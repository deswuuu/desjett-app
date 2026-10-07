/* Des & Jett — the app. Vanilla JS, hash routes, Store for data. */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '$' + Number(n||0).toLocaleString('en-CA', {maximumFractionDigits:0});
const money2 = n => '$' + Number(n||0).toFixed(2);
const today = () => isoDate(new Date());
const isoDate = d => { const z = new Date(d.getTime() - d.getTimezoneOffset()*60000); return z.toISOString().slice(0,10); };
const parseDate = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtD = s => { if(!s) return ''; const d = parseDate(s); return MON[d.getMonth()] + ' ' + d.getDate(); };
const fmtDow = s => { const d = parseDate(s); return DOW[d.getDay()] + ' ' + d.getDate(); };
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate()+n); return isoDate(d); };
const CATS = [['flight','Flight'],['stay','Stay'],['food','Food'],['transit','Transport'],['fun','Fun']];
const OCC_CATS = [['gift','Gift'],['food','Dinner'],['fun','Other']];
const CITIES = { Vancouver:{lat:49.28,lon:-123.12,tz:'America/Vancouver'}, Toronto:{lat:43.65,lon:-79.38,tz:'America/Toronto'}, Montreal:{lat:45.5,lon:-73.57,tz:'America/Toronto'}, Calgary:{lat:51.05,lon:-114.07,tz:'America/Edmonton'}, 'New York':{lat:40.71,lon:-74.01,tz:'America/New_York'}, 'Los Angeles':{lat:34.05,lon:-118.24,tz:'America/Los_Angeles'}, London:{lat:51.5,lon:-0.12,tz:'Europe/London'}, Seoul:{lat:37.57,lon:126.98,tz:'Asia/Seoul'}, Tokyo:{lat:35.68,lon:139.69,tz:'Asia/Tokyo'} };
const WX = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/>',
  rain:'<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
  storm:'<path d="M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7a3.5 3.5 0 0 0 1 7z"/><path d="M13 14l-2 4h3l-2 4"/>',
  snow:'<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7z"/><path d="M9 19v.1M13 19v.1M17 19v.1M11 22v.1M15 22v.1"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  cloudmoon:'<path d="M7 19h9a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 6.5 13 3 3 0 0 0 7 19z"/><path d="M19.5 9.5A4 4 0 0 1 15 5a4 4 0 0 0 4.5 4.5z"/>'
};
const wx = k => `<svg class="wx" viewBox="0 0 24 24">${WX[k]||WX.sun}</svg>`;
const CFG = window.DJ_CONFIG || {};

// ---------- data ----------
const D = {
  users(){ return Store.all('users'); },
  user(id){ return Store.get('users', id); },
  me(){ return D.user(localStorage.getItem('dj.me')) || null; },
  other(){ const me = D.me(); return D.users().find(u => me && u.id !== me.id) || null; },
  settings(){ const s = Store.get('settings','settings') || { id:'settings', tint:'sage', photoStyle:'polaroid', sky:'auto', envelopes:[], tripGuess:{flight:400, night:120, day:80}, setup:false, anniversary:'' }; s.tint = ({blush:'pink', cool:'sky', white:'silver'})[s.tint] || s.tint || 'sage'; return s; },
  anniversary(){ return D.settings().anniversary || ''; },
  monthsSince(date){ const a = D.anniversary(); if (!a) return null; const [ay,am] = a.split('-').map(Number), [y,m] = date.split('-').map(Number); return (y-ay)*12 + (m-am); },
  isMonthiversary(date){ const a = D.anniversary(); return !!a && date.slice(8) === a.slice(8) && date >= a; },
  saveSettings(patch){ return Store.put('settings', Object.assign({}, D.settings(), patch, {id:'settings'})); },
  trips(){ return Store.all('trips').filter(t => !t.occasion).sort((a,b) => a.start < b.start ? -1 : 1); },
  // occasions (birthdays, anniversaries…) live in the same collection; a hidden one only shows for whoever made it
  occasions(){ const me = (D.me()||{}).id; return Store.all('trips').filter(t => t.occasion && (!t.secret || t.authorId === me)).sort((a,b) => a.start < b.start ? -1 : 1); },
  occasionForDate(date){ return D.occasions().find(t => date >= t.start && date <= t.end) || null; },
  isHiddenFromMe(tripId){ if (!tripId) return false; const t = Store.get('trips', tripId); return !!(t && t.occasion && t.secret && t.authorId && t.authorId !== (D.me()||{}).id); },
  trip(id){ return Store.get('trips', id); },
  moments(){ const me = (D.me()||{}).id; return Store.all('moments').filter(m => !(m.kind === 'plan' && m.hidden && m.authorId && m.authorId !== me) && !D.isHiddenFromMe(m.tripId)); },
  tripMoments(id){ return D.moments().filter(m => m.tripId === id).sort((a,b) => (a.date+a.createdAt) < (b.date+b.createdAt) ? -1 : 1); },
  events(){ return Store.all('events'); },
  bubbles(){ return Store.all('bubbles'); },
  tripForDate(date){ return D.trips().find(t => date >= t.start && date <= t.end) || null; },
  // A memory can hold several cost lines (items), plus the single m.cost that flights/bookings and older memories use.
  costLines(m){ const out = []; if (m.cost && +m.cost.amount) out.push(Object.assign({}, m.cost, m.flight && (!m.cost.tag || m.cost.tag === 'fun' || m.cost.tag === 'other') ? { tag: 'flight' } : {}, { m, i: -1 })); (m.items||[]).forEach((it, i) => { if (it.type === 'cost' && +it.amount) out.push(Object.assign({}, it, { m, i })); }); return out; },
  costTotal(m){ return D.costLines(m).reduce((s,c) => s + +c.amount, 0); },
  voices(m){ const out = []; if (m.voice) out.push({ asset: m.voice, dur: m.voiceDur, by: m.authorId, legacy: true }); (m.items||[]).forEach(it => { if (it.type === 'voice' && it.asset) out.push(Object.assign({ by: m.authorId }, it)); }); return out; },
  notes(mid){ return Store.all('notes').filter(n => n.mid === mid).sort((a, b) => (a.by < b.by ? -1 : 1)); },
  note(mid, uid){ return Store.get('notes', 'note_' + mid + '_' + uid); },
  videos(m){ return (m.items||[]).filter(it => it.type === 'video' && it.url); },
  songs(m){ const out = []; if (m.song) out.push({ url: m.song, title: m.songTitle, artist: m.songBy, legacy: true }); (m.items||[]).forEach(it => { if (it.type === 'song' && it.url) out.push(it); }); return out; },
  shareOf(c, uid){ if (!c || !+c.amount) return 0; if (c.paidBy !== 'both') return c.paidBy === uid ? +c.amount : 0; const sp = c.split || {}; if (sp.mode === 'amt') return sp[uid] != null ? +sp[uid] : +c.amount / 2; return +c.amount * ((sp[uid] != null ? +sp[uid] : 50) / 100); },
  share(m, uid){ return D.costLines(m).reduce((s,c) => s + D.shareOf(c, uid), 0); },
  payerTextC(c){ if (!c) return ''; if (c.paidBy !== 'both') return (D.user(c.paidBy)||{}).name || ''; const [a, b] = D.users2(); const sa = D.shareOf(c, a.id), sb = D.shareOf(c, b.id); return Math.abs(sa - sb) < 0.01 ? `${a.name} & ${b.name}` : `${a.name} ${money2(sa)} · ${b.name} ${money2(sb)}`; },
  payerText(m){ const ls = D.costLines(m); return ls.length === 1 ? D.payerTextC(ls[0]) : ls.length ? ls.map(c => D.payerTextC(c)).filter((v,i,a) => a.indexOf(v) === i).join(', ') : ''; },
  tripLines(t){ return D.tripMoments(t.id).flatMap(m => D.costLines(m)); },
  // costs whose category was removed (or never existed) — shown under "Other" so nothing goes missing
  strayLines(t){ const keys = D.cats(t).map(c => c.key); return D.tripLines(t).filter(c => !keys.includes(c.tag || 'other')); },
  tripCost(t){ const by = {}; let total = 0; const cat = {}; D.tripLines(t).forEach(c => { total += +c.amount; D.users().forEach(u => { by[u.id] = (by[u.id]||0) + D.shareOf(c, u.id); }); const k = c.tag || 'other'; cat[k] = (cat[k]||0) + +c.amount; }); return { total, by, cat }; },
  // birthdays: stored on each person as YYYY-MM-DD; this year's / next occurrence as an ISO date
  bdayIn(u, year){ return u && u.birthday ? year + u.birthday.slice(4) : ''; },
  nextBirthday(u, from){ if (!u || !u.birthday) return ''; from = from || today(); const y = +from.slice(0,4); const a = D.bdayIn(u, y); return a >= from ? a : D.bdayIn(u, y + 1); },
  birthdaysOn(date){ return D.users().filter(u => u.birthday && u.birthday.slice(5) === date.slice(5)); },
  presents(){ const me = (D.me()||{}).id; return Store.all('presents').filter(p => p.fromUser === me || (p.forUser === me && todayIn(D.me()) >= p.date)); },
  wishes(){ const me = (D.me()||{}).id; return Store.all('wishes').filter(w => w.userId === me); },
  wishlist(uid){ return Store.all('wishlist').filter(w => w.userId === uid).sort((a,b) => a.at - b.at); },
  comments(mid, asset){ return Store.all('comments').filter(c => c.mid === mid && c.asset === asset).sort((a,b) => a.at - b.at); },
  tripPlan(t){ if (t.occasion) { const out = {}; D.cats(t).forEach(c => out[c.key] = D.planTotalFor(t, c.key)); return out; } const g = D.settings().tripGuess; const nights = Math.max(1, daysBetween(t.start, t.end)); const days = nights + 1; const def = { flight: g.flight, stay: g.night * nights, food: Math.round(g.day * days * 0.6), transit: Math.round(g.day * days * 0.15), fun: Math.round(g.day * days * 0.25) }; (t.cats||[]).forEach(c => def[c.key] = 0); const out = Object.assign(def, t.plan || {}); Object.keys(t.planCfg || {}).forEach(k => { out[k] = D.planTotalFor(t, k); }); return out; },
  planCfg(t, key){ const c = (t.planCfg || {})[key]; if (c) return c; if (t.occasion) return { mode:'total', who:'both', a: +((t.plan||{})[key]||0), b: 0 }; const g = D.settings().tripGuess; const legacy = (t.plan || {})[key]; if (legacy != null) return { mode:'total', who:'both', a: +legacy, b: 0 }; if (key === 'flight') return { mode:'total', who:'both', a: g.flight, b: 0 }; if (key === 'stay') return { mode:'day', who:'both', a: g.night, b: 0 }; const per = { food: 0.6, transit: 0.15, fun: 0.25 }[key]; return per ? { mode:'day', who:'both', a: Math.round(g.day * per), b: 0 } : { mode:'total', who:'both', a: 0, b: 0 }; },
  planUnits(t, key){ const nights = Math.max(1, daysBetween(t.start, t.end)); return key === 'stay' ? nights : nights + 1; },
  planTotalFor(t, key){ const c = D.planCfg(t, key); const per = c.who === 'each' ? (+c.a||0) + (+c.b||0) : (+c.a||0); return Math.round(per * (c.mode === 'day' ? D.planUnits(t, key) : 1)); },
  planTotal(t){ const p = D.tripPlan(t); return D.cats(t).reduce((a,c) => a + (+p[c.key]||0), 0); },
  envelopeMonthly(){ return D.settings().envelopes.reduce((s,e) => s + (+e.amount||0) * (e.per === 'each' ? 2 : 1), 0); },
  nextTrip(){ const t = today(); return D.trips().find(x => x.end >= t) || null; },
  cats(t){ const base = (t && t.occasion ? OCC_CATS : CATS).map(([k,l]) => ({ key:k, label:l })); if (!t) return base; const custom = (t.cats||[]); const renamed = base.map(c => Object.assign({}, c, (t.catNames||{})[c.key] ? { label: t.catNames[c.key] } : {})).filter(c => !(t.hidden||[]).includes(c.key)); return renamed.concat(custom); },
  catLabel(t, key){ const c = D.cats(t).find(c => c.key === key); return c ? c.label : (key === 'other' ? 'Other' : key); },
  latestBubble(userId){ return D.bubbles().filter(b => b.userId === userId && Date.now() - b.at < 86400000).sort((a,b) => b.at - a.at)[0] || null; },
  users2(){ const u = D.users(); return u.slice().sort((a,b) => a.id < b.id ? -1 : 1); },
};

// ---------- sky ----------
function sunTimes(date, lat, lon){ // NOAA approximation, returns Date objects (UTC)
  const rad = Math.PI/180, J = date/86400000 + 2440587.5, n = Math.floor(J - 2451544.5 + lon/360), Js = n - lon/360;
  const M = (357.5291 + 0.98560028 * Js) % 360, C = 1.9148*Math.sin(M*rad) + 0.02*Math.sin(2*M*rad) + 0.0003*Math.sin(3*M*rad);
  const L = (M + C + 180 + 102.9372) % 360, Jt = 2451545 + Js + 0.0053*Math.sin(M*rad) - 0.0069*Math.sin(2*L*rad);
  const dec = Math.asin(Math.sin(L*rad)*Math.sin(23.44*rad));
  const cosw = (Math.sin(-0.83*rad) - Math.sin(lat*rad)*Math.sin(dec)) / (Math.cos(lat*rad)*Math.cos(dec));
  if (cosw > 1) return { rise:null, set:null, polar:'night' }; if (cosw < -1) return { rise:null, set:null, polar:'day' };
  const w = Math.acos(cosw)/rad, toDate = j => new Date((j - 2440587.5) * 86400000);
  return { rise: toDate(Jt - w/360), set: toDate(Jt + w/360) };
}
function skyMode(user, at){
  at = at || new Date(); if (!user || user.lat == null) return 'day';
  const s = sunTimes(at, user.lat, user.lon); if (s.polar) return s.polar === 'day' ? 'day' : 'night';
  const t = at.getTime(), r = s.rise.getTime(), st = s.set.getTime(), h = 3600000;
  if (t < r - 0.4*h || t > st + 0.6*h) return 'night';
  if (t < r + 3.5*h) return 'morning';
  if (t > st - 1.3*h) return 'sunset';
  return 'day';
}
function applySky(){
  const s = D.settings(), me = D.me();
  let mode = s.sky === 'light' ? 'day' : s.sky === 'dark' ? 'night' : skyMode(me);
  if (['profile','between','gcal','emails','howto','notify'].includes(route.name)) mode = 'day';
  document.documentElement.dataset.sky = mode;
  document.documentElement.dataset.anni = (D.isMonthiversary(today()) && mode !== 'night' && route.name === 'home') ? '1' : '';
  document.documentElement.dataset.tint = s.tint || 'sage';
  const skyEl = $('#sky');
  const blobs = { morning:[['var(--b1)','-140px','-40px','340px','300px',.55,'t'],['var(--b2)','60px','-90px','300px','260px',.9,'b']], day:[['var(--b1)','-40px','-80px','300px','300px',.9,'t'],['var(--b2)','40px','-100px','260px','260px',.9,'b']], sunset:[['var(--b1)','-120px','-40px','320px','280px',.55,'b'],['var(--b2)','-80px','-100px','240px','240px',.35,'t']], night:[['var(--b1)','-60px','-90px','320px','320px',.75,'t'],['var(--b2)','20px','-110px','240px','240px',.28,'b']] }[mode];
  skyEl.innerHTML = blobs.map(b => `<div class="blob" style="background:${b[0]};${b[6]==='t'?'top':'bottom'}:${b[1]};${b[6]==='t'&&b===blobs[0]||b[6]==='b'&&b===blobs[0]?'left':'right'}:${b[2]};width:${b[3]};height:${b[4]};opacity:${b[5]}"></div>`).join('');
}
const weatherCache = {};
async function weather(user){
  if (!user || user.lat == null) return null;
  const k = user.lat + ',' + user.lon; const c = weatherCache[k];
  if (c && Date.now() - c.at < 1800000) return c.v;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${user.lat}&longitude=${user.lon}&current=weather_code,is_day,temperature_2m`);
    const j = await r.json(); const code = j.current.weather_code, day = j.current.is_day;
    let icon = day ? 'sun' : 'moon';
    if (code >= 95) icon = 'storm'; else if (code >= 71 && code <= 77) icon = 'snow'; else if (code >= 51) icon = 'rain'; else if (code >= 2) icon = day ? 'cloud' : 'cloudmoon';
    const v = { icon, temp: Math.round(j.current.temperature_2m) }; weatherCache[k] = { at: Date.now(), v }; return v;
  } catch (e) { return null; }
}
function timeIn(user, d){ d = d || new Date(); try { return new Intl.DateTimeFormat('en-CA', { timeZone: user.tz || undefined, hour:'numeric', minute:'2-digit', hour12:true }).format(d).replace(/\s?[ap]\.m\./i, m => m.trim().replace(/\./g,'')).replace(' ',' '); } catch(e){ return d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'}); } }
function todayIn(user){ try { const p = new Intl.DateTimeFormat('en-CA', { timeZone: (user && user.tz) || undefined, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date()); const g = k => p.find(x => x.type === k).value; return `${g('year')}-${g('month')}-${g('day')}`; } catch (e) { return today(); } }
function dateIn(user, d){ d = d || new Date(); try { return new Intl.DateTimeFormat('en-CA', { timeZone: user.tz || undefined, month:'short', day:'numeric' }).format(d); } catch(e){ return fmtD(today()); } }

// ---------- shell ----------
let route = { name:'home' }, sheet = null, toastT;
function go(name, params){ route = Object.assign({ name }, params||{}); location.hash = '#' + name + (params && params.id ? '/' + params.id : ''); render(); window.scrollTo(0,0); }
function toast(msg){ let t = $('.toast'); if (t) t.remove(); t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2200); }
function openSheet(html, onMount, cls){ closeSheet(); const dim = document.createElement('div'); dim.className = 'dim'; dim.onclick = closeSheet; const sh = document.createElement('div'); sh.className = 'sheet' + (cls ? ' ' + cls : ''); sh.innerHTML = '<div class="grip"></div>' + html; document.body.append(dim, sh); sheet = { dim, sh }; bind(sh); if (onMount) onMount(sh); }
function closeSheet(){ if (sheet) { sheet.dim.remove(); sheet.sh.remove(); sheet = null; } }
// in-app confirm / prompt (browser popups are blocked in some places, and look wrong anyway)
function ask(msg, opts){ opts = opts || {}; return new Promise(res => { const dim = document.createElement('div'); dim.className = 'dim ask'; const box = document.createElement('div'); box.className = 'askbox'; const input = opts.input != null; box.innerHTML = `<div style="font-size:15px;font-weight:500;letter-spacing:-.01em">${esc(msg)}</div>${opts.sub ? `<div class="sub" style="margin-top:4px">${esc(opts.sub)}</div>` : ''}${input ? `<input class="in" id="ask-in" style="margin-top:12px" value="${esc(opts.input||'')}" placeholder="${esc(opts.placeholder||'')}">` : ''}<div class="row" style="margin-top:14px;justify-content:flex-end;gap:8px"><button class="btn sm lite" id="ask-no">${esc(opts.no||'Cancel')}</button><button class="btn sm" id="ask-ok">${esc(opts.ok||'OK')}</button></div>`; document.body.append(dim, box); const done = v => { dim.remove(); box.remove(); res(v); }; dim.onclick = () => done(input ? null : false); box.querySelector('#ask-no').onclick = () => done(input ? null : false); box.querySelector('#ask-ok').onclick = () => done(input ? box.querySelector('#ask-in').value.trim() : true); if (input) { const el = box.querySelector('#ask-in'); el.focus(); el.select(); el.onkeydown = e => { if (e.key === 'Enter') done(el.value.trim()); }; } }); }
const ACT = {};
function bind(root){
  root.querySelectorAll('[data-go]').forEach(el => el.onclick = e => { e.preventDefault(); const [n, id] = el.dataset.go.split('/'); go(n, id ? { id } : null); });
  root.querySelectorAll('[data-act]').forEach(el => { const ev = el.dataset.on || 'click'; el['on' + ev] = e => { const [n, arg] = el.dataset.act.split('|'); if (!ACT[n]) return; if (ev === 'click' && el._busy) return; const r = ACT[n](arg, el, e); if (ev === 'click' && r && typeof r.then === 'function') { el._busy = true; el.classList.add('busy'); r.catch(err => { console.error(err); toast('Something went wrong: ' + (err && err.message || err)); }).finally(() => { el._busy = false; el.classList.remove('busy'); }); } }; });
  root.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', e => { if (pendingSticker || e.target.classList.contains('stk') || el._dragged) return; ACT.viewPh(el.dataset.view); }));
  // full photos load now (and retry if the other phone hasn't finished uploading); previews load as they scroll into view
  root.querySelectorAll('[data-asset]').forEach(el => loadImg(el, () => Store.blobUrl(el.dataset.asset), 0, true));
  root.querySelectorAll('[data-thumb]').forEach(el => { if (imgIO) imgIO.observe(el); else loadImg(el, () => previewUrl(el.dataset.thumb, el.dataset.pv)); });
}
const imgQ = []; let imgActive = 0;
function runImg(){ while (imgActive < 4 && imgQ.length) { const job = imgQ.shift(); if (!job.el.isConnected) continue; imgActive++; job.fn().catch(() => {}).finally(() => { imgActive--; runImg(); }); } }
function setImg(el, u){ if (el.tagName === 'IMG') el.src = u; else el.style.backgroundImage = `url(${u})`; el.classList.add('loaded'); }
const RETRY = [2000, 6000, 15000, 40000, 90000];
function loadImg(el, get, tries, now){ const job = { el, fn: async () => { const u = await get().catch(() => null); if (u) setImg(el, u); else if ((tries || 0) < RETRY.length) setTimeout(() => { if (el.isConnected) loadImg(el, get, (tries || 0) + 1, now); }, RETRY[tries || 0]); } };
  if (now) { job.fn().catch(() => {}); return; } imgQ.push(job); runImg(); }
const imgIO = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { imgIO.unobserve(e.target); loadImg(e.target, () => previewUrl(e.target.dataset.thumb, e.target.dataset.pv)); } }), { rootMargin: '500px' }) : null;
const pvCache = new Map();
// a small preview: the one saved with the photo, or one made here once (older photos) and kept on this phone
async function previewUrl(asset, thumb){ if (!asset) return null; if (pvCache.has(asset)) return pvCache.get(asset);
  let u = thumb ? await Store.blobUrl(thumb) : null;
  if (!u) { const k = 'pv_' + asset; const local = await Store.localBlob(k); if (local) u = URL.createObjectURL(local);
    else { const full = await Store.blob(asset); if (!full) return null; try { const img = await decodeImage(full); const pv = await toJpeg(scaleTo(img, img.naturalWidth, img.naturalHeight, 480), .8); Store.putLocalBlob(k, pv); u = URL.createObjectURL(pv); } catch (e) { u = await Store.blobUrl(asset); } } }
  if (u) pvCache.set(asset, u); return u; }
const pvAttr = p => `data-thumb="${p.asset}" data-pv="${p.thumb || ''}"`;
function palOf(id){ const u = D.user(id); return u ? `<i class="pal ${u.pal}" title="${esc(u.name)}"></i>` : ''; }
function nav(on){ return `<nav class="nav">${[['home','Home'],['trips','Trips'],['calendar','Calendar'],['memories','Memories']].map(([k,l]) => `<button class="${on===k?'on':''}" data-go="${k}">${l}</button>`).join('')}</nav>`; }

function render(){
  applySky();
  const app = $('#app'); const s = D.settings();
  if (!s.setup) return renderSetup(app);
  if (!D.me()) return renderWho(app);
  const R = { notify: renderNotify, chat: renderChat, howto: renderHowto, gcal: renderGcal, cat: renderCategory, home: renderHome, trips: renderTrips, trip: renderTrip, days: renderDays, budget: renderBudget, photos: renderPhotos, day: renderDay, calendar: renderCalendar, profile: renderProfile, memories: renderMemories, between: renderBetween, emails: renderEmails, moments: renderMoments, lists: renderLists, list: renderList, wall: renderWall, songs: renderSongs, map: renderMap, import: renderImport };
  (needsWhatsNew() ? renderWhatsNew : (R[route.name] || renderHome))(app);
  bind(app); bindHold(app); updateBadge();
}

// ---------- setup ----------
let setupStep = 1, setupData = { anni:'', a:{name:'', pal:'bunny', city:'Vancouver'}, b:{name:'', pal:'puppy', city:'Toronto'}, guess:{flight:400,night:120,day:80}, env:[{name:'Gifts',amount:100,per:'each'},{name:'Food sends',amount:100,per:'each'}] };
function renderSetup(app){
  const d = setupData;
  const cityOpts = c => Object.keys(CITIES).map(k => `<option ${k===c?'selected':''}>${k}</option>`).join('');
  const steps = {
    1: `<div class="bar"><span>Setup</span><span>1 / 3</span></div>${Store.mode === 'supabase' && !Store.user ? `<div class="glass deep">${signinHTML('Joining someone? Sign in instead')}</div>` : ''}<h1 class="hd">Who's who</h1>
      <div class="glass" style="display:flex;flex-direction:column;gap:12px">
        <div class="pick"><button class="${d.a.pal==='bunny'?'on':''}" data-act="setPal|a,bunny"><i class="pal bunny"></i>Bunny</button><button class="${d.a.pal==='puppy'?'on':''}" data-act="setPal|a,puppy"><i class="pal puppy"></i>Puppy</button></div>
        <input class="in" id="s-a-name" placeholder="Your name" value="${esc(d.a.name)}"><select class="in" id="s-a-city">${cityOpts(d.a.city)}</select>
      </div>
      <div class="glass" style="display:flex;flex-direction:column;gap:12px">
        <div class="l">Them</div>
        <input class="in" id="s-b-name" placeholder="Their name" value="${esc(d.b.name)}"><select class="in" id="s-b-city">${cityOpts(d.b.city)}</select>
        <div class="sub">They get the other pal.</div>
      </div>
      <div class="glass"><div class="row"><span style="font-size:13.5px">Together since</span><input class="in" type="date" id="s-anni" value="${esc(d.anni||'')}" style="width:auto;padding:8px 10px;font-size:12px"></div></div>
      <div class="row mt-auto"><span></span><button class="btn" data-act="setupNext">Next</button></div>`,
    2: `<div class="bar"><span>Setup</span><span>2 / 3</span></div><h1 class="hd">A typical trip</h1><div class="sub">Rough guesses. Every trip can change them.</div>
      <div class="glass env"><div class="row"><span>Flight</span><span>$<input class="in money" style="font-size:22px;width:90px" id="s-g-flight" type="number" value="${d.guess.flight}"></span></div>
      <div class="row"><span>Stay, per night</span><span>$<input class="in money" style="font-size:22px;width:90px" id="s-g-night" type="number" value="${d.guess.night}"></span></div>
      <div class="row"><span>A day together</span><span>$<input class="in money" style="font-size:22px;width:90px" id="s-g-day" type="number" value="${d.guess.day}"></span></div></div>
      <div class="row" style="padding:0 4px"><span class="l">5 days</span><span class="num" style="font-size:22px">${money(d.guess.flight*1 + d.guess.night*4 + d.guess.day*5)}</span></div>
      <div class="row mt-auto"><button class="btn lite" data-act="setupBack">Back</button><button class="btn" data-act="setupNext">Next</button></div>`,
    3: `<div class="bar"><span>Setup</span><span>3 / 3</span></div><h1 class="hd">Between visits</h1><div class="sub">Pick a number for each. The app counts the number and never asks what was inside.</div>
      <div class="glass env">${d.env.map((e,i) => `<div class="row"><input class="in" style="background:transparent;border:0;padding:0;width:45%" value="${esc(e.name)}" data-act="envName|${i}" data-on="input"><span style="display:flex;align-items:center;gap:6px">$<input class="in money" style="font-size:22px;width:70px" type="number" value="${e.amount}" data-act="envAmt|${i}" data-on="input"><button class="chip ${e.per==='each'?'on':''}" data-act="envPer|${i}">${e.per==='each'?'each':'shared'}</button></span></div>`).join('')}
      <div class="row" style="color:var(--mu)"><button data-act="envAdd">Add</button><span>+</span></div></div>
      <div class="row" style="padding:0 4px"><span class="l">Per month</span><span class="num" style="font-size:22px">${money(d.env.reduce((s,e)=>s+(+e.amount||0)*(e.per==='each'?2:1),0))}</span></div>
      <div class="row mt-auto"><button class="btn lite" data-act="setupBack">Back</button><button class="btn" data-act="setupDone">Done</button></div>`
  };
  app.innerHTML = `<div class="screen" style="min-height:calc(100vh - 140px)">${steps[setupStep]}</div>`; bind(app);
}
function readSetup(){ const d = setupData; if (setupStep === 1) { d.a.name = $('#s-a-name').value.trim(); d.a.city = $('#s-a-city').value; d.b.name = $('#s-b-name').value.trim(); d.b.city = $('#s-b-city').value; d.b.pal = d.a.pal === 'bunny' ? 'puppy' : 'bunny'; d.anni = $('#s-anni').value; } if (setupStep === 2) { d.guess = { flight:+$('#s-g-flight').value||0, night:+$('#s-g-night').value||0, day:+$('#s-g-day').value||0 }; } }
ACT.setPal = a => { const [who, pal] = a.split(','); readSetup(); setupData[who].pal = pal; setupData.b.pal = pal === 'bunny' ? 'puppy' : 'bunny'; render(); };
ACT.setupNext = () => { readSetup(); if (setupStep === 1 && !(setupData.a.name && setupData.b.name)) return toast('Both names, please'); setupStep++; render(); };
ACT.setupBack = () => { readSetup(); setupStep--; render(); };
ACT.envName = (i, el) => { setupData.env[i].name = el.value; };
ACT.envAmt = (i, el) => { setupData.env[i].amount = +el.value || 0; };
ACT.envPer = i => { const e = setupData.env[i]; e.per = e.per === 'each' ? 'shared' : 'each'; render(); };
ACT.envAdd = () => { setupData.env.push({ name:'', amount:0, per:'each' }); render(); };
ACT.setupDone = async () => {
  const d = setupData; const mk = (p, id) => Object.assign({ id, name:p.name, pal:p.pal, city:p.city }, CITIES[p.city] || CITIES.Vancouver);
  const a = await Store.put('users', mk(d.a, 'u_a')); await Store.put('users', mk(d.b, 'u_b'));
  await D.saveSettings({ setup:true, tripGuess:d.guess, envelopes:d.env.filter(e => e.name), anniversary:d.anni });
  localStorage.setItem('dj.me', a.id); markWhatsNewSeen(); howtoIdx = 0; go('howto');
};
function renderWho(app){
  app.innerHTML = `<div class="screen" style="min-height:calc(100vh - 140px);justify-content:center"><h1 class="hd center">Which one are you?</h1><div class="pick">${D.users().map(u => `<button data-act="iam|${u.id}"><i class="pal ${u.pal}"></i>${esc(u.name)}</button>`).join('')}</div>${Store.mode === 'supabase' && !Store.user ? `<div class="glass">${signinHTML('Sign in to sync')}</div>` : ''}</div>`; bind(app);
}
ACT.iam = id => { if (!localStorage.getItem('dj.seenVer')) markWhatsNewSeen(); localStorage.setItem('dj.me', id); go('home'); };
let signinEmail = '';
function signinHTML(title){ return signinEmail
  ? `<div class="l">${esc(title)}</div><div class="sub" style="margin-top:2px">We emailed a code to ${esc(signinEmail)}. Type it here — it signs in this app, not Safari.</div><input class="in" id="code" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit code" style="margin-top:8px;font-size:20px;letter-spacing:.2em;text-align:center"><div class="row" style="margin-top:8px"><button class="l" data-act="signinBack">Use a different email</button><button class="btn sm" data-act="signinCode">Sign in</button></div>`
  : `<div class="l">${esc(title)}</div><input class="in" id="email" type="email" autocomplete="email" placeholder="your email" style="margin-top:8px"><button class="btn block" style="margin-top:8px" data-act="signin">Send me a code</button>`; }
ACT.signin = async () => { const email = ($('#email') || {}).value; if (!email || !email.trim()) return toast('Your email, please'); try { await Store.signIn(email.trim()); signinEmail = email.trim(); toast('Check your email'); if (sheet) ACT.signinSheet(); else render(); } catch (e) { toast(e.message); } };
ACT.signinBack = () => { signinEmail = ''; if (sheet) ACT.signinSheet(); else render(); };
ACT.signinCode = async () => { const code = (($('#code') || {}).value || '').replace(/\s/g, ''); if (!/^\d{6,10}$/.test(code)) return toast('The code from the email, please'); try { await Store.verifyCode(signinEmail, code); signinEmail = ''; closeSheet(); toast('Signed in'); render(); } catch (e) { toast(/expired|invalid/i.test(e.message) ? 'That code didn\'t work — send a new one' : e.message); } };

// ---------- home ----------
function renderHome(app){
  const me = D.me(), other = D.other(), t = D.nextTrip(), now = new Date(); markSeen('home');
  const days = t ? daysBetween(today(), t.start) : null;
  const mine = D.latestBubble(me.id), theirs = other && D.latestBubble(other.id); const everBubbled = D.bubbles().length > 0;
  const [L, R] = D.users2();
  const myMode = skyMode(me), theirMode = other ? skyMode(other) : myMode;
  const sameCity = t && today() >= t.start && today() <= t.end;
  const glow = { morning:'#FDE8D3', day:'#FFFFFF', sunset:'#F39F5A', night:'#502D55' };
  const anni = D.isMonthiversary(today()), months = D.monthsSince(today());
  const gap = days == null ? 0 : Math.max(0, Math.min(1, days / 60)); const travel = Math.max(0, (Math.min(480, window.innerWidth) - 52 - 220) / 2); const px = (anni || sameCity) ? Math.round(travel + 6) : Math.round((1 - gap) * travel - 4);
  // long bubbles stop at the middle and show two lines, then "…" (the whole thing is in Chat)
  const bub = (b, side) => b ? `<button class="bub ${b.kind} ${side}" data-go="chat" style="${side==='r'?'right:'+(6+px):'left:'+(6+px)}px;top:${b.kind==='think'?0:6}px;max-width:min(150px, calc(50% - ${14+px}px))">${b.photo ? `<span class="bph"><span class="bimg"><img data-thumb="${b.photo}" data-pv="${b.thumb || ''}" alt=""></span>${b.auto ? '' : `<span class="bt">${esc(b.text)}</span>`}</span>` : b.sticker ? stkHTML(b.sticker, 'bstk') : `<span class="bt">${esc(b.text)}</span>`}</button>` : '';
  const flightDay = t && today() === t.start && D.tripMoments(t.id).find(m => m.flight);
  const cost = t ? D.tripCost(t) : null, plan = t ? D.planTotal(t) : 0;
  const lastTrip = !t ? D.trips().filter(x => x.end < today()).slice(-1)[0] || null : null;
  const recent = D.moments().filter(m => m.kind !== 'plan' && m.kind !== 'booking').sort((a,b) => (b.date+b.createdAt).localeCompare(a.date+a.createdAt)).slice(0,3);
  // birthdays, each judged in that person's own time zone
  const isBday = u => !!(u && u.birthday && todayIn(u).slice(5) === u.birthday.slice(5));
  const myBday = isBday(me), theirBday = !myBday && isBday(other); const bdUser = myBday ? me : theirBday ? other : null;
  const myGift = myBday && D.presents().find(p => p.forUser === me.id && p.date === todayIn(me));
  const theirGift = theirBday && Store.all('presents').find(p => p.fromUser === me.id && p.forUser === other.id && p.date === todayIn(other));
  const soonDate = !bdUser && other && other.birthday ? D.nextBirthday(other, todayIn(other)) : ''; const soon = soonDate ? daysBetween(todayIn(other), soonDate) : null;
  const soonGift = soon != null && soon <= 7 && Store.all('presents').find(p => p.fromUser === me.id && p.forUser === other.id && p.date === soonDate);
  const palSide = u => u && ((u.pal === 'bunny') ? 'l' : 'r');
  const deco = bdUser ? (() => { const hs = palSide(bdUser); const giver = myBday ? other : me; const gs = palSide(giver); const gift = myBday ? myGift : theirGift;
    return `<i class="hat ${hs}" style="${hs === 'l' ? 'left' : 'right'}:${42 + px}px"></i>${gift ? `<button class="gift ${gs}" style="${gs === 'l' ? 'left' : 'right'}:${86 + px}px" data-act="${myBday ? 'openPresent|' + gift.id : 'presentFor|' + other.id + ',' + gift.date}" aria-label="Present"></button>` : ''}`; })() : '';
  app.innerHTML = `<div class="screen">
    <div class="sides" id="sides">
      ${[L,R].map((u,i) => u ? `<div class="side ${i?'r':''} ${u.id===me.id?'me':''}"><span class="d">${u.id===me.id && !i ? `<button data-go="profile"><i class="pal ${u.pal}"></i></button> ` : ''}${sameCity && i ? '' : dateIn(u, now) + ' · ' + timeIn(u, now)} <span id="wx-${u.id}"></span>${u.id===me.id && i ? ` <button data-go="profile"><i class="pal ${u.pal}"></i></button>` : ''}</span><span class="c">${sameCity && i ? esc(me.name) + ' &amp; ' + esc(other.name) : esc(u.city)}</span></div>` : '').join('')}
    </div>
    <div class="meet">
      <button class="track" data-go="chat" style="height:12px;bottom:3px;background:transparent"><span style="display:block;height:1px;background:var(--ln);margin-top:5px"></span></button><button class="chatlink" data-go="chat">${unreadChat() ? '<i class="dot"></i>' : ''}Chat ›</button><div class="tick" style="left:24px"></div><div class="tick" style="left:50%"></div><div class="tick" style="right:24px"></div>
      ${other && theirMode !== myMode && !sameCity ? `<div class="halo" style="${me.pal==='bunny'?'right':'left'}:-10px;background:${glow[theirMode]};opacity:.75"></div>` : ''}
      ${bub(me.pal==='bunny'?mine:theirs, 'l')}${bub(me.pal==='bunny'?theirs:mine, 'r')}${deco}
      <button data-act="bubble|${me.pal==='bunny'?me.id:(other?other.id:'')}"><i class="pal lg bunny" style="transform:translateX(${px}px)"></i></button>
      <button data-act="bubble|${me.pal==='puppy'?me.id:(other?other.id:'')}"><i class="pal lg puppy" style="transform:translateX(${-px}px) scaleX(-1)"></i></button>
    </div>
    ${!everBubbled ? '<div class="l center" style="margin-top:-8px">tap a pal to say or think something</div>' : ''}
    ${bdUser ? `<div class="conf">${Array.from({length:24}, (_, i) => `<i style="left:${6 + (i*37)%88}%;top:${(i*53)%26}%;background:${['#F2B8C6','#F6E39A','#B9D3C9','#C4D4E6'][i%4]};transform:rotate(${i*41}deg)"></i>`).join('')}</div>` : ''}
    ${bdUser ? `<div class="center"><div class="hd md">${myBday ? 'Happy birthday, ' + esc(me.name) + '!' : esc(other.name) + '\'s birthday!'}</div><div class="sub">${myBday ? (myGift ? (myGift.openedAt ? 'from ' + esc(other.name) + ' ♡' : 'from ' + esc(other.name) + ' · tap your present') : '') : theirGift ? (theirGift.openedAt ? 'your present was opened ♡' : 'your present is waiting') : `<button class="l" data-act="presentFor|${other.id},${todayIn(other)}">wrap a present ›</button>`}${anni ? (myGift || theirGift || !myBday ? ' · ' : '') + months + ' Month' + (months===1?'':'s') : ''}</div>${myBday ? `<button class="chip" style="margin-top:10px;font-size:12px" data-act="wishSheet">Make a wish</button>` : ''}</div>` : anni ? `<div class="center"><div class="hd md">${months} Month${months===1?'':'s'}!</div><div class="sub">since ${fmtD(D.anniversary())}${t && !sameCity ? ' · ' + esc(t.city) + (days > 0 ? ' in ' + days + ' days' : ' today') : ''}</div></div>` : t ? `<div class="center"><div class="hd md">${sameCity ? 'Together' : esc(t.city)}</div><div class="sub">${sameCity ? esc(t.city) + ' · day ' + (daysBetween(t.start, today())+1) + ' of ' + (daysBetween(t.start,t.end)+1) : fmtD(t.start) + (days > 0 ? ' · ' + days + ' days' : ' · today') + (t.flyer ? ' · ' + esc((D.user(t.flyer)||{}).name||'') + ' flies' : '')}</div></div>` : `<div class="center"><div class="hd md">${lastTrip ? 'Next trip?' : 'No trip yet'}</div><div class="sub" style="margin-top:8px">Add one in Trips</div></div>`}
    ${flightDay ? flightCard(flightDay) : t ? `<button class="glass tap" data-go="trip/${t.id}"><div class="row"><span class="l">${sameCity ? 'This trip · day ' + (daysBetween(t.start, today())+1) + ' of ' + (daysBetween(t.start,t.end)+1) : 'Upcoming trip · ' + esc(t.city)}</span><span class="l">of ~${money(plan)}</span></div><div class="row" style="margin-top:8px"><span class="num">${money(cost.total)}</span><span class="sub">${cost.total <= plan ? 'on track' : 'a bit over'}</span></div></button>` : lastTrip ? `<button class="glass tap" data-go="trip/${lastTrip.id}"><div class="row"><span class="l">Last trip · ${esc(lastTrip.city)}</span><span class="l">${fmtD(lastTrip.start)} – ${fmtD(lastTrip.end)}</span></div><div class="row" style="margin-top:8px"><span class="num">${money(D.tripCost(lastTrip).total)}</span><span class="sub">${D.tripMoments(lastTrip.id).filter(m => m.kind === 'moment').length} memories</span></div></button>` : ''}
    ${onThisDayHTML()}
    ${soon != null && soon >= 1 && soon <= 7 ? `<button class="glass pill row tap" style="display:flex" data-act="birthdaySheet|${other.id},${soonDate}"><span class="l">${esc(other.name)}'s birthday ${soon === 1 ? 'tomorrow' : 'in ' + soon + ' days'}</span><span style="font-size:13px;font-weight:500">${soonGift ? 'present wrapped ✓' : 'wrap a present ›'}</span></button>` : ''}
    <button class="glass pill row tap" style="display:flex" data-go="between"><span class="l">${MONTHS[now.getMonth()]} budget</span><span style="font-size:13px;font-weight:500">${money(D.envelopeMonthly())}</span></button>
    <button class="glass pill row tap" style="display:flex" data-go="lists"><span class="l">Things to do together</span><span style="font-size:13px;font-weight:500">${(() => { const n = D.listItems().filter(i => !i.done).length; return n ? n + ' on the list ›' : 'start a list ›'; })()}</span></button>
    <div class="l">Recent memories</div>
    <div class="feed" style="margin-top:-8px">${recent.length ? recent.map(momentRow).join('') : '<div class="empty">Nothing yet. Tap + to add a moment.</div>'}</div>
  </div><button class="fab" data-act="homeAdd">+</button>${nav('home')}`;
  [L,R].forEach(u => u && weather(u).then(w => { const el = $('#wx-' + u.id); if (el && w) el.innerHTML = wx(w.icon); }));
}
function momentRow(m){
  const ph = m.photos && m.photos[0];
  return `<button class="mo" data-go="day/${m.tripId ? m.tripId + '_' + m.date : 'none_' + m.date}"><div class="th">${ph ? `<img ${pvAttr(ph)} alt="">` : ''}</div><div><div class="t">${esc(m.text || m.title || (D.voices(m).length ? 'Voice note' : D.songs(m).length ? (D.songs(m)[0].title || 'A song') : D.videos(m).length ? (D.videos(m)[0].title || 'A video') : (m.photos||[]).length ? 'Photo' : D.costLines(m).length ? (D.costLines(m)[0].label || 'A cost') : 'Memory'))}</div><div class="m l">${fmtD(m.date)}${m.tripId && D.trip(m.tripId) ? ' · ' + esc(D.trip(m.tripId).city) : ''} · ${palOf(m.authorId)}${D.costTotal(m) ? ' ' + money(D.costTotal(m)) : ''}${D.voices(m).length ? ' ' + D.voices(m).map(v => fmtDur(v.dur)).join(' · ') : ''}</div></div></button>`;
}
const ordinal = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const fmtDur = s => s ? Math.floor(s/60) + ':' + String(Math.round(s%60)).padStart(2,'0') : '';
function flightCard(m){
  const f = m.flight; const live = m.live;
  return `<div class="glass"><div class="row"><span class="l">${esc(f.no||'Flight')} · ${esc(f.from||'')} → ${esc(f.to||'')}</span><span class="chip on" style="font-size:10.5px;padding:3px 9px">${esc(live ? live.status : 'Scheduled')}</span></div>
  <div class="row" style="margin-top:8px"><span class="num" style="font-size:24px">${esc(f.arr||'')}</span><span class="l">lands${live && live.gate ? ' · gate ' + esc(live.gate) : ''}</span></div>
  <div class="row" style="margin-top:6px"><span class="l">Departs ${esc(f.dep||'')}</span><span class="l">${palOf(m.authorId)} flies</span></div></div>`;
}
ACT.bubble = uid => {
  const me = D.me(); if (uid !== me.id) { const b = D.latestBubble(uid); const u = D.user(uid); return toast(b ? `${u.name} ${b.kind==='say'?'says':'is thinking'}: ${b.text}` : `${u ? u.name : 'They'} hasn't said anything today`); }
  let kind = 'say';
  const chips = { say:['good morning','miss you','call me','♡','night night'], think:['want chocolate','sleepy','thinking of you','hungry','bored'] };
  if (D.isMonthiversary(today())) { const n = D.monthsSince(today()); chips.say.unshift('happy ' + n + ' month' + (n===1?'':'s'), '♡ ' + n); chips.think.unshift('♡ ' + n); }
  // Say · Think · Photo — a photo goes to Chat like any message, with an optional caption
  let pending = [];
  const draw = () => `<div class="bar"><button data-act="closeSheet">Close</button><span>${palOf(me.id)} ${esc(me.name)}</span></div><h2 class="hd md" style="margin:0">${kind === 'photo' ? 'Send a photo' : 'Say or think'}</h2>
    <div class="seg"><button class="${kind==='say'?'on':''}" data-act="bubKind|say">Say</button><button class="${kind==='think'?'on':''}" data-act="bubKind|think">Think</button><button class="${kind==='photo'?'on':''}" data-act="bubKind|photo">Photo</button></div>
    ${kind === 'photo' ? `${pending.length ? `<div class="thumbs">${pending.map((p, i) => `<div class="th"><img src="${p.url}" alt=""><button class="x" data-act="bubRmPh|${i}" aria-label="Remove">✕</button></div>`).join('')}</div>` : ''}
      <button class="btn lite block" data-act="bubPhoto">◫ ${pending.length ? 'Add another' : 'Take or choose a photo'}</button>
      <input id="bub-text" class="in" placeholder="Add a caption (optional)" value="${esc(caption)}">
      <div class="row"><button class="chip" data-act="chatStk">☺ Send a sticker instead</button><button class="btn sm" data-act="bubSendPh" ${pending.length ? '' : 'disabled'}>Send</button></div>`
    : `<div class="bub ${kind}" style="position:relative;left:0;top:0;align-self:flex-start;font-size:15px;padding:10px 16px;margin-top:4px;max-width:100%"><input id="bub-text" class="in" style="background:transparent;border:0;padding:0;font-size:15px;width:180px" placeholder="${kind==='say'?'say something':'what are you thinking?'}" value="${esc(caption)}"></div>
    <div class="chips">${chips[kind].map(c => `<button class="chip" data-act="bubChip|${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><button class="chip" data-act="chatStk">☺ Sticker</button><button class="btn sm" data-act="bubSend">Send</button></div>`}
    <div class="l">Shows on Home for a day, and stays in Chat</div><input type="file" id="bub-file" accept="image/*" multiple hidden data-act="bubFiles" data-on="change">`;
  let caption = '';
  const keepCap = () => { const el = $('#bub-text'); if (el) caption = el.value; };
  ACT.bubKind = k => { keepCap(); kind = k; openSheet(draw(), () => { if (k !== 'photo') $('#bub-text').focus(); }); };
  ACT.bubChip = c => { $('#bub-text').value = c; };
  ACT.bubPhoto = () => { keepCap(); $('#bub-file').click(); };
  ACT.bubFiles = (a, el) => { keepCap(); Array.from(el.files || []).forEach(f => pending.push({ file: f, url: URL.createObjectURL(f) })); kind = 'photo'; openSheet(draw()); };
  ACT.bubRmPh = i => { keepCap(); pending.splice(+i, 1); openSheet(draw()); };
  ACT.bubSendPh = async () => { keepCap(); if (!pending.length) return; const text = caption.trim(); toast(pending.length === 1 ? 'Sending…' : 'Sending ' + pending.length + ' photos…');
    for (const [i, p] of pending.entries()) { const ph = await storePhoto(p.file); await Store.put('bubbles', { id: Store.uid(), userId: me.id, kind: 'say', photo: ph.asset, thumb: ph.thumb, text: i === 0 && text ? text : '📷 Photo', auto: !(i === 0 && text), at: Date.now() + i }); }
    pending = []; closeSheet(); render(); toast('Sent'); };
  ACT.bubSend = async () => { const text = $('#bub-text').value.trim(); if (!text) return; await Store.put('bubbles', { id: Store.uid(), userId: me.id, kind, text, at: Date.now() }); closeSheet(); render(); };
  openSheet(draw(), () => $('#bub-text').focus());
};
ACT.closeSheet = () => closeSheet();

// ---------- trips ----------
let tripsTab = null;
function renderTrips(app){
  const t0 = today(); const now = D.trips().filter(t => t.start <= t0 && t.end >= t0), up = D.trips().filter(t => t.start > t0), past = D.trips().filter(t => t.end < t0).reverse();
  const yearOf = t => t.start.slice(0,4);
  // the trip you're on gets its own tab, and opens first
  if (!tripsTab || (tripsTab === 'now' && !now.length)) tripsTab = now.length ? 'now' : 'upcoming';
  let body;
  if (tripsTab === 'now') {
    body = now.map(t => { const n = daysBetween(t.start, t.end) + 1, d = daysBetween(t.start, t0) + 1; const ms = D.tripMoments(t.id).filter(m => m.kind === 'moment'); const td = D.tripMoments(t.id).filter(m => m.date === t0 && m.kind !== 'booking');
      return `<div class="l">Happening now</div><button class="glass tap" style="margin-top:-6px" data-go="trip/${t.id}"><div class="row"><span style="font-size:22px;font-weight:500;letter-spacing:-.02em">${esc(t.city)}</span><span class="chip on" style="font-size:10.5px;padding:3px 9px">Day ${d} of ${n}</span></div><div class="sub" style="text-align:left">${fmtD(t.start)} – ${fmtD(t.end)} · ${ms.length} memor${ms.length === 1 ? 'y' : 'ies'} so far</div><div class="tripbar"><i style="width:${Math.round(d / n * 100)}%"></i></div></button>
        <div class="tiles"><button data-go="day/${t.id}_${t0}"><b>Today</b><span>${td.length ? td.length + ' thing' + (td.length === 1 ? '' : 's') : 'add something'}</span></button><button data-go="days/${t.id}"><b>Days</b><span>${n} days</span></button><button data-go="budget/${t.id}"><b>Budget</b><span>${money(D.tripCost(t).total)}</span></button></div>
        <div class="list" style="font-size:13.5px;margin-top:-4px"><button class="row" data-act="importStart|${t.id}"><span>Import photos</span><span class="l">sorts them into days ›</span></button></div>`; }).join('')
      + (up[0] ? `<div class="l mt-auto">Up next</div><div class="list" style="margin-top:-6px"><button class="row" data-go="trip/${up[0].id}"><div style="text-align:left"><div style="font-weight:500">${esc(up[0].city)}</div><div class="l">${fmtD(up[0].start)} – ${fmtD(up[0].end)}</div></div><span class="l">${daysBetween(t0, up[0].start)} days ›</span></button></div>` : '');
  } else if (tripsTab === 'upcoming') {
    const first = up[0];
    body = `${first ? `<div class="l">Up next</div><button class="glass tap" style="margin-top:-6px" data-go="trip/${first.id}">${tripHero(first)}</button>` : '<div class="empty">No upcoming trip. Add one with +</div>'}
      ${up.length > 1 ? `<div class="list">${up.slice(1).map(t => `<button class="row" data-go="trip/${t.id}"><div style="text-align:left"><div style="font-weight:500">${esc(t.city)}</div><div class="l">${fmtD(t.start)} – ${fmtD(t.end)}</div></div><span class="l">${t.flyer ? palOf(t.flyer) + ' flies' : ''}</span></button>`).join('')}</div>` : ''}
      ${past.length ? `<div class="l mt-auto">Recent</div><div class="covers" style="margin-top:-6px">${past.slice(0,2).map(t => cover(t)).join('')}</div>` : ''}`;
  } else {
    let y = ''; body = past.length ? past.map(t => { const h = yearOf(t) !== y ? `<div class="l" style="margin-top:6px">${y = yearOf(t)}</div>` : ''; const c = D.tripCost(t); const n = D.tripMoments(t.id).filter(m => m.kind !== 'booking').length; return h + `<button class="row" style="padding:8px 0;border-bottom:1px solid var(--ln)" data-go="trip/${t.id}"><div class="th" data-asset="${coverAsset(t)||''}" style="background-size:cover"></div><div style="flex:1;text-align:left"><div style="font-weight:500">${esc(t.city)}</div><div class="l">${fmtD(t.start)} – ${fmtD(t.end)} · ${n} moments${t.imported ? ' · imported' : ''}</div></div><span class="l">${money(c.total)}</span></button>`; }).join('') : '<div class="empty">No past trips yet.</div>';
    body += `<button class="btn lite block mt-auto" data-act="addTrip|past">Add a past trip</button>`;
  }
  app.innerHTML = `<div class="screen" style="min-height:calc(100vh - 160px)"><div class="bar"><h1 class="hd" style="font-size:32px">Trips</h1><button class="plus" data-act="tripAdd">+</button></div>
    <div class="seg">${now.length ? `<button class="${tripsTab==='now'?'on':''}" data-act="tripsTab|now">Now</button>` : ''}<button class="${tripsTab==='upcoming'?'on':''}" data-act="tripsTab|upcoming">Upcoming</button><button class="${tripsTab==='past'?'on':''}" data-act="tripsTab|past">Past</button></div>${body}</div>${nav('trips')}`;
}
ACT.tripsTab = t => { tripsTab = t; render(); };
// a new trip: type the city and dates, or let a flight itinerary fill them in
const rowBtn = (act, title, sub) => `<button class="row" data-act="${act}"><span style="text-align:left"><div style="font-weight:500;font-size:15px">${title}</div><div class="l">${sub}</div></span><span class="l">›</span></button>`;
ACT.tripAdd = () => openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>New trip</span></div><h2 class="hd md" style="margin:0">New trip</h2><div class="list" style="font-size:13.5px">${rowBtn('tripAddPlain', 'Plan a trip', 'City and dates')}${rowBtn('bookingSheet|newTrip', 'From a booking', 'Upload a flight itinerary — the trip is made from it')}</div>`);
ACT.tripAddPlain = () => { closeSheet(); ACT.addTrip('new'); };
function tripHero(t){ const c = D.tripCost(t), p = D.planTotal(t); const d = daysBetween(today(), t.start); const [a, b] = D.users2(); return `<div class="row"><span style="font-size:22px;font-weight:500;letter-spacing:-.02em">${esc(t.city)}</span><span class="l">${d > 0 ? d + ' days' : d === 0 ? 'today' : 'now'}</span></div><div class="sub" style="text-align:left">${fmtD(t.start)} – ${fmtD(t.end)}${t.flyer ? ' · ' + palOf(t.flyer) + ' flies' : ''}</div><div class="row" style="margin-top:12px"><span class="num" style="font-size:24px">${money(c.total)}</span><span class="l">of ~${money(p)}</span></div>${splitBar(c, p, a, b)}`; }
function splitBar(c, total, a, b){ const T = Math.max(total, c.total, 1); return `<div class="split"><i class="a" style="width:${(c.by[a&&a.id]||0)/T*100}%"></i><i class="b" style="width:${(c.by[b&&b.id]||0)/T*100}%"></i></div>`; }
function coverAsset(t){ const m = D.tripMoments(t.id).find(m => m.photos && m.photos.length); return m ? (t.cover || m.photos[0].asset) : null; }
function cover(t){ return `<button data-go="trip/${t.id}" data-asset="${coverAsset(t)||''}"><span>${esc(t.city)} · ${MON[parseDate(t.start).getMonth()]}</span></button>`; }
ACT.addTrip = mode => {
  const users = D.users();
  openSheet(`<div class="bar"><button data-act="closeSheet">Cancel</button><span>${mode==='past'?'Past trip':'New trip'}</span></div><h2 class="hd md" style="margin:0">${mode==='past'?'Add a past trip':'Where to?'}</h2>
    <input class="in big" id="t-city" placeholder="City">
    <div class="row"><div class="field" style="flex:1"><label>From</label><input class="in" type="date" id="t-start" value="${today()}"></div><div class="field" style="flex:1"><label>To</label><input class="in" type="date" id="t-end" value="${addDays(today(),4)}"></div></div>
    <div class="field"><label>Who flies</label><div class="seg">${users.map((u,i) => `<button class="${i===0?'on':''}" data-act="segPick|tFlyer,${u.id}" data-seg="tFlyer" data-val="${u.id}">${esc(u.name)}</button>`).join('')}</div></div>
    ${mode==='past' ? `<div class="l">Rough costs, from memory</div><div class="row"><input class="in" type="number" id="t-flight" placeholder="Flight $"><input class="in" type="number" id="t-stay" placeholder="Stay $"><input class="in" type="number" id="t-rest" placeholder="Everything else $"></div><div class="sub">You can add photos to the days after.</div>` : ''}
    <button class="btn block" data-act="saveTrip|${mode}">Save</button>`, sh => sh.dataset['tFlyer'] = users[0] ? users[0].id : '');
};
ACT.segPick = (arg, el) => { const [key, val] = arg.split(','); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); sheet.sh.dataset[key] = val; };
ACT.saveTrip = async mode => {
  const city = $('#t-city').value.trim(), start = $('#t-start').value, end = $('#t-end').value; if (!city || !start || !end || end < start) return toast('City and dates, please');
  const t = await Store.put('trips', { id: Store.uid(), city, start, end, flyer: sheet.sh.dataset['tFlyer'], imported: mode === 'past', createdAt: Date.now() });
  if (mode === 'past') { const me = D.me().id; const add = async (tag, amt, text) => { if (+amt) await Store.put('moments', { id: Store.uid(), tripId: t.id, date: start, authorId: me, kind: 'booking', text, cost: { amount: +amt, paidBy: me, tag }, createdAt: Date.now() }); }; await add('flight', $('#t-flight').value, 'Flight'); await add('stay', $('#t-stay').value, 'Stay'); await add('other', $('#t-rest').value, 'Everything else'); }
  closeSheet(); go('trip', { id: t.id });
};
function renderTrip(app){
  const t = D.trip(route.id); if (!t) return go('trips');
  const ms = D.tripMoments(t.id), c = D.tripCost(t), p = D.planTotal(t);
  const nPhotos = ms.reduce((s, m) => s + (m.photos||[]).length, 0), mm = ms.filter(m => m.kind === 'moment');
  const nDays = daysBetween(t.start, t.end) + 1, dayN = daysBetween(t.start, today()) + 1;
  const stage = today() < t.start ? `${daysBetween(today(), t.start)} days away` : today() > t.end ? 'Done' : `Day ${dayN} of ${nDays}`;
  if (tlAsc == null || tlFor !== t.id) { tlFor = t.id; tlAsc = today() < t.start; }
  const listN = D.listItems().filter(i => !i.done && i.city && cityKey(i.city) === cityKey(t.city)).length;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trips">‹ Trips</button><span>${stage}</span></div><h1 class="hd">${esc(t.city)}</h1><div class="sub" style="margin-top:-6px;text-align:left">${fmtD(t.start)} – ${fmtD(t.end)} · ${mm.length} memor${mm.length === 1 ? 'y' : 'ies'} · ${nPhotos} photo${nPhotos === 1 ? '' : 's'}</div>
    <div class="tiles tchips"><button data-go="budget/${t.id}"><b>Budget</b><span>${money(c.total)} of ~${money(p)}</span></button><button data-go="photos/${t.id}"><b>Photos</b><span>${nPhotos}</span></button><button data-go="days/${t.id}"><b>Days</b><span>${nDays} days</span></button><button data-act="importStart|${t.id}"><b>Import</b><span>photos</span></button></div>
    <div class="secthd"><span class="hd md">Our days</span><span style="display:flex;gap:10px;align-items:center"><button class="l" data-act="tlOrder">${tlAsc ? 'first day first' : 'newest first'} ⇅</button><button class="plus" style="width:30px;height:30px;font-size:19px" data-act="newMoment|${t.id}" aria-label="Add a memory">+</button></span></div>
    ${timelineHTML(t, tlAsc, false)}
    <div class="list" style="font-size:13.5px">${listN ? `<button class="row" data-go="list/city~${encodeURIComponent(t.city)}"><span>On your list for ${esc(t.city)}</span><span class="l">${listN} ›</span></button>` : ''}<button class="row" data-go="emails/${t.id}"><span>Add a booking from an email</span><span class="l">›</span></button><button class="row" data-act="exportTrip|${t.id}"><span>Export</span><span class="l">›</span></button><button class="row" data-act="editTrip|${t.id}"><span>Edit trip</span><span class="l">›</span></button></div>
  </div>${nav('trips')}`;
}
let tlAsc = null, tlFor = null;
ACT.tlOrder = () => { tlAsc = !tlAsc; render(); };
// the trip as a timeline: each day's date on the left, its memories (with a strip of photos), flights and plans on the right
function timelineHTML(t, asc, all){
  const ms = D.tripMoments(t.id); const n = daysBetween(t.start, t.end); const td = today(); let out = '';
  const idx = Array.from({ length: n + 1 }, (_, i) => i); if (!asc) idx.reverse();
  for (const i of idx) { const d = addDays(t.start, i); const dm = ms.filter(m => m.date === d); const dn = parseDate(d);
    const items = dm.map(m => {
      if (m.flight) return `<button class="tm" data-go="day/${t.id}_${d}"><div class="t">${palOf(m.flight.who || m.authorId)}${esc(flightLabel(m))} ✈</div><div class="m">${esc(m.flight.no || '')} · ${esc(m.flight.from || '')} → ${esc(m.flight.to || '')}</div></button>`;
      if (m.kind === 'plan') return `<button class="tplan" data-go="day/${t.id}_${d}">${esc(m.title || m.text)}${m.time ? ' · ' + hhmm(m.time) : ''} · ${d < td ? 'plan' : 'planned'}</button>`;
      if (m.kind === 'booking') return `<button class="tplan" data-go="day/${t.id}_${d}">${esc(m.text || 'Booking')}${D.costTotal(m) ? ' · ' + money(D.costTotal(m)) : ''}</button>`;
      const ph = m.photos || []; const title = m.text || (D.songs(m)[0] || {}).title || (D.videos(m)[0] || {}).title || (D.voices(m).length ? 'Voice note' : ph.length ? 'Photos' : 'Memory');
      const meta = [m.time ? hhmm(m.time) : '', m.place && (m.place.name || m.place.area) ? '📍 ' + esc(m.place.name || m.place.area) : '', D.costTotal(m) ? money(D.costTotal(m)) : '', D.notes(m.id).length ? '✎ ' + D.notes(m.id).length : ''].filter(Boolean).join(' · ');
      const strip = ph.length ? `<div class="strip">${ph.slice(0, 4).map((p, j) => `<i ${pvAttr(p)}></i>`).join('')}${ph.length > 4 ? `<i class="more" data-n="+${ph.length - 4}" ${pvAttr(ph[4])}></i>` : ''}</div>` : '';
      return `<button class="tm" data-go="day/${t.id}_${d}"><div class="t">${palOf(m.authorId)}${esc(title)}</div>${meta ? `<div class="m">${meta}</div>` : ''}${strip}</button>`; });
    const isToday = d === td;
    if (!items.length) { if (!all && d > td) continue; out += `<div class="tday empty ${isToday ? 'today' : ''}"><button class="dn" data-go="day/${t.id}_${d}"><b>${dn.getDate()}</b><span>${DOW[dn.getDay()]}</span></button><div class="ms"><span>${isToday ? 'today · nothing yet' : 'nothing yet'}</span><button class="l" data-act="newMoment|${t.id},${d}">+ add</button></div></div>`; continue; }
    out += `<div class="tday ${isToday ? 'today' : ''}"><button class="dn" data-go="day/${t.id}_${d}"><b>${dn.getDate()}</b><span>${DOW[dn.getDay()]}</span></button><div class="ms">${items.join('')}</div></div>`; }
  return `<div class="tl days">${out || '<div class="empty">Nothing yet — tap + to add the first memory.</div>'}</div>`;
}
function renderDays(app){
  const t = D.trip(route.id); if (!t) return go('trips'); const c = D.tripCost(t);
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${fmtD(t.start)} – ${fmtD(t.end)}</span></div><h1 class="hd">Days</h1>${timelineHTML(t, true, true)}<div class="glass row mt-auto"><span class="l">So far</span><span class="num" style="font-size:20px">${money(c.total)}</span></div></div>${nav('trips')}`;
}
ACT.editTrip = id => { const t = D.trip(id); const users = D.users(); openSheet(`<div class="bar"><button data-act="closeSheet">Cancel</button><span>Edit</span></div><input class="in big" id="t-city" value="${esc(t.city)}"><div class="row"><input class="in" type="date" id="t-start" value="${t.start}"><input class="in" type="date" id="t-end" value="${t.end}"></div><div class="seg">${users.map(u => `<button class="${u.id===t.flyer?'on':''}" data-act="segPick|tFlyer,${u.id}">${esc(u.name)}</button>`).join('')}</div><div class="row"><button class="btn lite" data-act="deleteTrip|${id}">Delete trip</button><button class="btn" data-act="updateTrip|${id}">Save</button></div>`, sh => sh.dataset['tFlyer'] = t.flyer || ''); };
ACT.updateTrip = async id => { const t = D.trip(id); Object.assign(t, { city: $('#t-city').value.trim(), start: $('#t-start').value, end: $('#t-end').value, flyer: sheet.sh.dataset['tFlyer'] }); await Store.put('trips', t); closeSheet(); render(); };
ACT.deleteTrip = async id => { if (!await ask('Delete this trip and its moments?', { ok: 'Delete' })) return; for (const m of D.tripMoments(id)) await Store.remove(m.id); await Store.remove(id); closeSheet(); toast('Trip deleted'); go('trips'); };
// "Des lands 4:10 pm" / "Des flies home 9:00 am" for a flight booking, judged against the other flights in its trip
function payerPals(c){ c = c || {}; if (c.paidBy === 'both') return `<span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span>`; return palOf(c.paidBy); }
// A trip is a visit: the first flight in it "lands", the last one "flies home".
// Connecting legs on the same day: only the final arrival / first departure gets the label.
function flightInfo(m){
  const t = m.tripId ? D.trip(m.tripId) : null;
  const all = (t ? D.tripMoments(t.id) : [m]).filter(x => x.flight).sort((a,b) => (a.date + String(a.createdAt||0).padStart(15,'0')).localeCompare(b.date + String(b.createdAt||0).padStart(15,'0')));
  const flyer = D.user(m.flight.who || (t && t.flyer) || (m.cost && m.cost.paidBy) || m.authorId) || {}; const who = flyer.name || '';
  const firstDate = all[0] ? all[0].date : m.date, lastDate = all.length ? all[all.length-1].date : m.date;
  const day = all.filter(x => x.date === m.date); const isLastOfDay = day[day.length-1] === m || day[day.length-1].id === m.id; const isFirstOfDay = day[0] === m || day[0].id === m.id;
  let kind;
  if (firstDate === lastDate) { const home = t && daysBetween(t.start, m.date) > daysBetween(m.date, t.end); kind = home ? (isFirstOfDay ? 'home' : 'flies') : (isLastOfDay ? 'lands' : 'flies'); }
  else if (m.date === firstDate) kind = isLastOfDay ? 'lands' : 'flies';
  else if (m.date === lastDate) kind = isFirstOfDay ? 'home' : 'flies';
  else kind = 'flies';
  const time = (kind === 'lands' ? m.flight.arr : m.flight.dep) || '';
  const text = m.flight.title ? m.flight.title : kind === 'lands' ? `${who} lands` : kind === 'home' ? `${who} flies home` : `${who} flies ${m.flight.from||''} → ${m.flight.to||''}`;
  return { kind, out: kind === 'lands', who, time, text };
}
function flightLabel(m){ const f = flightInfo(m); return `${f.text} ${f.time}`.trim(); }
function renderBudget(app){
  const t = D.trip(route.id); if (!t) return go('trips'); const c = D.tripCost(t), plan = D.tripPlan(t), P = D.planTotal(t); const [a, b] = D.users2(); const cats = D.cats(t); const occ = !!t.occasion;
  const bdayFor = occ && t.kind === 'birthday' ? D.user(t.forUser) : null; const myPresent = bdayFor && Store.all('presents').find(p => p.fromUser === D.me().id && p.forUser === bdayFor.id && p.date === t.bday);
  app.innerHTML = `<div class="screen"><div class="bar">${occ ? `<button data-go="between">‹ Between visits</button>` : `<button data-go="trip/${t.id}">‹ ${esc(t.city)}</button>`}<span>${fmtD(t.start)}${t.end !== t.start ? ' – ' + fmtD(t.end) : ''}</span></div><h1 class="hd">${occ ? esc(t.city) : 'Budget'}</h1>${occ ? `<div class="l" style="margin-top:-10px">Occasion${t.secret ? ' · hidden from ' + esc((D.other()||{}).name||'them') : ''}</div>` : ''}
    <div class="glass"><div class="row"><div><div class="l">Actual</div><div class="num">${money(c.total)}</div></div><div style="text-align:right"><div class="l">Planned</div><div class="num" style="color:var(--mu)">${money(P)}</div></div></div></div>
    <div class="colhead"><span class="bcol"></span><span class="bamt">Actual</span><span class="bamt">Planned</span></div>
    <div class="list" style="margin-top:-10px">${cats.concat(D.strayLines(t).length ? [{ key: 'other', label: 'Other' }] : []).map(cat => { const ls = cat.key === 'other' && !D.cats(t).some(c => c.key === 'other') ? D.strayLines(t) : D.tripLines(t).filter(c => (c.tag||'other') === cat.key); const byA = ls.reduce((s,c)=>s+D.shareOf(c, a.id),0), byB = ls.reduce((s,c)=>s+D.shareOf(c, b.id),0); return `<button class="row" data-go="cat/${t.id}_${cat.key}"><span>${esc(cat.label)}</span><span style="display:flex;gap:14px;align-items:center"><span class="bcol">${byA?`<i class="pal ${a.pal}"></i>`:''}${byB?`<i class="pal ${b.pal}"></i>`:''}</span><span class="bamt">${byA+byB ? money(byA+byB) : '<span class="l">—</span>'}</span><span class="bamt l">${money(plan[cat.key]||0)}</span></span></button>`; }).join('')}</div>
    <button class="row" style="font-size:13.5px;color:var(--mu)" data-act="catAdd|${t.id}"><span>+ Add a category</span><span></span></button>
    ${(t.hidden||[]).length && Array.isArray(t.hidden) ? `<div class="row" style="font-size:12.5px;justify-content:flex-start;gap:6px;flex-wrap:wrap"><span class="l">Removed:</span>${t.hidden.map(k => `<button class="chip" style="font-size:11px" data-act="catRestore|${t.id},${k}">${esc((CATS.concat(OCC_CATS).find(c => c[0] === k)||[k,k])[1])} ↺</button>`).join('')}</div>` : ''}
    ${bdayFor ? `<button class="row" style="font-size:13.5px" data-act="presentFor|${bdayFor.id},${t.bday}"><span>${esc(bdayFor.name)}'s present</span><span class="l">${myPresent ? 'wrapped · opens ' + fmtD(t.bday) : 'wrap one'} ›</span></button>` : ''}
    ${occ ? `<button class="row" style="font-size:13.5px" data-act="newMoment|${t.id},${t.start > today() ? t.start : (t.end < today() ? t.end : today())}"><span>+ Add a cost</span><span class="l">›</span></button><button class="row" style="font-size:13.5px" data-act="occEdit|${t.id}"><span>Edit occasion</span><span class="l">›</span></button>` : ''}
    <button class="row" style="font-size:13.5px" data-act="exportXlsx|${t.id}"><span>Export to Excel</span><span class="l">›</span></button></div>${nav(occ ? '' : 'trips')}`;
}
function renderCategory(app){
  const [tripId, key] = route.id.slice(0, route.id.lastIndexOf('_')) ? [route.id.slice(0, route.id.indexOf('_')), route.id.slice(route.id.indexOf('_') + 1)] : route.id.split('_'); const t = D.trip(tripId); if (!t) return go('trips'); const label = D.catLabel(t, key); const plan = D.tripPlan(t);
  const ms = (key === 'other' && !D.cats(t).some(c => c.key === 'other') ? D.strayLines(t) : D.tripLines(t).filter(c => (c.tag||'other') === key)).sort((x,y) => y.m.date.localeCompare(x.m.date)); const total = ms.reduce((s,c) => s + +c.amount, 0);
  const byDay = {}; ms.forEach(c => (byDay[c.m.date] = byDay[c.m.date] || []).push(c));
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="budget/${t.id}">‹ Budget</button><span>${esc(t.city)}</span></div><h1 class="hd">${esc(label)}</h1>
    <div class="glass"><div class="row"><div><div class="l">Actual</div><div class="num">${money(total)}</div></div><div style="text-align:right"><div class="l">Planned</div><div class="num" style="color:var(--mu)">${money(plan[key]||0)}</div></div></div>
      ${(() => { const c = D.planCfg(t, key); const [a, b] = D.users2(); const units = D.planUnits(t, key); const unit = key === 'stay' ? 'night' : 'day'; const inp = (id, v) => `<input class="in" type="number" inputmode="decimal" id="pl-${id}" data-act="planCfgEdit|${t.id},${key}" data-on="change" value="${v||''}" placeholder="0" style="width:74px;padding:6px 8px;font-size:13px;text-align:right">`; return `<div class="row" style="margin-top:12px;gap:8px"><div class="seg" style="width:150px"><button class="${c.mode==='total'?'on':''}" data-act="planCfgSet|${t.id},${key},mode,total">Total</button><button class="${c.mode==='day'?'on':''}" data-act="planCfgSet|${t.id},${key},mode,day">Per ${unit}</button></div><div class="seg" style="width:120px"><button class="${c.who==='both'?'on':''}" data-act="planCfgSet|${t.id},${key},who,both">Both</button><button class="${c.who==='each'?'on':''}" data-act="planCfgSet|${t.id},${key},who,each">Each</button></div></div><div class="row" style="margin-top:8px"><span class="l">${c.mode==='day' ? `$${c.who==='each' ? ((+c.a||0)+(+c.b||0)) : (+c.a||0)}/${unit}${c.who==='each' ? ' together' : ''} · ${units} ${unit}${units===1?'':'s'}` : c.who==='each' ? 'together' : ''}</span><span style="display:flex;gap:6px;align-items:center">${c.who==='each' ? `<i class="pal ${a.pal}"></i>${inp('a', c.a)}<i class="pal ${b.pal}" style="margin-left:4px"></i>${inp('b', c.b)}` : `$${inp('a', c.a)}`}</span></div></div>`; })()}
    ${t.occasion ? '' : `<div class="list" style="font-size:13.5px;margin-top:-4px"><button class="row" data-go="emails/${t.id}"><span>Add a booking from an email</span><span class="l">›</span></button></div>`}
    ${Object.keys(byDay).map(d => `<div class="l">${fmtD(d)}</div><div class="list" style="margin-top:-8px">${byDay[d].map(c => `<div class="row"><button style="flex:1;display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left" data-act="${c.m.flight ? 'editFlight' : 'editMoment'}|${c.m.id}"><div style="text-align:left"><div style="font-weight:500">${esc(c.label || (c.m.flight ? flightLabel(c.m) : '') || c.m.text || c.m.title || 'Memory')}</div><div class="l">${payerPals(c)} ${esc(D.payerTextC(c))}${c.label && c.m.text ? ' · ' + esc(c.m.text) : ''}</div></div><span>${money2(c.amount)}</span></button><button class="l" style="padding:6px 2px 6px 12px" data-act="lineDelete|${c.m.id},${c.i}" aria-label="Delete">✕</button></div>`).join('')}</div>`).join('') || '<div class="empty">Nothing here yet.</div>'}
    <div class="row"><span class="l">${ms.length} item${ms.length===1?'':'s'}</span><button class="btn sm" data-act="newMomentCat|${t.id},${key}">+ Add</button></div>
    ${key === 'other' && !D.cats(t).some(c => c.key === 'other') ? '' : `<div class="list mt-auto" style="font-size:13.5px"><button class="row" data-act="catRename|${t.id},${key}"><span>Rename this category</span><span class="l">›</span></button><button class="row" data-act="catRemove|${t.id},${key}"><span class="muted">Remove the “${esc(label)}” category</span><span class="l">›</span></button></div>`}
  </div>${nav('trips')}`;
}
function lineDesc(c){ return [c.label || (c.m.flight ? flightLabel(c.m) : c.m.text || c.m.title), fmtD(c.m.date), money2(c.amount)].filter(Boolean).join(' · '); }
// delete one cost: a flight goes entirely (like "Delete flight"), a booking with nothing else goes, otherwise just that cost line
async function dropLine(m, i, list){ if (m.flight || (i < 0 && m.kind === 'booking')) { list.remove.push(m.id); return; } const x = list.put.find(y => y.id === m.id) || JSON.parse(JSON.stringify(Store.get('moments', m.id))); if (i < 0) x.cost = null; else x.items = (x.items||[]).filter((_, j) => j !== i); if (!list.put.includes(x)) list.put.push(x); }
ACT.lineDelete = async arg => { const [mid, i] = arg.split(','); const m = Store.get('moments', mid); if (!m) return; const c = D.costLines(m).find(x => String(x.i) === i); if (!c) return;
  if (!await ask(m.flight ? 'Delete this flight?' : 'Delete this cost?', { sub: lineDesc(c) + (m.flight ? ' — the flight and its cost are removed.' : ''), ok: 'Delete' })) return;
  const list = { put: [], remove: [] }; await dropLine(m, +i, list); await Store.putMany('moments', list.put); await Store.removeMany(list.remove); toast('Deleted'); render(); };
ACT.catRestore = async arg => { const [id, key] = arg.split(','); const t = D.trip(id); t.hidden = (Array.isArray(t.hidden) ? t.hidden : []).filter(k => k !== key); await Store.put('trips', t); render(); };
ACT.catAdd = async id => { const t = D.trip(id); const name = await ask('Name the category', { input: '', ok: 'Add' }); if (!name) return; const key = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_'); t.cats = (t.cats||[]).filter(c => c.key !== key).concat([{ key, label: name }]); await Store.put('trips', t); render(); };
ACT.catRename = async arg => { const [id, key] = arg.split(','); const t = D.trip(id); const name = await ask('Rename', { input: D.catLabel(t, key), ok: 'Save' }); if (!name) return; const c = (t.cats||[]).find(c => c.key === key); if (c) c.label = name; else { t.catNames = Object.assign({}, t.catNames, { [key]: name }); } await Store.put('trips', t); render(); };
ACT.catRemove = async arg => { const [id, key] = arg.split(','); const t = D.trip(id); const label = D.catLabel(t, key); const ls = D.tripLines(t).filter(c => c.tag === key);
  const finish = async () => { if ((t.cats||[]).some(c => c.key === key)) t.cats = t.cats.filter(c => c.key !== key); else t.hidden = (Array.isArray(t.hidden) ? t.hidden : []).concat([key]); await Store.put('trips', t); closeSheet(); go('budget', { id }); };
  if (!ls.length) { if (await ask('Remove the “' + label + '” category?', { sub: 'You can bring it back any time.', ok: 'Remove' })) await finish(); return; }
  const total = ls.reduce((a, c) => a + +c.amount, 0); const others = D.cats(t).filter(c => c.key !== key);
  openSheet(`<div class="bar"><button data-act="closeSheet">Cancel</button><span>Remove category</span></div><h2 class="hd md" style="margin:0">“${esc(label)}” has ${ls.length} cost${ls.length===1?'':'s'}</h2><div class="sub">${money2(total)} · what should happen to ${ls.length === 1 ? 'it' : 'them'}?</div>
    <div class="l" style="margin-top:6px">Move to</div><div class="chips">${others.map(c => `<button class="chip" data-act="catMoveTo|${c.key}">${esc(c.label)}</button>`).join('')}</div>
    <div class="list" style="font-size:13.5px;margin-top:6px"><button class="row" data-act="catDelAll"><span class="muted">Delete ${ls.length === 1 ? 'it' : 'them'} too${ls.some(c => c.m.flight) ? ' (and the flight' + (ls.filter(c => c.m.flight).length > 1 ? 's' : '') + ')' : ''}</span><span class="l">›</span></button></div>`);
  ACT.catMoveTo = async to => { const put = {}; ls.forEach(c => { const x = put[c.m.id] || (put[c.m.id] = JSON.parse(JSON.stringify(Store.get('moments', c.m.id)))); if (c.i < 0) x.cost.tag = to; else x.items[c.i].tag = to; }); await Store.putMany('moments', Object.values(put)); toast('Moved to ' + D.catLabel(t, to)); await finish(); };
  ACT.catDelAll = async () => { if (!await ask('Delete ' + ls.length + ' cost' + (ls.length===1?'':'s') + ' (' + money2(total) + ')?', { sub: ls.some(c => c.m.flight) ? 'Flights in this category are deleted too.' : '', ok: 'Delete' })) return; const list = { put: [], remove: [] }; for (const c of ls.slice().sort((a, b) => b.i - a.i)) await dropLine(c.m, c.i, list); await Store.putMany('moments', list.put); await Store.removeMany(list.remove.filter((v, j, a) => a.indexOf(v) === j)); toast('Deleted'); await finish(); };
};
ACT.newMomentCat = arg => { const [id, key] = arg.split(','); const t = D.trip(id); const date = today() >= t.start && today() <= t.end ? today() : t.start; momentSheet({ tripId: id, date, items: [{ type: 'cost', label: '', amount: '', paidBy: D.me().id, tag: key }] }, false, { openCost: true }); };
ACT.planCfgSet = async arg => { const [id, k, f, v] = arg.split(','); const t = D.trip(id); const c = Object.assign({}, D.planCfg(t, k)); const units = D.planUnits(t, k); if (f === 'mode' && v !== c.mode) { const conv = x => v === 'day' ? Math.round((+x||0) / units) : Math.round((+x||0) * units); c.a = conv(c.a); c.b = conv(c.b); } if (f === 'who' && v !== c.who) { if (v === 'each') { c.a = Math.round((+c.a||0) / 2); c.b = c.a; } else { c.a = (+c.a||0) + (+c.b||0); c.b = 0; } } c[f] = v; t.planCfg = Object.assign({}, t.planCfg, { [k]: c }); await Store.put('trips', t); render(); };
ACT.planCfgEdit = async arg => { const [id, k] = arg.split(','); const t = D.trip(id); const c = Object.assign({}, D.planCfg(t, k)); const a = $('#pl-a'), b = $('#pl-b'); if (a) c.a = +a.value || 0; if (b) c.b = +b.value || 0; t.planCfg = Object.assign({}, t.planCfg, { [k]: c }); await Store.put('trips', t); render(); };
function renderPhotos(app){
  const t = D.trip(route.id); const ms = D.tripMoments(t.id).filter(m => m.photos && m.photos.length); const byDay = {}; ms.forEach(m => (byDay[m.date] = byDay[m.date] || []).push(...m.photos.map(p => ({ p, m }))));
  const days = Object.keys(byDay).sort().reverse();
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${fmtD(t.start)} – ${fmtD(t.end)}</span></div><h1 class="hd">Photos</h1>${days.length ? days.map(d => `<div class="l">${fmtD(d)}</div><div class="pgrid" style="margin-top:-8px">${byDay[d].map(({p, m}) => `<button data-act="viewPh|trip:${t.id},${m.id},${m.photos.indexOf(p)}"><img ${pvAttr(p)} alt=""></button>`).join('')}</div>`).join('') : '<div class="empty">No photos yet.</div>'}</div>${nav('trips')}`;
}
function renderMoments(app){ const t = D.trip(route.id); const ms = D.tripMoments(t.id).filter(m => m.kind !== 'booking').reverse(); app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${ms.length} moments</span></div><h1 class="hd">Moments</h1><div class="feed">${ms.map(momentRow).join('') || '<div class="empty">Nothing yet.</div>'}</div></div>${nav('trips')}`; }

// ---------- day page ----------
function polaroid(ph, m, draggable, scope){
  const idx = m.photos.indexOf(ph); const stickers = (ph.stickers||[]).map((s,i) => stkHTML(s, 'stk', `data-stk="${m.id},${idx},${i}" style="left:${s.x}px;top:${s.y}px;transform:rotate(${s.rot||0}deg)"`)).join('');
  return `<div class="pola" data-pola="${m.id},${idx}" data-view="${scope || 'day:' + (m.tripId || 'none') + '_' + m.date},${m.id},${idx}" style="transform:rotate(${(idx%2?4:-4)}deg)"><div class="ph"><img data-asset="${ph.asset}" alt=""></div><span class="dt">${ph.caption ? esc(ph.caption) : palOf(m.authorId) + ' ' + m.date.replace(/-/g,' · ').slice(5) + ' · ' + m.date.slice(2,4)}</span>${stickers}</div>`;
}
function renderDay(app){
  const [tripId, date] = route.id.split('_'); const t = tripId !== 'none' ? D.trip(tripId) : null;
  const ms = D.moments().filter(m => m.date === date && (t ? m.tripId === t.id : !m.tripId)).sort((a,b) => a.createdAt - b.createdAt);
  const plan = ms.find(m => m.kind === 'plan'); const photos = ms.flatMap(m => (m.photos||[]).map(p => ({ p, m })));
  // lots of photos: a few on the wall (featured first), the rest behind "See all"
  const wall = pickWall(photos); const more = photos.length > wall.length; const seeAll = `<button class="btn lite block" data-go="wall/${route.id}">See all ${photos.length} photos ›</button>`;
  const cost = ms.reduce((s,m) => s + D.costTotal(m), 0), meals = ms.filter(m => D.costLines(m).some(c => c.tag === 'food')).length;
  const style = D.settings().photoStyle;
  const anni = D.isMonthiversary(date), months = anni ? D.monthsSince(date) : 0; const bds = D.birthdaysOn(date);
  const other23 = anni ? D.moments().filter(m => D.isMonthiversary(m.date) && m.date !== date && m.photos && m.photos.length).sort((a,b) => b.date.localeCompare(a.date)).slice(0,5) : [];
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="${t ? (t.occasion ? 'budget/' : 'days/') + t.id : 'calendar'}">‹ ${t ? esc(t.city) : 'Calendar'}</button><span>${fmtDow(date)}</span></div><h1 class="hd" style="font-size:34px">${bds.length && !plan ? bds.map(u => u.id === D.me().id ? 'Your birthday' : esc(u.name) + '\'s birthday').join(' & ') : anni ? `${months} month${months===1?'':'s'} <i class="heart lg"></i>` : plan ? esc(plan.title||plan.text) + (plan.who && plan.who !== 'both' ? ' ' + palOf(plan.who) : '') : fmtD(date)}</h1>${anni ? `<div class="sub" style="margin-top:-6px">since ${fmtD(D.anniversary())}${plan ? ' · ' + esc(plan.title||plan.text) : ''}</div>` : plan && plan.note ? `<div class="sub">${esc(plan.note)}</div>` : ''}
    ${anni ? `<div class="l">Other ${ordinal(+date.slice(8))}s</div><div class="strip23" style="margin-top:-8px">${other23.map(m => `<button data-go="day/${m.tripId||'none'}_${m.date}"><div class="ph"><img data-asset="${m.photos[0].asset}" alt=""></div><span class="l">${MON[parseDate(m.date).getMonth()]} · ${D.monthsSince(m.date)}</span></button>`).join('')}${(() => { const nd = new Date(parseDate(date)); nd.setMonth(nd.getMonth()+1); const ni = isoDate(nd); return `<button data-go="day/none_${ni}"><div class="ph empty"></div><span class="l">${MON[nd.getMonth()]} · ${D.monthsSince(ni)}</span></button>`; })()}</div>` : ''}
    ${more ? mosaicHTML(wall, photos, route.id) + seeAll + (() => { const f = stickerFocus && photos.find(x => x.p.asset === stickerFocus.asset); return f && style === 'polaroid' ? `<div class="l">Stickers on this one</div><div class="polas">${polaroid(f.p, f.m, true)}</div><div class="stkrow"><span class="l">Stickers · tap one, then the photo</span>${stickerTray('addSticker')}</div>` : ''; })() : photos.length ? style === 'polaroid' ? `<div class="polas">${wall.map(({p, m}) => polaroid(p, m, true)).join('')}</div>${more ? seeAll : ''}<div class="stkrow"><span class="l">Stickers · tap one, then a photo</span>${stickerTray('addSticker')}</div>` : `<div class="clean">${wall.map(({p, m}) => `<button class="ph" data-act="viewPh|day:${route.id},${m.id},${m.photos.indexOf(p)}"><img data-asset="${p.asset}" alt=""></button>`).join('')}</div>${more ? seeAll : ''}` : ''}
    ${ms.filter(m => m.kind !== 'plan').map(m => dayBlock(m, t, more)).join('')}
    ${!ms.length ? '<div class="empty">Nothing here yet.</div>' : ''}
    <div class="row mt-auto"><span class="l">${ms.filter(m=>m.kind!=='plan').length} moments${meals ? ' · ' + meals + ' meal' + (meals>1?'s':'') : ''}${cost ? ' · ' + money(cost) : ''}</span><span style="display:flex;gap:6px">${!plan ? `<button class="btn sm lite" data-act="addPlan|${date}${t?','+t.id:''}">+ Plan</button>` : `<button class="btn sm lite" data-act="editPlan|${plan.id}">Edit plan</button>`}<button class="btn sm lite" data-act="importStart|${t && !t.occasion ? t.id : ''}">Import</button><button class="btn sm" data-act="newMoment|${t ? t.id : ''},${date}">+ Add</button></span></div>
  </div>${nav(t ? 'trips' : 'calendar')}`;
  setupStickerDrag(app);
}
function songCard(sg, by){ const id = ((sg.url||'').match(/track\/([A-Za-z0-9]+)/)||[])[1]; return `<div class="glass" style="padding:12px 14px"><div class="row"><div class="who">${palOf(by)}<div><b style="font-size:13.5px;font-weight:500">${esc(sg.title || 'A song')}</b><div class="l">${esc(sg.artist || 'Spotify')}</div></div></div><a class="l" href="${esc(sg.url)}" target="_blank" rel="noopener">♫ open</a></div>${id ? `<iframe class="embed" style="margin-top:10px" src="https://open.spotify.com/embed/track/${id}?theme=0" loading="lazy" allow="encrypted-media"></iframe>` : ''}</div>`; }
// YouTube: youtu.be/ID, watch?v=ID, /shorts/ID, /embed/ID, /live/ID
function ytId(url){ const m = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/); return m ? m[1] : ''; }
function videoCard(v, by){ const id = ytId(v.url); const t = (String(v.url).match(/[?&]t=(\d+)/) || [])[1]; return `<div class="glass" style="padding:12px 14px"><div class="row"><div class="who">${palOf(by)}<div><b style="font-size:13.5px;font-weight:500">${esc(v.title || 'A video')}</b><div class="l">YouTube</div></div></div><a class="l" href="${esc(v.url)}" target="_blank" rel="noopener">▶ open</a></div>${id ? `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${id}?playsinline=1${t ? '&start=' + t : ''}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.title || 'YouTube video')}"></iframe></div>` : ''}</div>`; }
const BARS = Array.from({length:22},(_,i)=>`<i style="height:${30+((i*37)%60)}%"></i>`).join('');
function voiceCard(v){ return `<div class="glass" style="padding:12px 14px"><div class="wave"><button class="play" data-act="play|${v.asset}"></button>${palOf(v.by)}${v.name ? `<span class="aname">${esc(v.name)}</span>` : `<div class="bars">${BARS}</div>`}<span class="l">${fmtDur(v.dur)}</span><button class="l" data-act="shareAsset|${v.asset}">↑</button></div></div>`; }
// one memory on the day page: voice notes, songs, the message with its costs, or a booking
// a day with lots of photos: one big (featured first) and two beside it, the last with "+N"
function mosaicHTML(wall, photos, dayId){ const byScore = wall.slice().sort((a, b) => (b.p.featured ? 1 : 0) - (a.p.featured ? 1 : 0)); const tile = (x, cls, inner) => `<button class="${cls}" data-act="viewPh|day:${dayId},${x.m.id},${x.m.photos.indexOf(x.p)}">${inner}</button>`;
  const [a, b, c] = byScore; const rest = photos.length - 3;
  return `<div class="mosaic">${tile(a, 'mbig', `<img data-asset="${a.p.asset}" alt="">`)}${b ? tile(b, '', `<img ${pvAttr(b.p)} alt="">`) : ''}${c ? `<button class="more" data-go="wall/${dayId}"><img ${pvAttr(c.p)} alt="">${rest > 0 ? `<span>+${rest}</span>` : ''}</button>` : ''}</div>`; }
function pickWall(photos){ if (photos.length <= 4) return photos;
  const firsts = new Set(); const score = ({ p, m }, i) => { let s = 0; if (stickerFocus && stickerFocus.asset === p.asset) s += 10; if (p.featured) s += 5; if ((p.stickers||[]).length || p.caption) s += 1; if (!firsts.has(m.id)) { firsts.add(m.id); s += 0.5; } return s - i / 10000; };
  const scored = photos.map((x, i) => ({ x, i, s: score(x, i) })).sort((a, b) => b.s - a.s).slice(0, 3).sort((a, b) => a.i - b.i); return scored.map(o => o.x); }
let stickerFocus = null;
// "Des remembers… / Jett remembers…" under a memory; tap to read it all
function notesHTML(m){ if (m.kind !== 'moment' || !m.id) return ''; const me = D.me(); const ns = D.notes(m.id); const mine = ns.find(n => n.by === me.id);
  return `<div class="notes">${ns.map(n => { const u = D.user(n.by) || {}; return `<button class="note" data-act="${n.by === me.id ? 'noteEdit|' + m.id : 'noteOpen'}"><i class="pal ${u.pal || 'bunny'}"></i><div><span class="l">${n.by === me.id ? 'You remember' : esc(u.name || '') + ' remembers'}</span><p class="clamp">${esc(n.text)}</p></div></button>`; }).join('')}${mine ? '' : `<button class="l addnote" data-act="noteEdit|${m.id}">+ your side of this</button>`}</div>`; }
ACT.noteOpen = (a, el) => { const p = el.querySelector('p'); if (p) p.classList.toggle('clamp'); };
ACT.noteEdit = mid => { const me = D.me(); const m = Store.get('moments', mid); if (!m) return; const n = D.note(mid, me.id); const o = D.other() && D.note(mid, D.other().id);
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${esc(m.text || fmtD(m.date))}</span></div><h2 class="hd md" style="margin:0">Your side</h2>${o ? `<div class="note"><i class="pal ${(D.user(o.by)||{}).pal}"></i><div><span class="l">${esc((D.user(o.by)||{}).name||'')} remembers</span><p>${esc(o.text)}</p></div></div>` : ''}<textarea class="in" id="note-text" style="min-height:150px;font-size:15px" placeholder="What do you remember?">${esc(n ? n.text : '')}</textarea><div class="row">${n ? `<button class="btn sm lite" data-act="noteDel|${mid}">Delete</button>` : '<span></span>'}<button class="btn sm" data-act="noteSave|${mid}">Save</button></div>`, () => { const t = $('#note-text'); if (t) t.focus(); }, 'tall'); };
ACT.noteSave = async mid => { const me = D.me(); const txt = $('#note-text').value.trim(); const id = 'note_' + mid + '_' + me.id; if (txt) await Store.put('notes', { id, mid, by: me.id, text: txt, at: Date.now() }); else if (D.note(mid, me.id)) await Store.remove(id); closeSheet(); render(); };
ACT.noteDel = async mid => { if (!await ask('Delete your side?', { ok: 'Delete' })) return; await Store.remove('note_' + mid + '_' + D.me().id); closeSheet(); render(); };
function momentThumbs(m){ const ph = m.photos || []; if (!ph.length) return ''; const scope = 'day:' + (m.tripId || 'none') + '_' + m.date;
  return `<div class="mthumbs">${ph.slice(0, 4).map((p, i) => `<button data-act="viewPh|${scope},${m.id},${i}"><img ${pvAttr(p)} alt="">${i === 3 && ph.length > 4 ? `<span>+${ph.length - 4}</span>` : ''}</button>`).join('')}</div>`; }
function dayBlock(m, t, thumbs){
  if (m.kind === 'booking') { const tot = D.costTotal(m); return `<div class="caption">${palOf(m.flight ? (m.flight.who || m.authorId) : m.authorId)}<p>${m.flight ? `${esc(flightLabel(m))} <span class="l">${esc(m.flight.no||'')} · ${esc(m.flight.from||'')} → ${esc(m.flight.to||'')}</span>` : esc(m.text)}${tot ? ` <span class="l">${money2(tot)}</span>` : ''}</p><button class="l" style="margin-left:auto" data-act="${m.flight ? 'editFlight' : 'editMoment'}|${m.id}">edit</button></div>`; }
  const lines = D.costLines(m); const tot = D.costTotal(m);
  const costTxt = lines.length > 1 ? ` <span class="l">${lines.map(c => esc(c.label || D.catLabel(t, c.tag)) + ' ' + money2(c.amount)).join(' · ')}</span>` : tot ? ` <span class="l">${money2(tot)}</span>` : '';
  const where = m.place && (m.place.name || m.place.area) ? ` <span class="l">· 📍 ${esc(m.place.name || m.place.area)}</span>` : '';
  const cap = m.text ? `<div class="caption">${palOf(m.authorId)}<p>${esc(m.text)}${where}${costTxt}</p><button class="l" style="margin-left:auto" data-act="editMoment|${m.id}">edit</button></div>`
    : `<div class="caption">${palOf(m.authorId)}<p class="l">${lines.length ? lines.map(c => (c.label ? esc(c.label) + ' ' : '') + money2(c.amount) + ' · ' + esc(D.catLabel(t, c.tag))).join(' · ') : ''}</p><button class="l" style="margin-left:auto" data-act="editMoment|${m.id}">edit</button></div>`;
  return D.voices(m).map(voiceCard).join('') + D.songs(m).map(sg => songCard(sg, m.authorId)).join('') + D.videos(m).map(v => videoCard(v, m.authorId)).join('') + cap + (thumbs ? momentThumbs(m) : '') + notesHTML(m);
}
// every photo of a day: a grid like Photos, or one after another with captions
let wallMode = 'grid';
const hhmm = t => t ? imgTime('0000-00-00T' + t) : '';
function renderWall(app){
  const [tripId, date] = (route.id || '').split('_'); const t = tripId !== 'none' ? D.trip(tripId) : null;
  const ms = D.moments().filter(m => m.date === date && (t ? m.tripId === t.id : !m.tripId) && (m.photos||[]).length).sort((a,b) => a.createdAt - b.createdAt); const n = ms.reduce((s, m) => s + m.photos.length, 0); const scope = 'day:' + route.id;
  const label = m => `<div class="l wlabel">${palOf(m.authorId)} ${esc(m.text || m.title || 'Moment')}${m.time ? ' · ' + hhmm(m.time) : ''}${m.place && m.place.name ? ' · 📍 ' + esc(m.place.name) : ''}</div>`;
  const body = wallMode === 'grid'
    ? ms.map(m => label(m) + `<div class="pgrid" style="margin-top:-8px">${m.photos.map((p, i) => `<button data-act="viewPh|${scope},${m.id},${i}"><img ${pvAttr(p)} alt="">${p.featured ? '<i class="fstar">★</i>' : ''}</button>`).join('')}</div>`).join('')
    : ms.map(m => label(m) + m.photos.map((p, i) => `<div class="wfeed"><button data-act="viewPh|${scope},${m.id},${i}"><img data-asset="${p.asset}" alt="">${p.featured ? '<i class="fstar">★</i>' : ''}</button><input class="in vcap" placeholder="Add a caption" value="${esc(p.caption || '')}" data-act="wallCap|${m.id},${i}" data-on="change">${p.taken ? `<div class="l">${hhmm(p.taken)}</div>` : ''}</div>`).join('')).join('');
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="day/${route.id}">‹ ${fmtDow(date)} ${MON[parseDate(date).getMonth()]}</button><span>${n} photo${n === 1 ? '' : 's'}</span></div><h1 class="hd">Photos</h1>
    <div class="seg"><button class="${wallMode === 'grid' ? 'on' : ''}" data-act="wallMode|grid">▦ Grid</button><button class="${wallMode === 'scroll' ? 'on' : ''}" data-act="wallMode|scroll">☰ Scroll</button></div>
    ${body || '<div class="empty">No photos on this day.</div>'}</div>${nav(t ? 'trips' : 'calendar')}`;
}
ACT.wallMode = m => { wallMode = m; render(); };
ACT.wallCap = async (arg, el) => { const [mid, i] = arg.split(','); const m = Store.get('moments', mid); if (!m || !m.photos[+i]) return; m.photos[+i].caption = el.value.trim(); await Store.put('moments', m); };
// ---------- photo viewer ----------
let viewer = null;   // { list:[{mid, idx}], i }
function viewerList(scope){ const [kind, key] = [scope.slice(0, scope.indexOf(':')), scope.slice(scope.indexOf(':') + 1)];
  let ms = [];
  if (kind === 'day') { const [tripId, date] = key.split('_'); ms = D.moments().filter(m => m.date === date && (tripId !== 'none' ? m.tripId === tripId : !m.tripId)); }
  else if (kind === 'trip') ms = D.tripMoments(key);
  else if (kind === 'm') ms = [Store.get('moments', key)].filter(Boolean);
  ms = ms.slice().sort((a,b) => (a.date + String(a.createdAt||0).padStart(15,'0')).localeCompare(b.date + String(b.createdAt||0).padStart(15,'0')));
  return ms.flatMap(m => (m.photos||[]).map((p, idx) => ({ mid: m.id, idx }))); }
ACT.viewPh = arg => { const parts = arg.split(','); const idx = +parts.pop(), mid = parts.pop(), scope = parts.join(','); const list = viewerList(scope); const i = Math.max(0, list.findIndex(x => x.mid === mid && x.idx === idx)); viewer = { list: list.length ? list : [{ mid, idx }], i }; drawViewer(); };
function drawViewer(keepText){
  if (!viewer) return; const cur = viewer.list[viewer.i]; const m = cur && Store.get('moments', cur.mid); const p = m && m.photos[cur.idx];
  if (!p) { viewer = null; closeSheet(); return render(); }
  const me = D.me(); const t = m.tripId ? D.trip(m.tripId) : null; const cs = D.comments(m.id, p.asset); const typed = keepText ? ($('#v-cm') || {}).value || '' : ''; const capTyped = keepText && document.activeElement && document.activeElement.id === 'v-cap' ? document.activeElement.value : null; const focusId = keepText && document.activeElement ? document.activeElement.id : '';
  openSheet(`<div class="vtop"><button data-act="vClose">‹ ${esc(m.text ? m.text.slice(0, 28) : fmtD(m.date))}</button><span>${viewer.list.length > 1 ? (viewer.i + 1) + ' of ' + viewer.list.length : ''}</span></div>
    <div class="vimg ${p.polaroid ? 'pol' : ''}" id="v-img"><img data-asset="${p.asset}" alt=""></div>
    ${viewer.list.length > 1 ? `<div class="vdots">${viewer.list.map((_, j) => `<i class="${j === viewer.i ? 'on' : ''}"></i>`).join('')}</div>` : ''}
    <div class="vbody">
      <input class="in vcap" id="v-cap" placeholder="Add a caption" value="${esc(capTyped != null ? capTyped : (p.caption||''))}" data-act="vCap" data-on="change">
      <div class="l">${palOf(m.authorId)} ${esc((D.user(m.authorId)||{}).name||'')} · ${fmtDow(m.date)} ${MON[parseDate(m.date).getMonth()]}${t ? ' · ' + esc(t.city) : ''}</div>
      <div class="cms">${cs.map(c => { const u = D.user(c.by) || {}; const mine = c.by === me.id; return `<div class="cm ${mine ? 'me' : ''}"><i class="pal ${u.pal||'bunny'}"></i><div><button class="bb" ${mine ? `data-act="vDelCm|${c.id}"` : ''}>${esc(c.text)}</button><div class="t">${esc(u.name||'')} · ${timeIn(me, new Date(c.at))}${isoDate(new Date(c.at)) !== today() ? ' · ' + fmtD(isoDate(new Date(c.at))) : ''}</div></div></div>`; }).join('')}</div>
      <div class="row" style="gap:8px;margin-top:auto"><input class="in" id="v-cm" placeholder="Add a comment" value="${esc(typed)}" style="font-size:16px"><button class="btn sm" data-act="vSend">Send</button></div>
      <div class="vact"><button data-act="vFeature">${p.featured ? '★ Featured' : '☆ Feature'}</button><button data-act="vFlip">⇋ Flip</button><button data-act="vStickers">Stickers</button><button data-act="shareAsset|${p.asset}">Save</button><button data-act="vDelete">Delete</button></div>
    </div>`, sh => {
      const img = sh.querySelector('#v-img'); let x0 = null;
      img.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      img.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) ACT.vGo(dx < 0 ? 1 : -1); });
      img.addEventListener('click', e => { const r = img.getBoundingClientRect(); ACT.vGo(e.clientX > r.left + r.width / 2 ? 1 : -1); });
      if (focusId) { const f = sh.querySelector('#' + focusId); if (f) f.focus(); }
    }, 'viewer');
  prefetch(p.asset); const nx = viewer.list[(viewer.i + 1) % viewer.list.length]; const nm = nx && Store.get('moments', nx.mid); if (nm && nm.photos[nx.idx]) prefetch(nm.photos[nx.idx].asset);
}
// keep the photo itself ready, so Save shares straight away (iPhone blocks sharing if a tap waited on a download)
const ready = new Map(); function prefetch(id){ if (id && !ready.has(id)) Store.blob(id).then(b => { if (b) ready.set(id, b); }).catch(() => {}); }
ACT.vFlip = async () => { const cur = viewer.list[viewer.i]; const m = Store.get('moments', cur.mid); const p = m.photos[cur.idx]; const b = ready.get(p.asset) || await Store.blob(p.asset); if (!b) return toast('Photo isn\'t on this phone yet');
  toast('Flipping…'); const ph = await storePhoto(b, true); const old = [p.asset, p.thumb].filter(Boolean); const cms = Store.all('comments').filter(c => c.asset === p.asset);
  Object.assign(p, ph); if (!ph.thumb) delete p.thumb; await Store.put('moments', m); if (cms.length) await Store.putMany('comments', cms.map(c => Object.assign(c, { asset: ph.asset }))); old.forEach(a => Store.removeBlob(a)); pvCache.delete(old[0]); drawViewer(true); toast('Flipped'); };
ACT.vGo = d => { if (!viewer) return; const n = viewer.list.length; if (n < 2) return; viewer.i = (viewer.i + d + n) % n; drawViewer(); };
ACT.vClose = () => { viewer = null; closeSheet(); render(); };
ACT.vCap = async (a, el) => { const cur = viewer.list[viewer.i]; const m = Store.get('moments', cur.mid); m.photos[cur.idx].caption = el.value.trim(); await Store.put('moments', m); };
ACT.vSend = async () => { const el = $('#v-cm'); const text = el.value.trim(); if (!text) return; const cur = viewer.list[viewer.i]; const m = Store.get('moments', cur.mid); await Store.put('comments', { id: Store.uid(), mid: m.id, asset: m.photos[cur.idx].asset, by: D.me().id, text, at: Date.now() }); el.value = ''; drawViewer(); };
ACT.vDelCm = async id => { if (!await ask('Delete this comment?', { ok: 'Delete' })) return; await Store.remove(id); drawViewer(true); };
ACT.vFeature = async () => { const cur = viewer.list[viewer.i]; const m = Store.get('moments', cur.mid); const p = m.photos[cur.idx]; p.featured = !p.featured; await Store.put('moments', m); toast(p.featured ? 'Shows on the day\'s wall' : 'Not featured'); drawViewer(true); };
ACT.vStickers = () => { const cur = viewer.list[viewer.i]; const m = Store.get('moments', cur.mid); stickerFocus = { asset: (m.photos[cur.idx] || {}).asset }; viewer = null; closeSheet(); go('day', { id: (m.tripId || 'none') + '_' + m.date }); toast('Tap a sticker, then the photo'); };
ACT.vDelete = async () => { if (!await ask('Delete this photo?', { sub: 'It\'s removed for both of you.', ok: 'Delete' })) return; const cur = viewer.list[viewer.i]; const m = Store.get('moments', cur.mid); const [p] = m.photos.splice(cur.idx, 1); await Store.put('moments', m); if (p) { Store.removeBlob(p.asset); if (p.thumb) Store.removeBlob(p.thumb); await Store.removeMany(Store.all('comments').filter(c => c.asset === p.asset).map(c => c.id)); } viewer.list = viewer.list.filter((x, j) => j !== viewer.i).map(x => x.mid === cur.mid && x.idx > cur.idx ? { mid: x.mid, idx: x.idx - 1 } : x); if (!viewer.list.length) return ACT.vClose(); viewer.i = Math.min(viewer.i, viewer.list.length - 1); drawViewer(); toast('Deleted'); };
let audioEl;
ACT.play = async (id, el) => { if (audioEl && !audioEl.paused && audioEl.dataset.id === id) { audioEl.pause(); el.classList.remove('on'); return; } const u = await Store.blobUrl(id); if (!u) return; if (audioEl) audioEl.pause(); document.querySelectorAll('.play.on').forEach(p => p.classList.remove('on')); audioEl = new Audio(u); audioEl.dataset.id = id; el.classList.add('on'); audioEl.onended = () => el.classList.remove('on'); audioEl.play(); };
ACT.shareAsset = async id => { let b = ready.get(id);
  if (!b) { b = await Store.blob(id); if (!b) return toast('Photo isn\'t on this phone yet — try again in a moment'); ready.set(id, b); if (navigator.canShare) return toast('Ready — tap Save again'); }
  const ext = (b.type.split('/')[1] || id.split('.').pop() || 'jpg').replace('jpeg', 'jpg').replace('mp4', 'm4a'); const f = new File([b], 'des-jett-' + today() + '-' + id.slice(0, 5) + '.' + ext, { type: b.type });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); } catch (e) { if (e && e.name === 'NotAllowedError') toast('Tap Save again'); } return; } download(b, f.name); };
function download(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
let pendingSticker = null;
ACT.addSticker = arg => { pendingSticker = stkFrom(arg); if (sheet) closeSheet(); toast('Now tap a photo'); };
function setupStickerDrag(root){
  root.querySelectorAll('.pola').forEach(p => {
    p.addEventListener('pointerdown', async e => {
      if (e.target.classList.contains('stk')) return;
      if (!pendingSticker) return;
      const [mid, idx] = p.dataset.pola.split(','); const m = Store.get('moments', mid); const ph = m.photos[+idx]; const r = p.getBoundingClientRect();
      (ph.stickers = ph.stickers || []).push(Object.assign({}, pendingSticker, { x: Math.round(e.clientX - r.left - 22), y: Math.round(e.clientY - r.top - 22), rot: Math.round(Math.random()*30-15) }));
      pendingSticker = null; await Store.put('moments', m); render();
    });
  });
  root.querySelectorAll('.stk').forEach(s => {
    let drag = null;
    s.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); s.setPointerCapture(e.pointerId); const r = s.parentElement.getBoundingClientRect(); drag = { ox: e.clientX - r.left - parseFloat(s.style.left), oy: e.clientY - r.top - parseFloat(s.style.top), r, moved:false }; });
    s.addEventListener('pointermove', e => { if (!drag) return; drag.moved = true; s.style.left = (e.clientX - drag.r.left - drag.ox) + 'px'; s.style.top = (e.clientY - drag.r.top - drag.oy) + 'px'; });
    s.addEventListener('click', e => e.stopPropagation());
    s.addEventListener('pointerup', async e => { if (!drag) return; const [mid, idx, i] = s.dataset.stk.split(','); const m = Store.get('moments', mid); const st = m.photos[+idx].stickers[+i]; if (drag.moved) { st.x = Math.round(parseFloat(s.style.left)); st.y = Math.round(parseFloat(s.style.top)); await Store.put('moments', m); } else if (await ask('Remove sticker?', { ok: 'Remove' })) { m.photos[+idx].stickers.splice(+i, 1); await Store.put('moments', m); render(); } drag = null; });
  });
}

// ---------- new / edit moment ----------
ACT.newMoment = (arg) => { const [tripId, date] = (arg||'').split(','); momentSheet({ tripId: tripId || '', date: date || today() }); };
ACT.editMoment = id => { const m = Store.get('moments', id); if (m && m.flight) return ACT.editFlight(id); momentSheet(JSON.parse(JSON.stringify(m)), true); };
let rec = null, voiceSaving = null, recDone = null;
const uidShort = () => Math.random().toString(36).slice(2, 9);
// Old memories kept one voice / song / cost in fixed fields; move them into the items list when edited.
function normalizeItems(m, keepCost){
  m.items = (m.items || []).map(x => Object.assign({ id: uidShort() }, x));
  if (m.song) { m.items.unshift({ id: uidShort(), type:'song', url: m.song, title: m.songTitle || '', artist: m.songBy || '' }); delete m.song; delete m.songTitle; delete m.songBy; }
  if (m.voice) { m.items.unshift({ id: uidShort(), type:'voice', asset: m.voice, dur: m.voiceDur || 0, by: m.authorId }); delete m.voice; delete m.voiceDur; }
  if (!keepCost && m.cost && (+m.cost.amount || m.cost.label)) { m.items.push(Object.assign({ id: uidShort(), type:'cost', label: '' }, m.cost)); m.cost = null; }
  return m;
}
function momentSheet(m, editing, opts){
  opts = opts || {}; const present = opts.present; const me = D.me();
  m.authorId = m.authorId || me.id; m.photos = m.photos || []; normalizeItems(m, !!present);
  let pendingPhotos = [], removedAssets = [], ddOpen = false, costEdit = null, voicePick = false;
  // each of you writes your own side; they're separate records so you never overwrite each other
  const myNoteRec = m.id ? D.note(m.id, me.id) : null; let myNote = myNoteRec ? myNoteRec.text : ''; const otherNote = m.id && D.other() ? D.note(m.id, D.other().id) : null;
  let mode = m.tripId ? (D.trip(m.tripId) && D.trip(m.tripId).occasion ? 'occ' : 'trip') : 'none';
  if (!editing && !m.tripId && !present) { const t = D.tripForDate(m.date), o = D.occasionForDate(m.date); if (t) { mode = 'trip'; m.tripId = t.id; } else if (o) { mode = 'occ'; m.tripId = o.id; } }
  const costs = () => m.items.filter(x => x.type === 'cost');
  const theTrip = () => mode === 'none' ? null : (m.tripId ? D.trip(m.tripId) : null);
  const x = (act) => `<button class="x" data-act="${act}" aria-label="Remove">✕</button>`;
  const who = present ? D.user(present.forUser) : null;
  const drawMain = () => { const t = theTrip(); const list = mode === 'occ' ? D.occasions() : D.trips();
    const thumbs = m.photos.map((p, i) => `<div class="th ${p.polaroid ? 'pol' : ''}"><img data-asset="${p.asset}" alt="">${x('mRmPhoto|e,' + i)}</div>`).join('') + pendingPhotos.map((p, i) => `<div class="th ${p.polaroid ? 'pol' : ''}"><img src="${p.url}" alt="">${x('mRmPhoto|p,' + i)}</div>`).join('');
    const voices = m.items.filter(it => it.type === 'voice').map(v => `<div class="it"><button class="play" data-act="play|${v.asset}"></button>${palOf(v.by || m.authorId)}${v.name ? `<span class="aname">${esc(v.name)}</span>` : `<span class="bars">${BARS}</span>`}<span class="l">${fmtDur(v.dur)}</span>${x('mRmItem|' + v.id)}</div>`).join('');
    const videos = m.items.filter(it => it.type === 'video').map(v => `<div class="it"><button class="songbtn" data-act="mEditVideo|${v.id}"><b>▶ ${esc(v.title || 'A video')}</b><div class="l">${esc((v.url||'').replace(/^https?:\/\/(www\.)?/,'').slice(0,34))}</div></button>${x('mRmItem|' + v.id)}</div>`).join('');
    const songs = m.items.filter(it => it.type === 'song').map(sg => `<div class="it"><button class="songbtn" data-act="mEditSong|${sg.id}"><b>${esc(sg.title || 'A song')}</b><div class="l">${esc(sg.artist || (sg.url||'').replace(/^https?:\/\//,'').slice(0,34))}</div></button>${x('mRmItem|' + sg.id)}</div>`).join('');
    const cs = costs(); const tot = cs.reduce((s, c) => s + (+c.amount||0), 0);
    const costRows = cs.length ? `<div class="costs">${cs.map(c => `<button class="cr" data-act="mCostEdit|${c.id}">${c.label ? `<b>${esc(c.label)}</b>` : ''}<span class="tag">${esc(D.catLabel(t, c.tag || 'food'))}</span>${payerPals(c)}<span class="amt">${money2(c.amount)}</span></button>`).join('')}${cs.length > 1 ? `<div class="cr"><span class="l">Total</span><span class="amt">${money2(tot)}</span></div>` : ''}</div>` : '';
    const seg = present ? '' : `<div class="row" style="position:relative"><div class="seg" style="width:210px"><button class="${mode==='trip'?'on':''}" data-act="mMode|trip">Trip</button><button class="${mode==='occ'?'on':''}" data-act="mMode|occ">Occasion</button><button class="${mode==='none'?'on':''}" data-act="mMode|none">None</button></div>${mode !== 'none' ? `<span style="position:relative"><button class="chip on" data-act="mDD">${t ? esc(t.city) + ' · ' + fmtD(t.start) : mode === 'occ' ? 'Pick one' : 'Pick a trip'} ${ddOpen?'▴':'▾'}</button>${ddOpen ? `<div class="dd">${list.slice().reverse().map(o => `<button data-act="mPickTrip|${o.id}"><span style="${o.id===(t&&t.id)?'font-weight:500':''}">${esc(o.city)} · ${fmtD(o.start)}${o.end !== o.start ? ' – ' + fmtD(o.end) : ''}</span>${o.id===(t&&t.id)?'<i class="heart" style="width:10px;height:10px"></i>':''}</button>`).join('')}<button data-act="${mode === 'occ' ? 'mNewOcc' : 'mNewTrip'}"><span class="muted">+ New ${mode === 'occ' ? 'occasion' : 'trip'}</span></button></div>` : ''}</span>` : ''}</div>`;
    return `<div class="bar"><button data-act="closeSheet">Close</button><span>${present ? esc(who.name) + '\'s birthday · ' + fmtD(m.date) : palOf(me.id) + ' ' + esc(me.name)}</span></div><h2 class="hd md" style="margin:0">${present ? (editing ? 'Your present' : 'Wrap a present') : editing ? 'Edit memory' : 'New memory'}</h2>
    ${present ? `<div class="row" style="justify-content:center;padding:6px 0 2px"><div class="gift"></div></div><textarea class="in" id="m-text" style="min-height:120px;font-size:15px" placeholder="Write them something">${esc(m.text||'')}</textarea>` : `<input class="in big" id="m-text" placeholder="Say it how you'd say it to them" value="${esc(m.text||'')}">${otherNote ? `<div class="note"><i class="pal ${(D.user(otherNote.by)||{}).pal||'puppy'}"></i><div><span class="l">${esc((D.user(otherNote.by)||{}).name||'')} remembers</span><p>${esc(otherNote.text)}</p></div></div>` : ''}<textarea class="in" id="m-note" placeholder="Your side — what do you remember?" style="min-height:64px;font-size:14px">${esc(myNote)}</textarea>`}
    ${seg}
    <div class="attach"><button data-act="mPhoto|photo"><b>◫</b>Photo</button><button data-act="mPhoto|polaroid"><b>▣</b>Polaroid</button><button class="${rec || voicePick ?'sel':''}" data-act="mVoice"><b>●</b>${rec ? 'Stop' : voiceSaving ? 'Saving…' : 'Voice'}</button><button data-act="mSong"><b>♫</b>Song</button><button data-act="mVideo"><b>▶</b>Video</button>${present ? '' : `<button data-act="mCost"><b>$</b>Cost</button>`}</div>
    ${voicePick && !rec ? `<div class="chips"><button class="chip on" data-act="mVoiceRec">● Record now</button><button class="chip" data-act="mVoiceFile">↑ Choose an audio file</button><button class="chip" data-act="mVoice">Cancel</button></div>` : ''}
    <div class="items">${thumbs ? `<div class="thumbs">${thumbs}</div>` : ''}${voices}${songs}${videos}${costRows}</div>
    ${present ? `<div class="list" style="font-size:13.5px"><div class="row"><span>Opens</span><span class="l">${fmtD(m.date)} · 12:00am ${esc(who.name)}'s time</span></div><div class="row"><span>Hidden from ${esc(who.name)}</span><span class="l">until then</span></div></div>` : ''}
    <div class="row" style="margin-top:auto">${present ? `<span class="l">Only you can see this</span>` : `<span style="display:flex;gap:8px;align-items:center"><input class="in" type="date" id="m-date" value="${m.date}" style="padding:8px 10px;font-size:12px;width:auto"></span>`}<span style="display:flex;gap:6px">${editing ? `<button class="btn sm lite" data-act="mDelete">Delete</button>` : ''}<button class="btn sm" data-act="mSave">${present ? (editing ? 'Save' : 'Wrap it') : 'Save'}</button></span></div>
    <input type="file" id="m-file" accept="image/*" multiple hidden data-act="mFiles" data-on="change"><input type="file" id="m-audio" accept="audio/*,.m4a,.mp3,.wav,.aac" multiple hidden data-act="mAudioFiles" data-on="change">`; };
  const drawCost = () => { const c = costEdit; const t = theTrip(); const cats = D.cats(t); const tag = c.tag || 'food';
    return `<div class="bar"><button data-act="cBack">Back</button><span>Cost</span></div>
    <input class="in big" id="c-label" placeholder="What was it?" value="${esc(c.label||'')}">
    <div class="row"><span style="display:flex;align-items:center"><span class="num" style="font-size:34px">$</span><input class="in money" id="c-amt" type="number" inputmode="decimal" placeholder="0" value="${c.amount||''}" style="width:170px"></span></div>
    <div class="chips">${cats.map(k => `<button class="chip ${tag===k.key?'on':''}" data-act="cTag|${k.key}">${esc(k.label)}</button>`).join('')}${t ? `<button class="chip dash" data-act="cOther">+ Other</button>` : ''}</div>
    ${paidByHTML(c, 'c')}
    <div class="l">${esc(D.payerTextC(Object.assign({}, c, { amount: +c.amount || 0 })) || me.name)}${t ? ` · counts toward ${esc(t.city)}'s ${esc(D.catLabel(t, tag))}` : ' · no trip, not in a budget'}</div>
    <div class="row" style="margin-top:auto"><button class="btn sm lite" data-act="cRemove">Remove</button><button class="btn sm" data-act="cDone">Done</button></div>`; };
  const draw = () => costEdit ? drawCost() : drawMain();
  const keepCost = () => { if (!costEdit) return; const l = $('#c-label'), a = $('#c-amt'); if (l) costEdit.label = l.value.trim(); if (a) costEdit.amount = a.value === '' ? '' : +a.value; readSplit(costEdit, 'c'); };
  const keep = () => { if (costEdit) return keepCost(); const tx = $('#m-text'), dt = $('#m-date'), nt = $('#m-note'); if (tx) m.text = tx.value; if (dt) m.date = dt.value; if (nt) myNote = nt.value; };
  const redraw = () => { keep(); openSheet(draw(), null, 'tall'); };
  const confirmRm = async what => editing ? await ask('Remove this ' + what + '?', { ok: 'Remove' }) : true;
  ACT.mMode = k => { keep(); mode = k; ddOpen = false; if (k === 'none') m.tripId = ''; else { const cur = m.tripId && D.trip(m.tripId); if (!cur || !!cur.occasion !== (k === 'occ')) { const f = k === 'occ' ? D.occasionForDate(m.date) : D.tripForDate(m.date); m.tripId = f ? f.id : ''; } } redraw(); };
  ACT.mDD = () => { keep(); ddOpen = !ddOpen; redraw(); };
  ACT.mPickTrip = id => { keep(); m.tripId = id; ddOpen = false; redraw(); };
  ACT.mNewTrip = async () => { keep(); const city = await ask('Which city?', { input: '', ok: 'Add trip' }); if (!city) return; const t = await Store.put('trips', { id: Store.uid(), city, start: m.date, end: addDays(m.date, 4), flyer: '', createdAt: Date.now() }); m.tripId = t.id; ddOpen = false; redraw(); };
  ACT.mNewOcc = async () => { keep(); const name = await ask('Name the occasion', { input: '', placeholder: 'One year, Christmas…', ok: 'Add' }); if (!name) return; const o = await Store.put('trips', { id: Store.uid(), occasion: true, kind: 'custom', city: name, start: m.date, end: m.date, authorId: me.id, secret: false, createdAt: Date.now() }); m.tripId = o.id; ddOpen = false; redraw(); };
  let photoKind = 'photo';
  ACT.mPhoto = kind => { keep(); photoKind = kind; $('#m-file').click(); };
  ACT.mFiles = (a, f) => { Array.from(f.files).forEach(file => pendingPhotos.push({ file, polaroid: photoKind === 'polaroid', url: URL.createObjectURL(file) })); redraw(); };
  ACT.mRmPhoto = async arg => { keep(); const [k, i] = arg.split(','); if (k === 'p') { pendingPhotos.splice(+i, 1); return redraw(); } if (!await confirmRm('photo')) return; const [p] = m.photos.splice(+i, 1); if (p) { removedAssets.push(p.asset); if (p.thumb) removedAssets.push(p.thumb); } redraw(); };
  ACT.mRmItem = async id => { keep(); const it = m.items.find(x => x.id === id); if (!it) return; if (!await confirmRm(it.type === 'voice' ? 'voice note' : it.type)) return; m.items = m.items.filter(x => x.id !== id); if (it.type === 'voice' && it.asset) removedAssets.push(it.asset); redraw(); };
  const songAsk = async sg => { const url = await ask('Paste a Spotify link', { input: sg.url || '', placeholder: 'https://open.spotify.com/track/…', ok: 'Next' }); if (url == null || !url) return null; sg.url = url; sg.title = (await ask('Song title', { sub: 'optional', input: sg.title || '', ok: 'Next' })) || ''; sg.artist = (await ask('Artist', { sub: 'optional', input: sg.artist || '', ok: 'Done' })) || ''; return sg; };
  const videoAsk = async v => { const url = await ask('Paste a YouTube link', { input: v.url || '', placeholder: 'https://youtu.be/…', ok: 'Next' }); if (url == null || !url) return null; if (!ytId(url)) toast('That doesn\'t look like a YouTube link — saved as a link'); v.url = url.trim(); v.title = (await ask('What is it?', { sub: 'optional', input: v.title || '', ok: 'Done' })) || ''; return v; };
  ACT.mVideo = async () => { keep(); const v = await videoAsk({ id: uidShort(), type: 'video' }); if (v) m.items.push(v); redraw(); };
  ACT.mEditVideo = async id => { keep(); const v = m.items.find(x => x.id === id); if (v) await videoAsk(v); redraw(); };
  ACT.mSong = async () => { keep(); const sg = await songAsk({ id: uidShort(), type: 'song' }); if (sg) m.items.push(sg); redraw(); };
  ACT.mEditSong = async id => { keep(); const sg = m.items.find(x => x.id === id); if (sg) await songAsk(sg); redraw(); };
  ACT.mCost = () => { keep(); const t = theTrip(); costEdit = { id: uidShort(), type: 'cost', label: '', amount: '', tag: t && t.occasion ? 'gift' : 'food', paidBy: me.id, _new: true }; openSheet(draw(), () => { const l = $('#c-label'); if (l) l.focus(); }, 'tall'); };
  ACT.mCostEdit = id => { keep(); const c = m.items.find(x => x.id === id); if (!c) return; costEdit = JSON.parse(JSON.stringify(c)); openSheet(draw(), null, 'tall'); };
  ACT.cBack = () => { costEdit = null; openSheet(draw(), null, 'tall'); };
  ACT.cDone = () => { keepCost(); const c = costEdit; delete c._new; costEdit = null; if (+c.amount || c.label) { const i = m.items.findIndex(x => x.id === c.id); if (i >= 0) m.items[i] = c; else m.items.push(c); } openSheet(draw(), null, 'tall'); };
  ACT.cRemove = () => { const id = costEdit.id; costEdit = null; m.items = m.items.filter(x => x.id !== id); openSheet(draw(), null, 'tall'); };
  ACT.cTag = k => { keepCost(); costEdit.tag = k; openSheet(draw(), null, 'tall'); };
  ACT.cOther = async () => { keepCost(); const t = theTrip(); if (!t) return; const name = await ask('Name the category', { input: '', ok: 'Add' }); if (!name) return; const key = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_'); t.cats = (t.cats||[]).filter(c => c.key !== key).concat([{ key, label: name }]); await Store.put('trips', t); costEdit.tag = key; openSheet(draw(), null, 'tall'); };
  bindPaidBy('c', () => costEdit, () => { keepCost(); }, () => openSheet(draw(), null, 'tall'));
  // Voice: pick a format the phone can actually record (iPhone = mp4), collect data every second,
  // and keep a promise so Save waits for the recording to finish instead of saving without it.
  // Voice: record now, or pick a file (a Voice Memo saved to Files, a song clip…)
  ACT.mVoice = () => { keep(); if (rec) { rec.stop(); return; } if (voiceSaving) return; voicePick = !voicePick; redraw(); };
  ACT.mVoiceFile = () => { keep(); voicePick = false; $('#m-audio').click(); };
  ACT.mAudioFiles = async (a, f) => { const files = Array.from(f.files || []); voicePick = false; for (const file of files) { try { const ext = ((file.name.split('.').pop() || '').toLowerCase().slice(0, 5)) || (file.type.includes('mpeg') ? 'mp3' : 'm4a'); const dur = await audioDuration(file); const asset = await Store.putBlob(file, ext); m.items.push({ id: uidShort(), type: 'voice', asset, dur, by: me.id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) }); } catch (e) { toast('Could not add ' + file.name); } } if (files.length) toast(files.length === 1 ? 'Audio added' : files.length + ' audio files added'); if (sheet && !costEdit) redraw(); };
  ACT.mVoiceRec = async () => { keep(); voicePick = false;
    if (rec) { rec.stop(); return; }
    if (voiceSaving) return;
    if (!window.MediaRecorder || !navigator.mediaDevices) return toast('This phone can\'t record here');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast(e && e.name === 'NotAllowedError' ? 'Microphone is off for this app — allow it in Settings' : 'Microphone not available'); }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const chunks = []; const started = Date.now();
    try { rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); return toast('Recorder: ' + e.message); }
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    voiceSaving = null; let finish; recDone = new Promise(r => finish = r);
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); const mt = (rec && rec.mimeType) || type || 'audio/mp4'; rec = null;
      voiceSaving = (async () => {
        if (!chunks.length) { toast('Nothing was recorded — check the microphone'); return; }
        const blob = new Blob(chunks, { type: mt.split(';')[0] });
        try { const asset = await Store.putBlob(blob, mt.includes('mp4') ? 'm4a' : 'webm'); m.items.push({ id: uidShort(), type: 'voice', asset, dur: (Date.now() - started) / 1000, by: me.id }); toast('Voice note added'); }
        catch (e) { toast('Could not keep the voice note: ' + e.message); }
      })().finally(() => { voiceSaving = null; if (sheet && !costEdit) redraw(); });
      finish(voiceSaving); if (sheet && !costEdit) redraw();
    };
    rec.start(1000); redraw(); toast('Recording… tap Stop when done');
  };
  ACT.mDelete = async () => { if (!await ask(present ? 'Delete this present?' : 'Delete this memory?', { ok: 'Delete' })) return; await Store.remove(m.id); await Store.removeMany(Store.all('notes').filter(n => n.mid === m.id).map(n => n.id)); closeSheet(); toast('Deleted'); render(); };
  ACT.mSave = async () => {
    if (costEdit) ACT.cDone();
    if (rec) { const p = recDone; rec.stop(); await p; } if (voiceSaving) await voiceSaving; keep();
    m.items = m.items.filter(it => it.type !== 'cost' || +it.amount || it.label);
    if (!m.text && !pendingPhotos.length && !m.photos.length && !m.items.length) return toast('Add something first');
    for (const p of pendingPhotos) { m.photos.push(Object.assign(await storePhoto(p.file), { polaroid: p.polaroid, stickers: [] })); }
    m.id = m.id || Store.uid(); m.createdAt = m.createdAt || Date.now();
    if (present) { Object.assign(m, { forUser: present.forUser, fromUser: me.id, authorId: me.id }); await Store.put('presents', m); }
    else { m.kind = m.kind || 'moment'; if (mode === 'none') m.tripId = ''; else if (!m.tripId) { const f = mode === 'occ' ? D.occasionForDate(m.date) : D.tripForDate(m.date); m.tripId = f ? f.id : ''; } await Store.put('moments', m); }
    if (!present) { const nid = 'note_' + m.id + '_' + me.id; const txt = (myNote || '').trim(); if (txt) { if (!myNoteRec || myNoteRec.text !== txt) await Store.put('notes', { id: nid, mid: m.id, by: me.id, text: txt, at: Date.now() }); } else if (myNoteRec) await Store.remove(nid); }
    for (const a of removedAssets) { Store.removeBlob(a); await Store.removeMany(Store.all('comments').filter(c => c.asset === a).map(c => c.id)); }
    closeSheet(); toast(present ? 'Wrapped' : 'Saved'); render();
  };
  openSheet(draw(), sh => { if (opts.openCost) { const c = costs()[costs().length-1]; if (c) ACT.mCostEdit(c.id); else ACT.mCost(); } else if (!editing && !present) { const t = $('#m-text'); if (t) t.focus(); } }, 'tall');
}
// "Paid by" control shared by memory costs and flights: you / them / both, and a % or $ split for both
function paidByHTML(c, p){ const [a, b] = D.users2(); const me = D.me(); const pb = c.paidBy || me.id;
  const split = pb === 'both' ? (() => { const sp = c.split || { mode:'pct' }; const pct = sp.mode !== 'amt'; const va = sp[a.id] != null ? sp[a.id] : (pct ? 50 : ''), vb = sp[b.id] != null ? sp[b.id] : (pct ? 50 : ''); return `<div class="row" style="margin-top:8px"><div class="seg" style="width:90px"><button class="${pct?'on':''}" data-act="${p}SplitMode|pct">%</button><button class="${pct?'':'on'}" data-act="${p}SplitMode|amt">$</button></div><span style="display:flex;gap:6px;align-items:center"><i class="pal ${a.pal}"></i><input class="in" type="number" inputmode="decimal" id="${p}-sp-a" data-act="${p}SplitEdit|${a.id}" data-on="change" value="${va}" style="width:64px;padding:6px 8px;font-size:13px;text-align:right"><i class="pal ${b.pal}" style="margin-left:4px"></i><input class="in" type="number" inputmode="decimal" id="${p}-sp-b" data-act="${p}SplitEdit|${b.id}" data-on="change" value="${vb}" style="width:64px;padding:6px 8px;font-size:13px;text-align:right"></span></div>`; })() : '';
  return `<div class="row"><span>Paid by</span><div class="seg who" style="width:190px">${D.users2().map(u => `<button class="${pb===u.id?'on':''}" data-act="${p}Paid|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}<button class="${pb==='both'?'on':''}" data-act="${p}Paid|both"><span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span></button></div></div>${split}`; }
function readSplit(c, p){ const sa = $('#' + p + '-sp-a'), sb = $('#' + p + '-sp-b'); if (sa && sb && c.paidBy === 'both') { const [a, b] = D.users2(); c.split = Object.assign({ mode:'pct' }, c.split||{}, { [a.id]: sa.value === '' ? null : +sa.value, [b.id]: sb.value === '' ? null : +sb.value }); } }
function bindPaidBy(p, get, keep, redraw){
  ACT[p + 'Paid'] = id => { keep(); const c = get(); c.paidBy = id; if (id === 'both' && !c.split) { const [a, b] = D.users2(); c.split = { mode:'pct', [a.id]: 50, [b.id]: 50 }; } redraw(); };
  ACT[p + 'SplitMode'] = mode => { keep(); const c = get(); const [a, b] = D.users2(); const amt = +c.amount || 0; const sp = c.split || {}; if (mode === 'amt' && sp.mode !== 'amt') { const pa = sp[a.id] != null ? sp[a.id] : 50; c.split = { mode:'amt', [a.id]: Math.round(amt * pa) / 100, [b.id]: Math.round(amt * (100 - pa)) / 100 }; } else if (mode === 'pct' && sp.mode !== 'pct') { const va = sp[a.id] != null ? sp[a.id] : amt / 2; const pa = amt ? Math.round(va / amt * 100) : 50; c.split = { mode:'pct', [a.id]: pa, [b.id]: 100 - pa }; } redraw(); };
  ACT[p + 'SplitEdit'] = (uid, el) => { keep(); const c = get(); const [a, b] = D.users2(); const sp = c.split || (c.split = { mode:'pct' }); const other = uid === a.id ? b.id : a.id; const v = +el.value || 0; if (sp.mode === 'amt') sp[other] = Math.max(0, Math.round(((+c.amount || 0) - v) * 100) / 100); else sp[other] = Math.max(0, Math.min(100, 100 - v)); sp[uid] = v; redraw(); };
}
function audioDuration(file){ return new Promise(res => { try { const a = new Audio(); const u = URL.createObjectURL(file); const done = v => { URL.revokeObjectURL(u); res(isFinite(v) ? v : 0); }; a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); setTimeout(() => done(a.duration || 0), 4000); a.src = u; } catch (e) { res(0); } }); }
// Photos: decode through an <img> (it always honours the camera's rotation), then shrink in halves with
// high-quality smoothing — one big jump from 4000px makes iPhone photos look grainy.
async function decodeImage(blob){ const u = URL.createObjectURL(blob); try { const img = new Image(); img.decoding = 'async'; img.src = u; await (img.decode ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; })); return img; } finally { setTimeout(() => URL.revokeObjectURL(u), 1000); } }
function scaleTo(src, w0, h0, max, mirror){ let w = w0, h = h0, cur = src; const s = Math.min(1, max / Math.max(w0, h0)); const W = Math.max(1, Math.round(w0 * s)), H = Math.max(1, Math.round(h0 * s));
  while (w / 2 > W * 1.05) { const c = document.createElement('canvas'); c.width = Math.round(w / 2); c.height = Math.round(h / 2); const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height); cur = c; w = c.width; h = c.height; }
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; if (mirror) { x.translate(W, 0); x.scale(-1, 1); } x.drawImage(cur, 0, 0, W, H); return c; }
const toJpeg = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q));
async function shrink(file, max, mirror){ try { const img = await decodeImage(file); const c = scaleTo(img, img.naturalWidth, img.naturalHeight, max || 2048, mirror); return await toJpeg(c, .9); } catch (e) { return file; } }
// a photo is stored twice: the photo (2048px) and a small preview (480px) for grids and strips
async function storePhoto(file, mirror){ let img; try { img = await decodeImage(file); } catch (e) { const asset = await Store.putBlob(file, 'jpg'); return { asset }; }
  const big = await toJpeg(scaleTo(img, img.naturalWidth, img.naturalHeight, 2048, mirror), .9); const small = await toJpeg(scaleTo(img, img.naturalWidth, img.naturalHeight, 480, mirror), .8);
  const thumb = await Store.putBlob(small, 'jpg'); const asset = await Store.putBlob(big, 'jpg'); return { asset, thumb }; }

// ---------- flight sheet ----------
ACT.editFlight = id => { const src = Store.get('moments', id); if (!src) return; const m = JSON.parse(JSON.stringify(src)); const me = D.me(); m.flight = m.flight || {}; let ddOpen = false;
  const draw = () => { const f = m.flight; const t = m.tripId ? D.trip(m.tripId) : null; const info = flightInfo(Object.assign({}, m, { flight: Object.assign({}, f, { title: '' }) }));
    const sibs = t ? D.tripMoments(t.id).filter(x => x.flight && x.id !== m.id && (!f.code || x.flight.code === f.code)) : [];
    const c = m.cost || {}; const att = m.attachment;
    return `<div class="bar"><button data-act="closeSheet">Close</button><span>Flight · ${fmtDow(m.date)} ${MON[parseDate(m.date).getMonth()]}</span></div>
    <div class="l" style="margin-bottom:-6px">Shows as</div>
    <input class="in big" id="f-title" value="${esc(f.title||'')}" placeholder="${esc(info.text)}">
    <div class="glass deep"><div class="row"><input class="in" id="f-route" value="${esc((f.from||'') + ' → ' + (f.to||''))}" style="background:transparent;border:0;padding:0;font-size:22px;font-weight:500;letter-spacing:-.02em;width:60%"><input class="in chip" id="f-no" value="${esc(f.no||'')}" placeholder="AC 112" style="width:92px;text-align:center;font-size:12px;padding:5px 8px"></div>
      <div class="row" style="margin-top:8px"><input class="in" type="date" id="f-date" value="${m.date}" style="padding:6px 10px;font-size:13px;width:auto"><span style="display:flex;gap:4px;align-items:center"><input class="in" id="f-dep" value="${esc(f.dep||'')}" placeholder="dep" style="width:70px;padding:6px 8px;font-size:13px;text-align:center"> – <input class="in" id="f-arr" value="${esc(f.arr||'')}" placeholder="arr" style="width:70px;padding:6px 8px;font-size:13px;text-align:center"></span></div>
      <div class="l" style="margin-top:8px">${esc(AIRPORTS[f.from] || f.from || '')} → ${esc(AIRPORTS[f.to] || f.to || '')}${f.code ? ' · Booking ' + esc(f.code) : ''}</div></div>
    <div class="list" style="font-size:13.5px">
      <div class="row"><span>Who flies</span><div class="seg" style="width:130px">${D.users2().map(u => `<button class="${(f.who || (t && t.flyer) || me.id)===u.id?'on':''}" data-act="fWho|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div>
      <div class="row"><span>Cost</span><span style="display:flex;align-items:center;font-weight:500">$<input class="in" id="f-amt" type="number" inputmode="decimal" value="${c.amount||''}" placeholder="0" style="width:100px;padding:6px 8px;font-size:13px"></span></div>
      ${paidByHTML(Object.assign({ paidBy: me.id }, c), 'f')}
      <div class="row" style="position:relative"><span>Trip</span><span style="position:relative"><button class="chip on" data-act="fDD">${t ? esc(t.city) + ' · ' + fmtD(t.start) : 'No trip'} ${ddOpen?'▴':'▾'}</button>${ddOpen ? `<div class="dd">${D.trips().slice().reverse().map(x => `<button data-act="fPick|${x.id}"><span style="${x.id===(t&&t.id)?'font-weight:500':''}">${esc(x.city)} · ${fmtD(x.start)} – ${fmtD(x.end)}</span></button>`).join('')}<button data-act="fPick|"><span class="muted">No trip</span></button></div>` : ''}</span></div>
      ${att ? `<button class="row" data-act="openAtt|${att.asset}"><span style="display:flex;gap:10px;align-items:center"><span class="filebadge">${esc(((att.name||'').split('.').pop()||'file').toUpperCase().slice(0,4))}</span><span style="text-align:left"><div style="font-weight:500">${esc(att.name || 'Confirmation')}</div><div class="l">Added from email</div></span></span><span class="l">Open ›</span></button>` : ''}
      ${sibs.map(x => `<button class="row" data-act="fGoto|${x.id}"><span>${x.date < m.date ? 'Outbound flight' : 'Return flight'}</span><span class="l">${fmtD(x.date)} · ${esc(x.flight.no||'')} ›</span></button>`).join('')}
    </div>
    <div class="row" style="margin-top:auto"><button class="btn sm lite" data-act="fDelete">Delete flight</button><button class="btn sm" data-act="fSave">Save</button></div>`; };
  const keep = () => { const g = id => $('#' + id); if (!g('f-title')) return; const f = m.flight; f.title = g('f-title').value.trim(); const [a, b] = g('f-route').value.split(/→|->|-/).map(x => (x||'').trim().toUpperCase()); f.from = a || f.from; f.to = b || f.to; f.no = g('f-no').value.trim(); m.date = g('f-date').value || m.date; f.dep = g('f-dep').value.trim(); f.arr = g('f-arr').value.trim(); const amt = g('f-amt').value; if (amt === '' || !+amt) { if (m.cost) m.cost.amount = 0; } else { m.cost = Object.assign({ paidBy: me.id, tag: 'flight' }, m.cost || {}, { amount: +amt }); } if (m.cost) readSplit(m.cost, 'f'); m.text = 'Flight ' + (f.from||'') + ' → ' + (f.to||''); };
  const redraw = () => { keep(); openSheet(draw(), null, 'tall'); };
  ACT.fWho = id => { keep(); m.flight.who = id; redraw(); };
  ACT.fDD = () => { keep(); ddOpen = !ddOpen; redraw(); };
  ACT.fPick = id => { keep(); m.tripId = id || ''; ddOpen = false; redraw(); };
  ACT.fGoto = async id => { keep(); await Store.put('moments', m); ACT.editFlight(id); };
  bindPaidBy('f', () => (m.cost = m.cost || { amount: 0, paidBy: me.id, tag: 'flight' }), keep, () => openSheet(draw(), null, 'tall'));
  ACT.fSave = async () => { keep(); if (m.cost && !+m.cost.amount) m.cost = null; await Store.put('moments', m); closeSheet(); toast('Saved'); render(); };
  ACT.fDelete = async () => { if (!await ask('Delete this flight?', { ok: 'Delete' })) return; await Store.remove(m.id); closeSheet(); toast('Deleted'); render(); };
  openSheet(draw(), null, 'tall');
};
ACT.openAtt = async id => { const b = await Store.blob(id); if (!b) return toast('File not on this phone yet'); const u = URL.createObjectURL(b); const w = window.open(u, '_blank'); if (!w) download(b, id); };

// ---------- notifications ----------
// Each phone subscribes once; the server (supabase/functions/notify) sends to the other person's phones.
const pushState = { on: false, checked: false, reason: '' };
const NOTIFY = [['say','Say & think','when {o} says or thinks something'],['memories','New memories','one per memory'],['comments','Comments','on your photos'],['plans','New plans','when {o} adds a plan']];
const REMIND = [['trips','Trips','a week before and the day before'],['flights','Flights','an hour before landing, and when they land'],['birthdays','Birthdays','a week before and on the day'],['anni','The 23rd','the morning of each month']];
async function checkPush(){ pushState.checked = true; pushState.on = false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { pushState.reason = 'home'; return; }
  if (!CFG.PUSH_PUBLIC_KEY || Store.mode !== 'supabase') { pushState.reason = 'setup'; return; }
  if (Notification.permission === 'denied') { pushState.reason = 'denied'; return; }
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); pushState.on = !!sub && Notification.permission === 'granted'; pushState.reason = ''; } catch (e) { pushState.reason = 'error'; } }
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); };
const subId = sub => 'push_' + Array.from(sub.endpoint).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
function renderNotify(app){ const me = D.me(), o = D.other() || { name: 'them' }; const pref = me.notify || {};
  if (!pushState.checked) checkPush().then(() => route.name === 'notify' && render());
  const row = ([k, t, sub]) => `<div class="row"><span style="text-align:left"><div style="font-size:13.5px">${t}</div><div class="l">${esc(sub.replace('{o}', o.name))}</div></span><button class="tog ${pref[k] === false ? 'off' : ''}" data-act="notifyPref|${k}"></button></div>`;
  const status = pushState.on ? `<div class="row"><span style="font-size:13.5px">On this phone</span><span class="l">allowed ✓</span></div><div class="row" style="margin-top:6px"><button class="l" data-act="pushTest">Send me a test</button><button class="l" data-act="pushOff">Turn off on this phone</button></div>`
    : pushState.reason === 'home' ? `<div style="font-size:13.5px;font-weight:500">Add the app to your Home Screen first</div><div class="sub" style="margin-top:4px">iPhone only allows notifications for apps opened from the Home Screen. Safari → Share → Add to Home Screen, then open it from there.</div>`
    : pushState.reason === 'setup' ? `<div style="font-size:13.5px;font-weight:500">Almost there</div><div class="sub" style="margin-top:4px">${Store.mode !== 'supabase' ? 'Notifications need sync (Supabase) turned on first.' : 'The notification key isn\'t in config.js yet — see supabase/PUSH-SETUP.md.'}</div>`
    : pushState.reason === 'denied' ? `<div style="font-size:13.5px;font-weight:500">Notifications are blocked</div><div class="sub" style="margin-top:4px">iPhone Settings → Notifications → Des &amp; Jett → Allow Notifications.</div>`
    : `<div class="row"><span style="font-size:13.5px">On this phone</span><button class="btn sm" data-act="pushOn">Turn on</button></div>`;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="profile">‹ Profile</button><span>Notifications</span></div><h1 class="hd">Notifications</h1>
    <div class="glass">${status}</div>
    <div class="l">From ${esc(o.name)}</div><div class="list" style="margin-top:-8px">${NOTIFY.map(row).join('')}</div>
    <div class="l">Reminders</div><div class="list" style="margin-top:-8px">${REMIND.map(row).join('')}</div>
  </div>${nav('')}`;
}
ACT.notifyPref = async (k, el) => { const me = D.me(); me.notify = Object.assign({}, me.notify, { [k]: (me.notify || {})[k] === false }); el.classList.toggle('off', me.notify[k] === false); await Store.put('users', me); };
ACT.pushOn = async () => {
  try {
    const perm = await Notification.requestPermission(); if (perm !== 'granted') { pushState.reason = perm === 'denied' ? 'denied' : ''; return render(); }
    const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CFG.PUSH_PUBLIC_KEY) });
    await Store.put('push', { id: subId(sub), userId: D.me().id, sub: sub.toJSON(), at: Date.now(), device: navigator.userAgent.slice(0, 80) });
    pushState.on = true; toast('Notifications on'); render();
  } catch (e) { toast('Could not turn on: ' + e.message); }
};
ACT.pushOff = async () => { try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await Store.remove(subId(sub)); await sub.unsubscribe(); } } catch (e) {} pushState.on = false; toast('Off on this phone'); render(); };
ACT.pushTest = async () => { await Store.put('pushtest', { id: Store.uid(), userId: D.me().id, at: Date.now() }); toast('Sent — it should arrive in a few seconds'); };
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.go) { location.hash = e.data.go; } });

// ---------- birthdays ----------
ACT.birthdaySheet = arg => { const [uid, iso] = arg.split(','); const u = D.user(uid); const me = D.me(); if (!u) return; const mine = uid === me.id; const date = iso || D.nextBirthday(u);
  const present = Store.all('presents').find(p => p.fromUser === me.id && p.forUser === uid && p.date === date);
  const occ = D.occasions().find(o => o.kind === 'birthday' && o.forUser === uid && o.bday === date && o.authorId === me.id);
  const sealed = D.wishes().find(w => w.opens > today()); const wl = D.wishlist(uid);
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${fmtDow(date)} ${MON[parseDate(date).getMonth()]}</span></div>
    <h2 class="hd md" style="margin:0">${mine ? 'Your birthday' : esc(u.name) + '\'s birthday'}</h2>
    <div class="list" style="font-size:13.5px">
    ${mine ? `<button class="row" data-act="wishSheet"><span>Make a wish</span><span class="l">${sealed ? 'sealed until ' + fmtD(sealed.opens) : ''} ›</span></button>
      <button class="row" data-act="wishlistSheet|${uid}"><span>My wishlist</span><span class="l">${wl.length || ''} ›</span></button>`
    : `<button class="row" data-act="presentFor|${uid},${date}"><span>${present ? 'Your present' : 'Wrap a present'}</span><span class="l">${present ? (present.openedAt ? 'opened ♡' : 'wrapped · opens ' + fmtD(date)) : ''} ›</span></button>
      <button class="row" data-act="bdayBudget|${uid},${date}"><span>Birthday budget</span><span class="l">${occ ? money(D.tripCost(occ).total) + ' of ' + money(D.planTotal(occ)) : 'hidden from ' + esc(u.name)} ›</span></button>
      <button class="row" data-act="wishlistSheet|${uid}"><span>${esc(u.name)}'s wishlist</span><span class="l">${wl.length || ''} ›</span></button>
      <button class="row" data-act="bdayReminder|${uid}"><span>Add a reminder to my calendar</span><span class="l">a week before ›</span></button>`}
    </div>`);
};
ACT.presentFor = arg => { const [uid, date] = arg.split(','); const me = D.me(); const p = Store.all('presents').find(x => x.fromUser === me.id && x.forUser === uid && x.date === date); momentSheet(p ? JSON.parse(JSON.stringify(p)) : { date, text: '' }, !!p, { present: { forUser: uid } }); };
ACT.bdayBudget = async arg => { const [uid, date] = arg.split(','); const u = D.user(uid); const me = D.me(); let o = D.occasions().find(x => x.kind === 'birthday' && x.forUser === uid && x.bday === date && x.authorId === me.id);
  if (!o) o = await Store.put('trips', { id: Store.uid(), occasion: true, kind: 'birthday', forUser: uid, bday: date, city: u.name + '\'s birthday', start: addDays(date, -14), end: date, secret: true, authorId: me.id, createdAt: Date.now() });
  closeSheet(); go('budget', { id: o.id }); };
ACT.bdayReminder = uid => { const u = D.user(uid); if (!u || !u.birthday) return; const d = D.nextBirthday(u).replace(/-/g, ''); const nx = D.nextBirthday(u, addDays(D.nextBirthday(u), 1)).replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Des & Jett//EN','BEGIN:VEVENT','UID:bday-' + u.id + '@desjett','DTSTAMP:' + new Date().toISOString().replace(/[-:]/g,'').slice(0,15) + 'Z','DTSTART;VALUE=DATE:' + d,'DTEND;VALUE=DATE:' + addDays(D.nextBirthday(u), 1).replace(/-/g,''),'RRULE:FREQ=YEARLY','SUMMARY:' + u.name + '\'s birthday','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:' + u.name + '\'s birthday is in a week','TRIGGER:-P7D','END:VALARM','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:' + u.name + '\'s birthday is today','TRIGGER:PT9H','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' }); const f = new File([blob], u.name + '-birthday.ics', { type: 'text/calendar' });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
  const w = window.open('data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), '_blank'); if (!w) download(blob, f.name); };
// the wish capsule: sealed until your next birthday, even from you
ACT.wishSheet = () => { const me = D.me(); const ws = D.wishes(); const t = today();
  const opened = ws.filter(w => w.opens <= t).sort((a,b) => b.opens.localeCompare(a.opens))[0]; const sealed = ws.find(w => w.opens > t);
  const next = D.nextBirthday(me, addDays(t, 1)) || addDays(t, 365);
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Birthday wish</span></div>
    ${opened ? `<h2 class="hd md" style="margin:0">${opened.opens >= addDays(t, -40) ? 'Last year you wished…' : 'You once wished…'}</h2><div class="letter" style="font-size:16px">${esc(opened.text)}<div class="from">${palOf(me.id)} ${esc(me.name)} · ${fmtD(isoDate(new Date(opened.at)))}, ${new Date(opened.at).getFullYear()}</div></div>` : `<h2 class="hd md" style="margin:0">Make a wish</h2>`}
    <div class="l" style="margin-top:6px">${opened ? 'This year\'s wish' : ''}</div>
    <div class="envlp"><div class="seal">♡</div></div>
    ${sealed ? `<div class="row"><span class="l">Sealed · opens ${fmtD(sealed.opens)}, ${sealed.opens.slice(0,4)}</span><span></span></div>` : `<textarea class="in" id="w-text" placeholder="Make a wish. It stays sealed until your next birthday." style="min-height:80px;font-size:15px"></textarea><div class="row" style="margin-top:auto"><span class="l">Opens ${fmtD(next)}, ${next.slice(0,4)}</span><button class="btn sm" data-act="wishSeal|${next}">Seal it</button></div>`}`, null, 'tall'); };
ACT.wishSeal = async opens => { const text = ($('#w-text')||{}).value; if (!text || !text.trim()) return toast('Write a wish first'); await Store.put('wishes', { id: Store.uid(), userId: D.me().id, text: text.trim(), at: Date.now(), opens }); toast('Sealed'); ACT.wishSheet(); };
// wishlists: yours to keep, theirs to peek at — "I got this" is only visible to the one buying
ACT.wishlistSheet = uid => { const u = D.user(uid); const me = D.me(); const mine = uid === me.id; const items = D.wishlist(uid);
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${mine ? 'My wishlist' : esc(u.name) + '\'s wishlist'}</span></div>
    <h2 class="hd md" style="margin:0">${mine ? 'Things I\'d love' : esc(u.name) + ' would love'}</h2>
    <div class="list" style="font-size:13.5px">${items.map(w => `<div class="row"><span style="text-align:left">${w.url ? `<a href="${esc(w.url)}" target="_blank" rel="noopener" style="font-weight:500">${esc(w.title)}</a>` : `<span style="font-weight:500">${esc(w.title)}</span>`}${!mine && w.gotBy ? `<div class="l">${w.gotBy === me.id ? 'you got this' : 'taken'}</div>` : ''}</span>${mine ? `<button class="l" data-act="wlDel|${w.id}">✕</button>` : `<button class="chip ${w.gotBy === me.id ? 'on' : ''}" style="font-size:11px" data-act="wlGot|${w.id}">${w.gotBy === me.id ? 'Got it ✓' : 'I got this'}</button>`}</div>`).join('') || `<div class="empty" style="text-align:left">${mine ? 'Nothing yet.' : 'Nothing yet — maybe drop a hint.'}</div>`}</div>
    ${mine ? `<div class="row" style="margin-top:auto"><span></span><button class="btn sm" data-act="wlAdd">+ Add</button></div>` : ''}`, null, 'tall'); };
ACT.wlAdd = async () => { const title = await ask('What is it?', { input: '', ok: 'Next' }); if (!title) return; const url = await ask('Link', { sub: 'optional', input: '', placeholder: 'https://…', ok: 'Add' }); await Store.put('wishlist', { id: Store.uid(), userId: D.me().id, title, url: url || '', at: Date.now() }); ACT.wishlistSheet(D.me().id); };
ACT.wlDel = async id => { await Store.remove(id); ACT.wishlistSheet(D.me().id); };
ACT.wlGot = async id => { const w = Store.get('wishlist', id); const me = D.me(); w.gotBy = w.gotBy === me.id ? '' : me.id; await Store.put('wishlist', w); ACT.wishlistSheet(w.userId); };
// opening a present on your birthday: it becomes a memory from them
ACT.openPresent = async id => { const p = Store.get('presents', id); if (!p) return; const from = D.user(p.fromUser) || {};
  if (!p.openedAt) { p.openedAt = Date.now(); await Store.put('presents', p); if (!Store.all('moments').some(m => m.fromPresent === p.id)) await Store.put('moments', { id: Store.uid(), fromPresent: p.id, kind: 'moment', date: p.date, tripId: (D.tripForDate(p.date)||{}).id || '', authorId: p.fromUser, text: p.text || '', photos: JSON.parse(JSON.stringify(p.photos || [])), items: JSON.parse(JSON.stringify(p.items || [])), createdAt: Date.now() }); }
  openSheet(`<div class="bar"><span>From ${esc(from.name||'')}</span><span>${fmtD(p.date)}</span></div>
    ${p.text ? `<div class="letter">${esc(p.text).replace(/\n/g, '<br>')}<div class="from">${palOf(from.id)} ${esc(from.name||'')}</div></div>` : ''}
    ${(p.items||[]).filter(i => i.type === 'voice').map(v => voiceCard(Object.assign({ by: from.id }, v))).join('')}
    ${(p.items||[]).filter(i => i.type === 'song').map(sg => songCard(sg, from.id)).join('')}
    ${(p.photos||[]).map(ph => `<div class="gphoto"><img data-asset="${ph.asset}" alt=""></div>`).join('')}
    <div class="row" style="margin-top:auto"><span class="l">Saved to Memories</span><button class="btn sm" data-act="closeSheet">Close</button></div>`, null, 'tall'); };

// ---------- plans ----------
ACT.addPlan = arg => { const [date, tripId] = arg.split(','); planSheet({ date, tripId: tripId || (D.tripForDate(date)||{}).id || '' }); };
ACT.editPlan = id => planSheet(JSON.parse(JSON.stringify(Store.get('moments', id))), true);
function planSheet(p, editing){
  p.who = p.who || 'both';
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${fmtDow(p.date)}${p.tripId && D.trip(p.tripId) ? ' · ' + esc(D.trip(p.tripId).city) : ''}</span></div><input class="in big" id="p-title" placeholder="What are we doing?" value="${esc(p.title||'')}"><div class="row"><span class="l">Who</span><div class="seg who" style="width:190px"><button class="${p.who==='both'?'on':''}" data-act="pWho|both"><span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span></button>${D.users2().map(u => `<button class="${p.who===u.id?'on':''}" data-act="pWho|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div><div class="row" id="p-hide-row"><span style="font-size:13.5px">Hide from ${esc((D.other()||{}).name||'them')}</span><button class="tog ${p.hidden?'':'off'}" id="p-hide" data-act="togToggle"></button></div><textarea class="in" id="p-note" placeholder="Notes">${esc(p.note||'')}</textarea>${(p.cost && +p.cost.amount) || p.attachment ? `<div class="list" style="font-size:13.5px">${p.cost && +p.cost.amount ? `<div class="row"><span>Cost</span><span class="l">${payerPals(p.cost)} ${money2(p.cost.amount)} · ${esc(D.catLabel(p.tripId ? D.trip(p.tripId) : null, p.cost.tag || 'fun'))}</span></div>` : ''}${p.attachment ? `<button class="row" data-act="openAtt|${p.attachment.asset}"><span style="display:flex;gap:10px;align-items:center"><span class="filebadge">${esc(((p.attachment.name||'').split('.').pop()||'file').toUpperCase().slice(0,4))}</span><span style="text-align:left">${esc(p.attachment.name || 'Ticket')}</span></span><span class="l">Open ›</span></button>` : ''}</div>` : ''}<div class="row" style="flex-wrap:wrap;gap:8px"><span style="display:flex;gap:6px"><input class="in" type="date" id="p-date" value="${p.date}" style="width:auto;padding:8px 10px;font-size:12px"><input class="in" type="time" id="p-time" value="${p.time||''}" style="width:auto;padding:8px 10px;font-size:12px"></span><span style="display:flex;gap:6px;margin-left:auto">${editing ? `<button class="btn sm lite" data-act="pDelete|${p.id}">Delete</button>` : ''}<button class="btn sm" data-act="pSave">Save</button></span></div>`);
  ACT.pWho = (w, el) => { p.who = w; el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); };
  ACT.pSave = async () => { p.title = $('#p-title').value.trim(); if (!p.title) return toast('Give it a name'); p.note = $('#p-note').value.trim(); p.date = $('#p-date').value; p.time = $('#p-time').value; p.hidden = !$('#p-hide').classList.contains('off'); p.kind = 'plan'; p.id = p.id || Store.uid(); p.authorId = p.authorId || D.me().id; p.createdAt = p.createdAt || Date.now(); const t = D.tripForDate(p.date); p.tripId = t ? t.id : ''; await Store.put('moments', p); closeSheet(); render(); };
  ACT.pDelete = async id => { await Store.remove(id); closeSheet(); toast('Deleted'); render(); };
}

// ---------- calendar ----------
let calMonth = null, calSel = null, calOurs = false, calSpan = 120;
function renderCalendar(app){
  const me = D.me(); const now = new Date(); if (!calMonth) calMonth = { y: now.getFullYear(), m: now.getMonth() }; if (!calSel) calSel = today();
  const first = new Date(calMonth.y, calMonth.m, 1), start = first.getDay(), n = new Date(calMonth.y, calMonth.m+1, 0).getDate();
  const flights = D.moments().filter(m => m.flight); const plans = D.moments().filter(m => m.kind === 'plan'), evs = D.events().filter(e => e.ownerId === me.id || (!e.hidden && (D.user(e.ownerId)||{}).showEvents !== false));
  let cells = '<div class="h">S</div><div class="h">M</div><div class="h">T</div><div class="h">W</div><div class="h">T</div><div class="h">F</div><div class="h">S</div>';
  for (let i = 0; i < start; i++) cells += '<div></div>';
  for (let d = 1; d <= n; d++) { const iso = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const t = D.tripForDate(iso); const ours = plans.some(p => p.date === iso) || flights.some(f => f.date === iso); const ev = !calOurs && evs.some(e => e.date === iso); const an = D.isMonthiversary(iso); const bd = D.birthdaysOn(iso).length; cells += `<button class="${bd ? 'bd ' : ''}${t ? 'trip' + (iso===t.start?' s':'') + (iso===t.end?' e':'') : ''} ${ours?'ours':''} ${ev && !an?'ev':''} ${an?'anni':''} ${iso===today()?'today':''}" data-act="calSel|${iso}"><span>${d}</span></button>`; }
  const monthFirst = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}-01`, monthLast = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  const inMonth = d => d >= monthFirst && d <= monthLast;
  // one agenda for the whole month, grouped by day; the selected day is always there, highlighted
  const horizon = addDays(monthFirst, calSpan); const onward = d => d >= monthFirst && d <= horizon;
  const moreLater = plans.some(p => p.date > horizon) || flights.some(f => f.date > horizon) || (!calOurs && evs.some(e => e.date > horizon));
  const days = new Set([calSel].filter(onward));
  plans.forEach(p => onward(p.date) && days.add(p.date)); flights.forEach(f => onward(f.date) && days.add(f.date)); if (!calOurs) evs.forEach(e => onward(e.date) && days.add(e.date));
  { const lastDate = [...days, ...D.trips().map(t => t.end)].sort().slice(-1)[0] || monthLast; const cur = new Date(calMonth.y, calMonth.m, 1); const endM = new Date(Math.max(new Date(lastDate).getTime(), new Date(calMonth.y, calMonth.m + 2, 0).getTime())); while (cur <= endM) { const iso = isoDate(new Date(cur.getFullYear(), cur.getMonth(), (D.anniversary() ? +D.anniversary().slice(8) : 1), 12)); if (D.isMonthiversary(iso) && onward(iso)) days.add(iso); cur.setMonth(cur.getMonth() + 1); } }
  D.users().forEach(u => { if (!u.birthday) return; for (let y = calMonth.y; y <= calMonth.y + 2; y++) { const iso = D.bdayIn(u, y); if (onward(iso)) days.add(iso); } });
  const occs = D.occasions().filter(o => o.kind !== 'birthday'); occs.forEach(o => { if (onward(o.start)) days.add(o.start); });
  let lastYm = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}`;
  const groups = [...days].sort().map(d => { const t = D.tripForDate(d); const sel = d === calSel; const ym = d.slice(0,7); const divider = ym !== lastYm ? `<div class="mdiv">${MONTHS[+ym.slice(5,7)-1]}${ym.slice(0,4) !== String(calMonth.y) ? ' ' + ym.slice(0,4) : ''}</div>` : ''; lastYm = ym;
    const rows = [];
    D.birthdaysOn(d).forEach(u => rows.push(`<button class="ev" data-act="birthdaySheet|${u.id},${d}"><span class="t">All day</span>${palOf(u.id)}<span style="font-weight:500">${u.id === me.id ? 'Your birthday' : esc(u.name) + '\'s birthday'}</span></button>`));
    occs.filter(o => o.start === d).forEach(o => rows.push(`<button class="ev" data-go="budget/${o.id}"><span class="t">${o.end !== o.start ? 'til ' + fmtD(o.end) : 'All day'}</span><span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span><span style="font-weight:500">${esc(o.city)}</span>${o.secret ? '<span class="r">hidden</span>' : '<span class="r">occasion</span>'}</button>`));
    if (D.isMonthiversary(d)) rows.push(`<button class="ev" data-go="day/${t ? t.id : 'none'}_${d}"><span class="t">All day</span><span class="pair">${D.users().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span><span style="font-weight:500">${D.monthsSince(d)} Month${D.monthsSince(d)===1?'':'s'}</span><i class="heart r"></i></button>`);
    flights.filter(f => f.date === d).forEach(f => rows.push(`<button class="ev" data-act="editFlight|${f.id}"><span class="t">${esc(flightInfo(f).time || 'Flight')}</span>${palOf(f.flight.who || f.authorId)}<span style="font-weight:500">${esc(flightInfo(f).text)}</span><span class="r">${esc(f.flight.no||'')}</span></button>`));
    plans.filter(p => p.date === d).forEach(p => rows.push(`<button class="ev" data-go="day/${p.tripId || 'none'}_${p.date}"><span class="t">${esc(p.time||'All day')}</span>${p.who && p.who !== 'both' ? palOf(p.who) : `<span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span>`}<span style="font-weight:500">${esc(p.title)}</span>${p.hidden ? '<span class="r">hidden</span>' : ''}</button>`));
    if (!calOurs) evs.filter(e => e.date === d).sort((a,b) => (a.time||'').localeCompare(b.time||'')).forEach(e => rows.push(`<button class="ev ${e.hidden?'hid':''}" data-act="evSheet|${e.id}"><span class="t">${esc(e.time||'All day')}</span>${palOf(e.ownerId)}<span>${esc(e.title)}</span>${e.hidden ? '<span class="r">hidden</span>' : ''}</button>`));
    return divider + `<div class="agroup ${sel?'sel':''}" id="${sel?'ag-sel':''}"><div class="ahead"><span>${fmtDow(d)}${t ? ' · ' + esc(t.city) : ''}</span>${sel ? `<button class="chip" style="font-size:11px" data-act="addPlan|${d}${t?','+t.id:''}">+ Plan</button>` : ''}</div><div class="list">${rows.join('') || '<div class="empty" style="padding:6px 0;text-align:left">Nothing yet.</div>'}</div></div>`; });
  app.innerHTML = `<div class="screen"><div class="bar"><span style="display:flex;gap:10px;align-items:center"><button data-act="calNav|-1">‹</button><span>${calMonth.y}</span><button data-act="calNav|1">›</button></span><span style="display:flex;gap:8px;align-items:center"><button class="chip ${calOurs?'on':''}" style="font-size:11px" data-act="calOurs">Our plans only</button><button class="l" data-act="importIcs">Import .ics</button><button class="plus" data-act="calAdd" aria-label="Add">+</button></span></div>
    <h1 class="hd xl">${MON[calMonth.m]}</h1><div class="cal">${cells}</div>
    <div class="agenda">${groups.join('')}${moreLater ? '<button class="btn lite sm" style="align-self:center" data-act="calMore">Show more</button>' : ''}</div>
  </div>${nav('calendar')}`;
}
ACT.calNav = d => { calMonth.m += +d; if (calMonth.m < 0) { calMonth.m = 11; calMonth.y--; } if (calMonth.m > 11) { calMonth.m = 0; calMonth.y++; } const ym = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}`; calSel = today().startsWith(ym) ? today() : ym + '-01'; render(); };
ACT.calSel = iso => { calSel = iso; render(); const g = $('#ag-sel'); if (g) g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
ACT.calOurs = () => { calOurs = !calOurs; render(); };
// the + on the calendar: a plan for both of you, or something just yours
ACT.calAdd = () => { const d = calSel || today(); openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${fmtDow(d)} ${MON[parseDate(d).getMonth()]}</span></div><h2 class="hd md" style="margin:0">Add to the calendar</h2><div class="list" style="font-size:13.5px"><button class="row" data-act="calAddPlan|${d}"><span style="display:flex;gap:10px;align-items:center"><span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span><span style="text-align:left"><div style="font-weight:500">A plan for us</div><div class="l">Shows for both of you</div></span></span><span class="l">›</span></button><button class="row" data-act="calAddMine|${d}"><span style="display:flex;gap:10px;align-items:center">${palOf(D.me().id)}<span style="text-align:left"><div style="font-weight:500">Just mine</div><div class="l">Dentist, work, things like that</div></span></span><span class="l">›</span></button><button class="row" data-act="bookingSheet"><span style="display:flex;gap:10px;align-items:center"><span class="filebadge">PDF</span><span style="text-align:left"><div style="font-weight:500">From a booking</div><div class="l">Movie tickets, a reservation — upload or paste it</div></span></span><span class="l">›</span></button></div>`); };
ACT.calAddPlan = d => { closeSheet(); ACT.addPlan(d); };
ACT.calAddMine = d => { closeSheet(); ACT.addEvent(d); };
ACT.calMore = () => { calSpan += 180; render(); };
ACT.addEvent = date => { const me = D.me(); openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${palOf(me.id)} just mine</span></div><input class="in big" id="e-title" placeholder="Dentist, meeting, …"><div class="row"><input class="in" type="date" id="e-date" value="${date}" style="width:auto;padding:8px 10px;font-size:12px"><input class="in" type="time" id="e-time" style="width:auto;padding:8px 10px;font-size:12px"><button class="btn sm" style="margin-left:auto" data-act="eSave">Save</button></div><div class="row"><span style="font-size:13.5px">Hide from ${esc((D.other()||{}).name||'them')}</span><button class="tog off" id="e-hide" data-act="togToggle"></button></div>`); ACT.eSave = async () => { const title = $('#e-title').value.trim(); if (!title) return; await Store.put('events', { id: Store.uid(), ownerId: me.id, title, date: $('#e-date').value, time: $('#e-time').value, hidden: !$('#e-hide').classList.contains('off'), source:'manual' }); closeSheet(); render(); }; };
ACT.togToggle = (a, el) => el.classList.toggle('off');
ACT.evSheet = id => { const e = Store.get('events', id); const me = D.me(); const mine = e.ownerId === me.id; openSheet(`<div class="bar"><span>${fmtDow(e.date)}${e.time ? ' · ' + esc(e.time) : ''}</span><span>${e.source === 'ics' ? 'Google' : 'Here'} · ${esc((D.user(e.ownerId)||{}).name||'')}</span></div><h2 class="hd md" style="margin:0">${esc(e.title)}</h2>${mine ? `<div class="glass deep"><div class="row"><span style="font-size:13.5px">Hide from ${esc((D.other()||{}).name||'them')}</span><button class="tog ${e.hidden?'':'off'}" data-act="evHide|${id}"></button></div></div>` : ''}<div class="list" style="font-size:13.5px"><button class="row" data-act="evToPlan|${id}"><span>Make it a plan for us</span><span class="l">›</span></button>${mine ? `<button class="row" data-act="evDelete|${id}"><span>Remove from the app</span><span class="l">›</span></button>` : ''}</div><div class="row"><span class="l">${e.source === 'ics' ? 'Stays in your Google Calendar' : ''}</span><button class="btn sm" data-act="closeSheet">Done</button></div>`); };
ACT.evHide = async (id, el) => { const e = Store.get('events', id); e.hidden = !e.hidden; el.classList.toggle('off', !e.hidden); await Store.put('events', e); render(); };
ACT.evToPlan = id => { const e = Store.get('events', id); closeSheet(); planSheet({ title: e.title, date: e.date, time: e.time, tripId: (D.tripForDate(e.date)||{}).id || '' }); };
ACT.evDelete = async id => { await Store.remove(id); closeSheet(); render(); };
function renderGcal(app){
  const me = D.me(); const urls = me.icsUrls || [];
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="profile">‹ Profile</button><span>Google Calendar</span></div><h1 class="hd">Google Calendar</h1>
    <div class="glass"><div class="l">How to connect</div><ol class="steps"><li>On a computer, open Google Calendar → Settings.</li><li>On the left, click your calendar.</li><li>Scroll to <b>Integrate calendar</b>.</li><li>Copy <b>Secret address in iCal format</b>.</li><li>Paste it below.</li></ol></div>
    <div class="row"><input class="in" id="ics-url" placeholder="Paste the secret address here" style="font-size:12px"><button class="btn sm" data-act="icsAdd">Add</button></div>
    <div class="list" style="font-size:13.5px">${urls.map((u,i) => `<div class="row"><span>${palOf(me.id)} ${esc(u.name||'Calendar ' + (i+1))}</span><span class="l">${u.last ? 'synced ' + Math.max(0, Math.round((Date.now()-u.last)/60000)) + ' min ago' : u.error ? esc(u.error) : 'not yet'} · <button data-act="icsRemove|${i}">remove</button></span></div>`).join('') || '<div class="empty">No calendars yet.</div>'}</div>
    <div class="glass deep" style="font-size:13px"><div class="row"><span>Show my events to ${esc((D.other()||{}).name||'them')}</span><button class="tog ${me.showEvents===false?'off':''}" data-act="showEvents"></button></div><div class="l" style="margin-top:6px">You can still hide any single event.</div></div>
    <div class="list" style="font-size:13.5px"><button class="row" data-act="icsSync"><span>Sync now</span><span class="l">refreshes every hour while the app is open ›</span></button><button class="row" data-act="importIcs"><span>Import an .ics file instead</span><span class="l">›</span></button></div>
    <div class="glass deep" style="font-size:13px">${CFG.ICS_PROXY ? `<div class="row"><span>Relay</span><span class="l">connected</span></div>` : `<div style="font-weight:500">One more piece: the relay</div><div class="sub" style="margin-top:4px">Google doesn't let the app read that address directly, so a tiny relay fetches it. Free, ten minutes, once.</div><ol class="steps"><li>Sign in at dash.cloudflare.com → Workers → Create.</li><li>Paste the relay code from <b>supabase/functions-README.md</b> in the app folder, deploy.</li><li>Copy the worker's address into <b>config.js</b> as <b>ICS_PROXY</b>, re-deploy the app.</li></ol></div>`}</div>
  </div>${nav('')}`;
}
ACT.icsAdd = async () => { const url = $('#ics-url').value.trim(); if (!/^https?:\/\//.test(url)) return toast('Paste the full address'); const me = D.me(); me.icsUrls = (me.icsUrls||[]).concat([{ url, name: '' }]); await Store.put('users', me); await syncIcs(true); render(); };
ACT.icsRemove = async i => { const me = D.me(); me.icsUrls.splice(+i, 1); await Store.put('users', me); render(); };
ACT.showEvents = async (a, el) => { const me = D.me(); me.showEvents = me.showEvents === false; await Store.put('users', me); el.classList.toggle('off', me.showEvents === false); };
ACT.icsSync = async () => { await syncIcs(true); toast('Synced'); render(); };
async function fetchIcs(url){ try { const r = await fetch(url); if (r.ok) return await r.text(); } catch (e) {} if (CFG.ICS_PROXY) { try { const r = await fetch(CFG.ICS_PROXY + '?url=' + encodeURIComponent(url)); if (r.ok) return await r.text(); } catch (e) {} } throw new Error(CFG.ICS_PROXY ? 'relay could not reach it' : 'needs the relay'); }
async function syncIcs(force){
  const me = D.me(); if (!me || !(me.icsUrls||[]).length) return; let changed = false;
  for (const u of me.icsUrls) { if (!force && u.last && Date.now() - u.last < 3600000) continue; try { const text = await fetchIcs(u.url); const name = (text.match(/X-WR-CALNAME:(.*)/)||[])[1]; if (name) u.name = name.trim(); await importIcs(text, u.url); u.last = Date.now(); u.error = ''; } catch (e) { u.error = e.message; } changed = true; }
  if (changed) await Store.put('users', me);
}
ACT.importIcs = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.ics,text/calendar'; f.onchange = async () => { const text = await f.files[0].text(); const n = await importIcs(text); toast(`Imported ${n} events`); render(); }; f.click(); };
async function importIcs(text, source){
  const me = D.me(); const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/); let ev = null, n = 0; const lo = addDays(today(), -30), hi = addDays(today(), 400); const seen = new Set(); const out = [];
  for (const line of lines) { if (line === 'BEGIN:VEVENT') ev = {}; else if (line === 'END:VEVENT' && ev) { if (ev.date && ev.title && ev.date >= lo && ev.date <= hi) { const id = 'ics_' + (ev.uid ? ev.uid + (ev.rid ? '_' + ev.rid : '') : Store.uid()); const prev = Store.get('events', id); seen.add(id); if (!prev || prev.title !== ev.title || prev.date !== ev.date || (prev.time||'') !== (ev.time||'') || prev.src !== (source||'')) out.push({ id, ownerId: me.id, title: ev.title, date: ev.date, time: ev.time || '', hidden: prev ? prev.hidden : false, source:'ics', src: source || '' }); n++; } ev = null; } else if (ev) { const [k, v] = [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':')+1)]; if (k.startsWith('DTSTART')) { const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/); if (m) { ev.date = `${m[1]}-${m[2]}-${m[3]}`; if (m[4]) { const d = v.endsWith('Z') ? new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5])) : new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5]); ev.date = isoDate(d); ev.time = d.toTimeString().slice(0,5); } } } else if (k === 'SUMMARY') ev.title = v.replace(/\\,/g, ','); else if (k === 'UID') ev.uid = v.replace(/[^a-z0-9]/gi, '').slice(0,40); else if (k.startsWith('RECURRENCE-ID')) ev.rid = v.replace(/[^0-9]/g, '').slice(0,12); } }
  await Store.putMany('events', out);
  if (source) await Store.removeMany(D.events().filter(e => e.src === source && !seen.has(e.id)).map(e => e.id));
  return n;
}

// ---------- profile ----------
const TINTS = [['sage','linear-gradient(135deg,#FFFFFF,#D9DDCB)'],['pink','linear-gradient(135deg,#FFFFFF,#E8C4CE)'],['butter','linear-gradient(135deg,#FFFFFF,#F6E39A)'],['sky','linear-gradient(135deg,#FFFFFF,#C4D4E6)'],['silver','linear-gradient(135deg,#FFFFFF,#D9DAE2)'],['ink','linear-gradient(135deg,#5A5560,#3B3B41)']];
function renderProfile(app){
  const me = D.me(), s = D.settings();
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="home">‹</button><span>Profile</span></div><h1 class="hd"><input class="in" style="background:transparent;border:0;padding:0;font-size:40px;letter-spacing:-.04em;font-weight:400;width:100%" value="${esc(me.name)}" data-act="myName" data-on="change"></h1>
    <div class="pick">${['bunny','puppy'].map(p => `<button class="${me.pal===p?'on':''}" data-act="myPal|${p}"><i class="pal ${p}"></i>${p[0].toUpperCase()+p.slice(1)}</button>`).join('')}</div>
    <div class="glass"><div class="row"><span style="font-size:13.5px">Tint</span><span class="l">Day only · shared</span></div><div class="sw" style="margin-top:10px">${TINTS.map(([k,c]) => `<button class="${s.tint===k?'on':''}" style="background:${c}" data-act="tint|${k}" title="${k}"></button>`).join('')}</div></div>
    <div class="glass"><div class="row"><span style="font-size:13.5px">Photos</span><div class="seg" style="width:150px"><button class="${s.photoStyle==='polaroid'?'on':''}" data-act="photoStyle|polaroid">Polaroid</button><button class="${s.photoStyle==='clean'?'on':''}" data-act="photoStyle|clean">Clean</button></div></div></div>
    <div class="glass"><div class="row"><span style="font-size:13.5px">Sky</span><div class="seg" style="width:200px"><button class="${(s.sky||'auto')==='auto'?'on':''}" data-act="sky|auto">Follow</button><button class="${s.sky==='light'?'on':''}" data-act="sky|light">Light</button><button class="${s.sky==='dark'?'on':''}" data-act="sky|dark">Dark</button></div></div></div>
    <div class="glass"><div class="row"><span style="font-size:13.5px">Where I am</span><select class="in" style="width:auto;padding:6px 10px;font-size:12px" data-act="myCity" data-on="change">${Object.keys(CITIES).map(c => `<option ${me.city===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
    <div class="list" style="font-size:13.5px"><div class="row"><span>Together since</span><input class="in" type="date" value="${esc(s.anniversary||'')}" data-act="anniEdit" data-on="change" style="width:auto;padding:6px 10px;font-size:12px"></div><div class="row"><span>My birthday</span><input class="in" type="date" value="${esc(me.birthday||'')}" data-act="bdayEdit|${me.id}" data-on="change" style="width:auto;padding:6px 10px;font-size:12px"></div>${D.other() ? `<div class="row"><span>${esc(D.other().name)}'s birthday</span><input class="in" type="date" value="${esc(D.other().birthday||'')}" data-act="bdayEdit|${D.other().id}" data-on="change" style="width:auto;padding:6px 10px;font-size:12px"></div>` : ''}<button class="row" data-go="gcal"><span>Google Calendar</span><span class="l">${(me.icsUrls||[]).length ? 'live · ' + me.icsUrls.length : 'connect'} ›</span></button><button class="row" data-go="emails"><span>Trip emails</span><span class="l">›</span></button><button class="row" data-go="notify"><span>Notifications</span><span class="l">${pushState.on ? 'on' : 'off'} ›</span></button><button class="row" data-go="chat"><span>Chat</span><span class="l">${D.bubbles().length} ›</span></button><button class="row" data-act="howto"><span>How it works</span><span class="l">›</span></button><button class="row" data-act="whatsNew"><span>What's new</span><span class="l">v${APP_VERSION} ›</span></button><button class="row" data-act="exportAll"><span>Export everything</span><span class="l">backup ›</span></button><button class="row" data-act="importAll"><span>Restore a backup</span><span class="l">›</span></button>
    ${Store.mode === 'supabase' ? `<button class="row" data-act="${Store.user?'signout':'signinSheet'}"><span>${Store.user ? 'Signed in · ' + esc(Store.user.email) : 'Sign in to sync'}</span><span class="l">›</span></button>` : `<div class="row"><span>Sync</span><span class="l">local only · add Supabase keys</span></div>`}
    <button class="row" data-act="switchUser"><span>Switch person</span><span class="l">›</span></button><button class="row" data-act="resetAll"><span class="muted">Start over</span><span class="l">›</span></button></div>
  </div>${nav('')}`;
}
ACT.howto = () => { howtoIdx = 0; go('howto'); };
ACT.myName = async (a, el) => { const me = D.me(); me.name = el.value.trim() || me.name; await Store.put('users', me); };
ACT.myPal = async p => { const me = D.me(), o = D.other(); me.pal = p; await Store.put('users', me); if (o) { o.pal = p === 'bunny' ? 'puppy' : 'bunny'; await Store.put('users', o); } render(); };
ACT.myCity = async (a, el) => { const me = D.me(); Object.assign(me, { city: el.value }, CITIES[el.value]); await Store.put('users', me); render(); };
ACT.tint = t => D.saveSettings({ tint: t }).then(render);
ACT.bdayEdit = async (uid, el) => { const u = D.user(uid); u.birthday = el.value; await Store.put('users', u); };
ACT.anniEdit = (a, el) => D.saveSettings({ anniversary: el.value }).then(render);
ACT.photoStyle = p => D.saveSettings({ photoStyle: p }).then(render);
ACT.sky = p => D.saveSettings({ sky: p }).then(render);
ACT.switchUser = () => { localStorage.removeItem('dj.me'); render(); };
ACT.resetAll = async () => { if (await ask('Start over?', { sub: 'Erases everything on this phone. Anything synced stays in Supabase.', ok: 'Erase' })) { Store.wipe(); localStorage.removeItem('dj.me'); setupStep = 1; render(); } };
ACT.signout = async () => { await Store.signOut(); render(); };
ACT.signinSheet = () => openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Sync</span></div>${signinHTML('Sign in to sync')}`);
function occSheet(o, editing){ const other = D.other() || { name: 'them' };
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${editing ? 'Edit occasion' : 'New occasion'}</span></div>
    <input class="in big" id="o-name" placeholder="One year, Christmas…" value="${esc(o.city||'')}">
    <div class="row"><div class="field" style="flex:1"><label>From</label><input class="in" type="date" id="o-start" value="${o.start}"></div><div class="field" style="flex:1"><label>To</label><input class="in" type="date" id="o-end" value="${o.end}"></div></div>
    <div class="row"><span style="font-size:13.5px">Hide from ${esc(other.name)}</span><button class="tog ${o.secret?'':'off'}" id="o-hide" data-act="togToggle"></button></div>
    <div class="row" style="margin-top:auto">${editing ? `<button class="btn sm lite" data-act="occDelete|${o.id}">Delete</button>` : '<span></span>'}<button class="btn sm" data-act="occSave">Save</button></div>`, sh => { if (!editing) $('#o-name').focus(); });
  ACT.occSave = async () => { const name = $('#o-name').value.trim(), start = $('#o-start').value, end = $('#o-end').value || start; if (!name || !start) return toast('A name and a date, please'); Object.assign(o, { city: name, start, end: end < start ? start : end, secret: !$('#o-hide').classList.contains('off'), occasion: true, kind: o.kind || 'custom', authorId: o.authorId || D.me().id, createdAt: o.createdAt || Date.now() }); o.id = o.id || Store.uid(); await Store.put('trips', o); closeSheet(); go('budget', { id: o.id }); };
}
ACT.occNew = () => occSheet({ start: today(), end: today(), secret: false });
ACT.occEdit = id => occSheet(JSON.parse(JSON.stringify(D.trip(id))), true);
ACT.occDelete = async id => { if (!await ask('Delete this occasion?', { sub: 'Its costs stay as memories, without the budget.', ok: 'Delete' })) return; const ms = D.tripMoments(id).map(m => Object.assign(m, { tripId: '' })); await Store.putMany('moments', ms); await Store.remove(id); closeSheet(); go('between'); };
function renderBetween(app){
  const s = D.settings(), g = s.tripGuess;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="profile">‹ Profile</button><span>Between visits</span></div><h1 class="hd">Between visits</h1>
    <div class="glass env">${s.envelopes.map((e,i) => `<div class="row"><input class="in" style="background:transparent;border:0;padding:0;width:45%" value="${esc(e.name)}" data-act="bName|${i}" data-on="change"><span style="display:flex;align-items:center;gap:6px">$<input class="in money" style="font-size:22px;width:70px" type="number" value="${e.amount}" data-act="bAmt|${i}" data-on="change"><button class="chip ${e.per==='each'?'on':''}" data-act="bPer|${i}">${e.per==='each'?'each':'shared'}</button><button class="l" data-act="bDel|${i}">×</button></span></div>`).join('')}<div class="row" style="color:var(--mu)"><button data-act="bAdd">Add</button><span>+</span></div></div>
    <div class="row" style="padding:0 4px"><span class="l">Per month</span><span class="num" style="font-size:22px">${money(D.envelopeMonthly())}</span></div><div class="hr"></div>
    <div class="row"><span class="l">Occasions</span><button class="l" data-act="occNew">+ Occasion</button></div>
    <div class="list" style="margin-top:-8px">${D.occasions().filter(o => o.end >= addDays(today(), -60)).map(o => { const c = D.tripCost(o); return `<button class="row" data-go="budget/${o.id}"><div style="text-align:left"><div style="font-weight:500">${esc(o.city)}</div><div class="l">${fmtD(o.start)}${o.end !== o.start ? ' – ' + fmtD(o.end) : ''}${o.secret ? ' · hidden from ' + esc((D.other()||{}).name||'them') : ''}</div></div><span class="l">${money(c.total)} of ${money(D.planTotal(o))}</span></button>`; }).join('') || '<div class="empty" style="text-align:left;padding:6px 0">Birthdays, anniversaries, holidays — a budget for one date.</div>'}</div><div class="hr"></div>
    <div class="l">A typical trip</div><div class="glass env" style="margin-top:-6px">${[['flight','Flight'],['night','Stay, per night'],['day','A day together']].map(([k,l]) => `<div class="row"><span>${l}</span><span>$<input class="in money" style="font-size:22px;width:80px" type="number" value="${g[k]}" data-act="gEdit|${k}" data-on="change"></span></div>`).join('')}<div class="row" style="font-weight:500"><span>5 days</span><span>~${money(g.flight + g.night*4 + g.day*5)}</span></div></div>
  </div>${nav('')}`;
}
const envSave = async fn => { const s = D.settings(); fn(s); await D.saveSettings(s); render(); };
ACT.bName = (i, el) => envSave(s => s.envelopes[i].name = el.value);
ACT.bAmt = (i, el) => envSave(s => s.envelopes[i].amount = +el.value || 0);
ACT.bPer = i => envSave(s => s.envelopes[i].per = s.envelopes[i].per === 'each' ? 'shared' : 'each');
ACT.bDel = i => envSave(s => s.envelopes.splice(i, 1));
ACT.bAdd = () => envSave(s => s.envelopes.push({ name:'New', amount:0, per:'each' }));
ACT.gEdit = (k, el) => envSave(s => s.tripGuess[k] = +el.value || 0);

// ---------- how it works ----------
let howtoIdx = 0;
function renderHowto(app){
  const [a, b] = D.users2(); const an = D.anniversary(); const dayN = an ? ordinal(+an.slice(8)) : '23rd';
  const cards = [
    ["Look, it's our pals!", `This is ${esc(a.name)} and ${esc(b.name)}. ${esc(a.name)} and ${esc(b.name)} move closer as our next trip gets closer, and we sit together every ${dayN}. Tap yours to say or think something.`, `<div class="meet" style="height:150px"><i class="pal lg ${a.pal}" style="transform:translateX(38px)"></i><i class="pal lg ${b.pal}" style="transform:translateX(-38px) scaleX(-1)"></i></div>`],
    ['Memories', 'Tap + to log a memory: a message, photo, voice note, song, or cost… whatever helps us walk down memory lane!', `<div class="attach" style="margin-top:40px;pointer-events:none"><button><b>◫</b>Photo</button><button><b>▣</b>Polaroid</button><button><b>●</b>Voice</button><button><b>♫</b>Song</button><button><b>$</b>Cost</button></div>`],
    ['Trips', 'Every trip gets its own page: the days, our photos and polaroids, and a budget. Forward a flight or Airbnb email and it lands there on its own.', `<div class="mini"><div class="hd" style="font-size:30px">Vancouver</div><div class="sub" style="margin-top:2px">Oct 10 – 14 · day 2 of 5</div><div class="polas" style="padding:10px 0 4px;gap:10px"><div class="pola" style="transform:rotate(-4deg);width:92px;padding:5px 5px 17px"><div class="ph" style="height:88px"></div><span class="dt" style="font-size:8px">10 · 11 · 26</span></div><div class="pola" style="transform:rotate(3deg);margin-top:12px;width:92px;padding:5px 5px 17px"><div class="ph" style="height:88px;background:var(--tint)"></div><span class="dt" style="font-size:8px">10 · 12 · 26</span></div></div><div class="stats" style="margin-top:6px"><div><b style="font-size:22px">2</b><span class="l">days</span></div><div><b style="font-size:22px">3</b><span class="l">meals</span></div><div><b style="font-size:22px">7</b><span class="l">moments</span></div></div><div class="tiles" style="margin-top:12px"><button style="padding:10px 6px"><b style="font-size:12px">Days</b><span>Beach day</span></button><button style="padding:10px 6px"><b style="font-size:12px">Budget</b><span>$1,026</span></button><button style="padding:10px 6px"><b style="font-size:12px">Photos</b><span>11</span></button></div></div>`],
    ['Budget · Trips', 'We set up cost categories in the trip budget, then log what we actually spend as memories, with who paid.', `<div class="glass" style="margin-top:40px"><div class="row"><div><div class="l">Actual</div><div class="num">$1,026</div></div><div style="text-align:right"><div class="l">Planned</div><div class="num" style="color:var(--mu)">$1,300</div></div></div></div>`],
    ['Budget · Between visits', "Let's set a budget for how much we spend on each other in each category between visits.", `<div class="glass pill row" style="margin-top:40px;display:flex"><span class="l">${MONTHS[new Date().getMonth()]} budget</span><span style="font-size:13px;font-weight:500">${money(D.envelopeMonthly())}</span></div>`],
    ['Calendar', "Our plans and both our calendars in one place. Add manually or import from your Google Calendar, and hide any events you'd rather keep secret.", `<div class="cal" style="margin-top:30px;pointer-events:none"><div class="h">S</div><div class="h">M</div><div class="h">T</div><div class="h">W</div><div class="h">T</div><div class="h">F</div><div class="h">S</div><div>5</div><div class="ev">6</div><div>7</div><div>8</div><div>9</div><div class="trip s">10</div><div class="trip ours"><span>11</span></div><div class="trip">12</div><div class="trip e">13</div><div>14</div><div>15</div><div>16</div><div>17</div><div>18</div></div>`],
  ];
  const i = Math.min(howtoIdx, cards.length - 1); const [title, body, fig] = cards[i]; const last = i === cards.length - 1;
  app.innerHTML = `<div class="screen tut"><div class="bar"><span>How it works</span>${!last ? '<button data-act="howtoDone">Skip</button>' : '<span></span>'}</div>${fig}<div style="margin-top:auto"><div class="hd md">${title}</div><p>${body}</p></div><div class="row" style="margin-top:14px"><div class="dots">${cards.map((_,j) => `<i class="${j===i?'on':''}"></i>`).join('')}</div><span style="display:flex;gap:6px">${i ? '<button class="btn sm lite" data-act="howtoNav|-1">Back</button>' : ''}<button class="btn sm" data-act="${last ? 'howtoDone' : 'howtoNav|1'}">${last ? 'Start' : 'Next'}</button></span></div></div>`;
}
ACT.howtoNav = d => { howtoIdx += +d; render(); };
ACT.howtoDone = () => { howtoIdx = 0; go('home'); };

// ---------- trip emails (paste a confirmation) ----------
function renderEmails(app){
  emMode = null; const inbox = Store.all('inbox').sort((a,b) => b.at - a.at);
  app.innerHTML = `<div class="screen"><div class="bar">${route.id && D.trip(route.id) ? `<button data-go="trip/${route.id}">‹ ${esc(D.trip(route.id).city)}</button>` : '<button data-go="profile">‹ Profile</button>'}<span>Trip emails</span></div><h1 class="hd">Trip emails</h1>
    <div class="glass"><div class="l">Forward any confirmation to</div><div style="font-size:16px;font-weight:500;margin-top:4px">${CFG.INBOUND_EMAIL ? esc(CFG.INBOUND_EMAIL) : '<span class="muted">not set up yet</span>'}</div><div class="sub">Flights, stays, reservations, tickets. It lands in the right trip; you check it before it's added.${CFG.INBOUND_EMAIL ? '' : ' The setup guide has the forwarding piece.'}</div></div>
    <div class="list">${inbox.map(i => { const t = i.tripId ? D.trip(i.tripId) : null; const target = i.status === 'Review' ? 'reviewInbox|' + i.id : t ? 'inboxOpen|' + i.id : 'noop'; return `<div class="row"><button style="text-align:left;flex:1" data-act="${target}"><div style="font-weight:500">${esc(i.title)}</div><div class="l">${[i.dates && i.dates.length ? i.dates.map(fmtD).join(' & ') : '', t ? t.city : i.tripCity || '', i.amount ? money(i.amount) : '', 'added ' + fmtD(isoDate(new Date(i.at || Date.now())))].filter(Boolean).map(esc).join(' · ')}</div></button>${i.status === 'Review' ? '<span class="chip" style="font-size:10.5px">Review</span>' : ''}<button class="l" style="padding:6px 2px 6px 12px" data-act="inboxRemove|${i.id}" aria-label="Remove">✕</button></div>`; }).join('') || '<div class="empty">Nothing yet.</div>'}</div>
    <div class="glass deep"><div class="l">Paste or upload one</div><textarea class="in" id="em-text" style="margin-top:6px;min-height:80px" placeholder="Open the email, Select All, Copy, paste here."></textarea><div class="row" style="margin-top:8px"><button class="btn lite sm" data-act="emUpload">Upload PDF or photo</button><button class="btn sm" data-act="parseEmail">Read it</button></div><input type="file" id="em-file" accept="application/pdf,image/*" hidden data-act="emFile" data-on="change"><div class="l" id="em-status" style="margin-top:6px"></div></div>
    ${CFG.INBOUND_EMAIL ? '' : `<div class="glass" style="font-size:13px"><div style="font-weight:500">Set up forwarding</div><div class="sub" style="margin-top:4px">An address that drops emails straight in here. Two ways, both free.</div><div class="l" style="margin-top:8px">Without a domain</div><ol class="steps"><li>zapier.com → make a Zap: trigger <b>Email Parser by Zapier</b> (it gives you an address like something@robot.zapier.com).</li><li>Action: <b>Webhooks → POST</b> to your Supabase URL + <b>/rest/v1/docs</b> with the body from <b>supabase/functions-README.md</b>.</li><li>Put that address in <b>config.js</b> as <b>INBOUND_EMAIL</b>, re-deploy.</li></ol><div class="l" style="margin-top:8px">With a domain you own</div><ol class="steps"><li>Cloudflare → Email Routing → route <b>trips@yourdomain</b> to a Worker.</li><li>Paste the email worker from <b>supabase/functions-README.md</b>, add the two secrets.</li><li>Put the address in <b>config.js</b>, re-deploy.</li></ol></div>`}
  </div>${nav('')}`;
}
const NOT_AIRPORT = /^(THE|AND|FOR|NEW|YOU|ARE|CAD|USD|PST|PDT|EST|EDT|CST|CDT|MST|MDT|UTC|GMT|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|MON|TUE|WED|THU|FRI|SAT|SUN|SEAT|ROW|PNR|REF|TAX|FEE|ALL|ONE|TWO|OUT|PER|VIA|WWW|COM|PDF)$/;
function routeOf(line){ if (!/(→|->|–|—| - | to )/i.test(line)) return null; const codes = (line.match(/\b[A-Z]{3}\b/g) || []).filter(c => !NOT_AIRPORT.test(c)); if (codes.length < 2 || codes[0] === codes[1]) return null; return [codes[0], codes[1]]; }
const AIRPORTS = { YVR:'Vancouver', YYZ:'Toronto', YTZ:'Toronto', YUL:'Montreal', YYC:'Calgary', YEG:'Edmonton', YOW:'Ottawa', YHZ:'Halifax', YWG:'Winnipeg', YQB:'Quebec City', YXE:'Saskatoon', YQR:'Regina', YYJ:'Victoria', YLW:'Kelowna', YXX:'Abbotsford', SEA:'Seattle', SFO:'San Francisco', LAX:'Los Angeles', SAN:'San Diego', JFK:'New York', EWR:'New York', LGA:'New York', ORD:'Chicago', BOS:'Boston', MIA:'Miami', LAS:'Las Vegas', DEN:'Denver', ATL:'Atlanta', PDX:'Portland', PHX:'Phoenix', AUS:'Austin', DFW:'Dallas', IAH:'Houston', MCO:'Orlando', LHR:'London', LGW:'London', CDG:'Paris', AMS:'Amsterdam', FCO:'Rome', BCN:'Barcelona', MAD:'Madrid', LIS:'Lisbon', DUB:'Dublin', MEX:'Mexico City', CUN:'Cancún', SJD:'Los Cabos', PVR:'Puerto Vallarta', HNL:'Honolulu', OGG:'Maui', NRT:'Tokyo', HND:'Tokyo', ICN:'Seoul', TPE:'Taipei', HKG:'Hong Kong', SIN:'Singapore', BKK:'Bangkok', SYD:'Sydney' };
function cityForCode(text, code){ if (!code) return ''; const m = text.match(new RegExp('([A-Z][a-z\\u00C0-\\u017F.]+(?: [A-Z][a-z\\u00C0-\\u017F.]+)?)\\s*(?:\\(|-|–)\\s*' + code + '\\b')); const name = m ? m[1].replace(/\\s+(International|Airport|Pearson|Intl\\.?)$/i, '').trim() : ''; return name || AIRPORTS[code] || code; }
function parseConfirmation(text){
  // PDFs often come out as "04 : 30 PM" and "$ 23.10"
  const T = text.replace(/\r/g,'').replace(/(\d)[ \t]+:[ \t]*(\d{2})\b/g, '$1:$2').replace(/(\$)[ \t]+(?=\d)/g, '$1'); const up = T.toUpperCase();
  const r = { kind:'other', title:'Booking' };
  // a flight number only counts when the email is about flying (a tax number like "RT0001" isn't a flight)
  const airy = /\b(FLIGHTS?|AIRLINES?|AIRWAYS|BOARDING|DEPARTS?|DEPARTURE|ARRIVES?|ARRIVAL|ITINERARY|AIR CANADA|WESTJET|PORTER|FLAIR|DELTA|UNITED|AMERICAN AIRLINES|ALASKA|LYNX|SWOOP|JETBLUE|SOUTHWEST|AEROPLAN)\b/.test(up);
  const fl = T.match(/\b([A-Z][A-Z0-9]|\d[A-Z])\s?(\d{2,4})\b(?![\d:])/); if (fl && airy && !/^(AM|PM)$/.test(fl[1])) { r.kind = 'flight'; r.no = fl[1] + ' ' + fl[2]; }
  // a route: anywhere in a flight email, otherwise only two real airports on one line
  const ap = airy ? routeOf(T) : (T.split('\n').map(routeOf).find(x => x && AIRPORTS[x[0]] && AIRPORTS[x[1]]) || null); if (ap) { r.from = ap[0]; r.to = ap[1]; r.kind = 'flight'; }
  if (/AIRBNB|CHECK-?IN|NIGHTS?\b|HOTEL|VRBO/.test(up) && r.kind !== 'flight') r.kind = 'stay';
  if (/RESERVATION|TABLE FOR|OPENTABLE|RESY\b|PARTY OF|RESTAURANT/.test(up) && r.kind === 'other') r.kind = 'reservation';
  if (/SHOWTIME|CINEMA|MOVIE|TICKETS?\b|ADMISSION|CONCERT|THEATRE|THEATER|STADIUM|ARENA|FESTIVAL|MUSEUM|GALLERY|TICKETMASTER|EVENTBRITE|SEAT\(S\)|YOUR SEATS?/.test(up) && r.kind === 'other') r.kind = 'event';
  if (/\bTRAIN\b|VIA RAIL|AMTRAK|GREYHOUND|FERRY|FERRIES|CAR RENTAL|RENTAL CAR|HERTZ|ENTERPRISE RENT|\bAVIS\b|BUDGET RENT|\bBUS\b/.test(up) && r.kind === 'other') r.kind = 'transport';
  const money = T.match(/(?:CA?\$|USD|\$)\s?([\d,]+(?:\.\d{2})?)/g); if (money) { const nums = money.map(m => +m.replace(/[^\d.]/g,'')); r.amount = Math.max(...nums); }
  const code = T.match(/(?:confirmation|booking|reference|record locator|PNR)[^A-Z0-9\n]{0,30}\b([A-Z0-9]{5,8})\b/i); if (code) r.code = code[1];
  const dates = []; const re = /(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?(?:\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d))?(?:,?\s+(\d{4}))?/gi; let m; while ((m = re.exec(T))) { const day = +(m[3] || m[1]); if (!day) continue; const mon = MON.findIndex(x => m[2].slice(0,3).toLowerCase() === x.toLowerCase()); const yr = +(m[4] || new Date().getFullYear()); dates.push(isoDate(new Date(yr, mon, day))); }
  const iso = T.match(/\b(\d{4}-\d{2}-\d{2})\b/g); if (iso) dates.push(...iso);
  r.dates = [...new Set(dates)].sort(); r.date = r.dates[0];
  const times = T.match(/\b\d{1,2}:\d{2}\s?(?:[ap]\.?m\.?)?/gi) || []; r.dep = (times[0] || '').trim(); r.arr = (times[1] || '').trim();
  // flight legs: each line with a route; nearest date/times/flight number on or after that line
  r.legs = []; if (r.kind === 'flight') { const L = T.split('\n'); L.forEach((line, i) => { const rt = routeOf(line); if (!rt) return; let nx = L.findIndex((x, j) => j > i && routeOf(x)); if (nx < 0) nx = L.length; const after = L.slice(i, Math.min(nx, i+6)).join('\n'); const before = L.slice(Math.max(0,i-3), i).join('\n'); const dateRe = /(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?(?:\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d))?(?:,?\s+(\d{4}))?/i; const hasDate = x => dateRe.test(x) || /\b\d{4}-\d{2}-\d{2}\b/.test(x); let dA = -1, dB = -1; for (let j = i; j < Math.min(nx, i+6); j++) if (hasDate(L[j])) { dA = j - i; break; } for (let j = i-1; j >= Math.max(0, i-3); j--) if (hasDate(L[j])) { dB = i - j; break; } const win = dA < 0 ? before : (dB < 0 || dA <= dB) ? after : before; const dm = win.match(/(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?(?:\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d))?(?:,?\s+(\d{4}))?/i); let date = ''; if (dm && (dm[3]||dm[1])) { const mon = MON.findIndex(x => dm[2].slice(0,3).toLowerCase() === x.toLowerCase()); date = isoDate(new Date(+(dm[4]||new Date().getFullYear()), mon, +(dm[3]||dm[1]))); } const iso = win.match(/\b(\d{4}-\d{2}-\d{2})\b/); if (!date && iso) date = iso[1]; const tm = (after.match(/\b\d{1,2}:\d{2}\s?(?:[ap]\.?m\.?)?/gi) || []).map(x => x.trim()); const FN = /\b([A-Z][A-Z0-9]|\d[A-Z])\s?(\d{2,4})\b(?![\d:])/; let pv = -1; for (let j = i-1; j >= 0; j--) if (routeOf(L[j])) { pv = j; break; } let fn = line.match(FN); for (let d = 1; !fn && d <= 5; d++) { if (i-d > pv && L[i-d]) fn = L[i-d].match(FN); if (!fn && i+d < nx && L[i+d]) fn = L[i+d].match(FN); } if (r.legs.some(l => l.from === rt[0] && l.to === rt[1] && l.date === date)) return; r.legs.push({ from: rt[0], to: rt[1], date, dep: tm[0]||'', arr: tm[1]||'', no: fn && !/^(AM|PM)$/.test(fn[1]) ? fn[1] + ' ' + fn[2] : (r.no||'') }); }); if (!r.legs.length && r.from) r.legs.push({ from: r.from, to: r.to, date: r.date||'', dep: r.dep, arr: r.arr, no: r.no||'' }); r.legs = r.legs.slice(0, 4); if (r.legs[0] && r.legs[0].date) r.date = r.legs[0].date; if (r.legs.length > 1 && r.legs[r.legs.length-1].date) r.dates = [...new Set([r.legs[0].date, r.legs[r.legs.length-1].date].filter(Boolean))].sort(); }
  const city = T.match(/\b(?:to|in)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/); r.city = city ? city[1] : '';
  const line = T.split('\n').map(s => s.trim()).find(s => /airbnb|hotel|restaurant|air canada|westjet|porter|flair|delta|united|american|opentable/i.test(s)); r.title = r.kind === 'flight' ? (r.no ? 'Flight ' + r.no : 'Flight') : r.kind === 'stay' ? 'Stay' + (r.city ? ' · ' + r.city : '') : r.kind === 'reservation' ? 'Reservation' : (line || 'Booking').slice(0, 40);
  if (r.kind !== 'flight') bookingDetails(T, r);
  r.trip = r.date ? (D.tripForDate(r.date) || D.trips().find(t => Math.abs(daysBetween(t.start, r.date)) <= 2) || null) : null;
  return r;
}
ACT.noop = () => {};
ACT.emUpload = () => $('#em-file').click();
ACT.emFile = async (a, f) => { const file = f.files[0]; if (!file) return; const st = $('#em-status'); st.textContent = 'Reading…'; try { const text = file.type === 'application/pdf' ? await pdfText(file) : await ocrText(file, p => st.textContent = 'Reading… ' + Math.round(p*100) + '%'); $('#em-text').value = text; st.textContent = ''; const mode = emMode; emMode = null; reviewEmail(text, null, file, mode); } catch (e) { st.textContent = 'Could not read that file: ' + e.message; } };
// tickets, tables, trains: read the labelled bits ("Movie: …", "Date: …", "Time: …", "Total: …")
function bookingDetails(T, r){
  const stop = '(?=\\s{2,}|\\s+(?:Subtotal|Sub-total|Tax|Total|Booking|Points|Payment|Screen|Date|Time|Cinema|Venue|Seats?|Seat\\(s\\)|Tickets?|Admission|Party|Guests?)\\b|\\n|$)';
  const field = names => { const m = T.match(new RegExp('\\b(?:' + names + ')\\s*:\\s*(.+?)' + stop, 'i')); return m ? m[1].trim().replace(/[,;]$/, '') : ''; };
  const what = field('Movie|Film|Event|Show|Performance|Experience|Activity|Restaurant');
  const where = field('Cinema|Theatre|Theater|Venue|Location|Restaurant|Address|Place');
  r.seats = field('Your Seat\\(s\\)|Seats?|Seat\\(s\\)'); const ref = field('Booking reference|Booking ref|Confirmation number|Confirmation #|Confirmation code|Reference number|Reference'); if (ref && /^[A-Z0-9-]{4,14}$/i.test(ref)) r.code = ref; else if (r.code && !/\d/.test(r.code)) r.code = '';
  const party = T.match(/(?:table|party) (?:for|of) (\d+)/i) || T.match(/(?:total # of tickets|tickets?|guests?)\s*:?\s*(\d+)\b/i); if (party) r.people = +party[1];
  // the date / time that's labelled, not the email's own "Sent: Oct 4"
  const dl = T.split('\n').find(l => /\b(?:show ?)?date\s*:/i.test(l) && !/(transaction|purchase|order|booking|issue)\s*date/i.test(l));
  if (dl) { const dm = dl.match(/(?:(\d{1,2})(?:st|nd|rd|th)?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?(?:\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d))?(?:,?\s+(\d{4}))?/i); const iso = dl.match(/\b(\d{4}-\d{2}-\d{2})\b/); if (dm && (dm[3] || dm[1])) { const mon = MON.findIndex(x => dm[2].slice(0,3).toLowerCase() === x.toLowerCase()); r.date = isoDate(new Date(+(dm[4] || new Date().getFullYear()), mon, +(dm[3] || dm[1]))); } else if (iso) r.date = iso[1]; }
  const tl = T.match(/\b(?:show ?)?time\s*:\s*(\d{1,2}:\d{2}\s?(?:[ap]\.?m\.?)?)/i) || T.match(/\bat\s+(\d{1,2}:\d{2}\s?[ap]\.?m\.?)/i); if (tl) r.dep = tl[1].trim();
  // the total paid, not the biggest number on the page
  const tot = [...T.matchAll(/\b(grand total|total paid|amount paid|payment amount|order total|total charged|total)\b[^\d\n$]{0,24}(?:CA?\$|US\$|\$)?\s?([\d,]+\.\d{2})/gi)].filter(m => !/sub/i.test(T.slice(Math.max(0, m.index - 4), m.index)));
  if (tot.length) { const best = tot.find(m => /paid|payment|grand|charged/i.test(m[1])) || tot[tot.length - 1]; r.amount = +best[2].replace(/,/g, ''); }
  r.what = what; r.place = where;
  const brand = (T.match(/\b(Landmark Cinemas?|Cineplex|AMC|Regal|Ticketmaster|Eventbrite|OpenTable|Resy|Tock|VIA Rail|Amtrak|BC Ferries)\b/i) || [])[1] || '';
  if (r.kind === 'event') r.title = what || (brand ? brand + ' tickets' : 'Tickets');
  else if (r.kind === 'reservation') r.title = what ? what : where ? 'Dinner at ' + where : 'Reservation';
  else if (r.kind === 'transport') r.title = what || (brand || 'Transport');
  else if (r.kind === 'other' && what) r.title = what;
  if (!r.place && brand && r.kind !== 'stay') r.place = brand;
  return r;
}
async function loadScript(src){ if (document.querySelector(`script[src="${src}"]`)) return; await new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => rej(new Error('library did not load')); document.head.appendChild(el); }); }
async function pdfText(file){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let out = []; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const c = await page.getTextContent(); let line = '', lastY = null; c.items.forEach(it => { if (lastY !== null && Math.abs(it.transform[5] - lastY) > 4) { out.push(line); line = ''; } line += (line ? ' ' : '') + it.str; lastY = it.transform[5]; }); out.push(line); } return out.join('\n'); }
async function ocrText(file, onProgress){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js'); const r = await window.Tesseract.recognize(file, 'eng', { logger: m => { if (m.status === 'recognizing text' && onProgress) onProgress(m.progress); } }); return r.data.text; }
ACT.inboxOpen = id => { const i = Store.get('inbox', id); if (i && i.tripId && D.trip(i.tripId)) go('trip', { id: i.tripId }); };
ACT.inboxRemove = async id => { const i = Store.get('inbox', id); if (!i) return; if (!await ask('Remove from this list?', { sub: i.status === 'Review' ? 'It hasn\'t been added to anything.' : 'Whatever it added stays in your trip.', ok: 'Remove' })) return; await Store.remove(id); render(); };
ACT.reviewInbox = id => { const i = Store.get('inbox', id); reviewEmail(i.raw || '', i); };
ACT.parseEmail = () => { const text = $('#em-text').value; if (!text.trim()) return; const mode = emMode; emMode = null; reviewEmail(text, null, null, mode); };
// What kind of booking it is decides where it goes: flights onto the trip's days, a stay as a booking,
// tickets / tables / trains as a plan on the calendar (at their time) with the cost in the right category.
const BOOK_KINDS = [['flight', 'Flight'], ['stay', 'Stay'], ['event', 'Event'], ['reservation', 'Food'], ['transport', 'Transport'], ['other', 'Other']];
const BOOK_TAG = { flight: 'flight', stay: 'stay', event: 'fun', reservation: 'food', transport: 'transit', other: 'fun' };
let emMode = null;   // 'newTrip' when the booking is starting a trip
function reviewEmail(text, inboxItem, file, mode){
  mode = mode || null;
  const r = parseConfirmation(text); const me = D.me(); let paidBy = me.id, flyer = me.id; if (r.kind === 'flight' && r.legs && r.legs[0]) { const land = (cityForCode(text, r.legs[0].to) || '').toLowerCase().split(/[ ,]/)[0]; const home = D.users().find(u => land && (u.city||'').toLowerCase().split(/[ ,]/)[0] === land); const away = home && D.users().find(u => u.id !== home.id); if (away) { flyer = away.id; paidBy = away.id; } }
  let tripId = (route.name === 'emails' && route.id && D.trip(route.id)) ? route.id : (r.trip ? r.trip.id : ''); let ddOpen = false; let legs = (r.legs && r.legs.length ? r.legs : [{ from: r.from||'', to: r.to||'', date: r.date||today(), dep: r.dep||'', arr: r.arr||'', no: r.no||'' }]);
  r.time = r.time || (r.kind !== 'flight' ? r.dep || '' : ''); r.note = [r.seats ? 'Seats ' + r.seats : '', r.people ? r.people + (r.kind === 'reservation' ? ' people' : ' tickets') : '', r.code ? 'Ref ' + r.code : ''].filter(Boolean).join(' · ');
  // starting a new trip from this booking: city where the first flight lands, dates from the first to the last
  const guessNew = () => { const to = r.kind === 'flight' ? cityForCode(text, legs[0].to) : (r.city || ''); const start = (r.kind === 'flight' ? legs[0].date : r.date) || today(); const lastLeg = legs.length > 1 ? legs[legs.length - 1].date : ''; const end = r.kind === 'flight' && lastLeg > start ? lastLeg : (r.dates && r.dates[1] && r.dates[1] > start ? r.dates[r.dates.length - 1] : addDays(start, 4)); return { city: to, start, end }; };
  let nt = mode === 'newTrip' ? guessNew() : null; if (nt) tripId = '';
  const kindLabel = k => (BOOK_KINDS.find(x => x[0] === k) || ['', 'Booking'])[1];
  const draw = () => { const trip = tripId ? D.trip(tripId) : null; const users = D.users2(); const fl = r.kind === 'flight';
    return `<div class="bar"><span>${nt ? 'New trip from a booking' : 'From email'}</span><span>${inboxItem ? 'forwarded' : 'just now'}</span></div><h2 class="hd md" style="margin:0">${esc(kindLabel(r.kind))}${fl && legs.length > 1 ? ' · ' + legs.length + ' legs' : ''}</h2>
    <div class="chips">${BOOK_KINDS.map(([k, l]) => `<button class="chip ${r.kind === k ? 'on' : ''}" data-act="rKind|${k}">${l}</button>`).join('')}</div>
    ${fl ? legs.map((l, i) => `<div class="glass deep"><div class="row"><input class="in" data-leg="${i},route" style="background:transparent;border:0;padding:0;font-size:20px;font-weight:500;letter-spacing:-.02em;width:58%" value="${esc((l.from||'')+(l.from?' → ':'')+(l.to||''))}" placeholder="YYZ → YVR"><input class="in" data-leg="${i},no" style="background:transparent;border:0;padding:0;font-size:11px;text-align:right;width:38%" value="${esc(l.no||'')}" placeholder="AC 112"></div><div class="row" style="margin-top:4px"><input class="in" type="date" data-leg="${i},date" value="${l.date||today()}" style="padding:4px 8px;font-size:12px;width:auto"><span style="display:flex;gap:4px;align-items:center"><input class="in" data-leg="${i},dep" value="${esc(l.dep)}" placeholder="dep" style="width:66px;padding:4px 8px;font-size:12px"> – <input class="in" data-leg="${i},arr" value="${esc(l.arr)}" placeholder="arr" style="width:66px;padding:4px 8px;font-size:12px"></span></div></div>`).join('')
      : `<div class="glass deep"><input class="in" id="r-title" style="background:transparent;border:0;padding:0;font-size:20px;font-weight:500" value="${esc(r.title)}" placeholder="What is it?"><input class="in" id="r-place" style="background:transparent;border:0;padding:2px 0 0;font-size:13px;color:var(--fg2)" value="${esc(r.place||'')}" placeholder="Where"><div class="row" style="margin-top:6px;justify-content:flex-start;gap:6px;flex-wrap:wrap"><input class="in" type="date" id="r-date" value="${r.date||today()}" style="padding:4px 8px;font-size:12px;width:auto">${r.kind === 'stay' ? '' : `<input class="in" id="r-time" value="${esc(r.time||'')}" placeholder="time" style="width:86px;padding:4px 8px;font-size:12px">`}</div><input class="in" id="r-note" style="background:transparent;border:0;padding:6px 0 0;font-size:12px;color:var(--mu)" value="${esc(r.note||'')}" placeholder="Seats, people, reference…"></div>`}
    <div class="list" style="font-size:13.5px">
      ${nt ? `<div class="row"><span>New trip</span><input class="in" id="r-ncity" value="${esc(nt.city)}" placeholder="City" style="width:150px;padding:4px 8px;font-size:13px;text-align:right"></div><div class="row"><span>Dates</span><span style="display:flex;gap:4px;align-items:center"><input class="in" type="date" id="r-nstart" value="${nt.start}" style="padding:4px 6px;font-size:12px;width:auto">–<input class="in" type="date" id="r-nend" value="${nt.end}" style="padding:4px 6px;font-size:12px;width:auto"></span></div>`
        : `<div class="row" style="position:relative"><span>Trip</span><span style="position:relative"><button class="chip on" data-act="rDD">${trip ? esc(trip.city) + ' · ' + fmtD(trip.start) : 'No trip'} ${ddOpen?'▴':'▾'}</button>${ddOpen ? `<div class="dd"><button data-act="rPick|none"><span class="${tripId ? 'muted' : ''}">No trip</span></button>${D.trips().slice().reverse().map(x => `<button data-act="rPick|${x.id}"><span style="${x.id===tripId?'font-weight:500':''}">${esc(x.city)} · ${fmtD(x.start)} – ${fmtD(x.end)}</span></button>`).join('')}<button data-act="rPick|new"><span class="muted">+ New trip from this</span></button></div>` : ''}</span></div>`}
      <div class="row"><span>Cost</span><span style="display:flex;align-items:center;font-weight:500">$<input class="in" id="r-amt" type="number" value="${r.amount||''}" style="width:90px;padding:4px 8px;font-size:13px"></span></div>
      ${fl ? `<div class="row"><span>Who flies</span><div class="seg" style="width:130px">${users.map(u => `<button class="${flyer===u.id?'on':''}" data-act="rFlyer|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div>` : ''}
      <div class="row"><span>Paid by</span><div class="seg" style="width:130px">${users.map(u => `<button class="${paidBy===u.id?'on':''}" data-act="rPaid|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div>
      ${!fl && r.kind !== 'stay' ? `<div class="row"><span class="l">Goes on the calendar as a plan${r.amount ? ` · cost under ${esc(trip || nt ? D.catLabel(trip, BOOK_TAG[r.kind]) : 'no trip budget')}` : ''}</span><span></span></div>` : ''}
    </div>
    <div class="row"><button class="btn sm lite" data-act="closeSheet">Cancel</button><button class="btn sm" data-act="addFromEmail">${nt ? 'Create trip' : trip ? 'Add to trip' : 'Add'}</button></div>`; };
  const keep = () => { document.querySelectorAll('[data-leg]').forEach(el => { const [i, k] = el.dataset.leg.split(','); const l = legs[+i]; if (k === 'route') { const [f, t] = el.value.split('→').map(x => (x||'').trim().toUpperCase()); l.from = f; l.to = t; } else l[k] = el.value.trim(); }); const amt = $('#r-amt'); if (amt) r.amount = +amt.value || 0; const v = id => { const el = $(id); return el ? el.value.trim() : null; }; const tt = v('#r-title'); if (tt != null) r.title = tt; const dt = v('#r-date'); if (dt) r.date = dt; const tm = v('#r-time'); if (tm != null) r.time = tm; const pl = v('#r-place'); if (pl != null) r.place = pl; const no = v('#r-note'); if (no != null) r.note = no; if (nt) { const c = v('#r-ncity'); if (c != null) nt.city = c; const a = v('#r-nstart'), b = v('#r-nend'); if (a) nt.start = a; if (b) nt.end = b; } };
  const redraw = () => { keep(); openSheet(draw(), null, 'tall'); };
  ACT.rKind = k => { keep(); const was = r.kind; r.kind = k; if (k === 'flight' && was !== 'flight' && !legs[0].date) legs[0].date = r.date || today(); if (was === 'flight' && k !== 'flight' && (!r.title || /^Flight/.test(r.title))) r.title = ''; redraw(); };
  ACT.rDD = () => { ddOpen = !ddOpen; redraw(); };
  ACT.rPick = async id => { keep(); if (id === 'new') { const g = guessNew(); const city = await ask('Which city is this trip?', { input: g.city || r.city || '', ok: 'Add trip' }); if (!city) return; const t = await Store.put('trips', { id: Store.uid(), city, start: g.start, end: g.end, flyer: r.kind === 'flight' ? flyer : '', createdAt: Date.now() }); tripId = t.id; } else tripId = id === 'none' ? '' : id; ddOpen = false; redraw(); };
  ACT.rPaid = id => { keep(); paidBy = id; redraw(); };
  ACT.rFlyer = id => { keep(); flyer = id; redraw(); };
  ACT.addFromEmail = async () => {
    keep(); const kind = r.kind;
    if (nt) { if (!nt.city) return toast('Which city?'); const t = await Store.put('trips', { id: Store.uid(), city: nt.city, start: nt.start, end: nt.end < nt.start ? nt.start : nt.end, flyer: kind === 'flight' ? flyer : '', createdAt: Date.now() }); tripId = t.id; nt = null; }
    const trip = tripId ? D.trip(tripId) : null; const tag = BOOK_TAG[kind] || 'fun';
    if (trip && Array.isArray(trip.hidden) && trip.hidden.includes(tag)) { trip.hidden = trip.hidden.filter(k => k !== tag); await Store.put('trips', trip); }
    const attachment = file ? { asset: await Store.putBlob(file, (file.name.split('.').pop() || 'bin').toLowerCase().slice(0,5)), name: file.name, type: file.type } : null;
    if (kind === 'flight') { const out = []; for (const [i, l] of legs.entries()) { if (!l.from && !l.to) continue; const date = l.date || (trip ? (i ? trip.end : trip.start) : today());
        // re-adding the same email updates the flight instead of making a copy
        const prev = D.moments().find(x => x.flight && x.date === date && x.flight.from === l.from && x.flight.to === l.to && (x.flight.no||'') === (l.no||''));
        const m = prev ? JSON.parse(JSON.stringify(prev)) : { id: Store.uid(), authorId: me.id, kind: 'booking', createdAt: Date.now() + i, cost: null };
        Object.assign(m, { tripId: trip ? trip.id : '', date, text: 'Flight ' + l.from + ' → ' + l.to, flight: Object.assign({}, m.flight || {}, { no: l.no, from: l.from, to: l.to, dep: l.dep, arr: l.arr, code: r.code || '', who: flyer }) });
        if (i === 0 && r.amount) m.cost = Object.assign({}, m.cost || {}, { amount: r.amount, paidBy, tag: 'flight' });
        if (attachment) m.attachment = attachment;
        out.push(m); }
      // one flight = one cost: if an older copy of this booking carried the cost on another leg, keep only the first
      if (r.amount) out.slice(1).forEach(m => { if (m.cost && m.cost.tag === 'flight' && +m.cost.amount === +r.amount) m.cost = null; });
      await Store.putMany('moments', out); if (trip) { const ds = legs.map(l => l.date).filter(Boolean).sort(); let ch = false; if (ds[0] && ds[0] < trip.start) { trip.start = ds[0]; ch = true; } if (ds.length && ds[ds.length-1] > trip.end) { trip.end = ds[ds.length-1]; ch = true; } if (!trip.flyer) { trip.flyer = flyer; ch = true; } if (ch) await Store.put('trips', trip); } }
    else { const date = r.date || today(); const title = r.title || kindLabel(kind); const dup = D.moments().find(x => (x.text === title || x.title === title) && x.date === date && (+((x.cost||{}).amount||0)) === (+(r.amount||0)));
      if (!dup) { const plan = kind !== 'stay'; const m = { id: Store.uid(), tripId: trip ? trip.id : '', date, authorId: me.id, kind: plan ? 'plan' : 'booking', text: title, createdAt: Date.now(), cost: r.amount ? { amount: r.amount, paidBy, tag } : null, booking: kind };
        if (plan) Object.assign(m, { title, time: to24(r.time), who: 'both', note: [r.place, r.note].filter(Boolean).join(' · '), place: r.place ? { name: r.place } : null });
        if (attachment) m.attachment = attachment; await Store.put('moments', m); } }
    await Store.put('inbox', Object.assign({ id: Store.uid(), at: Date.now() }, inboxItem || {}, { title: kind === 'flight' ? 'Flight ' + legs.map(l => l.from + '→' + l.to).join(', ') + (legs[0] && legs[0].no ? ' · ' + legs[0].no.split(' ')[0] : '') : (r.title || kindLabel(kind)), kind, tripCity: trip ? trip.city : '', tripId: trip ? trip.id : '', dates: kind === 'flight' ? legs.map(l => l.date).filter(Boolean) : [r.date || today()], amount: r.amount || 0, status: 'Added', raw: '' }));
    closeSheet(); toast('Added'); if (trip) go('trip', { id: trip.id }); else render();
  };
  openSheet(draw(), null, 'tall');
}
// "4:30 PM" → "16:30" so plans sort and show like ones typed in
function to24(s){ const h = hm2(s); return h == null ? '' : String(Math.floor(h / 60)).padStart(2, '0') + ':' + String(h % 60).padStart(2, '0'); }
// add a booking from anywhere (calendar +, trips +): paste or upload, then the same review
ACT.bookingSheet = mode => { emMode = mode || null;
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${emMode === 'newTrip' ? 'New trip' : 'Add a booking'}</span></div><h2 class="hd md" style="margin:0">${emMode === 'newTrip' ? 'From a booking' : 'Add a booking'}</h2><div class="sub" style="text-align:left">${emMode === 'newTrip' ? 'Upload the itinerary (PDF or a screenshot) or paste the email — the trip is made from it.' : 'Flights, stays, tickets, reservations, trains. Upload the PDF or a screenshot, or paste the email.'}</div>
    <button class="btn block" data-act="emUpload">Upload PDF or photo</button><textarea class="in" id="em-text" style="min-height:90px" placeholder="…or paste the email here"></textarea><div class="row"><span class="l" id="em-status"></span><button class="btn sm lite" data-act="parseEmail">Read it</button></div><input type="file" id="em-file" accept="application/pdf,image/*" hidden data-act="emFile" data-on="change">`); };

// ---------- memories ----------
let memMonth = null;
function renderMemories(app){
  const now = new Date(); if (!memMonth) memMonth = { y: now.getFullYear(), m: now.getMonth() };
  const ym = `${memMonth.y}-${String(memMonth.m+1).padStart(2,'0')}`, first = ym + '-01', last = ym + '-' + String(new Date(memMonth.y, memMonth.m+1, 0).getDate()).padStart(2,'0');
  const future = first > today(); const cur = today().startsWith(ym);
  const trips = D.trips().filter(t => t.start <= last && t.end >= first);
  const ms = D.moments().filter(m => m.date >= first && m.date <= last && m.kind !== 'booking' && m.kind !== 'plan');
  const daysTogether = trips.reduce((s,t) => { const a = t.start > first ? t.start : first, b = (t.end < last ? t.end : last); const cap = cur ? today() : b; return s + Math.max(0, daysBetween(a, b < cap ? b : cap) + 1) * (a <= cap ? 1 : 0); }, 0);
  const meals = D.moments().filter(m => m.date >= first && m.date <= last && D.costLines(m).some(c => c.tag === 'food'));
  const inMonth = D.moments().filter(m => m.date >= first && m.date <= last && m.tripId);
  const tripsCost = inMonth.filter(m => !(D.trip(m.tripId)||{}).occasion).reduce((s,m) => s + D.costTotal(m), 0);
  const occCost = inMonth.filter(m => (D.trip(m.tripId)||{}).occasion).reduce((s,m) => s + D.costTotal(m), 0);
  const env = future ? 0 : D.envelopeMonthly(); const total = tripsCost + occCost + env;
  const months = D.anniversary() ? D.monthsSince(first) : null; const anniDay = D.anniversary() ? ym + '-' + D.anniversary().slice(8) : '';
  const anniMoments = anniDay ? ms.filter(m => m.date === anniDay) : [];
  const upcoming = D.trips().filter(t => t.start >= (cur ? today() : first) && t.start <= last);
  const plans = D.moments().filter(m => m.kind === 'plan' && m.date >= first && m.date <= last && m.date >= today());
  const all = { trips: D.trips().filter(t => t.start <= today()).length, days: D.trips().filter(t => t.start <= today()).reduce((s,t) => s + Math.min(daysBetween(t.start, t.end)+1, daysBetween(t.start, today())+1), 0), moments: D.moments().filter(m => m.kind === 'moment').length };
  const dash = v => future ? '–' : v;
  const prev = new Date(memMonth.y, memMonth.m-1, 1), next = new Date(memMonth.y, memMonth.m+1, 1);
  app.innerHTML = `<div class="screen"><div class="bar"><span>Memories · ${memMonth.y}</span><button data-go="profile">${palOf(D.me().id)} Profile</button></div>
    ${months != null && months >= 0 ? `<div class="l center" style="margin-top:6px">Month ${months} <i class="heart"></i></div>` : ''}
    <div class="monthnav" style="margin-top:-10px"><button class="l" data-act="memNav|-1">‹ ${MON[prev.getMonth()]}</button><h1 class="hd">${MONTHS[memMonth.m]}</h1><button class="l" data-act="memNav|1">${MON[next.getMonth()]} ›</button></div>
    <div class="stats"><div><b>${dash(trips.length)}</b><span class="l">trip${trips.length===1?'':'s'}</span></div><div><b>${dash(daysTogether)}</b><span class="l">days</span></div><div><b>${dash(meals.length)}</b><span class="l">meals</span></div><div><b>${dash(ms.length)}</b><span class="l">moments</span></div></div>
    ${trips.filter(t => t.start <= today()).length ? `<div class="covers">${trips.filter(t => t.start <= today()).slice(0,3).map(cover).join('')}</div>` : ''}
    ${future || (cur && upcoming.length) ? upcoming.map(t => `<button class="glass tap" data-go="trip/${t.id}"><div class="row"><span class="l">Coming up</span><span class="l">${fmtD(t.start)} – ${fmtD(t.end)}</span></div><div class="row" style="margin-top:8px"><span style="font-size:20px;font-weight:500;letter-spacing:-.02em">${esc(t.city)}</span><span class="sub">${daysBetween(today(), t.start)} days</span></div></button>`).join('') : ''}
    ${!future ? `<div class="glass"><div class="row"><span class="l">Together in ${MONTHS[memMonth.m]}</span><span class="l">${daysTogether ? '~' + money(total/daysTogether) + ' / day' : tripsCost ? '' : 'envelopes only'}</span></div><div class="num" style="margin-top:8px">${money(total)}</div>${tripsCost || occCost ? `<div class="l" style="margin-top:4px">${[tripsCost ? 'Trips ' + money(tripsCost) : '', occCost ? 'occasions ' + money(occCost) : '', 'envelopes ' + money(env)].filter(Boolean).join(' · ')}</div>` : ''}</div>` : ''}
    ${anniDay && (future || anniDay >= today() || plans.length) ? `<div class="list" style="font-size:13.5px">${anniDay >= today() ? `<button class="row" data-go="day/${(D.tripForDate(anniDay)||{}).id||'none'}_${anniDay}"><span>${fmtD(anniDay)}</span><span class="l">${D.monthsSince(anniDay)} months <i class="heart"></i></span></button>` : ''}${plans.map(p => `<button class="row" data-go="day/${p.tripId||'none'}_${p.date}"><span>${esc(p.title)}</span><span class="l">${fmtD(p.date)} · planned</span></button>`).join('')}</div>` : ''}
    ${(() => { const bds = D.users().filter(u => u.birthday && u.birthday.slice(5,7) === ym.slice(5,7)); return bds.length ? `<div class="list" style="font-size:13.5px">${bds.map(u => { const d = ym + u.birthday.slice(7); return `<button class="row" data-go="day/${(D.tripForDate(d)||{}).id||'none'}_${d}"><span>${u.id === D.me().id ? 'Your birthday' : esc(u.name) + '\'s birthday'}</span><span class="l">${fmtD(d)} ›</span></button>`; }).join('')}</div>` : ''; })()}
    ${anniMoments.length ? `<div class="l">${fmtD(anniDay)} · ${D.monthsSince(anniDay)} months</div><div class="feed" style="margin-top:-8px">${anniMoments.map(momentRow).join('')}</div>` : ''}
    ${ms.filter(m => !anniMoments.includes(m)).length ? `<div class="l">Moments</div><div class="feed" style="margin-top:-8px">${ms.filter(m => !anniMoments.includes(m)).sort((a,b) => b.date.localeCompare(a.date)).slice(0,4).map(momentRow).join('')}</div>` : future ? '<div class="empty">Nothing here yet.</div>' : ''}
    ${!future ? `<button class="row" style="font-size:13.5px" data-go="chat"><span>Chat</span><span class="l">${D.bubbles().filter(b => isoDate(new Date(b.at)).startsWith(ym)).length} said or thought ›</span></button>` : ''}
    <div class="list" style="font-size:13.5px;margin-top:-6px"><button class="row" data-go="songs"><span>Our songs</span><span class="l">${allSongs().length} ›</span></button><button class="row" data-go="map"><span>Our map</span><span class="l">${D.trips().length} trip${D.trips().length === 1 ? '' : 's'} ›</span></button><button class="row" data-go="lists"><span>Things to do together</span><span class="l">${D.listItems().filter(i => !i.done).length} ›</span></button><button class="row" data-act="importStart"><span>Import photos</span><span class="l">sorts them into days ›</span></button></div>
    ${!future ? `<div class="hr"></div><div class="l">All time</div><div class="stats" style="margin-top:-8px"><div><b>${all.trips}</b><span class="l">trip${all.trips===1?'':'s'}</span></div><div><b>${all.days}</b><span class="l">days</span></div><div><b>${all.moments}</b><span class="l">moments</span></div>${months != null ? `<div><b>${D.monthsSince(today())}</b><span class="l">months</span></div>` : ''}</div>` : ''}
  </div>${nav('memories')}`;
}
ACT.memNav = d => { memMonth.m += +d; if (memMonth.m < 0) { memMonth.m = 11; memMonth.y--; } if (memMonth.m > 11) { memMonth.m = 0; memMonth.y++; } render(); };

// ---------- export ----------
ACT.exportTrip = async id => {
  const t = D.trip(id); if (!window.JSZip) return toast('Export library not loaded');
  openSheet(`<div class="bar"><span>Export</span><span>${esc(t.city)} · ${MON[parseDate(t.start).getMonth()]}</span></div><div class="glass deep env"><div class="row"><span>Photos & polaroids</span><span class="l">${D.tripMoments(id).reduce((s,m)=>s+(m.photos||[]).length,0)}</span></div><div class="row"><span>Voice notes</span><span class="l">${D.tripMoments(id).reduce((s,m)=>s+D.voices(m).length,0)}</span></div><div class="row"><span>Moments</span><span class="l">text</span></div><div class="row"><span>Budget</span><span class="l">.xlsx</span></div></div><div class="sub">Saves as one folder. On a phone the share sheet lets you put it in Google Drive.</div><button class="btn block" data-act="doExport|${id}">Save</button>`);
};
ACT.doExport = async id => {
  const t = D.trip(id); const zip = new JSZip(); const folder = zip.folder(`${t.start.slice(0,4)} · ${t.city}`); const ms = D.tripMoments(id); let lines = [`${t.city} · ${t.start} – ${t.end}`, ''];
  for (const m of ms) { const who = (D.user(m.authorId)||{}).name || ''; lines.push(`${m.date} · ${who}${m.text ? ' · ' + m.text : ''}${m.title ? ' · ' + m.title : ''}${D.costLines(m).map(c => ' · $' + c.amount + ' (' + (c.label ? c.label + ', ' : '') + c.tag + ')').join('')}${D.songs(m).map(x => ' · ' + x.url).join('')}${D.videos(m).map(x => ' · ' + x.url).join('')}`); for (const [i, p] of (m.photos||[]).entries()) { lines.push(p.caption ? `    photo ${i+1}: ${p.caption}` : ''); const b = await Store.blob(p.asset); if (b) folder.file(`photos/${m.date}-${m.id}-${i}.jpg`, b); } for (const [i, v] of D.voices(m).entries()) { const b = await Store.blob(v.asset); if (b) folder.file(`voice/${m.date}-${m.id}-${i}.${v.asset.split('.').pop()}`, b); } }
  lines = lines.filter((l, i) => l !== '' || i < 2);
  folder.file('moments.txt', lines.join('\n')); const x = budgetWorkbook(t); if (x) folder.file('budget.xlsx', x); else folder.file('budget.csv', budgetCsv(t));
  const blob = await zip.generateAsync({ type:'blob' }); const f = new File([blob], `${t.city}-${t.start}.zip`, { type:'application/zip' }); closeSheet();
  if (navigator.canShare && navigator.canShare({ files:[f] })) { try { await navigator.share({ files:[f], title: t.city }); return; } catch (e) {} } download(blob, f.name); toast('Saved');
};
function budgetRows(t){ const rows = [['Date','Who','What','Category','Amount']]; D.tripLines(t).forEach(c => rows.push([c.m.date, D.payerTextC(c), [c.label, c.m.text||c.m.title].filter(Boolean).join(' · '), D.catLabel(t, c.tag||'other'), +c.amount])); const plan = D.tripPlan(t); rows.push([]); rows.push(['Plan']); D.cats(t).forEach(c => rows.push([c.label, '', '', '', plan[c.key]||0])); return rows; }
function budgetCsv(t){ return budgetRows(t).map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'); }
function budgetWorkbook(t){ if (!window.XLSX) return null; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows(t)), t.city.slice(0,30)); return XLSX.write(wb, { bookType:'xlsx', type:'array' }); }
ACT.exportXlsx = id => { const t = D.trip(id); const x = budgetWorkbook(t); if (x) download(new Blob([x]), `${t.city}-${t.start}-budget.xlsx`); else download(new Blob([budgetCsv(t)], { type:'text/csv' }), `${t.city}-${t.start}-budget.csv`); };

// ---------- V2.9: unread + app badge ----------
function seen(k){ const v = localStorage.getItem('dj.seen.' + k); if (v == null) { localStorage.setItem('dj.seen.' + k, String(Date.now())); return Date.now(); } return +v || 0; }
function markSeen(k){ try { localStorage.setItem('dj.seen.' + k, String(Date.now())); } catch (e) {} }
function unreadChat(){ const o = D.other(); if (!o) return 0; const s = seen('chat'); return D.bubbles().filter(b => b.userId === o.id && b.at > s).length; }
function unreadMem(){ const o = D.other(); if (!o) return 0; const s = seen('home'); return D.moments().filter(m => m.authorId === o.id && m.kind === 'moment' && (m.addedAt || m.createdAt || 0) > s).length; }
let badgeLast = -1;
function updateBadge(){ if (!D.me()) return; const n = unreadChat() + unreadMem(); if (n === badgeLast) return; badgeLast = n;
  try { if (navigator.setAppBadge) { if (n) navigator.setAppBadge(n).catch(() => {}); else navigator.clearAppBadge().catch(() => {}); } } catch (e) {}
  try { if (window.caches) caches.open('dj-badge').then(c => c.put('count', new Response(String(n)))).catch(() => {}); } catch (e) {} }

// ---------- V2.9: stickers (the two pals + your own) ----------
D.stickers = () => Store.all('stickers').sort((a, b) => a.at - b.at);
function stkKey(s){ return s.asset ? 's:' + s.asset : 'pal:' + s.pal; }
function stkFrom(arg){ if (!arg) return null; if (arg.startsWith('s:')) return { asset: arg.slice(2) }; if (arg.startsWith('pal:')) return { pal: arg.slice(4) }; return { pal: arg }; }
function stkHTML(s, cls, extra){ return s.asset ? `<i class="${cls} c" data-asset="${s.asset}" ${extra||''}></i>` : `<i class="${cls} ${s.pal}" ${extra||''}></i>`; }
// one tray, used on photos and in chat; hold one of yours to remove it
function stickerTray(act){ return `<div class="tray">${['bunny','puppy'].map(p => `<button data-act="${act}|pal:${p}"><i class="pal ${p}"></i></button>`).join('')}${D.stickers().map(s => `<button data-act="${act}|s:${s.asset}" data-hold="${s.id}"><i class="tstk" data-asset="${s.asset}"></i></button>`).join('')}<button class="add" data-act="stkAdd" aria-label="Add a sticker">+</button></div>`; }
function bindHold(root){ root.querySelectorAll('[data-hold]').forEach(el => { let t = null; const clear = () => { clearTimeout(t); t = null; };
  el.addEventListener('pointerdown', () => { clear(); t = setTimeout(async () => { t = null; el._busy = true; setTimeout(() => { el._busy = false; }, 600); const s = Store.get('stickers', el.dataset.hold); if (s && await ask('Remove this sticker?', { sub: 'Stickers already on photos and in chat stay.', ok: 'Remove' })) { const tray = sheet && sheet.sh.dataset.tray; await Store.remove(s.id); if (tray === 'chatSendStk') ACT.chatStk(); else if (tray === 'addSticker') ACT.stkTray(); render(); } }, 550); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, clear)); el.addEventListener('contextmenu', e => e.preventDefault()); }); }
// keep the cut-out: shrink to a small PNG, transparency and all
async function stickerBlob(blob){ try { const img = await createImageBitmap(blob); const max = 360, s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(r, 'image/png')); } catch (e) { return blob; } }
async function saveSticker(blob){ const png = await stickerBlob(blob); const asset = await Store.putBlob(png, 'png'); await Store.put('stickers', { id: Store.uid(), asset, by: D.me().id, at: Date.now() }); return asset; }
let stkReturn = null;   // what to reopen after adding one
ACT.stkAdd = () => { const back = sheet && sheet.sh.dataset.tray ? sheet.sh.dataset.tray : null; stkReturn = back;
  openSheet(`<div class="bar"><button data-act="${back ? 'stkBack' : 'closeSheet'}">${back ? 'Back' : 'Close'}</button><span>New sticker</span></div><h2 class="hd md" style="margin:0">Add a sticker</h2>
    <div class="glass deep" style="font-size:13px"><div style="font-weight:500">Cut-out from a photo</div><ol class="steps"><li>In Photos, press and hold the person or thing until it lifts out.</li><li>Tap <b>Copy</b>.</li><li>Come back here and tap <b>Paste</b>.</li></ol></div>
    <div class="list" style="font-size:13.5px"><button class="row" data-act="stkPaste"><span>Paste</span><span class="l">from what you copied ›</span></button><button class="row" data-act="stkPick"><span>Choose a picture</span><span class="l">any image ›</span></button></div>
    <div class="l">Stickers are shared — you both get them. Hold one in the tray to remove it.</div>
    <input type="file" id="stk-file" accept="image/*" hidden data-act="stkFile" data-on="change">`); };
ACT.stkBack = () => { const t = stkReturn; stkReturn = null; if (t === 'chatSendStk') ACT.chatStk(); else if (t === 'addSticker') ACT.stkTray(); else closeSheet(); };
ACT.stkPick = () => $('#stk-file').click();
ACT.stkFile = async (a, el) => { const f = el.files && el.files[0]; if (!f) return; await saveSticker(f); toast('Sticker added'); ACT.stkBack(); };
ACT.stkPaste = async () => { if (!navigator.clipboard || !navigator.clipboard.read) return toast('Paste isn\'t available here — use Choose a picture');
  try { const items = await navigator.clipboard.read(); for (const it of items) { const type = it.types.find(t => t.startsWith('image/')); if (type) { await saveSticker(await it.getType(type)); toast('Sticker added'); return ACT.stkBack(); } } toast('Nothing to paste — copy a cut-out first'); }
  catch (e) { toast('Couldn\'t paste — copy a cut-out first'); } };
// on the day page: pick one, then tap a photo
ACT.stkTray = () => { openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Stickers</span></div><h2 class="hd md" style="margin:0">Pick a sticker</h2>${stickerTray('addSticker')}<div class="l">Then tap a photo to stick it on. Drag to move, tap it to remove.</div>`, sh => { sh.dataset.tray = 'addSticker'; bindHold(sh); }); };

// ---------- V2.9: chat with a composer ----------
let chatDraft = '', chatThink = false;
function chatMsgBody(b){
  if (b.sticker) return stkHTML(b.sticker, 'cstk');
  if (b.photo) return `<button class="cph" data-act="chatPhoto|${b.id}"><img data-thumb="${b.photo}" data-pv="${b.thumb || ''}" alt=""></button>${b.text && !b.auto ? `<div class="b">${esc(b.text)}</div>` : ''}`;
  return `<div class="b ${b.kind === 'think' ? 'think' : ''}">${esc(b.text)}</div>`;
}
function renderChat(app){
  const me = D.me(); const all = D.bubbles().slice().sort((a,b) => a.at - b.at); let lastDay = '';
  const hadFocus = document.activeElement && document.activeElement.id === 'chat-in'; markSeen('chat');
  const rows = all.map(b => { const d = new Date(b.at); const day = isoDate(d); const sep = day !== lastDay ? `<div class="daysep">${day === today() ? 'Today' : fmtD(day)}</div>` : ''; lastDay = day; const u = D.user(b.userId) || {}; const mode = skyMode(u, d); return sep + `<div class="msg ${b.userId === me.id ? 'me' : ''} ${b.sticker ? 'sticker' : ''}"><i class="pal ${u.pal||'bunny'}"></i><div>${chatMsgBody(b)}<div class="t">${timeIn(u, d)} ${wx(mode === 'night' ? 'moon' : 'sun')}</div></div></div>`; }).join('');
  const month = all.filter(b => isoDate(new Date(b.at)).slice(0,7) === today().slice(0,7)).length;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="home">‹ Home</button><span>Chat</span></div><div class="row"><span class="hd" style="font-size:32px">${D.users2().map(u => `<i class="pal ${u.pal}" style="width:28px;height:28px;vertical-align:-6px"></i>`).join('')}</span><span class="l">${month} this month</span></div><div class="chat">${rows || '<div class="empty">Nothing said yet. Say something below.</div>'}</div>
    <div class="composer"><button class="cbtn" data-act="chatPick" aria-label="Photo">◫</button><button class="cbtn" data-act="chatStk" aria-label="Sticker">☺</button><input class="in" id="chat-in" placeholder="${chatThink ? 'what are you thinking?' : 'say something'}" value="${esc(chatDraft)}" data-act="chatType" data-on="input" autocomplete="off" enterkeyhint="send"><button class="cbtn ${chatThink ? 'on' : ''}" data-act="chatThink" aria-label="Think">💭</button><button class="btn sm" data-act="chatSend">Send</button></div>
    <input type="file" id="chat-file" accept="image/*" multiple hidden data-act="chatFiles" data-on="change">
  </div>${nav('home')}`;
  const inp = $('#chat-in'); inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ACT.chatSend(); } }; if (hadFocus) inp.focus();
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 0);
}
ACT.chatType = (a, el) => { chatDraft = el.value; };
ACT.chatThink = () => { chatThink = !chatThink; render(); const i = $('#chat-in'); if (i) i.focus(); };
ACT.chatSend = async () => { const el = $('#chat-in'); const text = (el ? el.value : chatDraft).trim(); if (!text) return; chatDraft = ''; await Store.put('bubbles', { id: Store.uid(), userId: D.me().id, kind: chatThink ? 'think' : 'say', text, at: Date.now() }); chatThink = false; render(); const i = $('#chat-in'); if (i) i.focus(); };
ACT.chatPick = () => $('#chat-file').click();
ACT.chatFiles = async (a, el) => { const files = Array.from(el.files || []); if (!files.length) return; const text = chatDraft.trim(); chatDraft = ''; toast(files.length === 1 ? 'Sending…' : 'Sending ' + files.length + ' photos…');
  for (const [i, f] of files.entries()) { const ph = await storePhoto(f); await Store.put('bubbles', { id: Store.uid(), userId: D.me().id, kind: 'say', photo: ph.asset, thumb: ph.thumb, text: i === 0 && text ? text : '📷 Photo', auto: !(i === 0 && text), at: Date.now() + i }); }
  render(); };
ACT.chatStk = () => openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Send a sticker</span></div>${stickerTray('chatSendStk')}<div class="l">Hold one of yours to remove it.</div>`, sh => { sh.dataset.tray = 'chatSendStk'; bindHold(sh); });
ACT.chatSendStk = async arg => { const s = stkFrom(arg); closeSheet(); await Store.put('bubbles', { id: Store.uid(), userId: D.me().id, kind: 'say', sticker: s, text: 'sent a sticker', auto: true, at: Date.now() }); render(); };
ACT.chatPhoto = id => { const b = Store.get('bubbles', id); if (!b) return; prefetch(b.photo); const mine = b.userId === D.me().id; const u = D.user(b.userId) || {};
  openSheet(`<div class="vtop"><button data-act="closeSheet">‹ Chat</button><span>${esc(u.name||'')} · ${fmtD(isoDate(new Date(b.at)))}</span></div><div class="vimg fit"><img data-asset="${b.photo}" alt=""></div><div class="vbody">${b.text && !b.auto ? `<div style="font-size:14px">${esc(b.text)}</div>` : ''}<div class="vact"><button data-act="shareAsset|${b.photo}">Save to phone</button>${mine ? `<button data-act="chatDelPhoto|${b.id}">Delete</button>` : ''}</div></div>`, null, 'viewer'); };
ACT.chatDelPhoto = async id => { if (!await ask('Delete this photo?', { sub: 'It\'s removed from the chat for both of you.', ok: 'Delete' })) return; const b = Store.get('bubbles', id); if (b && b.photo) { Store.removeBlob(b.photo); if (b.thumb) Store.removeBlob(b.thumb); } await Store.remove(id); closeSheet(); render(); };

// ---------- V2.9: things to do together (lists) ----------
const DEFAULT_LISTS = [{ key: 'cook', label: 'To cook', icon: '🍳' }, { key: 'do', label: 'To do', icon: '✅' }, { key: 'places', label: 'Places to go', icon: '📍' }, { key: 'watch', label: 'To watch', icon: '🎬' }];
D.lists = () => { const s = D.settings(); return Array.isArray(s.lists) && s.lists.length ? s.lists : DEFAULT_LISTS; };
D.listItems = () => Store.all('listitems').sort((a, b) => a.at - b.at);
const cityKey = c => (c || '').toLowerCase().split(/[ ,]/)[0];
function renderLists(app){
  const items = D.listItems();
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="home">‹ Home</button><span>${items.filter(i => !i.done).length} on the list</span></div><h1 class="hd">Things to do together</h1>
    <div class="lcards">${D.lists().map(l => { const its = items.filter(i => i.list === l.key); const open = its.filter(i => !i.done); return `<button class="glass tap lcard" data-go="list/${l.key}"><span class="ic">${esc(l.icon || '✦')}</span><b>${esc(l.label)}</b><span class="l">${open.length ? open.length + ' to go' : its.length ? 'all done ✓' : 'empty'}</span>${open.slice(0, 2).map(i => `<span class="pv">${esc(i.text)}</span>`).join('')}</button>`; }).join('')}<button class="glass tap lcard add" data-act="listNew"><span class="ic">+</span><b>New list</b><span class="l">date ideas, gifts…</span></button></div>
    ${(() => { const done = items.filter(i => i.done).sort((a, b) => (b.doneAt||0) - (a.doneAt||0)).slice(0, 5); return done.length ? `<div class="l">Recently done</div><div class="list" style="margin-top:-8px">${done.map(i => `<button class="row" data-go="list/${i.list}"><span style="text-decoration:line-through;color:var(--mu)">${esc(i.text)}</span><span class="l">${i.doneBy ? palOf(i.doneBy) : ''} ${i.doneAt ? fmtD(isoDate(new Date(i.doneAt))) : ''}</span></button>`).join('')}</div>` : ''; })()}
  </div>${nav('home')}`;
}
ACT.listNew = async () => { const name = await ask('Name the list', { input: '', placeholder: 'Date ideas, gifts…', ok: 'Add' }); if (!name) return; const key = 'l_' + Store.uid().slice(0, 8); await D.saveSettings({ lists: D.lists().concat([{ key, label: name, icon: '✦' }]) }); go('list', { id: key }); };
let listShowDone = false;
function renderList(app){
  const key = route.id || ''; const byCity = key.startsWith('city~') ? decodeURIComponent(key.slice(5)) : '';
  const l = byCity ? { key, label: 'For ' + byCity, icon: '📍' } : D.lists().find(x => x.key === key); if (!l) return go('lists');
  const all = D.listItems().filter(i => byCity ? cityKey(i.city) === cityKey(byCity) : i.list === key); const open = all.filter(i => !i.done), done = all.filter(i => i.done).sort((a, b) => (b.doneAt||0) - (a.doneAt||0));
  const row = i => `<div class="li ${i.done ? 'done' : ''}"><button class="tick" data-act="liTick|${i.id}" aria-label="Done">${i.done ? '✓' : ''}</button><button class="lt" data-act="liEdit|${i.id}"><span>${esc(i.text)}</span><span class="l">${palOf(i.by)}${i.city ? ' · ' + esc(i.city) : ''}${i.note ? ' · ' + esc(i.note.slice(0, 40)) : ''}${byCity ? ' · ' + esc((D.lists().find(x => x.key === i.list) || {}).label || '') : ''}${i.link ? ' · link' : ''}</span></button></div>`;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="lists">‹ Lists</button><span>${open.length} to go</span></div><h1 class="hd">${esc(l.icon || '')} ${esc(l.label)}</h1>
    ${byCity ? '' : `<div class="row" style="gap:8px"><input class="in" id="li-new" placeholder="Add something…" autocomplete="off" enterkeyhint="done"><button class="btn sm" data-act="liAdd|${key}">Add</button></div>`}
    <div class="lis">${open.map(row).join('') || `<div class="empty">${byCity ? 'Nothing tagged with ' + esc(byCity) + ' yet.' : 'Nothing yet — add the first one.'}</div>`}</div>
    ${done.length ? `<button class="row l" data-act="liShowDone"><span>${done.length} done</span><span>${listShowDone ? 'hide ▴' : 'show ▾'}</span></button>${listShowDone ? `<div class="lis">${done.map(row).join('')}</div>` : ''}` : ''}
    ${byCity || DEFAULT_LISTS.some(x => x.key === key) ? '' : `<div class="list mt-auto" style="font-size:13.5px"><button class="row" data-act="listRename|${key}"><span>Rename this list</span><span class="l">›</span></button><button class="row" data-act="listRemove|${key}"><span class="muted">Remove this list</span><span class="l">›</span></button></div>`}
  </div>${nav('home')}`;
  const inp = $('#li-new'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ACT.liAdd(key); } };
}
ACT.liAdd = async key => { const el = $('#li-new'); const text = el.value.trim(); if (!text) return; await Store.put('listitems', { id: Store.uid(), list: key, text, by: D.me().id, at: Date.now(), done: false }); render(); const i = $('#li-new'); if (i) i.focus(); };
ACT.liShowDone = () => { listShowDone = !listShowDone; render(); };
ACT.liTick = async id => { const i = Store.get('listitems', id); if (!i) return;
  if (i.done) { Object.assign(i, { done: false, doneAt: null, doneBy: null }); await Store.put('listitems', i); return render(); }
  Object.assign(i, { done: true, doneAt: Date.now(), doneBy: D.me().id }); await Store.put('listitems', i); render();
  if (await ask('Done! Make it a memory?', { sub: i.text, ok: 'Make a memory', no: 'Not now' })) momentSheet({ text: i.text, date: today() }); };
ACT.liEdit = id => { const i = Store.get('listitems', id); if (!i) return; const cities = [...new Set(D.users().map(u => u.city).concat(D.trips().map(t => t.city)).filter(Boolean))];
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${palOf(i.by)} added ${fmtD(isoDate(new Date(i.at)))}</span></div><input class="in big" id="li-text" value="${esc(i.text)}">
    <textarea class="in" id="li-note" placeholder="Notes, a recipe, why…">${esc(i.note||'')}</textarea><input class="in" id="li-link" placeholder="Link (optional)" value="${esc(i.link||'')}">
    <div class="row"><span style="font-size:13.5px">Where</span><select class="in" id="li-city" style="width:auto;padding:6px 10px;font-size:12px"><option value="">Anywhere</option>${cities.map(c => `<option ${cityKey(i.city) === cityKey(c) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
    <div class="row"><span style="font-size:13.5px">List</span><select class="in" id="li-list" style="width:auto;padding:6px 10px;font-size:12px">${D.lists().map(l => `<option value="${l.key}" ${l.key === i.list ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select></div>
    ${i.link ? `<a class="row l" href="${esc(i.link)}" target="_blank" rel="noopener"><span>Open the link</span><span>›</span></a>` : ''}
    <div class="row" style="margin-top:auto"><button class="btn sm lite" data-act="liDelete|${i.id}">Delete</button><button class="btn sm" data-act="liSave|${i.id}">Save</button></div>`); };
ACT.liSave = async id => { const i = Store.get('listitems', id); const text = $('#li-text').value.trim(); if (!text) return toast('Give it a name'); Object.assign(i, { text, note: $('#li-note').value.trim(), link: $('#li-link').value.trim(), city: $('#li-city').value, list: $('#li-list').value }); await Store.put('listitems', i); closeSheet(); render(); };
ACT.liDelete = async id => { if (!await ask('Delete this?', { ok: 'Delete' })) return; await Store.remove(id); closeSheet(); render(); };
ACT.listRename = async key => { const ls = D.lists().map(x => Object.assign({}, x)); const l = ls.find(x => x.key === key); const name = await ask('Rename', { input: l.label, ok: 'Save' }); if (!name) return; l.label = name; await D.saveSettings({ lists: ls }); render(); };
ACT.listRemove = async key => { const its = D.listItems().filter(i => i.list === key); if (!await ask('Remove this list?', { sub: its.length ? 'Its ' + its.length + ' item' + (its.length === 1 ? '' : 's') + ' are deleted too.' : '', ok: 'Remove' })) return; await Store.removeMany(its.map(i => i.id)); await D.saveSettings({ lists: D.lists().filter(x => x.key !== key) }); go('lists'); };

// ---------- V2.9: our songs ----------
function allSongs(){ return D.moments().filter(m => m.kind !== 'plan').flatMap(m => D.songs(m).map(sg => ({ sg, m }))).sort((a, b) => (b.m.date + String(b.m.createdAt||0).padStart(15,'0')).localeCompare(a.m.date + String(a.m.createdAt||0).padStart(15,'0'))); }
function renderSongs(app){
  const ss = allSongs(); const first = ss[0];
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="memories">‹ Memories</button><span>${ss.length} song${ss.length === 1 ? '' : 's'}</span></div><h1 class="hd">Our songs</h1>
    ${first ? songCard(first.sg, first.m.authorId) : ''}
    <div class="list">${ss.map(({ sg, m }) => `<div class="row"><button style="flex:1;text-align:left;display:flex;gap:10px;align-items:center" data-go="day/${m.tripId || 'none'}_${m.date}">${palOf(m.authorId)}<span><div style="font-weight:500">${esc(sg.title || 'A song')}</div><div class="l">${esc(sg.artist || 'Spotify')} · ${fmtD(m.date)} ${m.date.slice(0,4)}${m.tripId && D.trip(m.tripId) ? ' · ' + esc(D.trip(m.tripId).city) : ''}${m.text ? ' · ' + esc(m.text.slice(0, 30)) : ''}</div></span></button><a class="l" href="${esc(sg.url)}" target="_blank" rel="noopener">♫ open</a></div>`).join('') || '<div class="empty">Songs you add to memories collect here.</div>'}</div>
    <button class="btn lite block" data-act="songAdd">+ Add a song</button>
  </div>${nav('memories')}`;
}
ACT.songAdd = async () => { const url = await ask('Paste a Spotify link', { input: '', placeholder: 'https://open.spotify.com/track/…', ok: 'Next' }); if (!url) return; const title = (await ask('Song title', { sub: 'optional', input: '', ok: 'Next' })) || ''; const artist = (await ask('Artist', { sub: 'optional', input: '', ok: 'Next' })) || ''; const note = await ask('Why this one?', { sub: 'optional — becomes the memory', input: '', ok: 'Save' }); if (note == null) return;
  const t = D.tripForDate(today()); await Store.put('moments', { id: Store.uid(), tripId: t ? t.id : '', date: today(), authorId: D.me().id, kind: 'moment', text: note, items: [{ id: uidShort(), type: 'song', url, title, artist }], photos: [], createdAt: Date.now(), addedAt: Date.now() }); toast('Added'); render(); };

// ---------- V2.9: on this day ----------
function onThisDay(){ const td = today(); const ms = D.moments().filter(m => m.kind === 'moment' && m.date < td);
  const years = ms.filter(m => m.date.slice(5) === td.slice(5)); const pool = years.length ? years : ms.filter(m => m.date.slice(8) === td.slice(8));
  if (!pool.length) return null; const withPh = pool.filter(m => (m.photos||[]).length); const pick = (withPh.length ? withPh : pool).sort((a, b) => a.date.localeCompare(b.date))[0];
  const sameDay = pool.filter(m => m.date === pick.date); const yrs = +td.slice(0,4) - +pick.date.slice(0,4); const mos = yrs * 12 + (+td.slice(5,7) - +pick.date.slice(5,7));
  return { m: pick, all: sameDay, label: years.length ? (yrs === 1 ? 'A year ago today' : yrs + ' years ago today') : (mos === 1 ? 'A month ago today' : mos + ' months ago today') }; }
function onThisDayHTML(){ const o = onThisDay(); if (!o) return ''; const m = o.m; const t = m.tripId && D.trip(m.tripId); const phs = o.all.flatMap(x => (x.photos||[]).map(p => p.asset)).slice(0, 3);
  return `<button class="glass tap otd" data-go="day/${m.tripId || 'none'}_${m.date}"><div class="row"><span class="l">On this day · ${esc(o.label)}</span><span class="l">${fmtD(m.date)}${t ? ' · ' + esc(t.city) : ''}</span></div>${phs.length ? `<div class="otdph">${phs.map(a => `<i data-asset="${a}"></i>`).join('')}</div>` : ''}<div style="font-size:14px;font-weight:500;margin-top:8px;text-align:left">${esc(m.text || m.title || (D.songs(m)[0] || {}).title || (phs.length ? 'Photos' : 'A memory'))}</div></button>`; }

// ---------- V2.9: map ----------
const geoCache = {};
async function geocode(q){ if (!q) return null; const k = q.toLowerCase(); if (geoCache[k] !== undefined) return geoCache[k]; const known = Object.keys(CITIES).find(c => c.toLowerCase() === k.split(',')[0].trim()); if (known) return geoCache[k] = { lat: CITIES[known].lat, lon: CITIES[known].lon };
  try { const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q)); const j = await r.json(); geoCache[k] = j && j[0] ? { lat: +j[0].lat, lon: +j[0].lon } : null; } catch (e) { geoCache[k] = null; } return geoCache[k]; }
async function reverseGeo(lat, lon){ try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${lat}&lon=${lon}`); const j = await r.json(); const a = j.address || {}; const spot = j.name || a.amenity || a.tourism || a.leisure || a.shop || ''; const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.town || a.city || a.village || ''; return { name: spot && spot !== area ? spot : area, area, city: a.city || a.town || a.village || '' }; } catch (e) { return null; } }
async function loadLeaflet(){ if (window.L) return; if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; l.dataset.leaflet = 1; document.head.appendChild(l); } await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'); }
function mapPoints(){ const pts = [];
  D.users().forEach(u => { const g = u.lat != null ? { lat: u.lat, lon: u.lon } : CITIES[u.city]; if (g) pts.push({ kind: 'home', lat: g.lat, lon: g.lon, title: esc(u.name) + '\'s home · ' + esc(u.city), pal: u.pal }); });
  D.trips().forEach(t => { const g = t.geo || (CITIES[t.city] ? CITIES[t.city] : null); if (g) pts.push({ kind: 'trip', lat: g.lat, lon: g.lon, title: `<a href="#trip/${t.id}">${esc(t.city)}</a><br>${fmtD(t.start)} – ${fmtD(t.end)} ${t.start.slice(0,4)}` }); });
  D.moments().filter(m => m.place && m.place.lat != null).forEach(m => pts.push({ kind: 'mem', lat: m.place.lat, lon: m.place.lon, title: `<a href="#day/${m.tripId || 'none'}_${m.date}">${esc(m.text || m.place.name || 'A memory')}</a><br>${fmtD(m.date)}${m.place.name ? ' · ' + esc(m.place.name) : ''}` }));
  return pts; }
let mapObj = null;
function renderMap(app){
  const trips = D.trips(); const places = D.moments().filter(m => m.place && m.place.name);
  const byPlace = {}; places.forEach(m => { const k = m.place.name; (byPlace[k] = byPlace[k] || []).push(m); });
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="memories">‹ Memories</button><span>${trips.length} trip${trips.length === 1 ? '' : 's'} · ${places.length} place${places.length === 1 ? '' : 's'}</span></div><h1 class="hd">Our map</h1>
    <div id="map" class="map"><div class="empty">Loading the map…</div></div>
    <div class="l">Places from photos</div><div class="list" style="margin-top:-8px">${Object.keys(byPlace).map(k => { const m = byPlace[k][0]; return `<button class="row" data-go="day/${m.tripId || 'none'}_${m.date}"><span>${esc(k)}</span><span class="l">${byPlace[k].length > 1 ? byPlace[k].length + ' memories' : fmtD(m.date)} ›</span></button>`; }).join('') || '<div class="empty" style="text-align:left;padding:6px 0">Photos imported with their location add pins here.</div>'}</div>
  </div>${nav('memories')}`;
  drawMap();
}
async function drawMap(){
  // trips in cities the app doesn't know yet get looked up once and remembered
  for (const t of D.trips().filter(t => !t.geo && !CITIES[t.city])) { const g = await geocode(t.city); if (g) { t.geo = g; await Store.put('trips', t); } }
  const el = $('#map'); if (!el || route.name !== 'map') return;
  try { await loadLeaflet(); } catch (e) { el.innerHTML = '<div class="empty">The map needs a connection.</div>'; return; }
  if (!$('#map')) return; el.innerHTML = ''; const pts = mapPoints(); if (mapObj) { try { mapObj.remove(); } catch (e) {} }
  const L = window.L; mapObj = L.map(el, { zoomControl: false, attributionControl: true }); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(mapObj);
  const icon = p => L.divIcon({ className: '', html: p.kind === 'home' ? `<i class="pal ${p.pal} mpin"></i>` : p.kind === 'trip' ? '<i class="mtrip"></i>' : '<i class="mmem"></i>', iconSize: p.kind === 'home' ? [26, 26] : p.kind === 'trip' ? [18, 18] : [10, 10] });
  pts.forEach(p => L.marker([p.lat, p.lon], { icon: icon(p) }).addTo(mapObj).bindPopup(p.title));
  if (pts.length) mapObj.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lon])).pad(0.3), { maxZoom: 12 }); else mapObj.setView([49.28, -100], 3);
}

// ---------- V2.9: import a pile of photos → sorted into days → memories ----------
// Reads each photo's own "taken at" time (and location, if the phone kept it) from its EXIF,
// groups them by day and by gaps, guesses names from your plans and places, then you review.
function readExif(buf){
  try {
    const u8 = new Uint8Array(buf), v = new DataView(buf); let start = -1;
    for (let i = 0; i < u8.length - 12; i++) { if (u8[i] === 0x45 && u8[i+1] === 0x78 && u8[i+2] === 0x69 && u8[i+3] === 0x66 && u8[i+4] === 0 && u8[i+5] === 0) { const t = i + 6; if ((u8[t] === 0x49 && u8[t+1] === 0x49) || (u8[t] === 0x4D && u8[t+1] === 0x4D)) { start = t; break; } } }
    if (start < 0) return null;
    const le = u8[start] === 0x49, N = u8.length - start;
    const g16 = o => o + 2 <= N ? v.getUint16(start + o, le) : 0, g32 = o => o + 4 <= N ? v.getUint32(start + o, le) : 0;
    const out = {};
    const ifd = (off, cb) => { if (!off || off + 2 > N) return; const n = Math.min(g16(off), 300); for (let i = 0; i < n; i++) { const e = off + 2 + i * 12; if (e + 12 > N) break; cb(g16(e), g16(e + 2), g32(e + 4), e + 8); } };
    const str = (cnt, vo) => { const o = cnt > 4 ? g32(vo) : vo; let s = ''; for (let i = 0; i < cnt && o + i < N; i++) { const c = u8[start + o + i]; if (!c) break; s += String.fromCharCode(c); } return s.trim(); };
    const rat = o => { const d = g32(o + 4); return d ? g32(o) / d : 0; };
    const dms = vo => { const o = g32(vo); return rat(o) + rat(o + 8) / 60 + rat(o + 16) / 3600; };
    let exifP = 0, gpsP = 0;
    ifd(g32(4), (tag, type, cnt, vo) => { if (tag === 0x8769) exifP = g32(vo); else if (tag === 0x8825) gpsP = g32(vo); else if (tag === 0x010F) out.make = str(cnt, vo); else if (tag === 0x0110) out.model = str(cnt, vo); else if (tag === 0x0132) out.date0 = str(cnt, vo); });
    ifd(exifP, (tag, type, cnt, vo) => { if (tag === 0x9003) out.date = str(cnt, vo); else if (tag === 0x9004 && !out.date) out.date = str(cnt, vo); });
    let latRef = 'N', lonRef = 'E', lat = null, lon = null;
    ifd(gpsP, (tag, type, cnt, vo) => { if (tag === 1) latRef = String.fromCharCode(u8[start + vo]); else if (tag === 3) lonRef = String.fromCharCode(u8[start + vo]); else if (tag === 2 && cnt === 3) lat = dms(vo); else if (tag === 4 && cnt === 3) lon = dms(vo); });
    if (lat != null && lon != null && (lat || lon)) { out.lat = latRef === 'S' ? -lat : lat; out.lon = lonRef === 'W' ? -lon : lon; }
    const d = (out.date || out.date0 || '').match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/); if (d && d[1] !== '0000') out.dt = `${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}`;
    return out;
  } catch (e) { return null; }
}
const imgTime = dt => { const h = +dt.slice(11, 13), m = dt.slice(14, 16); return ((h % 12) || 12) + ':' + m + (h < 12 ? 'am' : 'pm'); };
const dtMin = dt => +dt.slice(11, 13) * 60 + +dt.slice(14, 16);
const dtMs = dt => new Date(+dt.slice(0, 4), +dt.slice(5, 7) - 1, +dt.slice(8, 10), +dt.slice(11, 13), +dt.slice(14, 16)).getTime();
function kmBetween(a, b){ const R = 6371, r = x => x * Math.PI / 180; const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
async function thumbOf(file){ try { const img = await createImageBitmap(file); const s = 220 / Math.max(img.width, img.height); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * Math.min(1, s))); c.height = Math.max(1, Math.round(img.height * Math.min(1, s))); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); if (img.close) img.close(); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .7)); return URL.createObjectURL(b); } catch (e) { return URL.createObjectURL(file); } }

let imp = null;   // the import in progress; lives only on this phone until "Make memories"
// start an import from a trip (photos outside its dates start skipped) or from anywhere ('' = sorted by date into whatever trip matches)
function pickImages(cb){ const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.multiple = true; f.style.display = 'none'; document.body.appendChild(f); f.onchange = () => { const files = Array.from(f.files || []); f.remove(); if (files.length) cb(files); }; f.click(); }
ACT.importStart = tripId => { closeSheet(); pickImages(files => importRead(tripId || '', files)); };
ACT.importMore = () => pickImages(files => importRead(imp.tripId, files, true));
let impSeq = 0;
async function importRead(tripId, files, more){
  if (!more || !imp) imp = { tripId, key: tripId || 'any', items: [], groups: [], sel: [] };
  imp.stage = 'reading'; imp.done = 0; imp.total = files.length; if (route.name !== 'import') go('import', { id: imp.key }); else render();
  const now = Date.now(); const fresh = [];
  for (const [i, file] of files.entries()) {
    let ex = null; try { ex = readExif(await file.slice(0, 512 * 1024).arrayBuffer()); if (!ex && /hei[cf]/i.test(file.type + file.name) && file.size < 25e6) ex = readExif(await file.arrayBuffer()); } catch (e) {}
    ex = ex || {}; let dt = ex.dt || '';
    // no EXIF time: fall back to the file's date, unless that's just "now" (the picker re-saved it)
    if (!dt && file.lastModified && now - file.lastModified > 10 * 60000) { const d = new Date(file.lastModified); dt = isoDate(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    const screen = !ex.make && !ex.model && (/png/i.test(file.type) || /screenshot/i.test(file.name));
    const it = { id: 'i' + (impSeq++), file, dt, lat: ex.lat, lon: ex.lon, screen, hasExif: !!ex.dt, thumb: await thumbOf(file), out: false }; imp.items.push(it); fresh.push(it);
    imp.done = i + 1; const pr = $('#imp-prog'); if (pr) pr.textContent = `Reading ${imp.done} of ${imp.total}…`;
  }
  if (more) importPlace(fresh); else imp.groups = buildGroups(fresh);
  imp.stage = 'review'; if (route.name === 'import') render(); importPlaces();
}
const impTrip = () => imp && imp.tripId ? D.trip(imp.tripId) : null;
const byTime = (a, b) => (a.dt || '9999').localeCompare(b.dt || '9999');
function newGroup(kind, date, items){ return { id: 'g' + (impSeq++), kind, date, items: items.map(x => x.id) }; }
// group photos: by day, then a new moment after a 90-minute gap or a move of more than 1.5 km
function buildGroups(items){
  const t = impTrip(); const groups = []; let g = null, prev = null;
  for (const x of items.filter(x => x.dt && !x.screen).sort(byTime)) {
    const far = prev && prev.lat != null && x.lat != null && kmBetween(prev, x) > 1.5;
    if (!g || prev.dt.slice(0, 10) !== x.dt.slice(0, 10) || dtMs(x.dt) - dtMs(prev.dt) > 90 * 60000 || far) { g = newGroup('time', x.dt.slice(0, 10), []); groups.push(g); }
    g.items.push(x.id); prev = x; }
  const unknown = items.filter(x => !x.dt && !x.screen); if (unknown.length) groups.push(newGroup('unknown', t ? (today() >= t.start && today() <= t.end ? today() : t.start) : today(), unknown));
  const screens = items.filter(x => x.screen); if (screens.length) { const s = newGroup('screens', screens[0].dt ? screens[0].dt.slice(0, 10) : (t ? t.start : today()), screens); s.skip = true; groups.push(s); }
  groups.forEach(g => { g.outside = !!(t && g.kind === 'time' && (g.date < t.start || g.date > t.end)); if (g.outside) g.skip = true; importGuess(g); });
  return groups;
}
// "+ Add more": new photos join a moment they fit in (same day, within 90 minutes), the rest make new ones
function importPlace(fresh){
  const left = [];
  for (const x of fresh) {
    let home = null;
    if (x.screen) home = imp.groups.find(g => g.kind === 'screens');
    else if (!x.dt) home = imp.groups.find(g => g.kind === 'unknown');
    else home = imp.groups.find(g => { if (g.kind !== 'time' || g.date !== x.dt.slice(0, 10)) return false; const sp = groupSpan(g); return sp && dtMs(x.dt) >= dtMs(sp.a) - 90 * 60000 && dtMs(x.dt) <= dtMs(sp.b) + 90 * 60000; });
    if (home) { home.items.push(x.id); sortGroup(home); importGuess(home); } else left.push(x);
  }
  buildGroups(left).forEach(g => insertGroup(g));
}
function sortGroup(g){ g.items = groupItems(g).sort(byTime).map(x => x.id); }
// keep moments in time order within a day
function insertGroup(g){ const sp = groupSpan(g); let at = imp.groups.length; if (g.kind === 'time' && sp) { const i = imp.groups.findIndex(o => { const s2 = groupSpan(o); return o.kind !== 'time' || (o.date === g.date && s2 && s2.a > sp.a) || o.date > g.date; }); if (i >= 0) at = i; } imp.groups.splice(at, 0, g); }
function groupItems(g){ return g.items.map(id => imp.items.find(x => x.id === id)).filter(Boolean); }
function groupSpan(g){ const ts = groupItems(g).filter(x => x.dt).map(x => x.dt).sort(); return ts.length ? { a: ts[0], b: ts[ts.length - 1] } : null; }
// a name for the group: a plan or booking at that time, else the time of day (+ the place, once known)
function importGuess(g){
  if (g.edited) return; const sp = groupSpan(g);
  if (g.kind === 'screens') { g.title = 'Screenshots'; return; } if (g.kind === 'unknown' || !sp) { g.title = ''; return; }
  const a = dtMin(sp.a), b = dtMin(sp.b);
  const plans = D.moments().filter(m => m.date === g.date && (m.kind === 'plan' || m.kind === 'booking') && !m.flight && (m.time || ''));
  const hit = plans.find(m => { const h = hm2(m.time); return h != null && h >= a - 60 && h <= b + 30; });
  if (hit) { g.title = hit.title || hit.text; g.from = 'plan'; return; }
  const fl = D.moments().find(m => m.flight && m.date === g.date && hm2(m.flight.arr) != null && a >= hm2(m.flight.arr) - 30 && a <= hm2(m.flight.arr) + 120);
  if (fl) { g.title = 'Landed in ' + (AIRPORTS[fl.flight.to] || fl.flight.to); g.from = 'flight'; return; }
  const part = a < 300 ? 'Late night' : a < 690 ? 'Morning' : a < 870 ? 'Midday' : a < 1050 ? 'Afternoon' : a < 1290 ? 'Evening' : 'Late night';
  g.title = part + (g.place && g.place.name ? ' · ' + g.place.name : ''); g.from = 'time';
}
function hm2(s){ const m = String(s || '').match(/(\d{1,2}):(\d{2})\s*([ap])?/i); if (!m) return null; let h = +m[1]; if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } return h * 60 + +m[2]; }
// look up a place name for each group that has a location (one request a second, as OpenStreetMap asks)
let placing = false;
async function importPlaces(){ if (placing) return; placing = true; const mine = imp;
  try { while (imp === mine && mine) { const g = mine.groups.find(g => !g.place && !g.noPlace && groupItems(g).some(y => y.lat != null)); if (!g || mine.stage !== 'review') break; const x = groupItems(g).find(y => y.lat != null);
    const p = await reverseGeo(x.lat, x.lon); g.place = { lat: x.lat, lon: x.lon, name: p ? p.name : '', area: p ? p.area : '' }; importGuess(g);
    if (route.name === 'import' && !sheet && !(document.activeElement && document.activeElement.classList.contains('imptitle'))) render(); await new Promise(r => setTimeout(r, 1100)); } } finally { placing = false; } }
function renderImport(app){
  const t = impTrip() || (route.id && route.id !== 'any' ? D.trip(route.id) : null); const back = t ? `trip/${t.id}` : 'home';
  if (!imp || imp.key !== route.id) { app.innerHTML = `<div class="screen"><div class="bar"><button data-go="${back}">‹ ${t ? esc(t.city) : 'Home'}</button><span>Import</span></div><h1 class="hd">Import photos</h1><div class="sub" style="text-align:left">Pick a pile of photos. They're sorted into days and moments for you to check before anything is saved.</div><button class="btn block" data-act="importStart|${t ? t.id : ''}">Choose photos</button></div>${nav(t ? 'trips' : 'home')}`; return; }
  if (imp.stage === 'reading') { app.innerHTML = `<div class="screen"><div class="bar"><span></span><span>Import</span></div><h1 class="hd">Sorting your photos</h1><div class="glass"><div class="row"><span id="imp-prog">Reading ${imp.done} of ${imp.total}…</span><span class="spin"></span></div><div class="l" style="margin-top:6px">Nothing is saved yet. Keep the app open.</div></div></div>`; return; }
  if (imp.stage === 'saving') { app.innerHTML = `<div class="screen"><div class="bar"><span></span><span>Import</span></div><h1 class="hd">Making memories</h1><div class="glass"><div class="row"><span id="imp-prog">${imp.saved || 0} of ${imp.toSave || 0}…</span><span class="spin"></span></div><div class="l" style="margin-top:6px">Keep the app open — photos upload in the background after.</div></div></div>`; return; }
  const its = imp.items; const withT = its.filter(x => x.hasExif).length, withL = its.filter(x => x.lat != null).length; const sel = imp.sel;
  imp.groups = imp.groups.filter(g => g.items.length);
  const days = [...new Set(imp.groups.map(g => g.date))].sort(); const live = imp.groups.filter(g => !g.skip && groupItems(g).some(x => !x.out));
  const card = (g, i, list) => { const gi = groupItems(g); const sp = groupSpan(g); const n = gi.filter(x => !x.out).length; const nxt = list[i + 1];
    if (g.skip) return `<button class="glass impg skip row" data-act="impSkip|${g.id}"><span class="itick"></span><span style="flex:1;text-align:left"><b style="font-weight:500">${esc(g.title || (g.kind === 'unknown' ? 'No time' : 'Moment'))}</b> <span class="l">· ${gi.length} photo${gi.length === 1 ? '' : 's'}${g.outside ? ' · outside the trip dates' : ''}</span></span><span class="l">Skipped · tap to include</span></button>`;
    const meta = `${g.kind === 'unknown' ? 'No time on these · ' : g.kind === 'screens' ? 'Screenshots · ' : sp ? imgTime(sp.a) + (sp.b !== sp.a ? ' – ' + imgTime(sp.b) : '') + ' · ' : ''}${n} photo${n === 1 ? '' : 's'}${g.place && (g.place.name || g.place.area) ? ' · 📍 ' + esc(g.place.name || g.place.area) : ''}${g.from === 'plan' && !g.edited ? ' · from your plans' : ''}`;
    const strip = gi.map((x, k) => `<button class="ph ${x.out ? 'out' : ''} ${sel.includes(x.id) ? 'sel' : ''}" data-act="impTap|${x.id}"><img src="${x.thumb}" alt="">${x.dt && g.kind !== 'unknown' ? `<span>${imgTime(x.dt)}</span>` : ''}</button>`).join('');
    return `<div class="glass impg"><div class="row" style="gap:10px;align-items:flex-start"><button class="itick on" data-act="impSkip|${g.id}" aria-label="Skip this moment">✓</button><div style="flex:1;min-width:0"><input class="in imptitle" data-act="impTitle|${g.id}" data-on="change" value="${esc(g.title || '')}" placeholder="${g.kind === 'unknown' ? 'What were these?' : 'Name this moment'}"><div class="l" style="margin-top:4px">${meta}</div></div></div>
      <div class="impstrip">${strip}</div>
      <div class="row" style="margin-top:8px;gap:6px;justify-content:flex-start;flex-wrap:wrap">${g.kind !== 'time' ? `<input class="in" type="date" value="${g.date}" data-act="impDate|${g.id}" data-on="change" style="width:auto;padding:5px 8px;font-size:12px">` : ''}${nxt && nxt.kind === 'time' && g.kind === 'time' && !nxt.skip ? `<button class="chip" data-act="impMerge|${g.id}">Merge with next</button>` : ''}<span class="l" style="margin-left:auto">tap photos to move them</span></div></div>`; };
  app.innerHTML = `<div class="screen"><div class="bar"><button data-act="impCancel">Cancel</button><span>${its.length} photos</span></div><h1 class="hd">Check your moments</h1>
    <div class="glass deep" style="font-size:12.5px"><div class="row"><span>Time taken</span><span class="l">${withT} of ${its.length}</span></div><div class="row" style="margin-top:4px"><span>Location</span><span class="l">${withL} of ${its.length}</span></div>${!withL ? `<div class="l" style="margin-top:6px">Your phone didn't share locations, so places aren't guessed. Choosing photos through Files usually keeps them.</div>` : ''}${withT < its.length ? `<div class="l" style="margin-top:6px">Photos without a time are grouped at the end — pick their day there.</div>` : ''}</div>
    <button class="btn lite block" data-act="importMore">+ Add more photos</button>
    ${days.map(d => { const list = imp.groups.filter(g => g.date === d && g.kind === 'time'); const all = list.concat(imp.groups.filter(g => g.date === d && g.kind !== 'time')); return all.length ? `<div class="l">${fmtDow(d)} ${MON[parseDate(d).getMonth()]}${t && d >= t.start && d <= t.end ? ' · day ' + (daysBetween(t.start, d) + 1) : ''}${D.tripForDate(d) && (!t || D.tripForDate(d).id !== t.id) ? ' · ' + esc(D.tripForDate(d).city) : ''}</div>${all.map((g, i) => card(g, i, all)).join('')}` : ''; }).join('')}
    ${sel.length ? `<div class="impbar selbar"><button class="l" style="white-space:nowrap" data-act="impSelClear">${sel.length} selected ✕</button><span style="display:flex;gap:6px;justify-content:flex-end"><button class="chip on" data-act="impSelNew">New moment</button><button class="chip" data-act="impSelMove">Move to…</button><button class="chip" data-act="impSelOut">Leave out</button></span></div>`
      : `<div class="impbar"><span class="l">${live.length} memor${live.length === 1 ? 'y' : 'ies'} · ${live.reduce((s, g) => s + groupItems(g).filter(x => !x.out).length, 0)} photos</span><button class="btn sm" data-act="impSave" ${live.length ? '' : 'disabled'}>Make memories</button></div>`}
  </div>${nav(t ? 'trips' : 'home')}`;
}
const impG = id => imp && imp.groups.find(g => g.id === id);
const impGroupOf = id => imp.groups.find(g => g.items.includes(id));
ACT.impTitle = (id, el) => { const g = impG(id); if (g) { g.title = el.value.trim(); g.edited = true; } };
ACT.impSkip = id => { const g = impG(id); if (g) { g.skip = !g.skip; render(); } };
// tap a photo: select it (a left-out photo comes back instead)
ACT.impTap = id => { const x = imp && imp.items.find(y => y.id === id); if (!x) return; if (x.out) { x.out = false; return render(); } const i = imp.sel.indexOf(id); if (i >= 0) imp.sel.splice(i, 1); else imp.sel.push(id); render(); };
ACT.impSelClear = () => { imp.sel = []; render(); };
ACT.impSelOut = () => { imp.sel.forEach(id => { const x = imp.items.find(y => y.id === id); if (x) x.out = true; }); imp.sel = []; render(); };
function takeSelected(){ const ids = imp.sel.slice(); imp.groups.forEach(g => { g.items = g.items.filter(id => !ids.includes(id)); }); imp.sel = []; return ids.map(id => imp.items.find(x => x.id === id)).filter(Boolean).sort(byTime); }
ACT.impSelNew = () => { const from = impGroupOf(imp.sel[0]); const xs = takeSelected(); if (!xs.length) return; const timed = xs.some(x => x.dt); const g = newGroup(timed ? 'time' : 'unknown', timed ? xs.find(x => x.dt).dt.slice(0, 10) : (from ? from.date : today()), xs); const t = impTrip(); g.outside = !!(t && g.kind === 'time' && (g.date < t.start || g.date > t.end)); importGuess(g); insertGroup(g); imp.groups.forEach(o => { if (o !== g) importGuess(o); }); importPlaces(); render(); toast('New moment'); };
ACT.impSelMove = () => { const mine = new Set(imp.sel.map(id => (impGroupOf(id) || {}).id)); const opts = imp.groups.filter(g => !(mine.size === 1 && mine.has(g.id)));
  openSheet(`<div class="bar"><button data-act="closeSheet">Cancel</button><span>Move ${imp.sel.length} photo${imp.sel.length === 1 ? '' : 's'}</span></div><h2 class="hd md" style="margin:0">Move to…</h2><div class="list" style="font-size:13.5px">${opts.map(g => { const sp = groupSpan(g); return `<button class="row" data-act="impMoveTo|${g.id}"><span style="display:flex;gap:10px;align-items:center"><span class="th" style="width:40px;height:40px"><img src="${(groupItems(g)[0] || {}).thumb || ''}" alt=""></span><span style="text-align:left"><div style="font-weight:500">${esc(g.title || 'Moment')}</div><div class="l">${fmtDow(g.date)}${sp ? ' · ' + imgTime(sp.a) : ''} · ${g.items.length} photo${g.items.length === 1 ? '' : 's'}${g.skip ? ' · skipped' : ''}</div></span></span><span class="l">›</span></button>`; }).join('')}</div>`); };
ACT.impMoveTo = gid => { const g = impG(gid); if (!g) return; const xs = takeSelected(); g.items = g.items.concat(xs.map(x => x.id)); sortGroup(g); imp.groups.forEach(importGuess); closeSheet(); render(); };
ACT.impDate = (id, el) => { const g = impG(id); if (g && el.value) { g.date = el.value; render(); } };
ACT.impMerge = id => { const g = impG(id); const list = imp.groups.filter(x => x.date === g.date && x.kind === 'time'); const nxt = list[list.indexOf(g) + 1]; if (!nxt) return; g.items = g.items.concat(nxt.items); sortGroup(g); if (!g.place && nxt.place) g.place = nxt.place; imp.groups = imp.groups.filter(x => x !== nxt); importGuess(g); render(); };
// ✂ between two photos: split the moment exactly there
ACT.impCut = arg => { const [id, k] = arg.split(','); const g = impG(id); if (!g || +k < 1 || +k >= g.items.length) return;
  const ng = { id: 'g' + (impSeq++), kind: g.kind, date: g.date, items: g.items.slice(+k), place: g.place, outside: g.outside }; g.items = g.items.slice(0, +k); g.edited = false; imp.groups.splice(imp.groups.indexOf(g) + 1, 0, ng); importGuess(g); importGuess(ng); render(); };
ACT.impCancel = async () => { if (!await ask('Stop importing?', { sub: 'Nothing has been saved.', ok: 'Stop', no: 'Keep going' })) return; const t = impTrip(); imp.items.forEach(x => { try { URL.revokeObjectURL(x.thumb); } catch (e) {} }); imp = null; if (t) go('trip', { id: t.id }); else go('home'); };
ACT.impSave = async () => {
  const live = imp.groups.filter(g => !g.skip && groupItems(g).some(x => !x.out)); if (!live.length) return;
  const me = D.me(); const t0 = impTrip(); const mine = imp; imp.stage = 'saving'; imp.saved = 0; imp.toSave = live.reduce((s, g) => s + groupItems(g).filter(x => !x.out).length, 0); render();
  let made = 0; const tripsUsed = new Set();
  for (const g of live) {
    const photos = [];
    for (const x of groupItems(g).filter(x => !x.out)) { const ph = await storePhoto(x.file); photos.push({ asset: ph.asset, thumb: ph.thumb, polaroid: false, stickers: [], taken: x.dt ? x.dt.slice(11, 16) : '' }); mine.saved++; const pr = $('#imp-prog'); if (pr) pr.textContent = `${mine.saved} of ${mine.toSave}…`; }
    const sp = groupSpan(g); const trip = t0 && g.date >= t0.start && g.date <= t0.end ? t0 : D.tripForDate(g.date); if (trip) tripsUsed.add(trip.id);
    await Store.put('moments', { id: Store.uid(), tripId: trip ? trip.id : '', date: g.date, authorId: me.id, kind: 'moment', text: g.title || '', photos, items: [], time: sp && g.kind === 'time' ? sp.a.slice(11, 16) : '', place: g.place && g.place.lat != null ? g.place : null, imported: true, createdAt: sp && g.kind === 'time' ? dtMs(sp.a) : Date.now() + made, addedAt: Date.now() });
    made++;
  }
  // one note for the other phone ("Des added 42 photos from Toronto") instead of one per memory
  const tripId = t0 ? t0.id : tripsUsed.size === 1 ? [...tripsUsed][0] : '';
  await Store.put('imports', { id: Store.uid(), by: me.id, tripId, count: mine.saved, memories: made, at: Date.now() });
  mine.items.forEach(x => { try { URL.revokeObjectURL(x.thumb); } catch (e) {} }); imp = null;
  toast(made + ' memor' + (made === 1 ? 'y' : 'ies') + ' added'); if (tripId) go('days', { id: tripId }); else go('memories');
};
// the + on Home: one memory, or a pile of photos
ACT.homeAdd = () => openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Add</span></div><div class="list" style="font-size:13.5px">${rowBtn('newMoment', 'New memory', 'A message, photos, voice, song or cost')}${rowBtn('importStart', 'Import photos', 'A pile of photos, sorted into days and moments')}${rowBtn('tripAdd', 'New trip', 'City and dates, or from a booking')}${rowBtn('bookingSheet', 'Add a booking', 'Tickets, reservations, flights, stays — from the email or PDF')}</div>`);

// ---------- V2.9: export everything / restore ----------
// One zip: every photo, voice note, chat photo and sticker in folders by date, readable text files,
// a budget per trip, and backup.json (everything the app needs to rebuild itself from the zip).
function exportScope(){ const me = D.me().id; const hide = new Set();
  // surprises stay surprises: the other person's unopened presents, wishes, hidden occasions and hidden plans
  Store.all('presents').forEach(p => { if (p.fromUser !== me && !(p.forUser === me && todayIn(D.me()) >= p.date)) hide.add(p.id); });
  Store.all('wishes').forEach(w => { if (w.userId !== me) hide.add(w.id); });
  Store.all('trips').forEach(t => { if (t.occasion && t.secret && t.authorId && t.authorId !== me) hide.add(t.id); });
  Store.all('moments').forEach(m => { if ((m.kind === 'plan' && m.hidden && m.authorId && m.authorId !== me) || hide.has(m.tripId)) hide.add(m.id); });
  ['push', 'pushtest', 'pushlog'].forEach(c => Store.all(c).forEach(x => hide.add(x.id)));
  return hide; }
function exportCounts(){ const hide = exportScope(); const ms = Store.all('moments').filter(m => !hide.has(m.id));
  return { photos: ms.reduce((s, m) => s + (m.photos||[]).length, 0), voices: ms.reduce((s, m) => s + D.voices(m).length, 0), chat: D.bubbles().filter(b => b.photo).length, stickers: D.stickers().length, memories: ms.filter(m => m.kind === 'moment').length, trips: D.trips().length }; }
ACT.exportAll = () => { const c = exportCounts();
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Backup</span></div><h2 class="hd md" style="margin:0">Export everything</h2>
    <div class="glass deep env"><div class="row"><span>Photos</span><span class="l">${c.photos}</span></div><div class="row"><span>Voice notes</span><span class="l">${c.voices}</span></div><div class="row"><span>Chat photos</span><span class="l">${c.chat}</span></div><div class="row"><span>Stickers</span><span class="l">${c.stickers}</span></div><div class="row"><span>Memories, plans, lists, chat</span><span class="l">text</span></div><div class="row"><span>Budgets</span><span class="l">${c.trips} × .xlsx</span></div></div>
    <div class="sub" style="text-align:left">One zip. Keep it in Google Drive or Files — <b>Restore a backup</b> can rebuild the app from it. Photos still on the server are downloaded first, so big libraries take a minute.</div>
    <div id="exp-prog" class="l"></div>
    <button class="btn block" data-act="doExportAll">Make the zip</button><button class="row l" style="justify-content:center" data-act="exportJson">or just the data (.json, small)</button>`); };
ACT.exportJson = () => { const hide = exportScope(); download(new Blob([JSON.stringify(JSON.parse(Store.exportJSON()).filter(r => !hide.has(r.id)), null, 2)], { type: 'application/json' }), 'des-jett-backup-' + today() + '.json'); };
const safeName = s => String(s || '').replace(/[\/\\:*?"<>|#%]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
ACT.doExportAll = async () => {
  if (!window.JSZip) { toast('Zip library didn\'t load — saving the data only'); return ACT.exportJson(); }
  const hide = exportScope(); const recs = JSON.parse(Store.exportJSON()).filter(r => !hide.has(r.id)); const keep = new Set(recs.map(r => r.id));
  const zip = new JSZip(); const files = {}; const prog = $('#exp-prog'); let n = 0, missing = 0;
  const jobs = []; const names = {};
  const uniq = path => { if (!names[path]) { names[path] = 1; return path; } const i = path.lastIndexOf('.'); let k = 2; while (names[path.slice(0, i) + ' ' + k + path.slice(i)]) k++; const p = path.slice(0, i) + ' ' + k + path.slice(i); names[p] = 1; return p; };
  const want = (asset, path) => { if (asset && !files[asset] && !jobs.some(j => j.asset === asset)) jobs.push({ asset, path: uniq(path) }); };
  const ms = Store.all('moments').filter(m => keep.has(m.id)).sort((a, b) => (a.date + String(a.createdAt||0).padStart(15,'0')).localeCompare(b.date + String(b.createdAt||0).padStart(15,'0')));
  ms.forEach(m => { const t = m.tripId ? Store.get('trips', m.tripId) : null; const dir = m.date + (t ? ' ' + safeName(t.city) : '');
    (m.photos||[]).forEach((p, i) => want(p.asset, `Photos/${dir}/${m.date}${m.text ? ' ' + safeName(m.text).slice(0, 30) : ''} ${i + 1}.${(p.asset.split('.').pop() || 'jpg')}`));
    D.voices(m).forEach((v, i) => want(v.asset, `Voice notes/${m.date} ${safeName(v.name || m.text || 'voice').slice(0, 30)} ${i + 1}.${v.asset.split('.').pop()}`));
    if (m.attachment && m.attachment.asset) want(m.attachment.asset, `Bookings/${m.date} ${safeName(m.attachment.name || 'confirmation')}`); });
  Store.all('presents').filter(p => keep.has(p.id)).forEach(p => { (p.photos||[]).forEach((ph, i) => want(ph.asset, `Presents/${p.date} ${i + 1}.jpg`)); D.voices(p).forEach((v, i) => want(v.asset, `Presents/${p.date} voice ${i + 1}.${v.asset.split('.').pop()}`)); });
  D.bubbles().forEach(b => { if (b.photo) want(b.photo, `Chat/${isoDate(new Date(b.at))} ${safeName((D.user(b.userId)||{}).name)}.jpg`); if (b.sticker && b.sticker.asset) want(b.sticker.asset, `Stickers/sticker.png`); });
  D.stickers().forEach(s => want(s.asset, `Stickers/sticker.png`));
  for (const j of jobs) { const b = await Store.blob(j.asset).catch(() => null); n++; if (b) { zip.file(j.path, b); files[j.asset] = j.path; } else missing++; if (prog) prog.textContent = `Collecting ${n} of ${jobs.length}…`; }
  // readable copies
  const who = id => (D.user(id) || {}).name || '';
  const memTxt = ms.filter(m => m.kind !== 'plan').map(m => { const t = m.tripId ? Store.get('trips', m.tripId) : null; return [`${m.date}${m.time ? ' ' + m.time : ''} · ${who(m.authorId)}${t ? ' · ' + t.city : ''}`, m.flight ? `  ✈ ${m.flight.no || ''} ${m.flight.from || ''} → ${m.flight.to || ''} ${m.flight.dep || ''}–${m.flight.arr || ''}` : '', m.text ? '  ' + m.text : '', m.place && m.place.name ? '  📍 ' + m.place.name : '', ...D.costLines(m).map(c => `  $${c.amount} ${c.label || ''} (${c.tag || 'other'}) · ${D.payerTextC(c)}`), ...D.songs(m).map(s => `  ♫ ${s.title || ''} ${s.artist ? '— ' + s.artist : ''} ${s.url}`), ...D.videos(m).map(v => `  ▶ ${v.title || ''} ${v.url}`), ...D.notes(m.id).map(n => `  ${who(n.by)} remembers: ${n.text}`), ...(m.photos||[]).map((p, i) => p.caption ? `  photo ${i + 1}: ${p.caption}` : ''), ...D.voices(m).map(v => `  ● voice note ${fmtDur(v.dur)}`)].filter(Boolean).join('\n'); }).join('\n\n');
  zip.file('Memories.txt', memTxt || 'No memories yet.');
  zip.file('Plans.txt', ms.filter(m => m.kind === 'plan').map(p => `${p.date}${p.time ? ' ' + p.time : ''} · ${p.title || ''}${p.note ? ' — ' + p.note : ''}`).join('\n') || 'No plans.');
  zip.file('Chat.txt', D.bubbles().slice().sort((a, b) => a.at - b.at).map(b => { const d = new Date(b.at); return `${isoDate(d)} ${d.toTimeString().slice(0, 5)} ${who(b.userId)}${b.kind === 'think' ? ' (thinking)' : ''}: ${b.photo ? '[photo] ' + (b.auto ? '' : b.text) : b.sticker ? '[sticker]' : b.text}`; }).join('\n') || 'Nothing yet.');
  zip.file('Lists.txt', D.lists().map(l => `${l.icon || ''} ${l.label}\n` + D.listItems().filter(i => i.list === l.key).map(i => `  [${i.done ? 'x' : ' '}] ${i.text}${i.city ? ' (' + i.city + ')' : ''}${i.note ? ' — ' + i.note : ''}${i.link ? ' ' + i.link : ''}`).join('\n')).join('\n\n'));
  D.trips().concat(D.occasions()).forEach(t => { const x = budgetWorkbook(t); const nm = `Budgets/${t.start} ${safeName(t.city)}`; if (x) zip.file(uniq(nm + '.xlsx'), x); else zip.file(uniq(nm + '.csv'), budgetCsv(t)); });
  zip.file('backup.json', JSON.stringify({ app: 'des-jett', version: 2, made: new Date().toISOString(), by: D.me().id, docs: recs, files }, null, 1));
  zip.file('README.txt', 'Des & Jett backup, made ' + new Date().toString() + '\n\nPhotos, voice notes, chat photos and stickers are in their folders, named by date.\nMemories.txt, Plans.txt, Chat.txt and Lists.txt are readable copies.\nTo rebuild the app: Profile → Restore a backup → pick this zip.\n');
  if (prog) prog.textContent = 'Zipping…';
  const blob = await zip.generateAsync({ type: 'blob' }); const f = new File([blob], `des-jett-${today()}.zip`, { type: 'application/zip' }); closeSheet();
  if (missing) toast(missing + ' file' + (missing === 1 ? '' : 's') + ' couldn\'t be downloaded — try again with signal');
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: 'Des & Jett backup' }); return; } catch (e) {} } download(blob, f.name); if (!missing) toast('Saved');
};
const EXT_TYPE = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', m4a: 'audio/mp4', mp4: 'audio/mp4', webm: 'audio/webm', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', pdf: 'application/pdf' };
ACT.importAll = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,.zip,application/json,application/zip'; f.style.display = 'none'; document.body.appendChild(f);
  f.onchange = async () => { const file = f.files[0]; f.remove(); if (!file) return; try {
    if (/\.zip$/i.test(file.name) || file.type.includes('zip')) {
      if (!window.JSZip) return toast('Zip library didn\'t load — try again with signal');
      toast('Restoring…'); const zip = await JSZip.loadAsync(file); const bj = zip.file('backup.json'); if (!bj) return toast('That zip isn\'t a Des & Jett backup');
      const data = JSON.parse(await bj.async('string')); let nb = 0;
      for (const [asset, path] of Object.entries(data.files || {})) { const zf = zip.file(path); if (!zf) continue; const buf = await zf.async('arraybuffer'); await Store.restoreBlob(asset, new Blob([buf], { type: EXT_TYPE[(asset.split('.').pop() || '').toLowerCase()] || '' })); nb++; }
      const n = await Store.importJSON(JSON.stringify(data.docs || [])); toast(`Restored ${n} record${n === 1 ? '' : 's'} and ${nb} file${nb === 1 ? '' : 's'}`);
    } else { const n = await Store.importJSON(await file.text()); toast(`Restored ${n} record${n === 1 ? '' : 's'}`); }
    render(); } catch (e) { toast('Couldn\'t restore: ' + e.message); } }; f.click(); };

// ---------- What's new (shown once per phone after an update; Profile → What's new replays it) ----------
const APP_VERSION = '2.12'; const WN_VERSIONS = ['2.10', '2.11', '2.12'];
let wnIdx = 0, wnForce = false;
function needsWhatsNew(){ if (window.DJ_SKIP_WHATSNEW && !wnForce) return false; if (wnForce) return true; try { return localStorage.getItem('dj.seenVer') !== APP_VERSION; } catch (e) { return false; } }
function markWhatsNewSeen(){ try { localStorage.setItem('dj.seenVer', APP_VERSION); } catch (e) {} }
function whatsNewCards(){ const [a, b] = D.users2(); const o = D.other() || b || { name: 'them' }; const me = D.me() || a;
  const msg = (u, inner, mine) => `<div class="msg ${mine ? 'me' : ''}"><i class="pal ${u.pal}"></i><div>${inner}</div></div>`;
  const v211 = [
    ['Tickets & reservations from email', `Not just flights: movie tickets, concerts, dinner reservations, trains. Upload the PDF or paste the email and it becomes a plan on the calendar at the right time, with the cost in the budget and the ticket attached. The + on the calendar has “From a booking”.`,
      `<div class="mini"><div class="chips" style="justify-content:center"><span class="chip">Flight</span><span class="chip">Stay</span><span class="chip on">Event</span><span class="chip">Food</span><span class="chip">Transport</span></div><div style="font-size:18px;font-weight:500;margin-top:12px">Primetime</div><div class="l">Landmark 10 New West · Tue Oct 6 · 4:30pm · Seats D-10, D-11</div><div class="row" style="margin-top:8px"><span class="l">Cost</span><span style="font-weight:500">$23.10</span></div></div>`],
    ['A new trip from a booking', `Trips → + → “From a booking”: upload the flight itinerary and the trip is made for you — the city where you land, the dates from the first flight to the last, and the flights already in it. The + on Home can start a trip too.`,
      `<div class="mini"><div class="list" style="font-size:13.5px"><div class="row"><span>New trip</span><span style="font-weight:500">Toronto</span></div><div class="row"><span>Dates</span><span class="l">Oct 2 – Oct 11</span></div><div class="row"><span>Flights</span><span class="l">YVR → YYZ · YYZ → YVR</span></div></div></div>`],
    ['Fewer photos on the wall', `Days with lots of photos show a few, and “See all” opens every photo — as a grid like your Photos app, or scrolling one by one with their captions. Tap ☆ Feature on a photo to keep it on the day's wall.`,
      `<div class="mini"><div class="pgrid" style="pointer-events:none">${['#E9C9A8','#C98F7A','#8E6A7E','#B9D3C9','#C4D4E6','#F2B8C6'].map(c => `<button style="background:${c}"></button>`).join('')}</div><div class="seg" style="margin-top:10px"><button class="on">▦ Grid</button><button>☰ Scroll</button></div></div>`],
    ['YouTube videos', `Next to Song there's <b>▶ Video</b>: paste a YouTube link and it plays right in the memory, like a Spotify song does.`,
      `<div class="mini"><div class="attach" style="pointer-events:none"><button><b>◫</b>Photo</button><button><b>●</b>Voice</button><button><b>♫</b>Song</button><button class="sel"><b>▶</b>Video</button></div><div class="yt" style="display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px">▶</div></div>`],
    ['Photo, right from Home', `Tap your pal: Say · Think · <b>Photo</b>. Pick one (or a few), add a caption, send — it pops up on Home and stays in Chat.`,
      `<div class="mini"><div class="seg"><button>Say</button><button>Think</button><button class="on">Photo</button></div><div class="btn lite block" style="margin-top:10px">◫ Take or choose a photo</div></div>`],
  ].map(c => c.concat('2.11'));
  const sw = c => `<i style="display:block;width:46px;height:46px;border-radius:9px;background:${c}"></i>`;
  const v212 = [
    ['Our days', `A trip opens on its days now — each date with its memories, photos, flights and plans, newest first (tap ⇅ to start from day 1). Tap any of it to open that day.`,
      `<div class="mini"><div class="tday" style="border:0;padding:0"><div class="dn"><b>3</b><span>Sat</span></div><div class="ms"><div class="tm"><div class="t"><i class="pal bunny"></i>Morning wander</div><div class="m">9:40am · 📍 Kensington Market</div><div style="display:flex;gap:4px">${['#E9C9A8','#8E6A7E','#B9D3C9','#C4D4E6'].map(sw).join('')}</div></div><div class="tplan">Dinner at Alo · 7:00pm · plan</div></div></div></div>`],
    ['Your side of it', `Every memory can hold what each of you remembers — your own words, under “Des remembers” and “Jett remembers”. Add yours when you make a memory, or tap “+ your side of this” on any day.`,
      `<div class="mini"><div class="notes" style="margin:0"><div class="note"><i class="pal bunny"></i><div><span class="l">Des remembers</span><p>the guy who sang to us at the ramen place 😭</p></div></div><div class="note"><i class="pal puppy"></i><div><span class="l">Jett remembers</span><p>you ate all my gyoza</p></div></div></div></div>`],
    ['Busy days, tidier', `Days with lots of photos show one big and two small, with “+39” — tap for all of them. The grid loads quickly now (small previews), and ☆ Feature picks the big one.`,
      `<div class="mini"><div class="mosaic" style="grid-template-rows:70px 70px"><button style="background:#E9C9A8"></button><button style="background:#B9D3C9"></button><button class="more" style="background:#8E6A7E"><span>+39</span></button></div></div>`],
    ['Sharper photos', `Photos keep more detail now. Selfies came out mirrored? Tap a photo → ⇋ Flip. Save works on each other's photos, and chat photos always arrive with their message.`,
      `<div class="mini" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap"><span class="chip">⇋ Flip</span><span class="chip">Save</span><span class="chip on">sharper</span></div>`],
  ].map(c => c.concat('2.12'));
  return v212.concat(v211).concat([
    ['Chat, with photos', `Chat has its own typing box now. Send messages, 💭 thoughts, photos and stickers — photos stay, and you can save them to your phone. You can also send a photo from your pal on Home.`,
      `<div class="mini" style="display:flex;flex-direction:column;gap:8px">${msg(o, `<div class="b">look where we ate 😭</div>`)}${msg(o, `<div class="cph" style="width:130px;height:96px;background:linear-gradient(135deg,#E9C9A8,#C98F7A)"></div>`)}${msg(me, `<div class="b">going back tomorrow</div>`, true)}<div class="composer" style="margin-top:4px"><span class="cbtn">◫</span><span class="cbtn">☺</span><span class="in" style="color:var(--mu);font-size:14px">say something</span><span class="btn sm">Send</span></div></div>`],
    ['Your own stickers', `Make stickers out of your photos: in Photos, press and hold one of you until it lifts out, tap <b>Copy</b>, then <b>Paste</b> here. They're shared — use them on photos and in chat. Hold one to remove it.`,
      `<div class="mini"><div class="tray" style="justify-content:center"><button><i class="pal bunny"></i></button><button><i class="pal puppy"></i></button><button><i class="tstk" style="background:radial-gradient(circle,#E0607E 55%,transparent 57%)"></i></button><button class="add">+</button></div><div class="l center" style="margin-top:10px">Copy in Photos → Paste</div></div>`],
    ['Import a pile of photos', `Pick a whole trip's photos at once. They're sorted into days and moments by when they were taken, named from your plans (“Dinner at Alo”) or where you were. Check them — tick, rename, tap photos to move them into their own moment — then Make memories. From any trip, the + on Home, a day, or Memories.`,
      `<div class="mini"><div class="row" style="gap:10px;align-items:flex-start"><span class="itick on">✓</span><div style="flex:1"><div style="font-weight:500">Dinner at Alo</div><div class="l">7:20pm – 9:05pm · 6 photos · from your plans</div></div></div><div class="impstrip" style="margin-top:8px"><i class="ph" style="background:#C98F7A"></i><i class="ph sel" style="background:#8E6A7E"></i><i class="ph" style="background:#E9C9A8"></i></div></div>`],
    ['Things to do together', `Lists for both of you: to cook, to do, places to go, to watch — or make your own. Give something a city and it shows up on that trip. Tick it off and make it a memory.`,
      `<div class="mini"><div class="lcards" style="gap:8px"><div class="glass lcard" style="min-height:0"><span class="ic">🍳</span><b>To cook</b><span class="pv">dumplings from scratch</span></div><div class="glass lcard" style="min-height:0"><span class="ic">📍</span><b>Places to go</b><span class="pv">Toronto Island</span></div></div></div>`],
    ['Our songs, our map, on this day', `In Memories: every song from every memory in one place, and a map of our homes, trips and the places in our photos. On Home, “On this day” brings back a memory from a month (or a year) ago today.`,
      `<div class="mini"><div class="list" style="font-size:13px"><div class="row"><span>Our songs</span><span class="l">♫</span></div><div class="row"><span>Our map</span><span class="l">📍</span></div><div class="row"><span>On this day</span><span class="l">a month ago today</span></div></div></div>`],
    ['And a few fixes', `A clear <b>+ Plan</b> (and a + on the calendar). Trips has a <b>Now</b> tab while you're on one. Voice notes can be an audio file. The app icon shows a number for unread messages. Profile → <b>Export everything</b> saves every photo and voice note in one zip.`,
      `<div class="mini" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center"><span class="chip">+ Plan</span><span class="chip on">Now</span><span class="chip">↑ Audio file</span><span class="chip">Export everything</span><span class="chip"><i class="dot"></i>2</span></div>`],
  ].map(c => c.concat('2.10'))).filter(c => wnForce || WN_VERSIONS.indexOf(c[3]) > WN_VERSIONS.indexOf(localStorage.getItem('dj.seenVer') || '')); }
function renderWhatsNew(app){
  const cards = whatsNewCards(); if (!cards.length) { markWhatsNewSeen(); wnForce = false; return (route.name === 'home' ? renderHome : renderHome)(app); } const i = Math.min(wnIdx, cards.length - 1); const [title, body, fig] = cards[i]; const last = i === cards.length - 1;
  app.innerHTML = `<div class="screen tut wn"><div class="bar"><span>What's new · ${MONTHS[new Date().getMonth()]} update</span>${!last ? '<button data-act="wnDone">Skip</button>' : '<span></span>'}</div>${fig}<div style="margin-top:auto"><div class="hd md">${title}</div><p>${body}</p></div><div class="row" style="margin-top:14px"><div class="dots">${cards.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><span style="display:flex;gap:6px">${i ? '<button class="btn sm lite" data-act="wnNav|-1">Back</button>' : ''}<button class="btn sm" data-act="${last ? 'wnDone' : 'wnNav|1'}">${last ? 'Got it' : 'Next'}</button></span></div></div>`;
  let x0 = null; const el = app.querySelector('.wn'); el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true }); el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) { const n = wnIdx + (dx < 0 ? 1 : -1); if (n >= 0 && n < cards.length) { wnIdx = n; render(); } } });
}
ACT.wnNav = d => { wnIdx = Math.max(0, wnIdx + +d); render(); };
ACT.wnDone = () => { wnIdx = 0; wnForce = false; markWhatsNewSeen(); render(); window.scrollTo(0, 0); };
ACT.whatsNew = () => { wnIdx = 0; wnForce = true; render(); window.scrollTo(0, 0); };

// ---------- boot ----------
window.addEventListener('hashchange', () => { const [n, id] = location.hash.slice(1).split('/'); if (n && n !== route.name || id !== route.id) { route = { name: n || 'home', id }; render(); } });
Store.onChange(() => { if (viewer) drawViewer(true); else if (!sheet) render(); });
Store.ready = Store.connect(CFG).then(() => { const [n, id] = location.hash.slice(1).split('/'); route = { name: n || 'home', id }; render(); setInterval(applySky, 60000); syncIcs(false); checkPush(); setInterval(() => syncIcs(false), 3600000); if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{}); });
window.DJ = { D, go, ACT, render, parseConfirmation, skyMode, Store, imp: () => imp, pdfText, storePhoto };
})();
