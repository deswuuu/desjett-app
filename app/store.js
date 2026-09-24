/* Storage: every record is a JSON doc in a named collection.
   Local mode  -> localStorage (docs) + IndexedDB (photos/audio blobs).
   Supabase    -> table "docs" (id, collection, data, updated_at) + storage bucket "assets".
   The UI never knows which one is active. */
(function(){
  const LS = 'dj.docs.v1';
  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const listeners = new Set();
  let docs = {};           // id -> {id, collection, data, updated_at}
  let sb = null, sbUser = null, channel = null;

  function loadLocal(){ try{ docs = JSON.parse(localStorage.getItem(LS)||'{}'); }catch(e){ docs = {}; } }
  function saveLocal(){ try{ localStorage.setItem(LS, JSON.stringify(docs)); }catch(e){} }
  function emit(){ listeners.forEach(fn => { try{ fn(); }catch(e){ console.error(e); } }); }

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
  async function putBlobLocal(id, blob){ const db = await openIDB(); return new Promise((res,rej)=>{ const t=db.transaction('assets','readwrite'); t.objectStore('assets').put(blob,id); t.oncomplete=()=>res(id); t.onerror=()=>rej(t.error); }); }
  async function getBlobLocal(id){ const db = await openIDB(); return new Promise((res,rej)=>{ const t=db.transaction('assets'); const q=t.objectStore('assets').get(id); q.onsuccess=()=>res(q.result||null); q.onerror=()=>rej(q.error); }); }
  const urlCache = new Map();

  // ---------- public API ----------
  const Store = {
    ready: null, mode: 'local', user: null,
    onChange(fn){ listeners.add(fn); return () => listeners.delete(fn); },
    all(collection){ return Object.values(docs).filter(d => d.collection === collection).map(d => d.data); },
    get(collection, id){ const d = docs[id]; return d && d.collection === collection ? d.data : null; },
    async put(collection, data){
      if (!data.id) data.id = uid();
      const rec = { id: data.id, collection, data, updated_at: new Date().toISOString() };
      docs[data.id] = rec; saveLocal(); emit();
      if (sb) { const { error } = await sb.from('docs').upsert(rec); if (error) console.warn('sync', error.message); }
      return data;
    },
    async remove(id){
      delete docs[id]; saveLocal(); emit();
      if (sb) await sb.from('docs').delete().eq('id', id);
    },
    async putBlob(blob, ext){
      const id = uid() + (ext ? '.' + ext : '');
      await putBlobLocal(id, blob);
      if (sb) { const { error } = await sb.storage.from('assets').upload(id, blob, { upsert: true }); if (error) console.warn('upload', error.message); }
      return id;
    },
    async blobUrl(id){
      if (!id) return null;
      if (urlCache.has(id)) return urlCache.get(id);
      let blob = await getBlobLocal(id);
      if (!blob && sb) {
        const { data } = await sb.storage.from('assets').download(id);
        if (data) { blob = data; await putBlobLocal(id, blob); }
      }
      if (!blob) return null;
      const u = URL.createObjectURL(blob); urlCache.set(id, u); return u;
    },
    async blob(id){ let b = await getBlobLocal(id); if (!b && sb){ const {data} = await sb.storage.from('assets').download(id); b = data; } return b; },
    exportJSON(){ return JSON.stringify(Object.values(docs), null, 2); },
    async importJSON(text){ const arr = JSON.parse(text); arr.forEach(r => { docs[r.id] = r; }); saveLocal(); emit(); if (sb) await sb.from('docs').upsert(arr); },
    wipe(){ docs = {}; saveLocal(); emit(); },

    // ---------- Supabase ----------
    async connect(cfg){
      loadLocal();
      if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) { this.mode = 'local'; return; }
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      this.mode = 'supabase';
      const { data: { session } } = await sb.auth.getSession();
      sbUser = session ? session.user : null; this.user = sbUser;
      if (sbUser) await this.pull();
      sb.auth.onAuthStateChange(async (_e, s) => { sbUser = s ? s.user : null; Store.user = sbUser; if (sbUser) await Store.pull(); emit(); });
    },
    async signIn(email){ if (!sb) return; const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; },
    async signOut(){ if (sb) await sb.auth.signOut(); },
    async pull(){
      if (!sb) return;
      const { data, error } = await sb.from('docs').select('*');
      if (error) { console.warn('pull', error.message); return; }
      const local = Object.values(docs);
      // merge: newest wins; push local-only docs up
      const remoteIds = new Set(data.map(r => r.id));
      data.forEach(r => { const l = docs[r.id]; if (!l || l.updated_at < r.updated_at) docs[r.id] = r; });
      const toPush = local.filter(l => !remoteIds.has(l.id) || (docs[l.id] === l));
      if (toPush.length) await sb.from('docs').upsert(toPush);
      saveLocal(); emit();
      if (!channel) {
        channel = sb.channel('docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
          if (p.eventType === 'DELETE') delete docs[p.old.id]; else docs[p.new.id] = p.new;
          saveLocal(); emit();
        }).subscribe();
      }
    },
  };
  Store.uid = uid;
  window.Store = Store;
})();
