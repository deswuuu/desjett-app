/* Storage: every record is a JSON doc in a named collection.
   Local mode  -> localStorage (docs) + IndexedDB (photos/audio blobs).
   Supabase    -> table "docs" (id, collection, data, updated_at) + storage bucket "assets".
   Saves are local-first: the phone is updated instantly and a queue syncs to Supabase
   in the background (retrying when offline). The UI never waits for the network. */
(function(){
  const LS = 'dj.docs.v1', LQ = 'dj.queue.v1', LSYNC = 'dj.synced.v1', LUP = 'dj.uploaded.v1';
  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const listeners = new Set();
  let docs = {};           // id -> {id, collection, data, updated_at}
  let sb = null, sbUser = null, channel = null;
  let queue = { put: {}, del: {}, blob: {}, blobDel: {} };   // pending remote work, keyed by id
  let synced = new Set();  // ids we know exist on the server (so a missing one means "deleted elsewhere")
  let uploaded = new Set();// blob ids already in the bucket

  const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function loadLocal(){ docs = readJSON(LS, {}); queue = Object.assign({ put: {}, del: {}, blob: {}, blobDel: {} }, readJSON(LQ, {})); synced = new Set(readJSON(LSYNC, [])); uploaded = new Set(readJSON(LUP, [])); }
  function saveLocal(){ writeJSON(LS, docs); }
  function saveQueue(){ writeJSON(LQ, queue); }
  function saveSynced(){ writeJSON(LSYNC, [...synced]); }
  function saveUploaded(){ writeJSON(LUP, [...uploaded]); }
  let emitTimer = null;
  function emit(){ clearTimeout(emitTimer); emitTimer = setTimeout(() => listeners.forEach(fn => { try { fn(); } catch(e){ console.error(e); } }), 0); }

  // ---------- IndexedDB blobs ----------
  let idb;
  function openIDB(){
    if (idb) return Promise.resolve(idb);
    return new Promise((res, rej) => {
      const r = indexedDB.open('dj-assets', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('assets');
      r.onsuccess = () => { idb = r.result; res(idb); };
      r.onerror = () => rej(r.error);
    });
  }
  // iPhone can be unreliable storing Blob objects in IndexedDB, so store bytes + type.
  async function putBlobLocal(id, blob){ const buf = await blob.arrayBuffer(); const db = await openIDB(); return new Promise((res,rej)=>{ const t=db.transaction('assets','readwrite'); t.objectStore('assets').put({ buf, type: blob.type }, id); t.oncomplete=()=>res(id); t.onerror=()=>rej(t.error); }); }
  async function getBlobLocal(id){ const db = await openIDB(); return new Promise((res,rej)=>{ const t=db.transaction('assets'); const q=t.objectStore('assets').get(id); q.onsuccess=()=>{ const v = q.result; if (!v) return res(null); if (v instanceof Blob) return res(v); res(new Blob([v.buf], { type: v.type || '' })); }; q.onerror=()=>rej(q.error); }); }
  async function localBlobIds(){ const db = await openIDB(); return new Promise((res,rej)=>{ const t=db.transaction('assets'); const q=t.objectStore('assets').getAllKeys(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>rej(q.error); }); }
  const urlCache = new Map();

  // ---------- background sync ----------
  let flushing = false, flushTimer = null, retryMs = 2000;
  function scheduleFlush(ms){ clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms == null ? 300 : ms); }
  async function flush(){
    if (!sb || !sbUser || flushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    flushing = true; let failed = false;
    try {
      // deletes
      const dels = Object.keys(queue.del);
      if (dels.length) {
        const { error } = await sb.from('docs').delete().in('id', dels);
        if (error) { failed = true; console.warn('sync delete', error.message); }
        else { dels.forEach(id => { delete queue.del[id]; synced.delete(id); }); saveQueue(); saveSynced(); }
      }
      // puts, in batches
      const ids = Object.keys(queue.put).filter(id => docs[id]);
      Object.keys(queue.put).forEach(id => { if (!docs[id]) delete queue.put[id]; });
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200); const recs = chunk.map(id => docs[id]);
        const { error } = await sb.from('docs').upsert(recs);
        if (error) { failed = true; console.warn('sync', error.message); break; }
        chunk.forEach(id => { if (queue.put[id] && docs[id] && queue.put[id] <= docs[id].updated_at) delete queue.put[id]; synced.add(id); });
        saveQueue(); saveSynced();
      }
      // removed photos / voice notes
      const bdel = Object.keys(queue.blobDel);
      if (bdel.length) { const { error } = await sb.storage.from('assets').remove(bdel); if (error) { failed = true; console.warn('remove', error.message); } else { bdel.forEach(id => { delete queue.blobDel[id]; uploaded.delete(id); }); saveQueue(); saveUploaded(); } }
      // photos / voice notes
      for (const id of Object.keys(queue.blob)) {
        const blob = await getBlobLocal(id).catch(() => null);
        if (!blob) { delete queue.blob[id]; continue; }
        const { error } = await sb.storage.from('assets').upload(id, blob, { upsert: true, contentType: blob.type || undefined });
        if (error && !/exists/i.test(error.message)) { failed = true; console.warn('upload', error.message); break; }
        delete queue.blob[id]; uploaded.add(id); saveQueue(); saveUploaded();
      }
    } catch (e) { failed = true; console.warn('sync', e.message); }
    flushing = false;
    if (failed) { scheduleFlush(retryMs); retryMs = Math.min(retryMs * 2, 60000); }
    else { retryMs = 2000; if (Object.keys(queue.put).length || Object.keys(queue.del).length || Object.keys(queue.blob).length || Object.keys(queue.blobDel).length) scheduleFlush(); }
    Store.pending = Object.keys(queue.put).length + Object.keys(queue.del).length + Object.keys(queue.blob).length + Object.keys(queue.blobDel).length;
  }

  function writeDoc(collection, data){
    if (!data.id) data.id = uid();
    const rec = { id: data.id, collection, data, updated_at: new Date().toISOString() };
    docs[data.id] = rec; queue.put[data.id] = rec.updated_at; delete queue.del[data.id];
    return data;
  }
  function dropDoc(id){ delete docs[id]; delete queue.put[id]; queue.del[id] = 1; }

  // ---------- public API ----------
  const Store = {
    ready: null, mode: 'local', user: null, pending: 0,
    onChange(fn){ listeners.add(fn); return () => listeners.delete(fn); },
    all(collection){ return Object.values(docs).filter(d => d.collection === collection).map(d => d.data); },
    get(collection, id){ const d = docs[id]; return d && d.collection === collection ? d.data : null; },
    async put(collection, data){ writeDoc(collection, data); saveLocal(); saveQueue(); emit(); scheduleFlush(); return data; },
    async putMany(collection, arr){ if (!arr.length) return arr; arr.forEach(d => writeDoc(collection, d)); saveLocal(); saveQueue(); emit(); scheduleFlush(); return arr; },
    async remove(id){ dropDoc(id); saveLocal(); saveQueue(); emit(); scheduleFlush(); },
    async removeMany(ids){ if (!ids.length) return; ids.forEach(dropDoc); saveLocal(); saveQueue(); emit(); scheduleFlush(); },
    async putBlob(blob, ext){
      const id = uid() + (ext ? '.' + ext : '');
      await putBlobLocal(id, blob);
      queue.blob[id] = 1; saveQueue(); scheduleFlush();
      return id;
    },
    async removeBlob(id){
      if (!id) return; urlCache.delete(id); delete queue.blob[id];
      try { const db = await openIDB(); await new Promise(res => { const t = db.transaction('assets','readwrite'); t.objectStore('assets').delete(id); t.oncomplete = res; t.onerror = res; }); } catch (e) {}
      if (uploaded.has(id) || sb) queue.blobDel[id] = 1; saveQueue(); scheduleFlush();
    },
    async blobUrl(id){
      if (!id) return null;
      if (urlCache.has(id)) return urlCache.get(id);
      const blob = await Store.blob(id);
      if (!blob) return null;
      const u = URL.createObjectURL(blob); urlCache.set(id, u); return u;
    },
    async blob(id){ let b = await getBlobLocal(id).catch(() => null); if (!b && sb) { const { data } = await sb.storage.from('assets').download(id); if (data) { b = data; putBlobLocal(id, b).catch(() => {}); uploaded.add(id); saveUploaded(); } } return b; },
    exportJSON(){ return JSON.stringify(Object.values(docs), null, 2); },
    async importJSON(text){ const arr = JSON.parse(text); arr.forEach(r => { docs[r.id] = r; queue.put[r.id] = r.updated_at; }); saveLocal(); saveQueue(); emit(); scheduleFlush(); },
    wipe(){ docs = {}; queue = { put: {}, del: {}, blob: {}, blobDel: {} }; synced = new Set(); saveLocal(); saveQueue(); saveSynced(); emit(); },
    flush(){ return flush(); },

    // ---------- Supabase ----------
    async connect(cfg){
      loadLocal();
      if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) { this.mode = 'local'; return; }
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      this.mode = 'supabase';
      const { data: { session } } = await sb.auth.getSession();
      sbUser = session ? session.user : null; this.user = sbUser;
      if (sbUser) this.pull();   // don't block opening the app on the network
      sb.auth.onAuthStateChange(async (_e, s) => { const was = sbUser; sbUser = s ? s.user : null; Store.user = sbUser; if (sbUser && !was) await Store.pull(); emit(); });
      // catch up whenever the app comes back to the front or the phone gets signal again
      let lastPull = Date.now();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && sbUser && Date.now() - lastPull > 5000) { lastPull = Date.now(); Store.pull(); } });
      window.addEventListener('online', () => { if (sbUser) { Store.pull(); } });
      window.addEventListener('pageshow', e => { if (e.persisted && sbUser) Store.pull(); });
    },
    // the email carries both a link and a 6-digit code; the code works inside the Home Screen app
    async verifyCode(email, token){ if (!sb) return; const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' }); if (error) throw error; const u = data && (data.user || (data.session && data.session.user)); if (u) { const was = sbUser; sbUser = u; Store.user = u; if (!was) await Store.pull(); emit(); } },
    async signIn(email){ if (!sb) return; const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; },
    async signOut(){ if (sb) await sb.auth.signOut(); },
    async pull(){
      if (!sb || !sbUser) return;
      let data = [], from = 0;
      while (true) {
        const { data: page, error } = await sb.from('docs').select('*').range(from, from + 999);
        if (error) { console.warn('pull', error.message); return; }
        data = data.concat(page); if (page.length < 1000) break; from += 1000;
      }
      let changed = false; const remoteIds = new Set(data.map(r => r.id));
      data.forEach(r => {
        synced.add(r.id);
        if (queue.del[r.id]) return;                                  // we deleted it; the delete is on its way
        const l = docs[r.id];
        if (!l || l.updated_at < r.updated_at) { docs[r.id] = r; changed = true; }
        else if (l.updated_at > r.updated_at) queue.put[r.id] = l.updated_at;   // ours is newer: send it
      });
      Object.keys(docs).forEach(id => {
        if (remoteIds.has(id) || queue.put[id]) return;
        if (synced.has(id)) { delete docs[id]; synced.delete(id); changed = true; }   // deleted on the other phone
        else queue.put[id] = docs[id].updated_at;                                      // made here before sign-in: send it up
      });
      // photos / voice notes made before sign-in
      try { (await localBlobIds()).forEach(id => { if (!uploaded.has(id)) queue.blob[id] = 1; }); } catch (e) {}
      saveLocal(); saveQueue(); saveSynced(); if (changed) emit();
      flush();
      if (!channel) {
        channel = sb.channel('docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
          if (p.eventType === 'DELETE') { const id = p.old && p.old.id; if (id && docs[id] && !queue.put[id]) { delete docs[id]; synced.delete(id); saveLocal(); saveSynced(); emit(); } return; }
          const r = p.new; if (!r || !r.id) return; synced.add(r.id);
          const l = docs[r.id];
          if (queue.del[r.id]) return;
          if (l && l.updated_at >= r.updated_at) return;    // our own echo, or older
          docs[r.id] = r; saveLocal(); saveSynced(); emit();
        }).subscribe();
      }
    },
  };
  Store.uid = uid;
  window.Store = Store;
})();
