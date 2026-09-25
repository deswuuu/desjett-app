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
  trips(){ return Store.all('trips').sort((a,b) => a.start < b.start ? -1 : 1); },
  trip(id){ return Store.get('trips', id); },
  moments(){ const me = (D.me()||{}).id; return Store.all('moments').filter(m => !(m.kind === 'plan' && m.hidden && m.authorId && m.authorId !== me)); },
  tripMoments(id){ return D.moments().filter(m => m.tripId === id).sort((a,b) => (a.date+a.createdAt) < (b.date+b.createdAt) ? -1 : 1); },
  events(){ return Store.all('events'); },
  bubbles(){ return Store.all('bubbles'); },
  tripForDate(date){ return D.trips().find(t => date >= t.start && date <= t.end) || null; },
  share(m, uid){ const c = m.cost; if (!c || !+c.amount) return 0; if (c.paidBy !== 'both') return c.paidBy === uid ? +c.amount : 0; const sp = c.split || {}; if (sp.mode === 'amt') return sp[uid] != null ? +sp[uid] : +c.amount / 2; return +c.amount * ((sp[uid] != null ? +sp[uid] : 50) / 100); },
  payerText(m){ const c = m.cost; if (!c) return ''; if (c.paidBy !== 'both') return (D.user(c.paidBy)||{}).name || ''; const [a, b] = D.users2(); const sa = D.share(m, a.id), sb = D.share(m, b.id); const even = Math.abs(sa - sb) < 0.01; return even ? `${a.name} & ${b.name}` : `${a.name} ${money2(sa)} · ${b.name} ${money2(sb)}`; },
  tripCost(t){ const ms = D.tripMoments(t.id); const by = {}; let total = 0; const cat = {}; ms.forEach(m => { if (m.cost && m.cost.amount) { total += +m.cost.amount; D.users().forEach(u => { by[u.id] = (by[u.id]||0) + D.share(m, u.id); }); const c = m.cost.tag || 'other'; cat[c] = (cat[c]||0) + +m.cost.amount; } }); return { total, by, cat }; },
  tripPlan(t){ const g = D.settings().tripGuess; const nights = Math.max(1, daysBetween(t.start, t.end)); const days = nights + 1; const def = { flight: g.flight, stay: g.night * nights, food: Math.round(g.day * days * 0.6), transit: Math.round(g.day * days * 0.15), fun: Math.round(g.day * days * 0.25) }; (t.cats||[]).forEach(c => def[c.key] = 0); const out = Object.assign(def, t.plan || {}); Object.keys(t.planCfg || {}).forEach(k => { out[k] = D.planTotalFor(t, k); }); return out; },
  planCfg(t, key){ const c = (t.planCfg || {})[key]; if (c) return c; const g = D.settings().tripGuess; const legacy = (t.plan || {})[key]; if (legacy != null) return { mode:'total', who:'both', a: +legacy, b: 0 }; if (key === 'flight') return { mode:'total', who:'both', a: g.flight, b: 0 }; if (key === 'stay') return { mode:'day', who:'both', a: g.night, b: 0 }; const per = { food: 0.6, transit: 0.15, fun: 0.25 }[key]; return per ? { mode:'day', who:'both', a: Math.round(g.day * per), b: 0 } : { mode:'total', who:'both', a: 0, b: 0 }; },
  planUnits(t, key){ const nights = Math.max(1, daysBetween(t.start, t.end)); return key === 'stay' ? nights : nights + 1; },
  planTotalFor(t, key){ const c = D.planCfg(t, key); const per = c.who === 'each' ? (+c.a||0) + (+c.b||0) : (+c.a||0); return Math.round(per * (c.mode === 'day' ? D.planUnits(t, key) : 1)); },
  planTotal(t){ const p = D.tripPlan(t); return D.cats(t).reduce((a,c) => a + (+p[c.key]||0), 0); },
  envelopeMonthly(){ return D.settings().envelopes.reduce((s,e) => s + (+e.amount||0) * (e.per === 'each' ? 2 : 1), 0); },
  nextTrip(){ const t = today(); return D.trips().find(x => x.end >= t) || null; },
  cats(t){ const base = CATS.map(([k,l]) => ({ key:k, label:l })); if (!t) return base; const custom = (t.cats||[]); const renamed = base.map(c => Object.assign({}, c, (t.catNames||{})[c.key] ? { label: t.catNames[c.key] } : {})).filter(c => !(t.hidden||[]).includes(c.key)); return renamed.concat(custom); },
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
  if (['profile','between','gcal','emails','howto'].includes(route.name)) mode = 'day';
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
  root.querySelectorAll('[data-asset]').forEach(async el => { const u = await Store.blobUrl(el.dataset.asset); if (u) { if (el.tagName === 'IMG') el.src = u; else el.style.backgroundImage = `url(${u})`; } });
}
function palOf(id){ const u = D.user(id); return u ? `<i class="pal ${u.pal}" title="${esc(u.name)}"></i>` : ''; }
function nav(on){ return `<nav class="nav">${[['home','Home'],['trips','Trips'],['calendar','Calendar'],['memories','Memories']].map(([k,l]) => `<button class="${on===k?'on':''}" data-go="${k}">${l}</button>`).join('')}</nav>`; }

function render(){
  applySky();
  const app = $('#app'); const s = D.settings();
  if (!s.setup) return renderSetup(app);
  if (!D.me()) return renderWho(app);
  const R = { chat: renderChat, howto: renderHowto, gcal: renderGcal, cat: renderCategory, home: renderHome, trips: renderTrips, trip: renderTrip, days: renderDays, budget: renderBudget, photos: renderPhotos, day: renderDay, calendar: renderCalendar, profile: renderProfile, memories: renderMemories, between: renderBetween, emails: renderEmails, moments: renderMoments };
  (R[route.name] || renderHome)(app);
  bind(app);
}

// ---------- setup ----------
let setupStep = 1, setupData = { anni:'', a:{name:'', pal:'bunny', city:'Vancouver'}, b:{name:'', pal:'puppy', city:'Toronto'}, guess:{flight:400,night:120,day:80}, env:[{name:'Gifts',amount:100,per:'each'},{name:'Food sends',amount:100,per:'each'}] };
function renderSetup(app){
  const d = setupData;
  const cityOpts = c => Object.keys(CITIES).map(k => `<option ${k===c?'selected':''}>${k}</option>`).join('');
  const steps = {
    1: `<div class="bar"><span>Setup</span><span>1 / 3</span></div><h1 class="hd">Who's who</h1>
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
  localStorage.setItem('dj.me', a.id); howtoIdx = 0; go('howto');
};
function renderWho(app){
  app.innerHTML = `<div class="screen" style="min-height:calc(100vh - 140px);justify-content:center"><h1 class="hd center">Which one are you?</h1><div class="pick">${D.users().map(u => `<button data-act="iam|${u.id}"><i class="pal ${u.pal}"></i>${esc(u.name)}</button>`).join('')}</div>${Store.mode === 'supabase' && !Store.user ? `<div class="glass"><div class="l">Sign in to sync</div><input class="in" id="email" placeholder="email"><button class="btn block" style="margin-top:8px" data-act="signin">Send magic link</button></div>` : ''}</div>`; bind(app);
}
ACT.iam = id => { localStorage.setItem('dj.me', id); go('home'); };
ACT.signin = async () => { try { await Store.signIn($('#email').value.trim()); toast('Check your email'); } catch (e) { toast(e.message); } };

// ---------- home ----------
function renderHome(app){
  const me = D.me(), other = D.other(), t = D.nextTrip(), now = new Date();
  const days = t ? daysBetween(today(), t.start) : null;
  const mine = D.latestBubble(me.id), theirs = other && D.latestBubble(other.id); const everBubbled = D.bubbles().length > 0;
  const [L, R] = D.users2();
  const myMode = skyMode(me), theirMode = other ? skyMode(other) : myMode;
  const sameCity = t && today() >= t.start && today() <= t.end;
  const glow = { morning:'#FDE8D3', day:'#FFFFFF', sunset:'#F39F5A', night:'#502D55' };
  const anni = D.isMonthiversary(today()), months = D.monthsSince(today());
  const gap = days == null ? 0 : Math.max(0, Math.min(1, days / 60)); const travel = Math.max(0, (Math.min(480, window.innerWidth) - 52 - 220) / 2); const px = (anni || sameCity) ? Math.round(travel + 6) : Math.round((1 - gap) * travel - 4);
  const bub = (b, side) => b ? `<button class="bub ${b.kind} ${side}" data-go="chat" style="${side==='r'?'right:'+(6+px):'left:'+(6+px)}px;top:${b.kind==='think'?0:6}px">${esc(b.text)}</button>` : '';
  const flightDay = t && today() === t.start && D.tripMoments(t.id).find(m => m.flight);
  const cost = t ? D.tripCost(t) : null, plan = t ? D.planTotal(t) : 0;
  const recent = D.moments().filter(m => m.kind !== 'plan' && m.kind !== 'booking').sort((a,b) => (b.date+b.createdAt).localeCompare(a.date+a.createdAt)).slice(0,3);
  app.innerHTML = `<div class="screen">
    <div class="sides" id="sides">
      ${[L,R].map((u,i) => u ? `<div class="side ${i?'r':''} ${u.id===me.id?'me':''}"><span class="d">${u.id===me.id && !i ? `<button data-go="profile"><i class="pal ${u.pal}"></i></button> ` : ''}${sameCity && i ? '' : dateIn(u, now) + ' · ' + timeIn(u, now)} <span id="wx-${u.id}"></span>${u.id===me.id && i ? ` <button data-go="profile"><i class="pal ${u.pal}"></i></button>` : ''}</span><span class="c">${sameCity && i ? esc(me.name) + ' &amp; ' + esc(other.name) : esc(u.city)}</span></div>` : '').join('')}
    </div>
    <div class="meet">
      <button class="track" data-go="chat" style="height:12px;bottom:3px;background:transparent"><span style="display:block;height:1px;background:var(--ln);margin-top:5px"></span></button><button class="chatlink" data-go="chat">Chat ›</button><div class="tick" style="left:24px"></div><div class="tick" style="left:50%"></div><div class="tick" style="right:24px"></div>
      ${other && theirMode !== myMode && !sameCity ? `<div class="halo" style="${me.pal==='bunny'?'right':'left'}:-10px;background:${glow[theirMode]};opacity:.75"></div>` : ''}
      ${bub(me.pal==='bunny'?mine:theirs, 'l')}${bub(me.pal==='bunny'?theirs:mine, 'r')}
      <button data-act="bubble|${me.pal==='bunny'?me.id:(other?other.id:'')}"><i class="pal lg bunny" style="transform:translateX(${px}px)"></i></button>
      <button data-act="bubble|${me.pal==='puppy'?me.id:(other?other.id:'')}"><i class="pal lg puppy" style="transform:translateX(${-px}px) scaleX(-1)"></i></button>
    </div>
    ${!everBubbled ? '<div class="l center" style="margin-top:-8px">tap a pal to say or think something</div>' : ''}
    ${anni ? `<div class="center"><div class="hd md">${months} Month${months===1?'':'s'}!</div><div class="sub">since ${fmtD(D.anniversary())}${t && !sameCity ? ' · ' + esc(t.city) + (days > 0 ? ' in ' + days + ' days' : ' today') : ''}</div></div>` : t ? `<div class="center"><div class="hd md">${sameCity ? 'Together' : esc(t.city)}</div><div class="sub">${sameCity ? esc(t.city) + ' · day ' + (daysBetween(t.start, today())+1) + ' of ' + (daysBetween(t.start,t.end)+1) : fmtD(t.start) + (days > 0 ? ' · ' + days + ' days' : ' · today') + (t.flyer ? ' · ' + esc((D.user(t.flyer)||{}).name||'') + ' flies' : '')}</div></div>` : `<div class="center"><div class="hd md">No trip yet</div><div class="sub" style="margin-top:8px">Add one in Trips</div></div>`}
    ${flightDay ? flightCard(flightDay) : t ? `<button class="glass tap" data-go="trip/${t.id}"><div class="row"><span class="l">Upcoming trip</span><span class="l">of ~${money(plan)}</span></div><div class="row" style="margin-top:8px"><span class="num">${money(cost.total)}</span><span class="sub">${cost.total <= plan ? 'on track' : 'a bit over'}</span></div></button>` : ''}
    <button class="glass pill row tap" style="display:flex" data-go="between"><span class="l">${MONTHS[now.getMonth()]} budget</span><span style="font-size:13px;font-weight:500">${money(D.envelopeMonthly())}</span></button>
    <div class="l">Recent memories</div>
    <div class="feed" style="margin-top:-8px">${recent.length ? recent.map(momentRow).join('') : '<div class="empty">Nothing yet. Tap + to add a moment.</div>'}</div>
  </div><button class="fab" data-act="newMoment">+</button>${nav('home')}`;
  [L,R].forEach(u => u && weather(u).then(w => { const el = $('#wx-' + u.id); if (el && w) el.innerHTML = wx(w.icon); }));
}
function momentRow(m){
  const ph = m.photos && m.photos[0];
  return `<button class="mo" data-go="day/${m.tripId ? m.tripId + '_' + m.date : 'none_' + m.date}"><div class="th">${ph ? `<img data-asset="${ph.asset}" alt="">` : ''}</div><div><div class="t">${esc(m.text || m.title || (m.voice ? 'Voice note' : m.song ? 'A song' : 'Photo'))}</div><div class="m l">${fmtD(m.date)}${m.tripId && D.trip(m.tripId) ? ' · ' + esc(D.trip(m.tripId).city) : ''} · ${palOf(m.authorId)}${m.cost && m.cost.amount ? ' ' + money(m.cost.amount) : ''}${m.voice ? ' ' + fmtDur(m.voiceDur) : ''}</div></div></button>`;
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
  const draw = () => `<div class="bar"><button data-act="closeSheet">Close</button><span>${palOf(me.id)} ${esc(me.name)}</span></div><h2 class="hd md" style="margin:0">Say or think</h2>
    <div class="seg"><button class="${kind==='say'?'on':''}" data-act="bubKind|say">Say</button><button class="${kind==='think'?'on':''}" data-act="bubKind|think">Think</button></div>
    <div class="bub ${kind}" style="position:relative;left:0;top:0;align-self:flex-start;font-size:15px;padding:10px 16px;margin-top:4px;max-width:100%"><input id="bub-text" class="in" style="background:transparent;border:0;padding:0;font-size:15px;width:180px" placeholder="${kind==='say'?'say something':'what are you thinking?'}"></div>
    <div class="chips">${chips[kind].map(c => `<button class="chip" data-act="bubChip|${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="row" style="margin-top:6px"><span class="l">Shows for a day</span><button class="btn sm" data-act="bubSend">Send</button></div>`;
  ACT.bubKind = k => { kind = k; openSheet(draw(), () => $('#bub-text').focus()); };
  ACT.bubChip = c => { $('#bub-text').value = c; };
  ACT.bubSend = async () => { const text = $('#bub-text').value.trim(); if (!text) return; await Store.put('bubbles', { id: Store.uid(), userId: me.id, kind, text, at: Date.now() }); closeSheet(); render(); };
  openSheet(draw(), () => $('#bub-text').focus());
};
ACT.closeSheet = () => closeSheet();

// ---------- chat ----------
function renderChat(app){
  const me = D.me(); const all = D.bubbles().slice().sort((a,b) => a.at - b.at); let lastDay = '';
  const rows = all.map(b => { const d = new Date(b.at); const day = isoDate(d); const sep = day !== lastDay ? `<div class="daysep">${day === today() ? 'Today' : fmtD(day)}</div>` : ''; lastDay = day; const u = D.user(b.userId) || {}; const mode = skyMode(u, d); return sep + `<div class="msg ${b.userId === me.id ? 'me' : ''}"><i class="pal ${u.pal||'bunny'}"></i><div><div class="b ${b.kind === 'think' ? 'think' : ''}">${esc(b.text)}</div><div class="t">${timeIn(u, d)} ${wx(mode === 'night' ? 'moon' : 'sun')}</div></div></div>`; }).join('');
  const month = all.filter(b => isoDate(new Date(b.at)).slice(0,7) === today().slice(0,7)).length;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="home">‹ Home</button><span>Chat</span></div><div class="row"><span class="hd" style="font-size:32px">${D.users2().map(u => `<i class="pal ${u.pal}" style="width:28px;height:28px;vertical-align:-6px"></i>`).join('')}</span><span class="l">${month} this month</span></div><div class="chat">${rows || '<div class="empty">Nothing said yet. Tap a pal on Home.</div>'}</div></div>${nav('home')}`;
}

// ---------- trips ----------
let tripsTab = 'upcoming';
function renderTrips(app){
  const t0 = today(); const up = D.trips().filter(t => t.end >= t0), past = D.trips().filter(t => t.end < t0).reverse();
  const yearOf = t => t.start.slice(0,4);
  let body;
  if (tripsTab === 'upcoming') {
    const first = up[0];
    body = `${first ? `<div class="l">Up next</div><button class="glass tap" style="margin-top:-6px" data-go="trip/${first.id}">${tripHero(first)}</button>` : '<div class="empty">No upcoming trip. Add one with +</div>'}
      ${up.length > 1 ? `<div class="list">${up.slice(1).map(t => `<button class="row" data-go="trip/${t.id}"><div style="text-align:left"><div style="font-weight:500">${esc(t.city)}</div><div class="l">${fmtD(t.start)} – ${fmtD(t.end)}</div></div><span class="l">${t.flyer ? palOf(t.flyer) + ' flies' : ''}</span></button>`).join('')}</div>` : ''}
      ${past.length ? `<div class="l mt-auto">Recent</div><div class="covers" style="margin-top:-6px">${past.slice(0,2).map(t => cover(t)).join('')}</div>` : ''}`;
  } else {
    let y = ''; body = past.length ? past.map(t => { const h = yearOf(t) !== y ? `<div class="l" style="margin-top:6px">${y = yearOf(t)}</div>` : ''; const c = D.tripCost(t); const n = D.tripMoments(t.id).filter(m => m.kind !== 'booking').length; return h + `<button class="row" style="padding:8px 0;border-bottom:1px solid var(--ln)" data-go="trip/${t.id}"><div class="th" data-asset="${coverAsset(t)||''}" style="background-size:cover"></div><div style="flex:1;text-align:left"><div style="font-weight:500">${esc(t.city)}</div><div class="l">${fmtD(t.start)} – ${fmtD(t.end)} · ${n} moments${t.imported ? ' · imported' : ''}</div></div><span class="l">${money(c.total)}</span></button>`; }).join('') : '<div class="empty">No past trips yet.</div>';
    body += `<button class="btn lite block mt-auto" data-act="addTrip|past">Add a past trip</button>`;
  }
  app.innerHTML = `<div class="screen" style="min-height:calc(100vh - 160px)"><div class="bar"><h1 class="hd" style="font-size:32px">Trips</h1><button class="plus" data-act="addTrip|new">+</button></div>
    <div class="seg"><button class="${tripsTab==='upcoming'?'on':''}" data-act="tripsTab|upcoming">Upcoming</button><button class="${tripsTab==='past'?'on':''}" data-act="tripsTab|past">Past</button></div>${body}</div>${nav('trips')}`;
}
ACT.tripsTab = t => { tripsTab = t; render(); };
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
  const photos = ms.flatMap(m => (m.photos||[]).map(ph => Object.assign({ m }, ph)));
  const nDays = daysBetween(t.start, t.end) + 1, dayN = daysBetween(t.start, today()) + 1;
  const stage = today() < t.start ? `${daysBetween(today(), t.start)} days away` : today() > t.end ? 'Done' : `Day ${dayN} of ${nDays}`;
  const meals = ms.filter(m => m.cost && m.cost.tag === 'food').length, mm = ms.filter(m => m.kind !== 'booking');
  const todayPlan = ms.find(m => m.kind === 'plan' && m.date === today());
  const style = D.settings().photoStyle;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trips">‹ Trips</button><span>${stage}</span></div><h1 class="hd">${esc(t.city)}</h1>
    ${style === 'polaroid' ? `<div class="polas">${photos.slice(0,2).map(ph => polaroid(ph, ph.m, false)).join('')}<button class="pola empty" data-act="newMoment|${t.id}"><div class="ph">+</div></button></div>` : `<div class="clean">${photos.slice(0,3).map(ph => `<div class="ph"><img data-asset="${ph.asset}" alt=""></div>`).join('')}<button class="ph" style="display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:300;color:var(--mu)" data-act="newMoment|${t.id}">+</button></div>`}
    <div class="stats"><div><b>${Math.min(nDays, Math.max(0, today() > t.end ? nDays : dayN))}</b><span class="l">days</span></div><div><b>${meals}</b><span class="l">meals</span></div><div><b>${mm.length}</b><span class="l">moments</span></div></div>
    <div class="tiles"><button data-go="days/${t.id}"><b>Days</b><span>${todayPlan ? esc(todayPlan.title||todayPlan.text) : nDays + ' days'}</span></button><button data-go="budget/${t.id}"><b>Budget</b><span>${money(c.total)} of ~${money(p)}</span></button><button data-go="photos/${t.id}"><b>Photos</b><span>${photos.length}</span></button></div>
    <div class="list" style="font-size:13.5px;margin-top:-4px"><button class="row" data-go="moments/${t.id}"><span>All moments</span><span class="l">${mm.length} ›</span></button><button class="row" data-go="emails/${t.id}"><span>Add a booking from an email</span><span class="l">›</span></button><button class="row" data-act="exportTrip|${t.id}"><span>Export</span><span class="l">›</span></button><button class="row" data-act="editTrip|${t.id}"><span>Edit trip</span><span class="l">›</span></button></div>
  </div>${nav('trips')}`;
}
ACT.editTrip = id => { const t = D.trip(id); const users = D.users(); openSheet(`<div class="bar"><button data-act="closeSheet">Cancel</button><span>Edit</span></div><input class="in big" id="t-city" value="${esc(t.city)}"><div class="row"><input class="in" type="date" id="t-start" value="${t.start}"><input class="in" type="date" id="t-end" value="${t.end}"></div><div class="seg">${users.map(u => `<button class="${u.id===t.flyer?'on':''}" data-act="segPick|tFlyer,${u.id}">${esc(u.name)}</button>`).join('')}</div><div class="row"><button class="btn lite" data-act="deleteTrip|${id}">Delete trip</button><button class="btn" data-act="updateTrip|${id}">Save</button></div>`, sh => sh.dataset['tFlyer'] = t.flyer || ''); };
ACT.updateTrip = async id => { const t = D.trip(id); Object.assign(t, { city: $('#t-city').value.trim(), start: $('#t-start').value, end: $('#t-end').value, flyer: sheet.sh.dataset['tFlyer'] }); await Store.put('trips', t); closeSheet(); render(); };
ACT.deleteTrip = async id => { if (!await ask('Delete this trip and its moments?', { ok: 'Delete' })) return; for (const m of D.tripMoments(id)) await Store.remove(m.id); await Store.remove(id); closeSheet(); toast('Trip deleted'); go('trips'); };
// "Des lands 4:10 pm" / "Des flies home 9:00 am" for a flight booking, judged against the other flights in its trip
function payerPals(m){ const c = m.cost || {}; if (c.paidBy === 'both') return `<span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span>`; return palOf(c.paidBy); }
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
function renderDays(app){
  const t = D.trip(route.id); const ms = D.tripMoments(t.id); const n = daysBetween(t.start, t.end); 
  let rows = '';
  for (let i = 0; i <= n; i++) { const d = addDays(t.start, i); const dm = ms.filter(m => m.date === d); const plan = dm.find(m => m.kind === 'plan'), fls = dm.filter(m => m.flight), fl = fls.find(x => flightInfo(x).kind !== 'flies') || fls[0]; const title = plan ? (plan.title||plan.text) : fl ? flightLabel(fl) : dm.find(m => m.text) ? dm.find(m => m.text).text : ''; const others = dm.filter(m => m.kind !== 'booking').length; rows += `<button class="day" data-go="day/${t.id}_${d}"><div class="d">${parseDate(d).getDate()}</div><div class="w ${title?'':'open'}">${title ? esc(title) : 'Open'}${others ? `<span>${others} moment${others>1?'s':''}</span>` : plan && plan.note ? `<span>${esc(plan.note)}</span>` : ''}</div></button>`; }
  const c = D.tripCost(t);
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${fmtD(t.start)} – ${fmtD(t.end)}</span></div><h1 class="hd">Days</h1><div class="days">${rows}</div><div class="glass row mt-auto"><span class="l">So far</span><span class="num" style="font-size:20px">${money(c.total)}</span></div></div>${nav('trips')}`;
}
function renderBudget(app){
  const t = D.trip(route.id), c = D.tripCost(t), plan = D.tripPlan(t), P = D.planTotal(t); const [a, b] = D.users2(); const cats = D.cats(t);
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${fmtD(t.start)} – ${fmtD(t.end)}</span></div><h1 class="hd">Budget</h1>
    <div class="glass"><div class="row"><div><div class="l">Actual</div><div class="num">${money(c.total)}</div></div><div style="text-align:right"><div class="l">Planned</div><div class="num" style="color:var(--mu)">${money(P)}</div></div></div></div>
    <div class="colhead"><span class="bcol"></span><span class="bamt">Actual</span><span class="bamt">Planned</span></div>
    <div class="list" style="margin-top:-10px">${cats.map(cat => { const keys = cats.map(c => c.key); const ms = D.tripMoments(t.id).filter(m => m.cost && ((m.cost.tag||'other') === cat.key || (cat.key === 'fun' && !keys.includes(m.cost.tag||'other')))); const byA = ms.reduce((s,m)=>s+D.share(m, a.id),0), byB = ms.reduce((s,m)=>s+D.share(m, b.id),0); return `<button class="row" data-go="cat/${t.id}_${cat.key}"><span>${esc(cat.label)}</span><span style="display:flex;gap:14px;align-items:center"><span class="bcol">${byA?`<i class="pal ${a.pal}"></i>`:''}${byB?`<i class="pal ${b.pal}"></i>`:''}</span><span class="bamt">${byA+byB ? money(byA+byB) : '<span class="l">—</span>'}</span><span class="bamt l">${money(plan[cat.key]||0)}</span></span></button>`; }).join('')}</div>
    <button class="row" style="font-size:13.5px;color:var(--mu)" data-act="catAdd|${t.id}"><span>+ Add a category</span><span></span></button>
    <div class="l">Tap a category to see every memory in it, change its plan, or rename it.</div>
    <button class="row" style="font-size:13.5px" data-act="exportXlsx|${t.id}"><span>Export to Excel</span><span class="l">›</span></button></div>${nav('trips')}`;
}
function renderCategory(app){
  const [tripId, key] = route.id.split('_'); const t = D.trip(tripId); if (!t) return go('trips'); const label = D.catLabel(t, key); const plan = D.tripPlan(t);
  const keys = D.cats(t).map(c => c.key); const ms = D.tripMoments(t.id).filter(m => m.cost && ((m.cost.tag||'other') === key || (key === 'fun' && !keys.includes(m.cost.tag||'other')))).sort((x,y) => y.date.localeCompare(x.date)); const total = ms.reduce((s,m) => s + +m.cost.amount, 0);
  const byDay = {}; ms.forEach(m => (byDay[m.date] = byDay[m.date] || []).push(m));
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="budget/${t.id}">‹ Budget</button><span>${esc(t.city)}</span></div><h1 class="hd">${esc(label)}</h1>
    <div class="glass"><div class="row"><div><div class="l">Actual</div><div class="num">${money(total)}</div></div><div style="text-align:right"><div class="l">Planned</div><div class="num" style="color:var(--mu)">${money(plan[key]||0)}</div></div></div>
      ${(() => { const c = D.planCfg(t, key); const [a, b] = D.users2(); const units = D.planUnits(t, key); const unit = key === 'stay' ? 'night' : 'day'; const inp = (id, v) => `<input class="in" type="number" inputmode="decimal" id="pl-${id}" data-act="planCfgEdit|${t.id},${key}" data-on="change" value="${v||''}" placeholder="0" style="width:74px;padding:6px 8px;font-size:13px;text-align:right">`; return `<div class="row" style="margin-top:12px;gap:8px"><div class="seg" style="width:150px"><button class="${c.mode==='total'?'on':''}" data-act="planCfgSet|${t.id},${key},mode,total">Total</button><button class="${c.mode==='day'?'on':''}" data-act="planCfgSet|${t.id},${key},mode,day">Per ${unit}</button></div><div class="seg" style="width:120px"><button class="${c.who==='both'?'on':''}" data-act="planCfgSet|${t.id},${key},who,both">Both</button><button class="${c.who==='each'?'on':''}" data-act="planCfgSet|${t.id},${key},who,each">Each</button></div></div><div class="row" style="margin-top:8px"><span class="l">${c.mode==='day' ? `$${c.who==='each' ? ((+c.a||0)+(+c.b||0)) : (+c.a||0)}/${unit}${c.who==='each' ? ' together' : ''} · ${units} ${unit}${units===1?'':'s'}` : c.who==='each' ? 'together' : ''}</span><span style="display:flex;gap:6px;align-items:center">${c.who==='each' ? `<i class="pal ${a.pal}"></i>${inp('a', c.a)}<i class="pal ${b.pal}" style="margin-left:4px"></i>${inp('b', c.b)}` : `$${inp('a', c.a)}`}</span></div></div>`; })()}
    <div class="list" style="font-size:13.5px;margin-top:-4px"><button class="row" data-go="emails/${t.id}"><span>Add a booking from an email</span><span class="l">›</span></button></div>
    ${Object.keys(byDay).map(d => `<div class="l">${fmtD(d)}</div><div class="list" style="margin-top:-8px">${byDay[d].map(m => `<button class="row" data-act="editMoment|${m.id}"><div style="text-align:left"><div style="font-weight:500">${esc(m.text||m.title||'Memory')}</div><div class="l">${payerPals(m)} ${esc(D.payerText(m))}</div></div><span>${money2(m.cost.amount)}</span></button>`).join('')}</div>`).join('') || '<div class="empty">Nothing here yet.</div>'}
    <div class="row mt-auto"><span class="l">${ms.length} memor${ms.length===1?'y':'ies'}</span><span style="display:flex;gap:6px"><button class="btn sm lite" data-act="catRename|${t.id},${key}">Rename</button><button class="btn sm lite" data-act="catRemove|${t.id},${key}">Remove</button><button class="btn sm" data-act="newMomentCat|${t.id},${key}">+ Add</button></span></div>
  </div>${nav('trips')}`;
}
ACT.catAdd = async id => { const t = D.trip(id); const name = await ask('Name the category', { input: '', ok: 'Add' }); if (!name) return; const key = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_'); t.cats = (t.cats||[]).filter(c => c.key !== key).concat([{ key, label: name }]); await Store.put('trips', t); render(); };
ACT.catRename = async arg => { const [id, key] = arg.split(','); const t = D.trip(id); const name = await ask('Rename', { input: D.catLabel(t, key), ok: 'Save' }); if (!name) return; const c = (t.cats||[]).find(c => c.key === key); if (c) c.label = name; else { t.catNames = Object.assign({}, t.catNames, { [key]: name }); } await Store.put('trips', t); render(); };
ACT.catRemove = async arg => { const [id, key] = arg.split(','); const t = D.trip(id); const n = D.tripMoments(id).filter(m => m.cost && m.cost.tag === key).length; if (!await ask('Remove this category?', { sub: n ? `${n} memor${n===1?'y':'ies'} will move to "Fun".` : '', ok: 'Remove' })) return; for (const m of D.tripMoments(id)) if (m.cost && m.cost.tag === key) { m.cost.tag = 'fun'; await Store.put('moments', m); } if ((t.cats||[]).some(c => c.key === key)) t.cats = t.cats.filter(c => c.key !== key); else t.hidden = (t.hidden||[]).concat([key]); await Store.put('trips', t); go('budget', { id }); };
ACT.newMomentCat = arg => { const [id, key] = arg.split(','); const t = D.trip(id); const date = today() >= t.start && today() <= t.end ? today() : t.start; momentSheet({ tripId: id, date, cost: { amount: '', paidBy: D.me().id, tag: key } }); };
ACT.planCfgSet = async arg => { const [id, k, f, v] = arg.split(','); const t = D.trip(id); const c = Object.assign({}, D.planCfg(t, k)); const units = D.planUnits(t, k); if (f === 'mode' && v !== c.mode) { const conv = x => v === 'day' ? Math.round((+x||0) / units) : Math.round((+x||0) * units); c.a = conv(c.a); c.b = conv(c.b); } if (f === 'who' && v !== c.who) { if (v === 'each') { c.a = Math.round((+c.a||0) / 2); c.b = c.a; } else { c.a = (+c.a||0) + (+c.b||0); c.b = 0; } } c[f] = v; t.planCfg = Object.assign({}, t.planCfg, { [k]: c }); await Store.put('trips', t); render(); };
ACT.planCfgEdit = async arg => { const [id, k] = arg.split(','); const t = D.trip(id); const c = Object.assign({}, D.planCfg(t, k)); const a = $('#pl-a'), b = $('#pl-b'); if (a) c.a = +a.value || 0; if (b) c.b = +b.value || 0; t.planCfg = Object.assign({}, t.planCfg, { [k]: c }); await Store.put('trips', t); render(); };
function renderPhotos(app){
  const t = D.trip(route.id); const ms = D.tripMoments(t.id).filter(m => m.photos && m.photos.length); const byDay = {}; ms.forEach(m => (byDay[m.date] = byDay[m.date] || []).push(...m.photos.map(p => ({ p, m }))));
  const days = Object.keys(byDay).sort().reverse();
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${fmtD(t.start)} – ${fmtD(t.end)}</span></div><h1 class="hd">Photos</h1>${days.length ? days.map(d => `<div class="l">${fmtD(d)}</div><div class="pgrid" style="margin-top:-8px">${byDay[d].map(({p, m}) => `<button data-go="day/${t.id}_${d}"><img data-asset="${p.asset}" alt=""></button>`).join('')}</div>`).join('') : '<div class="empty">No photos yet.</div>'}</div>${nav('trips')}`;
}
function renderMoments(app){ const t = D.trip(route.id); const ms = D.tripMoments(t.id).filter(m => m.kind !== 'booking').reverse(); app.innerHTML = `<div class="screen"><div class="bar"><button data-go="trip/${t.id}">‹ ${esc(t.city)}</button><span>${ms.length} moments</span></div><h1 class="hd">Moments</h1><div class="feed">${ms.map(momentRow).join('') || '<div class="empty">Nothing yet.</div>'}</div></div>${nav('trips')}`; }

// ---------- day page ----------
function polaroid(ph, m, draggable){
  const idx = m.photos.indexOf(ph); const stickers = (ph.stickers||[]).map((s,i) => `<i class="stk ${s.pal}" data-stk="${m.id},${idx},${i}" style="left:${s.x}px;top:${s.y}px;transform:rotate(${s.rot||0}deg)"></i>`).join('');
  return `<div class="pola" data-pola="${m.id},${idx}" style="transform:rotate(${(idx%2?4:-4)}deg)"><div class="ph"><img data-asset="${ph.asset}" alt=""></div><span class="dt">${palOf(m.authorId)} ${m.date.replace(/-/g,' · ').slice(5)} · ${m.date.slice(2,4)}</span>${stickers}</div>`;
}
function renderDay(app){
  const [tripId, date] = route.id.split('_'); const t = tripId !== 'none' ? D.trip(tripId) : null;
  const ms = D.moments().filter(m => m.date === date && (t ? m.tripId === t.id : !m.tripId)).sort((a,b) => a.createdAt - b.createdAt);
  const plan = ms.find(m => m.kind === 'plan'); const photos = ms.flatMap(m => (m.photos||[]).map(p => ({ p, m })));
  const cost = ms.reduce((s,m) => s + (m.cost ? +m.cost.amount : 0), 0), meals = ms.filter(m => m.cost && m.cost.tag === 'food').length;
  const style = D.settings().photoStyle;
  const anni = D.isMonthiversary(date), months = anni ? D.monthsSince(date) : 0;
  const other23 = anni ? D.moments().filter(m => D.isMonthiversary(m.date) && m.date !== date && m.photos && m.photos.length).sort((a,b) => b.date.localeCompare(a.date)).slice(0,5) : [];
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="${t ? 'days/' + t.id : 'calendar'}">‹ ${t ? esc(t.city) : 'Calendar'}</button><span>${fmtDow(date)}</span></div><h1 class="hd" style="font-size:34px">${anni ? `${months} month${months===1?'':'s'} <i class="heart lg"></i>` : plan ? esc(plan.title||plan.text) + (plan.who && plan.who !== 'both' ? ' ' + palOf(plan.who) : '') : fmtD(date)}</h1>${anni ? `<div class="sub" style="margin-top:-6px">since ${fmtD(D.anniversary())}${plan ? ' · ' + esc(plan.title||plan.text) : ''}</div>` : plan && plan.note ? `<div class="sub">${esc(plan.note)}</div>` : ''}
    ${anni ? `<div class="l">Other ${ordinal(+date.slice(8))}s</div><div class="strip23" style="margin-top:-8px">${other23.map(m => `<button data-go="day/${m.tripId||'none'}_${m.date}"><div class="ph"><img data-asset="${m.photos[0].asset}" alt=""></div><span class="l">${MON[parseDate(m.date).getMonth()]} · ${D.monthsSince(m.date)}</span></button>`).join('')}${(() => { const nd = new Date(parseDate(date)); nd.setMonth(nd.getMonth()+1); const ni = isoDate(nd); return `<button data-go="day/none_${ni}"><div class="ph empty"></div><span class="l">${MON[nd.getMonth()]} · ${D.monthsSince(ni)}</span></button>`; })()}</div>` : ''}
    ${photos.length ? style === 'polaroid' ? `<div class="polas">${photos.map(({p, m}) => polaroid(p, m, true)).join('')}</div><div class="stkrow"><span class="l">Stickers</span>${D.users().map(u => `<button data-act="addSticker|${u.pal}"><i class="pal ${u.pal}"></i></button>`).join('')}<span class="l">tap, then drag on a photo</span></div>` : `<div class="clean">${photos.map(({p}) => `<div class="ph"><img data-asset="${p.asset}" alt=""></div>`).join('')}</div>` : ''}
    ${ms.filter(m => m.kind !== 'plan').map(m => `${m.voice ? `<div class="glass" style="padding:12px 14px"><div class="wave"><button class="play" data-act="play|${m.voice}"></button>${palOf(m.authorId)}<div class="bars">${Array.from({length:22},(_,i)=>`<i style="height:${30+((i*37)%60)}%"></i>`).join('')}</div><span class="l">${fmtDur(m.voiceDur)}</span><button class="l" data-act="shareAsset|${m.voice}">↑</button></div></div>` : ''}
      ${m.song ? songCard(m) : ''}
      ${m.text && m.kind !== 'booking' ? `<div class="caption">${palOf(m.authorId)}<p>${esc(m.text)}${m.cost && m.cost.amount ? ` <span class="l">${money2(m.cost.amount)}</span>` : ''}</p><button class="l" style="margin-left:auto" data-act="editMoment|${m.id}">edit</button></div>` : m.cost && m.cost.amount && m.kind !== 'booking' ? `<div class="caption">${palOf(m.authorId)}<p class="l">${money2(m.cost.amount)} · ${esc(D.catLabel(t, m.cost.tag))}</p><button class="l" style="margin-left:auto" data-act="editMoment|${m.id}">edit</button></div>` : ''}
      ${m.kind === 'booking' ? `<div class="caption">${palOf(m.flight ? (m.flight.who || m.authorId) : m.authorId)}<p>${m.flight ? `${esc(flightLabel(m))} <span class="l">${esc(m.flight.no||'')} · ${esc(m.flight.from||'')} → ${esc(m.flight.to||'')}</span>` : esc(m.text)}${m.cost && m.cost.amount ? ` <span class="l">${money2(m.cost.amount)}</span>` : ''}</p><button class="l" style="margin-left:auto" data-act="editMoment|${m.id}">edit</button></div>` : ''}`).join('')}
    ${!ms.length ? '<div class="empty">Nothing here yet.</div>' : ''}
    <div class="row mt-auto"><span class="l">${ms.filter(m=>m.kind!=='plan').length} moments${meals ? ' · ' + meals + ' meal' + (meals>1?'s':'') : ''}${cost ? ' · ' + money(cost) : ''}</span><span style="display:flex;gap:6px">${!plan ? `<button class="btn sm lite" data-act="addPlan|${date}${t?','+t.id:''}">Plan</button>` : `<button class="btn sm lite" data-act="editPlan|${plan.id}">Edit plan</button>`}<button class="btn sm" data-act="newMoment|${t ? t.id : ''},${date}">+ Add</button></span></div>
  </div>${nav(t ? 'trips' : 'calendar')}`;
  setupStickerDrag(app);
}
function songCard(m){ const id = (m.song.match(/track\/([A-Za-z0-9]+)/)||[])[1]; return `<div class="glass" style="padding:12px 14px"><div class="row"><div class="who">${palOf(m.authorId)}<div><b style="font-size:13.5px;font-weight:500">${esc(m.songTitle || 'A song')}</b><div class="l">${esc(m.songBy || 'Spotify')}</div></div></div><a class="l" href="${esc(m.song)}" target="_blank" rel="noopener">♫ open</a></div>${id ? `<iframe class="embed" style="margin-top:10px" src="https://open.spotify.com/embed/track/${id}?theme=0" loading="lazy" allow="encrypted-media"></iframe>` : ''}</div>`; }
let audioEl;
ACT.play = async (id, el) => { if (audioEl && !audioEl.paused && audioEl.dataset.id === id) { audioEl.pause(); el.classList.remove('on'); return; } const u = await Store.blobUrl(id); if (!u) return; if (audioEl) audioEl.pause(); document.querySelectorAll('.play.on').forEach(p => p.classList.remove('on')); audioEl = new Audio(u); audioEl.dataset.id = id; el.classList.add('on'); audioEl.onended = () => el.classList.remove('on'); audioEl.play(); };
ACT.shareAsset = async id => { const b = await Store.blob(id); if (!b) return; const f = new File([b], id, { type: b.type }); if (navigator.canShare && navigator.canShare({ files:[f] })) return navigator.share({ files:[f] }); download(b, id); };
function download(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
let pendingSticker = null;
ACT.addSticker = pal => { pendingSticker = pal; toast('Now tap a photo'); };
function setupStickerDrag(root){
  root.querySelectorAll('.pola').forEach(p => {
    p.addEventListener('pointerdown', async e => {
      if (e.target.classList.contains('stk')) return;
      if (!pendingSticker) return;
      const [mid, idx] = p.dataset.pola.split(','); const m = Store.get('moments', mid); const ph = m.photos[+idx]; const r = p.getBoundingClientRect();
      (ph.stickers = ph.stickers || []).push({ pal: pendingSticker, x: Math.round(e.clientX - r.left - 22), y: Math.round(e.clientY - r.top - 22), rot: Math.round(Math.random()*30-15) });
      pendingSticker = null; await Store.put('moments', m); render();
    });
  });
  root.querySelectorAll('.stk').forEach(s => {
    let drag = null;
    s.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); s.setPointerCapture(e.pointerId); const r = s.parentElement.getBoundingClientRect(); drag = { ox: e.clientX - r.left - parseFloat(s.style.left), oy: e.clientY - r.top - parseFloat(s.style.top), r, moved:false }; });
    s.addEventListener('pointermove', e => { if (!drag) return; drag.moved = true; s.style.left = (e.clientX - drag.r.left - drag.ox) + 'px'; s.style.top = (e.clientY - drag.r.top - drag.oy) + 'px'; });
    s.addEventListener('pointerup', async e => { if (!drag) return; const [mid, idx, i] = s.dataset.stk.split(','); const m = Store.get('moments', mid); const st = m.photos[+idx].stickers[+i]; if (drag.moved) { st.x = Math.round(parseFloat(s.style.left)); st.y = Math.round(parseFloat(s.style.top)); await Store.put('moments', m); } else if (await ask('Remove sticker?', { ok: 'Remove' })) { m.photos[+idx].stickers.splice(+i, 1); await Store.put('moments', m); render(); } drag = null; });
  });
}

// ---------- new / edit moment ----------
ACT.newMoment = (arg) => { const [tripId, date] = (arg||'').split(','); momentSheet({ tripId: tripId || (D.tripForDate(date||today())||{}).id || '', date: date || today() }); };
ACT.editMoment = id => momentSheet(JSON.parse(JSON.stringify(Store.get('moments', id))), true);
let rec = null, voiceSaving = null, recDone = null;
function momentSheet(m, editing){
  const me = D.me(); m.authorId = m.authorId || me.id; m.photos = m.photos || []; m.cost = m.cost || null; let showCost = !!(m.cost && (m.cost.amount || m.cost.tag)); let pendingPhotos = []; let ddOpen = false; let noTrip = editing ? !m.tripId : false;
  const draw = () => { const t = noTrip ? null : (m.tripId ? D.trip(m.tripId) : D.tripForDate(m.date)); if (t && !m.tripId) m.tripId = t.id; const cats = D.cats(t); const tag = m.cost && m.cost.tag || 'food'; return `<div class="bar"><button data-act="closeSheet">Close</button><span>${palOf(me.id)} ${esc(me.name)}</span></div><h2 class="hd md" style="margin:0">${editing ? 'Edit memory' : 'New memory'}</h2>
    <input class="in big" id="m-text" placeholder="Say it how you'd say it to them" value="${esc(m.text||'')}">
    <div class="row" style="position:relative"><div class="seg" style="width:130px"><button class="${!noTrip?'on':''}" data-act="mTripMode|trip">Trip</button><button class="${noTrip?'on':''}" data-act="mTripMode|none">No trip</button></div>${!noTrip ? `<span style="position:relative"><button class="chip on" data-act="mDD">${t ? esc(t.city) + ' · ' + fmtD(t.start) : 'Pick a trip'} ${ddOpen?'▴':'▾'}</button>${ddOpen ? `<div class="dd">${D.trips().slice().reverse().map(x => `<button data-act="mPickTrip|${x.id}"><span style="${x.id===(t&&t.id)?'font-weight:500':''}">${esc(x.city)} · ${fmtD(x.start)} – ${fmtD(x.end)}</span>${x.id===(t&&t.id)?'<i class="heart" style="width:10px;height:10px"></i>':''}</button>`).join('')}<button data-act="mNewTrip"><span class="muted">+ New trip</span></button></div>` : ''}</span>` : ''}</div>
    <div class="attach"><button data-act="mPhoto|photo"><b>◫</b>Photo${pendingPhotos.filter(p=>!p.polaroid).length ? ' ' + pendingPhotos.filter(p=>!p.polaroid).length : ''}</button><button data-act="mPhoto|polaroid"><b>▣</b>Polaroid${pendingPhotos.filter(p=>p.polaroid).length ? ' ' + pendingPhotos.filter(p=>p.polaroid).length : ''}</button><button class="${m.voice||rec?'sel':''}" data-act="mVoice"><b>●</b>${rec ? 'Stop' : voiceSaving ? 'Saving…' : m.voice ? 'Voice ✓' : 'Voice'}</button><button class="${m.song?'sel':''}" data-act="mSong"><b>♫</b>Song</button><button class="${showCost?'sel':''}" data-act="mCost"><b>$</b>Cost</button></div>
    ${showCost ? `<div class="glass deep"><div class="row"><span style="display:flex;align-items:center"><span class="num" style="font-size:34px">$</span><input class="in money" id="m-amt" type="number" inputmode="decimal" placeholder="0" value="${m.cost&&m.cost.amount||''}"></span><div class="seg who" style="width:190px">${D.users2().map(u => `<button class="${(m.cost&&m.cost.paidBy||me.id)===u.id?'on':''}" data-act="mPaid|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}<button class="${(m.cost&&m.cost.paidBy)==='both'?'on':''}" data-act="mPaid|both"><span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span></button></div></div>${(m.cost&&m.cost.paidBy)==='both' ? (() => { const sp = m.cost.split || { mode:'pct' }; const [a, b] = D.users2(); const pct = sp.mode !== 'amt'; const va = sp[a.id] != null ? sp[a.id] : (pct ? 50 : ''), vb = sp[b.id] != null ? sp[b.id] : (pct ? 50 : ''); return `<div class="row" style="margin-top:8px"><div class="seg" style="width:90px"><button class="${pct?'on':''}" data-act="mSplitMode|pct">%</button><button class="${pct?'':'on'}" data-act="mSplitMode|amt">$</button></div><span style="display:flex;gap:6px;align-items:center"><i class="pal ${a.pal}"></i><input class="in" type="number" inputmode="decimal" id="sp-a" data-act="mSplitEdit|${a.id}" data-on="change" value="${va}" style="width:64px;padding:6px 8px;font-size:13px;text-align:right"><i class="pal ${b.pal}" style="margin-left:4px"></i><input class="in" type="number" inputmode="decimal" id="sp-b" data-act="mSplitEdit|${b.id}" data-on="change" value="${vb}" style="width:64px;padding:6px 8px;font-size:13px;text-align:right"></span></div>`; })() : ''}<div class="l" style="margin-top:6px">Paid by ${esc(D.payerText(m) || me.name)}${t ? ` · counts toward ${esc(t.city)}'s ${esc(D.catLabel(t, tag))}` : ' · no trip, not in a budget'}</div><div class="chips" style="margin-top:8px">${cats.map(c => `<button class="chip ${tag===c.key?'on':''}" data-act="mTag|${c.key}">${esc(c.label)}</button>`).join('')}${t ? `<button class="chip dash" data-act="mOther">+ Other</button>` : ''}</div></div>` : ''}
    <div class="row" style="margin-top:auto"><span style="display:flex;gap:8px;align-items:center"><input class="in" type="date" id="m-date" value="${m.date}" style="padding:8px 10px;font-size:12px;width:auto"></span><span style="display:flex;gap:6px">${editing ? `<button class="btn sm lite" data-act="mDelete">Delete</button>` : ''}<button class="btn sm" data-act="mSave">Save</button></span></div>
    <input type="file" id="m-file" accept="image/*" multiple hidden data-act="mFiles" data-on="change">`; };
  const keep = () => { const tx = $('#m-text'), dt = $('#m-date'), amt = $('#m-amt'); if (tx) m.text = tx.value; if (dt) m.date = dt.value; if (showCost) { m.cost = Object.assign({ paidBy: me.id, tag:'food' }, m.cost||{}, amt ? { amount: +amt.value || 0 } : {}); const sa = $('#sp-a'), sb = $('#sp-b'); if (sa && sb && m.cost.paidBy === 'both') { const [a, b] = D.users2(); m.cost.split = Object.assign({ mode:'pct' }, m.cost.split||{}, { [a.id]: sa.value === '' ? null : +sa.value, [b.id]: sb.value === '' ? null : +sb.value }); } } };
  const redraw = () => { keep(); openSheet(draw(), null, 'tall'); };
  ACT.mTripMode = k => { keep(); noTrip = k === 'none'; if (noTrip) m.tripId = ''; else { const t = D.tripForDate(m.date); m.tripId = t ? t.id : (D.trips().slice(-1)[0]||{}).id || ''; } ddOpen = false; redraw(); };
  ACT.mDD = () => { keep(); ddOpen = !ddOpen; redraw(); };
  ACT.mPickTrip = id => { keep(); m.tripId = id; ddOpen = false; redraw(); };
  ACT.mNewTrip = async () => { const city = await ask('Which city?', { input: '', ok: 'Add trip' }); if (!city) return; const start = m.date; Store.put('trips', { id: Store.uid(), city, start, end: addDays(start, 4), flyer: '', createdAt: Date.now() }).then(t => { m.tripId = t.id; ddOpen = false; redraw(); }); };
  ACT.mOther = async () => { keep(); const t = D.trip(m.tripId); if (!t) return; const name = await ask('Name the category', { input: '', ok: 'Add' }); if (!name) return; const key = 'c_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_'); t.cats = (t.cats||[]).filter(c => c.key !== key).concat([{ key, label: name }]); await Store.put('trips', t); m.cost = Object.assign({ paidBy: me.id }, m.cost||{}, { tag: key }); redraw(); };
  let photoKind = 'photo';
  ACT.mPhoto = kind => { keep(); photoKind = kind; $('#m-file').click(); };
  ACT.mFiles = (a, f) => { Array.from(f.files).forEach(file => pendingPhotos.push({ file, polaroid: photoKind === 'polaroid' })); redraw(); };
  ACT.mCost = () => { keep(); showCost = !showCost; if (showCost && !m.cost) m.cost = { paidBy: me.id, tag: m.flight ? 'flight' : 'food', amount:'' }; redraw(); };
  ACT.mPaid = id => { keep(); m.cost.paidBy = id; if (id === 'both' && !m.cost.split) { const [a, b] = D.users2(); m.cost.split = { mode:'pct', [a.id]: 50, [b.id]: 50 }; } redraw(); };
  ACT.mSplitMode = mode => { keep(); const [a, b] = D.users2(); const amt = +m.cost.amount || 0; const sp = m.cost.split || {}; if (mode === 'amt' && sp.mode !== 'amt') { const pa = sp[a.id] != null ? sp[a.id] : 50; m.cost.split = { mode:'amt', [a.id]: Math.round(amt * pa) / 100, [b.id]: Math.round(amt * (100 - pa)) / 100 }; } else if (mode === 'pct' && sp.mode === 'pct') {} else if (mode === 'pct') { const va = sp[a.id] != null ? sp[a.id] : amt / 2; const pa = amt ? Math.round(va / amt * 100) : 50; m.cost.split = { mode:'pct', [a.id]: pa, [b.id]: 100 - pa }; } openSheet(draw(), null, 'tall'); };
  ACT.mSplitEdit = (uid, el) => { keep(); const [a, b] = D.users2(); const sp = m.cost.split; const other = uid === a.id ? b.id : a.id; const v = +el.value || 0; if (sp.mode === 'amt') sp[other] = Math.max(0, Math.round(((+m.cost.amount || 0) - v) * 100) / 100); else sp[other] = Math.max(0, Math.min(100, 100 - v)); sp[uid] = v; openSheet(draw(), null, 'tall'); };
  ACT.mTag = k => { keep(); m.cost.tag = k; redraw(); };
  ACT.mSong = async () => { keep(); const url = await ask('Paste a Spotify link', { input: m.song || '', placeholder: 'https://open.spotify.com/track/…', ok: 'Next' }); if (url == null) return; m.song = url; if (m.song) { m.songTitle = (await ask('Song title', { sub: 'optional', input: m.songTitle || '', ok: 'Next' })) || ''; m.songBy = (await ask('Artist', { sub: 'optional', input: m.songBy || '', ok: 'Done' })) || ''; } redraw(); };
  // Voice: pick a format the phone can actually record (iPhone = mp4), collect data every second,
  // and keep a promise so Save waits for the recording to finish instead of saving without it.
  ACT.mVoice = async () => { keep();
    if (rec) { rec.stop(); return; }
    if (voiceSaving) return;
    if (!window.MediaRecorder || !navigator.mediaDevices) return toast('This phone can\'t record here');
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast(e && e.name === 'NotAllowedError' ? 'Microphone is off for this app — allow it in Settings' : 'Microphone not available'); }
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    const chunks = []; const started = Date.now(); let done;
    try { rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); return toast('Recorder: ' + e.message); }
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    voiceSaving = null; let finish; recDone = new Promise(r => finish = r);
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); const mt = (rec && rec.mimeType) || type || 'audio/mp4'; rec = null;
      voiceSaving = (async () => {
        if (!chunks.length) { toast('Nothing was recorded — check the microphone'); return; }
        const blob = new Blob(chunks, { type: mt.split(';')[0] });
        try { m.voice = await Store.putBlob(blob, mt.includes('mp4') ? 'm4a' : 'webm'); m.voiceDur = (Date.now() - started) / 1000; toast('Voice note ready'); }
        catch (e) { toast('Could not keep the voice note: ' + e.message); }
      })().finally(() => { voiceSaving = null; if (sheet) redraw(); });
      finish(voiceSaving); if (sheet) redraw();
    };
    rec.start(1000); redraw(); toast('Recording… tap Stop when done');
  };
  ACT.mDelete = async () => { if (!await ask('Delete this moment?', { ok: 'Delete' })) return; await Store.remove(m.id); closeSheet(); toast('Deleted'); render(); };
  ACT.mSave = async () => { if (rec) { const p = recDone; rec.stop(); await p; } if (voiceSaving) await voiceSaving; keep(); if (!m.text && !pendingPhotos.length && !m.photos.length && !m.voice && !m.song && !(m.cost && m.cost.amount)) return toast('Add something first'); for (const p of pendingPhotos) { const blob = await shrink(p.file); const asset = await Store.putBlob(blob, 'jpg'); m.photos.push({ asset, polaroid: p.polaroid, stickers: [] }); } if (!showCost) m.cost = null; m.id = m.id || Store.uid(); m.kind = m.kind || 'moment'; m.createdAt = m.createdAt || Date.now(); if (noTrip) m.tripId = ''; else if (!m.tripId) { const t = D.tripForDate(m.date); m.tripId = t ? t.id : ''; } await Store.put('moments', m); closeSheet(); toast('Saved'); if (route.name === 'home' || route.name === 'trip' || route.name === 'day') render(); };
  openSheet(draw(), () => { if (!editing) $('#m-text').focus(); }, 'tall');
}
async function shrink(file){ try { const img = await createImageBitmap(file); const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return await new Promise(r => c.toBlob(r, 'image/jpeg', .86)); } catch (e) { return file; } }

// ---------- plans ----------
ACT.addPlan = arg => { const [date, tripId] = arg.split(','); planSheet({ date, tripId: tripId || (D.tripForDate(date)||{}).id || '' }); };
ACT.editPlan = id => planSheet(JSON.parse(JSON.stringify(Store.get('moments', id))), true);
function planSheet(p, editing){
  p.who = p.who || 'both';
  openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>${fmtDow(p.date)}${p.tripId && D.trip(p.tripId) ? ' · ' + esc(D.trip(p.tripId).city) : ''}</span></div><input class="in big" id="p-title" placeholder="What are we doing?" value="${esc(p.title||'')}"><div class="row"><span class="l">Who</span><div class="seg who" style="width:190px"><button class="${p.who==='both'?'on':''}" data-act="pWho|both"><span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span></button>${D.users2().map(u => `<button class="${p.who===u.id?'on':''}" data-act="pWho|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div><div class="row" id="p-hide-row"><span style="font-size:13.5px">Hide from ${esc((D.other()||{}).name||'them')}</span><button class="tog ${p.hidden?'':'off'}" id="p-hide" data-act="togToggle"></button></div><textarea class="in" id="p-note" placeholder="Notes">${esc(p.note||'')}</textarea><div class="row"><input class="in" type="date" id="p-date" value="${p.date}" style="width:auto;padding:8px 10px;font-size:12px"><input class="in" type="time" id="p-time" value="${p.time||''}" style="width:auto;padding:8px 10px;font-size:12px"><span style="display:flex;gap:6px;margin-left:auto">${editing ? `<button class="btn sm lite" data-act="pDelete|${p.id}">Delete</button>` : ''}<button class="btn sm" data-act="pSave">Save</button></span></div>`);
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
  for (let d = 1; d <= n; d++) { const iso = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const t = D.tripForDate(iso); const ours = plans.some(p => p.date === iso) || flights.some(f => f.date === iso); const ev = !calOurs && evs.some(e => e.date === iso); const an = D.isMonthiversary(iso); cells += `<button class="${t ? 'trip' + (iso===t.start?' s':'') + (iso===t.end?' e':'') : ''} ${ours?'ours':''} ${ev && !an?'ev':''} ${an?'anni':''} ${iso===today()?'today':''}" data-act="calSel|${iso}"><span>${d}</span></button>`; }
  const monthFirst = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}-01`, monthLast = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  const inMonth = d => d >= monthFirst && d <= monthLast;
  // one agenda for the whole month, grouped by day; the selected day is always there, highlighted
  const horizon = addDays(monthFirst, calSpan); const onward = d => d >= monthFirst && d <= horizon;
  const moreLater = plans.some(p => p.date > horizon) || flights.some(f => f.date > horizon) || (!calOurs && evs.some(e => e.date > horizon));
  const days = new Set([calSel].filter(onward));
  plans.forEach(p => onward(p.date) && days.add(p.date)); flights.forEach(f => onward(f.date) && days.add(f.date)); if (!calOurs) evs.forEach(e => onward(e.date) && days.add(e.date));
  { const lastDate = [...days, ...D.trips().map(t => t.end)].sort().slice(-1)[0] || monthLast; const cur = new Date(calMonth.y, calMonth.m, 1); const endM = new Date(Math.max(new Date(lastDate).getTime(), new Date(calMonth.y, calMonth.m + 2, 0).getTime())); while (cur <= endM) { const iso = isoDate(new Date(cur.getFullYear(), cur.getMonth(), (D.anniversary() ? +D.anniversary().slice(8) : 1), 12)); if (D.isMonthiversary(iso) && onward(iso)) days.add(iso); cur.setMonth(cur.getMonth() + 1); } }
  const firstFlight = flights.map(x => x.date).sort()[0];
  let lastYm = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}`;
  const groups = [...days].sort().map(d => { const t = D.tripForDate(d); const sel = d === calSel; const ym = d.slice(0,7); const divider = ym !== lastYm ? `<div class="mdiv">${MONTHS[+ym.slice(5,7)-1]}${ym.slice(0,4) !== String(calMonth.y) ? ' ' + ym.slice(0,4) : ''}</div>` : ''; lastYm = ym;
    const rows = [];
    if (D.isMonthiversary(d)) rows.push(`<button class="ev" data-go="day/${t ? t.id : 'none'}_${d}"><span class="t">All day</span><span class="pair">${D.users().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span><span style="font-weight:500">${D.monthsSince(d)} Month${D.monthsSince(d)===1?'':'s'}</span><i class="heart r"></i></button>`);
    flights.filter(f => f.date === d).forEach(f => rows.push(`<button class="ev" data-go="day/${f.tripId || 'none'}_${f.date}"><span class="t">${esc(flightInfo(f).time || 'Flight')}</span>${palOf(f.flight.who || f.authorId)}<span style="font-weight:500">${esc(flightInfo(f).text)}</span><span class="r">${esc(f.flight.no||'')}</span></button>`));
    plans.filter(p => p.date === d).forEach(p => rows.push(`<button class="ev" data-go="day/${p.tripId || 'none'}_${p.date}"><span class="t">${esc(p.time||'All day')}</span>${p.who && p.who !== 'both' ? palOf(p.who) : `<span class="pair">${D.users2().map(u => `<i class="pal ${u.pal}"></i>`).join('')}</span>`}<span style="font-weight:500">${esc(p.title)}</span>${p.hidden ? '<span class="r">hidden</span>' : ''}</button>`));
    if (!calOurs) evs.filter(e => e.date === d).sort((a,b) => (a.time||'').localeCompare(b.time||'')).forEach(e => rows.push(`<button class="ev ${e.hidden?'hid':''}" data-act="evSheet|${e.id}"><span class="t">${esc(e.time||'All day')}</span>${palOf(e.ownerId)}<span>${esc(e.title)}</span>${e.hidden ? '<span class="r">hidden</span>' : ''}</button>`));
    return divider + `<div class="agroup ${sel?'sel':''}" id="${sel?'ag-sel':''}"><div class="ahead"><span>${fmtDow(d)}${t ? ' · ' + esc(t.city) : ''}</span>${sel ? `<button class="l" data-act="addPlan|${d}${t?','+t.id:''}">+ Plan</button>` : ''}</div><div class="list">${rows.join('') || '<div class="empty" style="padding:6px 0;text-align:left">Nothing yet.</div>'}</div></div>`; });
  app.innerHTML = `<div class="screen"><div class="bar"><span style="display:flex;gap:10px;align-items:center"><button data-act="calNav|-1">‹</button><span>${calMonth.y}</span><button data-act="calNav|1">›</button></span><span style="display:flex;gap:8px;align-items:center"><button class="chip ${calOurs?'on':''}" style="font-size:11px" data-act="calOurs">Our plans only</button><button class="l" data-act="importIcs">Import .ics</button></span></div>
    <h1 class="hd xl">${MON[calMonth.m]}</h1><div class="cal">${cells}</div>
    <div class="agenda">${groups.join('')}${moreLater ? '<button class="btn lite sm" style="align-self:center" data-act="calMore">Show more</button>' : ''}</div>
  </div>${nav('calendar')}`;
}
ACT.calNav = d => { calMonth.m += +d; if (calMonth.m < 0) { calMonth.m = 11; calMonth.y--; } if (calMonth.m > 11) { calMonth.m = 0; calMonth.y++; } const ym = `${calMonth.y}-${String(calMonth.m+1).padStart(2,'0')}`; calSel = today().startsWith(ym) ? today() : ym + '-01'; render(); };
ACT.calSel = iso => { calSel = iso; render(); const g = $('#ag-sel'); if (g) g.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
ACT.calOurs = () => { calOurs = !calOurs; render(); };
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
    <div class="list" style="font-size:13.5px"><div class="row"><span>Together since</span><input class="in" type="date" value="${esc(s.anniversary||'')}" data-act="anniEdit" data-on="change" style="width:auto;padding:6px 10px;font-size:12px"></div><button class="row" data-go="gcal"><span>Google Calendar</span><span class="l">${(me.icsUrls||[]).length ? 'live · ' + me.icsUrls.length : 'connect'} ›</span></button><button class="row" data-go="emails"><span>Trip emails</span><span class="l">›</span></button><button class="row" data-go="chat"><span>Chat</span><span class="l">${D.bubbles().length} ›</span></button><button class="row" data-act="howto"><span>How it works</span><span class="l">›</span></button><button class="row" data-act="exportAll"><span>Export everything</span><span class="l">backup ›</span></button><button class="row" data-act="importAll"><span>Restore a backup</span><span class="l">›</span></button>
    ${Store.mode === 'supabase' ? `<button class="row" data-act="${Store.user?'signout':'signinSheet'}"><span>${Store.user ? 'Signed in · ' + esc(Store.user.email) : 'Sign in to sync'}</span><span class="l">›</span></button>` : `<div class="row"><span>Sync</span><span class="l">local only · add Supabase keys</span></div>`}
    <button class="row" data-act="switchUser"><span>Switch person</span><span class="l">›</span></button><button class="row" data-act="resetAll"><span class="muted">Start over</span><span class="l">›</span></button></div>
  </div>${nav('')}`;
}
ACT.howto = () => { howtoIdx = 0; go('howto'); };
ACT.myName = async (a, el) => { const me = D.me(); me.name = el.value.trim() || me.name; await Store.put('users', me); };
ACT.myPal = async p => { const me = D.me(), o = D.other(); me.pal = p; await Store.put('users', me); if (o) { o.pal = p === 'bunny' ? 'puppy' : 'bunny'; await Store.put('users', o); } render(); };
ACT.myCity = async (a, el) => { const me = D.me(); Object.assign(me, { city: el.value }, CITIES[el.value]); await Store.put('users', me); render(); };
ACT.tint = t => D.saveSettings({ tint: t }).then(render);
ACT.anniEdit = (a, el) => D.saveSettings({ anniversary: el.value }).then(render);
ACT.photoStyle = p => D.saveSettings({ photoStyle: p }).then(render);
ACT.sky = p => D.saveSettings({ sky: p }).then(render);
ACT.switchUser = () => { localStorage.removeItem('dj.me'); render(); };
ACT.resetAll = async () => { if (await ask('Start over?', { sub: 'Erases everything on this phone. Anything synced stays in Supabase.', ok: 'Erase' })) { Store.wipe(); localStorage.removeItem('dj.me'); setupStep = 1; render(); } };
ACT.signout = async () => { await Store.signOut(); render(); };
ACT.signinSheet = () => openSheet(`<div class="bar"><button data-act="closeSheet">Close</button><span>Sync</span></div><input class="in" id="email" placeholder="email"><button class="btn block" data-act="signin">Send magic link</button>`);
ACT.exportAll = () => download(new Blob([Store.exportJSON()], { type:'application/json' }), 'des-jett-backup.json');
ACT.importAll = () => { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json'; f.onchange = async () => { await Store.importJSON(await f.files[0].text()); toast('Restored'); render(); }; f.click(); };
function renderBetween(app){
  const s = D.settings(), g = s.tripGuess;
  app.innerHTML = `<div class="screen"><div class="bar"><button data-go="profile">‹ Profile</button><span>Between visits</span></div><h1 class="hd">Between visits</h1>
    <div class="glass env">${s.envelopes.map((e,i) => `<div class="row"><input class="in" style="background:transparent;border:0;padding:0;width:45%" value="${esc(e.name)}" data-act="bName|${i}" data-on="change"><span style="display:flex;align-items:center;gap:6px">$<input class="in money" style="font-size:22px;width:70px" type="number" value="${e.amount}" data-act="bAmt|${i}" data-on="change"><button class="chip ${e.per==='each'?'on':''}" data-act="bPer|${i}">${e.per==='each'?'each':'shared'}</button><button class="l" data-act="bDel|${i}">×</button></span></div>`).join('')}<div class="row" style="color:var(--mu)"><button data-act="bAdd">Add</button><span>+</span></div></div>
    <div class="row" style="padding:0 4px"><span class="l">Per month</span><span class="num" style="font-size:22px">${money(D.envelopeMonthly())}</span></div><div class="hr"></div>
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
  const inbox = Store.all('inbox').sort((a,b) => b.at - a.at);
  app.innerHTML = `<div class="screen"><div class="bar">${route.id && D.trip(route.id) ? `<button data-go="trip/${route.id}">‹ ${esc(D.trip(route.id).city)}</button>` : '<button data-go="profile">‹ Profile</button>'}<span>Trip emails</span></div><h1 class="hd">Trip emails</h1>
    <div class="glass"><div class="l">Forward any confirmation to</div><div style="font-size:16px;font-weight:500;margin-top:4px">${CFG.INBOUND_EMAIL ? esc(CFG.INBOUND_EMAIL) : '<span class="muted">not set up yet</span>'}</div><div class="sub">Flights, stays, reservations, tickets. It lands in the right trip; you check it before it's added.${CFG.INBOUND_EMAIL ? '' : ' The setup guide has the forwarding piece.'}</div></div>
    <div class="list">${inbox.map(i => `<button class="row" data-act="${i.status === 'Review' ? 'reviewInbox|' + i.id : 'noop'}"><div style="text-align:left"><div style="font-weight:500">${esc(i.title)}</div><div class="l">${esc(i.kind||'')}${i.tripCity ? ' · ' + esc(i.tripCity) : ''}</div></div>${i.status === 'Review' ? '<span class="chip" style="font-size:10.5px">Review</span>' : `<span class="l">${esc(i.status)}</span>`}</button>`).join('') || '<div class="empty">Nothing yet.</div>'}</div>
    <div class="glass deep"><div class="l">Paste or upload one</div><textarea class="in" id="em-text" style="margin-top:6px;min-height:80px" placeholder="Open the email, Select All, Copy, paste here."></textarea><div class="row" style="margin-top:8px"><button class="btn lite sm" data-act="emUpload">Upload PDF or photo</button><button class="btn sm" data-act="parseEmail">Read it</button></div><input type="file" id="em-file" accept="application/pdf,image/*" hidden data-act="emFile" data-on="change"><div class="l" id="em-status" style="margin-top:6px"></div></div>
    ${CFG.INBOUND_EMAIL ? '' : `<div class="glass" style="font-size:13px"><div style="font-weight:500">Set up forwarding</div><div class="sub" style="margin-top:4px">An address that drops emails straight in here. Two ways, both free.</div><div class="l" style="margin-top:8px">Without a domain</div><ol class="steps"><li>zapier.com → make a Zap: trigger <b>Email Parser by Zapier</b> (it gives you an address like something@robot.zapier.com).</li><li>Action: <b>Webhooks → POST</b> to your Supabase URL + <b>/rest/v1/docs</b> with the body from <b>supabase/functions-README.md</b>.</li><li>Put that address in <b>config.js</b> as <b>INBOUND_EMAIL</b>, re-deploy.</li></ol><div class="l" style="margin-top:8px">With a domain you own</div><ol class="steps"><li>Cloudflare → Email Routing → route <b>trips@yourdomain</b> to a Worker.</li><li>Paste the email worker from <b>supabase/functions-README.md</b>, add the two secrets.</li><li>Put the address in <b>config.js</b>, re-deploy.</li></ol></div>`}
  </div>${nav('')}`;
}
const NOT_AIRPORT = /^(THE|AND|FOR|NEW|YOU|ARE|CAD|USD|PST|PDT|EST|EDT|CST|CDT|MST|MDT|UTC|GMT|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|MON|TUE|WED|THU|FRI|SAT|SUN|SEAT|ROW|PNR|REF|TAX|FEE|ALL|ONE|TWO|OUT|PER|VIA|WWW|COM|PDF)$/;
function routeOf(line){ if (!/(→|->|–|—| - | to )/i.test(line)) return null; const codes = (line.match(/\b[A-Z]{3}\b/g) || []).filter(c => !NOT_AIRPORT.test(c)); if (codes.length < 2 || codes[0] === codes[1]) return null; return [codes[0], codes[1]]; }
const AIRPORTS = { YVR:'Vancouver', YYZ:'Toronto', YTZ:'Toronto', YUL:'Montreal', YYC:'Calgary', YEG:'Edmonton', YOW:'Ottawa', YHZ:'Halifax', YWG:'Winnipeg', YQB:'Quebec City', YXE:'Saskatoon', YQR:'Regina', YYJ:'Victoria', YLW:'Kelowna', YXX:'Abbotsford', SEA:'Seattle', SFO:'San Francisco', LAX:'Los Angeles', SAN:'San Diego', JFK:'New York', EWR:'New York', LGA:'New York', ORD:'Chicago', BOS:'Boston', MIA:'Miami', LAS:'Las Vegas', DEN:'Denver', ATL:'Atlanta', PDX:'Portland', PHX:'Phoenix', AUS:'Austin', DFW:'Dallas', IAH:'Houston', MCO:'Orlando', LHR:'London', LGW:'London', CDG:'Paris', AMS:'Amsterdam', FCO:'Rome', BCN:'Barcelona', MAD:'Madrid', LIS:'Lisbon', DUB:'Dublin', MEX:'Mexico City', CUN:'Cancún', SJD:'Los Cabos', PVR:'Puerto Vallarta', HNL:'Honolulu', OGG:'Maui', NRT:'Tokyo', HND:'Tokyo', ICN:'Seoul', TPE:'Taipei', HKG:'Hong Kong', SIN:'Singapore', BKK:'Bangkok', SYD:'Sydney' };
function cityForCode(text, code){ if (!code) return ''; const m = text.match(new RegExp('([A-Z][a-z\\u00C0-\\u017F.]+(?: [A-Z][a-z\\u00C0-\\u017F.]+)?)\\s*(?:\\(|-|–)\\s*' + code + '\\b')); const name = m ? m[1].replace(/\\s+(International|Airport|Pearson|Intl\\.?)$/i, '').trim() : ''; return name || AIRPORTS[code] || code; }
function parseConfirmation(text){
  const T = text.replace(/\r/g,''); const up = T.toUpperCase();
  const r = { kind:'other', title:'Booking' };
  const fl = T.match(/\b([A-Z][A-Z0-9]|\d[A-Z])\s?(\d{2,4})\b(?![\d:])/); if (fl && !/^(AM|PM)$/.test(fl[1])) { r.kind = 'flight'; r.no = fl[1] + ' ' + fl[2]; }
  const ap = routeOf(T); if (ap) { r.from = ap[0]; r.to = ap[1]; r.kind = 'flight'; }
  if (/AIRBNB|CHECK-?IN|NIGHTS?\b|HOTEL|VRBO/.test(up) && r.kind !== 'flight') r.kind = 'stay';
  if (/RESERVATION|TABLE FOR|OPENTABLE|RESY/.test(up) && r.kind === 'other') r.kind = 'reservation';
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
  r.trip = r.date ? (D.tripForDate(r.date) || D.trips().find(t => Math.abs(daysBetween(t.start, r.date)) <= 2) || null) : null;
  return r;
}
ACT.noop = () => {};
ACT.emUpload = () => $('#em-file').click();
ACT.emFile = async (a, f) => { const file = f.files[0]; if (!file) return; const st = $('#em-status'); st.textContent = 'Reading…'; try { const text = file.type === 'application/pdf' ? await pdfText(file) : await ocrText(file, p => st.textContent = 'Reading… ' + Math.round(p*100) + '%'); $('#em-text').value = text; st.textContent = ''; reviewEmail(text, null, file); } catch (e) { st.textContent = 'Could not read that file: ' + e.message; } };
async function loadScript(src){ if (document.querySelector(`script[src="${src}"]`)) return; await new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => rej(new Error('library did not load')); document.head.appendChild(el); }); }
async function pdfText(file){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; let out = []; for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const c = await page.getTextContent(); let line = '', lastY = null; c.items.forEach(it => { if (lastY !== null && Math.abs(it.transform[5] - lastY) > 4) { out.push(line); line = ''; } line += (line ? ' ' : '') + it.str; lastY = it.transform[5]; }); out.push(line); } return out.join('\n'); }
async function ocrText(file, onProgress){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js'); const r = await window.Tesseract.recognize(file, 'eng', { logger: m => { if (m.status === 'recognizing text' && onProgress) onProgress(m.progress); } }); return r.data.text; }
ACT.reviewInbox = id => { const i = Store.get('inbox', id); reviewEmail(i.raw || '', i); };
ACT.parseEmail = () => { const text = $('#em-text').value; if (!text.trim()) return; reviewEmail(text); };
function reviewEmail(text, inboxItem, file){
  const r = parseConfirmation(text); const me = D.me(); let paidBy = me.id, flyer = me.id; if (r.kind === 'flight' && r.legs && r.legs[0]) { const land = (cityForCode(text, r.legs[0].to) || '').toLowerCase().split(/[ ,]/)[0]; const home = D.users().find(u => land && (u.city||'').toLowerCase().split(/[ ,]/)[0] === land); const away = home && D.users().find(u => u.id !== home.id); if (away) { flyer = away.id; paidBy = away.id; } } let tripId = (route.name === 'emails' && route.id && D.trip(route.id)) ? route.id : (r.trip ? r.trip.id : ''); let ddOpen = false; let legs = (r.legs && r.legs.length ? r.legs : [{ from: r.from||'', to: r.to||'', date: r.date||today(), dep: r.dep||'', arr: r.arr||'', no: r.no||'' }]);
  const draw = () => { const trip = tripId ? D.trip(tripId) : null; const users = D.users2(); return `<div class="bar"><span>From email</span><span>${inboxItem ? 'forwarded' : 'just now'}</span></div><h2 class="hd md" style="margin:0">${esc(r.kind[0].toUpperCase()+r.kind.slice(1))}${r.kind === 'flight' && legs.length > 1 ? ' · ' + legs.length + ' legs' : ''}</h2>
    ${r.kind === 'flight' ? legs.map((l, i) => `<div class="glass deep"><div class="row"><input class="in" data-leg="${i},route" style="background:transparent;border:0;padding:0;font-size:20px;font-weight:500;letter-spacing:-.02em;width:58%" value="${esc((l.from||'')+(l.from?' → ':'')+(l.to||''))}" placeholder="YYZ → YVR"><input class="in" data-leg="${i},no" style="background:transparent;border:0;padding:0;font-size:11px;text-align:right;width:38%" value="${esc(l.no||'')}" placeholder="AC 112"></div><div class="row" style="margin-top:4px"><input class="in" type="date" data-leg="${i},date" value="${l.date||today()}" style="padding:4px 8px;font-size:12px;width:auto"><span style="display:flex;gap:4px;align-items:center"><input class="in" data-leg="${i},dep" value="${esc(l.dep)}" placeholder="dep" style="width:66px;padding:4px 8px;font-size:12px"> – <input class="in" data-leg="${i},arr" value="${esc(l.arr)}" placeholder="arr" style="width:66px;padding:4px 8px;font-size:12px"></span></div></div>`).join('') : `<div class="glass deep"><input class="in" id="r-title" style="background:transparent;border:0;padding:0;font-size:20px;font-weight:500" value="${esc(r.title)}"><div class="row" style="margin-top:4px"><input class="in" type="date" id="r-date" value="${r.date||today()}" style="padding:4px 8px;font-size:12px;width:auto"><span class="l">${esc(r.code||'')}</span></div></div>`}
    <div class="list" style="font-size:13.5px">
      <div class="row" style="position:relative"><span>Trip</span><span style="position:relative"><button class="chip on" data-act="rDD">${trip ? esc(trip.city) + ' · ' + fmtD(trip.start) : 'No trip yet'} ${ddOpen?'▴':'▾'}</button>${ddOpen ? `<div class="dd">${D.trips().slice().reverse().map(x => `<button data-act="rPick|${x.id}"><span style="${x.id===tripId?'font-weight:500':''}">${esc(x.city)} · ${fmtD(x.start)} – ${fmtD(x.end)}</span></button>`).join('')}<button data-act="rPick|new"><span class="muted">+ New trip from this</span></button></div>` : ''}</span></div>
      <div class="row"><span>Cost</span><span style="display:flex;align-items:center;font-weight:500">$<input class="in" id="r-amt" type="number" value="${r.amount||''}" style="width:90px;padding:4px 8px;font-size:13px"></span></div>
      ${r.kind === 'flight' ? `<div class="row"><span>Who flies</span><div class="seg" style="width:130px">${users.map(u => `<button class="${flyer===u.id?'on':''}" data-act="rFlyer|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div>` : ''}
      <div class="row"><span>Paid by</span><div class="seg" style="width:130px">${users.map(u => `<button class="${paidBy===u.id?'on':''}" data-act="rPaid|${u.id}"><i class="pal ${u.pal}"></i></button>`).join('')}</div></div>
    </div>
    <div class="row"><button class="btn sm lite" data-act="closeSheet">Cancel</button><button class="btn sm" data-act="addFromEmail">${trip ? 'Add to trip' : 'Add'}</button></div>`; };
  const keep = () => { document.querySelectorAll('[data-leg]').forEach(el => { const [i, k] = el.dataset.leg.split(','); const l = legs[+i]; if (k === 'route') { const [f, t] = el.value.split('→').map(x => (x||'').trim().toUpperCase()); l.from = f; l.to = t; } else l[k] = el.value.trim(); }); const amt = $('#r-amt'); if (amt) r.amount = +amt.value || 0; const tt = $('#r-title'); if (tt) r.title = tt.value.trim(); const dt = $('#r-date'); if (dt) r.date = dt.value; };
  const redraw = () => { keep(); openSheet(draw(), null, 'tall'); };
  ACT.rDD = () => { ddOpen = !ddOpen; redraw(); };
  ACT.rPick = async id => { keep(); if (id === 'new') { const to = r.kind === 'flight' ? cityForCode(text, legs[0].to) : ''; const city = await ask('Which city is this trip?', { input: to || r.city || '', ok: 'Add trip' }); if (!city) return; const start = legs[0].date || r.date || today(); const end = legs.length > 1 && legs[legs.length-1].date > start ? legs[legs.length-1].date : (r.dates && r.dates[1] && r.dates[1] > start ? r.dates[1] : addDays(start, 4)); const t = await Store.put('trips', { id: Store.uid(), city, start, end, flyer: r.kind === 'flight' ? flyer : '', createdAt: Date.now() }); tripId = t.id; } else tripId = id; ddOpen = false; redraw(); };
  ACT.rPaid = id => { keep(); paidBy = id; redraw(); };
  ACT.rFlyer = id => { keep(); flyer = id; redraw(); };
  ACT.addFromEmail = async () => {
    keep(); const trip = tripId ? D.trip(tripId) : null; const kind = r.kind;
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
    else { const date = r.date || today(); const dup = D.moments().find(x => (x.text === r.title || x.title === r.title) && x.date === date && (+((x.cost||{}).amount||0)) === (+(r.amount||0))); if (!dup) { const m = { id: Store.uid(), tripId: trip ? trip.id : '', date, authorId: me.id, kind: kind === 'reservation' ? 'plan' : 'booking', text: r.title, createdAt: Date.now(), cost: r.amount ? { amount: r.amount, paidBy, tag: kind === 'stay' ? 'stay' : 'food' } : null }; if (kind === 'reservation') { m.title = r.title; m.time = r.dep || ''; m.who = 'both'; } if (attachment) m.attachment = attachment; await Store.put('moments', m); } }
    await Store.put('inbox', Object.assign({ id: Store.uid(), at: Date.now() }, inboxItem || {}, { title: kind === 'flight' ? 'Flight ' + legs.map(l => l.from + '→' + l.to).join(', ') : r.title, kind, tripCity: trip ? trip.city : '', status: 'Added', raw: '' }));
    closeSheet(); toast('Added'); if (trip) go('trip', { id: trip.id }); else render();
  };
  openSheet(draw(), null, 'tall');
}

// ---------- memories ----------
let memMonth = null;
function renderMemories(app){
  const now = new Date(); if (!memMonth) memMonth = { y: now.getFullYear(), m: now.getMonth() };
  const ym = `${memMonth.y}-${String(memMonth.m+1).padStart(2,'0')}`, first = ym + '-01', last = ym + '-' + String(new Date(memMonth.y, memMonth.m+1, 0).getDate()).padStart(2,'0');
  const future = first > today(); const cur = today().startsWith(ym);
  const trips = D.trips().filter(t => t.start <= last && t.end >= first);
  const ms = D.moments().filter(m => m.date >= first && m.date <= last && m.kind !== 'booking' && m.kind !== 'plan');
  const daysTogether = trips.reduce((s,t) => { const a = t.start > first ? t.start : first, b = (t.end < last ? t.end : last); const cap = cur ? today() : b; return s + Math.max(0, daysBetween(a, b < cap ? b : cap) + 1) * (a <= cap ? 1 : 0); }, 0);
  const meals = D.moments().filter(m => m.date >= first && m.date <= last && m.cost && m.cost.tag === 'food');
  const tripsCost = D.moments().filter(m => m.date >= first && m.date <= last && m.cost && m.cost.amount && m.tripId).reduce((s,m) => s + +m.cost.amount, 0);
  const env = future ? 0 : D.envelopeMonthly(); const total = tripsCost + env;
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
    ${!future ? `<div class="glass"><div class="row"><span class="l">Together in ${MONTHS[memMonth.m]}</span><span class="l">${daysTogether ? '~' + money(total/daysTogether) + ' / day' : tripsCost ? '' : 'envelopes only'}</span></div><div class="num" style="margin-top:8px">${money(total)}</div>${tripsCost ? `<div class="l" style="margin-top:4px">Trips ${money(tripsCost)} · envelopes ${money(env)}</div>` : ''}</div>` : ''}
    ${anniDay && (future || anniDay >= today() || plans.length) ? `<div class="list" style="font-size:13.5px">${anniDay >= today() ? `<button class="row" data-go="day/${(D.tripForDate(anniDay)||{}).id||'none'}_${anniDay}"><span>${fmtD(anniDay)}</span><span class="l">${D.monthsSince(anniDay)} months <i class="heart"></i></span></button>` : ''}${plans.map(p => `<button class="row" data-go="day/${p.tripId||'none'}_${p.date}"><span>${esc(p.title)}</span><span class="l">${fmtD(p.date)} · planned</span></button>`).join('')}</div>` : ''}
    ${anniMoments.length ? `<div class="l">${fmtD(anniDay)} · ${D.monthsSince(anniDay)} months</div><div class="feed" style="margin-top:-8px">${anniMoments.map(momentRow).join('')}</div>` : ''}
    ${ms.filter(m => !anniMoments.includes(m)).length ? `<div class="l">Moments</div><div class="feed" style="margin-top:-8px">${ms.filter(m => !anniMoments.includes(m)).sort((a,b) => b.date.localeCompare(a.date)).slice(0,4).map(momentRow).join('')}</div>` : future ? '<div class="empty">Nothing here yet.</div>' : ''}
    ${!future ? `<button class="row" style="font-size:13.5px" data-go="chat"><span>Chat</span><span class="l">${D.bubbles().filter(b => isoDate(new Date(b.at)).startsWith(ym)).length} said or thought ›</span></button>` : ''}
    ${!future ? `<div class="hr"></div><div class="l">All time</div><div class="stats" style="margin-top:-8px"><div><b>${all.trips}</b><span class="l">trip${all.trips===1?'':'s'}</span></div><div><b>${all.days}</b><span class="l">days</span></div><div><b>${all.moments}</b><span class="l">moments</span></div>${months != null ? `<div><b>${D.monthsSince(today())}</b><span class="l">months</span></div>` : ''}</div>` : ''}
  </div>${nav('memories')}`;
}
ACT.memNav = d => { memMonth.m += +d; if (memMonth.m < 0) { memMonth.m = 11; memMonth.y--; } if (memMonth.m > 11) { memMonth.m = 0; memMonth.y++; } render(); };

// ---------- export ----------
ACT.exportTrip = async id => {
  const t = D.trip(id); if (!window.JSZip) return toast('Export library not loaded');
  openSheet(`<div class="bar"><span>Export</span><span>${esc(t.city)} · ${MON[parseDate(t.start).getMonth()]}</span></div><div class="glass deep env"><div class="row"><span>Photos & polaroids</span><span class="l">${D.tripMoments(id).reduce((s,m)=>s+(m.photos||[]).length,0)}</span></div><div class="row"><span>Voice notes</span><span class="l">${D.tripMoments(id).filter(m=>m.voice).length}</span></div><div class="row"><span>Moments</span><span class="l">text</span></div><div class="row"><span>Budget</span><span class="l">.xlsx</span></div></div><div class="sub">Saves as one folder. On a phone the share sheet lets you put it in Google Drive.</div><button class="btn block" data-act="doExport|${id}">Save</button>`);
};
ACT.doExport = async id => {
  const t = D.trip(id); const zip = new JSZip(); const folder = zip.folder(`${t.start.slice(0,4)} · ${t.city}`); const ms = D.tripMoments(id); let lines = [`${t.city} · ${t.start} – ${t.end}`, ''];
  for (const m of ms) { const who = (D.user(m.authorId)||{}).name || ''; lines.push(`${m.date} · ${who}${m.text ? ' · ' + m.text : ''}${m.title ? ' · ' + m.title : ''}${m.cost && m.cost.amount ? ' · $' + m.cost.amount + ' (' + m.cost.tag + ')' : ''}${m.song ? ' · ' + m.song : ''}`); for (const [i, p] of (m.photos||[]).entries()) { const b = await Store.blob(p.asset); if (b) folder.file(`photos/${m.date}-${m.id}-${i}.jpg`, b); } if (m.voice) { const b = await Store.blob(m.voice); if (b) folder.file(`voice/${m.date}-${m.id}.${m.voice.split('.').pop()}`, b); } }
  folder.file('moments.txt', lines.join('\n')); const x = budgetWorkbook(t); if (x) folder.file('budget.xlsx', x); else folder.file('budget.csv', budgetCsv(t));
  const blob = await zip.generateAsync({ type:'blob' }); const f = new File([blob], `${t.city}-${t.start}.zip`, { type:'application/zip' }); closeSheet();
  if (navigator.canShare && navigator.canShare({ files:[f] })) { try { await navigator.share({ files:[f], title: t.city }); return; } catch (e) {} } download(blob, f.name); toast('Saved');
};
function budgetRows(t){ const rows = [['Date','Who','What','Category','Amount']]; D.tripMoments(t.id).filter(m => m.cost && m.cost.amount).forEach(m => rows.push([m.date, D.payerText(m), m.text||m.title||'', D.catLabel(t, m.cost.tag||'other'), +m.cost.amount])); const plan = D.tripPlan(t); rows.push([]); rows.push(['Plan']); D.cats(t).forEach(c => rows.push([c.label, '', '', '', plan[c.key]||0])); return rows; }
function budgetCsv(t){ return budgetRows(t).map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'); }
function budgetWorkbook(t){ if (!window.XLSX) return null; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows(t)), t.city.slice(0,30)); return XLSX.write(wb, { bookType:'xlsx', type:'array' }); }
ACT.exportXlsx = id => { const t = D.trip(id); const x = budgetWorkbook(t); if (x) download(new Blob([x]), `${t.city}-${t.start}-budget.xlsx`); else download(new Blob([budgetCsv(t)], { type:'text/csv' }), `${t.city}-${t.start}-budget.csv`); };

// ---------- boot ----------
window.addEventListener('hashchange', () => { const [n, id] = location.hash.slice(1).split('/'); if (n && n !== route.name || id !== route.id) { route = { name: n || 'home', id }; render(); } });
Store.onChange(() => { if (!sheet) render(); });
Store.ready = Store.connect(CFG).then(() => { const [n, id] = location.hash.slice(1).split('/'); route = { name: n || 'home', id }; render(); setInterval(applySky, 60000); syncIcs(false); setInterval(() => syncIcs(false), 3600000); if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{}); });
window.DJ = { D, go, ACT, render, parseConfirmation, skyMode, Store };
})();
