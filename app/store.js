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
  let sb = null, sbUser = null, channel = null, sbUrl = '', sbKey = '';
  // V2.17.1: big files (videos) upload on their own, in 6 MB pieces that pick up where they left off if the app closes
  // (Supabase's resumable uploads), with progress — and never hold up messages, memories or photos behind them.
  // Records that point at a video go as soon as its still is up; the other phone shows "on its way" until it arrives.
  const BIG = 6 * 1024 * 1024, CHUNK = 6 * 1024 * 1024, LTUS = 'dj.tus.v1';
  const isBig = id => typeof queue.blob[id] === 'number' && queue.blob[id] > BIG;
  const upListeners = new Set(); const upProg = (id, sent, total, done) => upListeners.forEach(fn => { try { fn({ id, sent, total, done }); } catch (e) {} });
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  function xhr(method, url, headers, body, onProg){ return new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open(method, url); Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v)); if (onProg && x.upload) x.upload.onprogress = e => onProg(e.loaded); x.onload = () => res(x); x.onerror = () => rej(new Error('network')); x.ontimeout = () => rej(new Error('timeout')); x.send(body || null); }); }
  async function tusUpload(id, blob){
    const { data: { session } } = await sb.auth.getSession(); const tok = session && session.access_token;
    if (!tok || !sbUrl) throw Object.assign(new Error('no session'), { fallback: true });
    const base = sbUrl.replace(/\/$/, '') + '/storage/v1/upload/resumable';
    const H = { authorization: 'Bearer ' + tok, apikey: sbKey, 'tus-resumable': '1.0.0', 'x-upsert': 'true' };
    const saved = readJSON(LTUS, {}); let loc = saved[id] && saved[id].size === blob.size ? saved[id].url : null; let off = 0;
    if (loc) { const h = await xhr('HEAD', loc, H); if (h.status === 200 || h.status === 204) off = +h.getResponseHeader('upload-offset') || 0; else loc = null; }
    if (!loc) {
      const meta = { bucketName: 'assets', objectName: id, contentType: blob.type || 'application/octet-stream', cacheControl: '3600' };
      const r = await xhr('POST', base, Object.assign({ 'upload-length': String(blob.size), 'upload-metadata': Object.entries(meta).map(([k, v]) => k + ' ' + b64(v)).join(',') }, H));
      if (r.status !== 201) throw Object.assign(new Error('resumable ' + r.status), { fallback: true });   // not available → the ordinary upload
      loc = r.getResponseHeader('location'); if (!loc) throw Object.assign(new Error('resumable: no location'), { fallback: true });
      loc = new URL(loc, base).href; saved[id] = { url: loc, size: blob.size }; writeJSON(LTUS, saved); }
    upProg(id, off, blob.size);
    while (off < blob.size) { const end = Math.min(off + CHUNK, blob.size); const at = off;
      const r = await xhr('PATCH', loc, Object.assign({ 'upload-offset': String(at), 'content-type': 'application/offset+octet-stream' }, H), blob.slice(at, end), n => upProg(id, at + n, blob.size));
      if (r.status === 404 || r.status === 409 || r.status === 410) { const s2 = readJSON(LTUS, {}); delete s2[id]; writeJSON(LTUS, s2); throw new Error('resumable restart ' + r.status); }
      if (r.status !== 204 && r.status !== 200) throw new Error('resumable ' + r.status);
      off = +r.getResponseHeader('upload-offset') || end; upProg(id, off, blob.size); }
    const s3 = readJSON(LTUS, {}); delete s3[id]; writeJSON(LTUS, s3);
  }
  let bigBusy = false, bigRetry = 4000;
  async function bigUploads(){
    if (bigBusy || !sb || !sbUser) return; bigBusy = true; let failed = false;
    try { for (const id of Object.keys(queue.blob).filter(isBig)) {
      const blob = await getBlobLocal(id).catch(() => null); if (!blob) { delete queue.blob[id]; saveQueue(); continue; }
      try { await tusUpload(id, blob); }
      catch (e) { if (!e.fallback) { failed = true; console.warn('upload', id, e.message); upProg(id, 0, blob.size, false); continue; }
        let error = null; try { ({ error } = await sb.storage.from('assets').upload(id, blob, { upsert: true, contentType: blob.type || undefined })); } catch (e2) { error = e2; }
        if (error && !/exists/i.test(error.message || '')) { failed = true; console.warn('upload', id, error.message); upProg(id, 0, blob.size, false); continue; } }
      delete queue.blob[id]; uploaded.add(id); saveQueue(); saveUploaded(); upProg(id, blob.size, blob.size, true);
      Store.pending = Math.max(0, Store.pending - 1); } }
    finally { bigBusy = false; }
    if (failed) { setTimeout(bigUploads, bigRetry); bigRetry = Math.min(bigRetry * 2, 120000); } else bigRetry = 4000;
  }
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
  const urlCache = new Map(); const signed = new Map();

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
      // records that don't wait on a photo go straight away; ones that point at a photo go after it's uploaded,
      // so the other phone never gets a message before its photo. Chat photos jump the queue.
      const putDocs = async ids => { for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200); const recs = chunk.map(id => docs[id]);
        const { error } = await sb.from('docs').upsert(recs);
        if (error) { failed = true; console.warn('sync', error.message); return; }
        chunk.forEach(id => { if (queue.put[id] && docs[id] && queue.put[id] <= docs[id].updated_at) delete queue.put[id]; synced.add(id); });
        saveQueue(); saveSynced(); } };
      Object.keys(queue.put).forEach(id => { if (!docs[id]) delete queue.put[id]; });
      const waiting = Object.keys(queue.blob).filter(b => !isBig(b)); const json = id => JSON.stringify(docs[id].data);
      const needs = id => waiting.length && waiting.some(b => json(id).includes(b));
      const ids = Object.keys(queue.put); const later = ids.filter(needs), now = ids.filter(id => !later.includes(id));
      await putDocs(now);
      // removed photos / voice notes
      const bdel = Object.keys(queue.blobDel);
      // (a failure here must never hold up new photos and records)
      if (bdel.length) { try { const { error } = await sb.storage.from('assets').remove(bdel); if (error) { failed = true; console.warn('remove', error.message); } else { bdel.forEach(id => { delete queue.blobDel[id]; uploaded.delete(id); }); saveQueue(); saveUploaded(); } } catch (e) { failed = true; console.warn('remove', e.message); } }
      // photos / voice notes (the ones a chat message is waiting on first)
      const chatIds = later.filter(id => docs[id] && docs[id].collection === 'bubbles').map(json).join(' ');
      const sz = b => typeof queue.blob[b] === 'number' ? queue.blob[b] : 0;
      const order = waiting.slice().sort((a, b) => ((chatIds.includes(b) ? 1 : 0) - (chatIds.includes(a) ? 1 : 0)) || sz(a) - sz(b));
      for (const id of order) {
        const blob = await getBlobLocal(id).catch(() => null);
        if (!blob) { delete queue.blob[id]; continue; }
        let error = null; try { ({ error } = await sb.storage.from('assets').upload(id, blob, { upsert: true, contentType: blob.type || undefined })); } catch (e) { error = e; }
        if (error && !/exists/i.test(error.message || '')) { failed = true; console.warn('upload', error.message); continue; }
        delete queue.blob[id]; uploaded.add(id); saveQueue(); saveUploaded();
        // anything that was only waiting on this photo can go now
        const ready = later.filter(d => queue.put[d] && docs[d] && !Object.keys(queue.blob).some(b => !isBig(b) && json(d).includes(b)));
        if (ready.length) await putDocs(ready);
      }
      await putDocs(Object.keys(queue.put).filter(id => docs[id]));
    } catch (e) { failed = true; console.warn('sync', e.message); }
    flushing = false; bigUploads();
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
      queue.blob[id] = blob.size || 1; saveQueue(); scheduleFlush();
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
    // how much space photos, videos, voice notes and files take (the server's count when signed in)
    async usage(){ const out = { photos: 0, videos: 0, voice: 0, files: 0, total: 0, count: 0, source: sb && sbUser ? 'server' : 'phone' };
      const add = (name, size) => { if (/^pv_/.test(name)) return; const ext = (name.split('.').pop() || '').toLowerCase(); const k = /^(jpg|jpeg|png|heic|webp|gif)$/.test(ext) ? 'photos' : /^(mov|mp4|m4v)$/.test(ext) ? 'videos' : /^(m4a|webm|mp3|wav|aac|ogg)$/.test(ext) ? 'voice' : 'files'; out[k] += size || 0; out.total += size || 0; out.count++; };
      if (sb && sbUser) { for (let off = 0; off < 50000; off += 1000) { const { data, error } = await sb.storage.from('assets').list('', { limit: 1000, offset: off }); if (error || !data) break; data.forEach(o => add(o.name, (o.metadata && o.metadata.size) || 0)); if (data.length < 1000) break; } return out; }
      const db = await openIDB(); await new Promise(res => { const t = db.transaction('assets'); const q = t.objectStore('assets').openCursor(); q.onsuccess = () => { const c = q.result; if (!c) return res(); const v = c.value; add(String(c.key), v && v.buf ? v.buf.byteLength : v && v.size || 0); c.continue(); }; q.onerror = () => res(); }); return out; },
    // a local-only copy (small previews made on this phone for older photos); never uploaded
    async putLocalBlob(id, blob){ try { await putBlobLocal(id, blob); } catch (e) {} },
    async localBlob(id){ return getBlobLocal(id).catch(() => null); },
    onUpload(fn){ upListeners.add(fn); return () => upListeners.delete(fn); },
    uploading(){ return Object.keys(queue.blob).filter(isBig); },
    // a video to play: this phone's copy, or a link that streams it (it starts playing straight away instead of
    // downloading all of it first). null = not uploaded yet.
    async mediaUrl(id){
      if (!id) return null; if (urlCache.has(id)) return urlCache.get(id);
      const local = await getBlobLocal(id).catch(() => null); if (local) { const u = URL.createObjectURL(local); urlCache.set(id, u); return u; }
      if (!sb) return null; const c = signed.get(id); if (c && c.until > Date.now()) return c.url;
      try { const { data, error } = await sb.storage.from('assets').createSignedUrl(id, 6 * 3600); if (error || !data || !data.signedUrl) return null; signed.set(id, { url: data.signedUrl, until: Date.now() + 5.5 * 3600e3 }); return data.signedUrl; } catch (e) { return null; }
    },
    // the whole file (to save to Photos), with progress — not kept on the phone, videos are big
    async fetchBlob(id, onProg){
      const local = await getBlobLocal(id).catch(() => null); if (local) return local;
      const u = await Store.mediaUrl(id); if (!u) return null;
      const r = await fetch(u); if (!r.ok) return null; const total = +r.headers.get('content-length') || 0; const type = (r.headers.get('content-type') || '').split(';')[0];
      if (!r.body || !r.body.getReader) return new Blob([await r.arrayBuffer()], { type });
      const rd = r.body.getReader(); const parts = []; let got = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (onProg && total) onProg(got / total); }
      return new Blob(parts, { type });
    },
    async blob(id){ let b = await getBlobLocal(id).catch(() => null); if (!b && sb) { const { data } = await sb.storage.from('assets').download(id); if (data) { b = data; putBlobLocal(id, b).catch(() => {}); uploaded.add(id); saveUploaded(); } } return b; },
    exportJSON(){ return JSON.stringify(Object.values(docs), null, 2); },
    // put back a photo / voice note from a backup under its original id (uploaded again if the server lacks it)
    async restoreBlob(id, blob){ await putBlobLocal(id, blob); urlCache.delete(id); if (!uploaded.has(id)) { queue.blob[id] = 1; saveQueue(); scheduleFlush(); } },
    // restoring never rolls back something newer that's already here; returns how many records came back
    async importJSON(text){ const arr = JSON.parse(text); let n = 0; arr.forEach(r => { if (!r || !r.id || !r.collection) return; const l = docs[r.id]; if (l && l.updated_at >= r.updated_at) return; docs[r.id] = r; queue.put[r.id] = r.updated_at; delete queue.del[r.id]; n++; }); saveLocal(); saveQueue(); emit(); if (sb && sbUser) await Store.pull(); else scheduleFlush(); return n; },
    wipe(){ docs = {}; queue = { put: {}, del: {}, blob: {}, blobDel: {} }; synced = new Set(); saveLocal(); saveQueue(); saveSynced(); emit(); },
    flush(){ return flush(); },

    // ---------- Supabase ----------
    async connect(cfg){
      loadLocal();
      if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) { this.mode = 'local'; return; }
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY); sbUrl = cfg.SUPABASE_URL; sbKey = cfg.SUPABASE_ANON_KEY;
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
