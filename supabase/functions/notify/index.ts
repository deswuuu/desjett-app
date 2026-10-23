// Des & Jett — notifications. A Supabase Edge Function.
// Called two ways, both with the x-notify-secret header:
//   1. by a database trigger when something changes  -> { type:'change', op, collection, record, old }
//   2. by a scheduled job every minute               -> { type:'tick' }   (your reminders every minute; trips, flights, birthdays every 5)
// It never tells you about your own actions, never mentions anything hidden, and each
// reminder is sent once (remembered as a small "pushlog" record).
import webpush from 'npm:web-push@3.6.7';

const SB_URL = Deno.env.get('SUPABASE_URL');
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SECRET = Deno.env.get('NOTIFY_SECRET');
try { webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@example.com', Deno.env.get('VAPID_PUBLIC_KEY'), Deno.env.get('VAPID_PRIVATE_KEY')); } catch (e) { console.error('VAPID keys missing', e.message); }

// ---------- database ----------
const H = () => ({ apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' });
async function q(params) { const r = await fetch(`${SB_URL}/rest/v1/docs?${params}`, { headers: H() }); if (!r.ok) throw new Error('db ' + r.status + ' ' + await r.text()); return await r.json(); }
const coll = async c => (await q(`select=id,data&collection=eq.${c}`)).map(r => Object.assign({ id: r.id }, r.data));
const one = async id => { const r = await q(`select=id,data&id=eq.${encodeURIComponent(id)}`); return r[0] ? Object.assign({ id: r[0].id }, r[0].data) : null; };
async function upsert(recs) { if (!recs.length) return; await fetch(`${SB_URL}/rest/v1/docs`, { method: 'POST', headers: Object.assign(H(), { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(recs) }); }
async function del(ids) { if (!ids.length) return; await fetch(`${SB_URL}/rest/v1/docs?id=in.(${ids.map(encodeURIComponent).join(',')})`, { method: 'DELETE', headers: H() }); }

// ---------- time ----------
function parts(tz, t) { const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(t)); const g = k => (p.find(x => x.type === k) || {}).value; return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: +g('hour') % 24, min: +g('minute') }; }
const tzOffset = (tz, t) => { const p = parts(tz, t); const [y, m, d] = p.date.split('-').map(Number); return Date.UTC(y, m - 1, d, p.hour, p.min) - Math.floor(t / 60000) * 60000; };
function zoned(date, hh, mm, tz) { const [y, m, d] = date.split('-').map(Number); const guess = Date.UTC(y, m - 1, d, hh, mm); const o1 = tzOffset(tz, guess); let t = guess - o1; const o2 = tzOffset(tz, t); if (o2 !== o1) t = guess - o2; return t; }
function hm(s) { const m = String(s || '').match(/(\d{1,2}):(\d{2})\s*([ap])?/i); if (!m) return null; let h = +m[1]; if (m[3]) { const pm = /p/i.test(m[3]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; } return [h, +m[2]]; }
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'], DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtD = s => MON[+s.slice(5, 7) - 1] + ' ' + (+s.slice(8));
const fmtDow = s => DOW[new Date(s + 'T12:00:00Z').getUTCDay()] + ' ' + fmtD(s);
const clock = t => { const [h, m] = t; return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? 'am' : 'pm'); };
const AIRPORT = { YVR:['Vancouver','America/Vancouver'], YYJ:['Victoria','America/Vancouver'], YLW:['Kelowna','America/Vancouver'], YXX:['Abbotsford','America/Vancouver'], YYZ:['Toronto','America/Toronto'], YTZ:['Toronto','America/Toronto'], YOW:['Ottawa','America/Toronto'], YUL:['Montreal','America/Toronto'], YQB:['Quebec City','America/Toronto'], YYC:['Calgary','America/Edmonton'], YEG:['Edmonton','America/Edmonton'], YWG:['Winnipeg','America/Winnipeg'], YHZ:['Halifax','America/Halifax'], YXE:['Saskatoon','America/Regina'], YQR:['Regina','America/Regina'], SEA:['Seattle','America/Los_Angeles'], PDX:['Portland','America/Los_Angeles'], SFO:['San Francisco','America/Los_Angeles'], LAX:['Los Angeles','America/Los_Angeles'], SAN:['San Diego','America/Los_Angeles'], LAS:['Las Vegas','America/Los_Angeles'], PHX:['Phoenix','America/Phoenix'], DEN:['Denver','America/Denver'], ORD:['Chicago','America/Chicago'], DFW:['Dallas','America/Chicago'], IAH:['Houston','America/Chicago'], AUS:['Austin','America/Chicago'], JFK:['New York','America/New_York'], EWR:['New York','America/New_York'], LGA:['New York','America/New_York'], BOS:['Boston','America/New_York'], MIA:['Miami','America/New_York'], ATL:['Atlanta','America/New_York'], MCO:['Orlando','America/New_York'], HNL:['Honolulu','Pacific/Honolulu'], OGG:['Maui','Pacific/Honolulu'], MEX:['Mexico City','America/Mexico_City'], CUN:['Cancún','America/Cancun'], PVR:['Puerto Vallarta','America/Mexico_City'], SJD:['Los Cabos','America/Mazatlan'], LHR:['London','Europe/London'], LGW:['London','Europe/London'], DUB:['Dublin','Europe/Dublin'], CDG:['Paris','Europe/Paris'], AMS:['Amsterdam','Europe/Amsterdam'], FCO:['Rome','Europe/Rome'], BCN:['Barcelona','Europe/Madrid'], MAD:['Madrid','Europe/Madrid'], LIS:['Lisbon','Europe/Lisbon'], NRT:['Tokyo','Asia/Tokyo'], HND:['Tokyo','Asia/Tokyo'], ICN:['Seoul','Asia/Seoul'], TPE:['Taipei','Asia/Taipei'], HKG:['Hong Kong','Asia/Hong_Kong'], SIN:['Singapore','Asia/Singapore'], BKK:['Bangkok','Asia/Bangkok'], SYD:['Sydney','Australia/Sydney'] };
// when a flight lands, as a real instant (overnight flights land the next day)
function landsAt(m) { const f = m.flight || {}; const a = AIRPORT[f.to], o = AIRPORT[f.from]; const arr = hm(f.arr); if (!a || !arr) return null; let t = zoned(m.date, arr[0], arr[1], a[1]); const dep = hm(f.dep); if (dep && o) { const d = zoned(m.date, dep[0], dep[1], o[1]); while (t <= d) t += 864e5; } return t; }

// ---------- sending ----------
function makeCtx(users, subs) { return { users, subs, sent: 0, gone: [] }; }
const other = (ctx, id) => ctx.users.find(u => u.id !== id) || null;
const name = (ctx, id) => (ctx.users.find(u => u.id === id) || {}).name || 'They';
async function send(ctx, userId, payload, pref) {
  const u = ctx.users.find(x => x.id === userId); if (!u) return 0;
  if (pref && u.notify && u.notify[pref] === false) return 0;
  let n = 0;
  for (const s of ctx.subs.filter(s => s.userId === userId)) {
    try { await webpush.sendNotification(s.sub, JSON.stringify(Object.assign({ icon: 'assets/icon-192.png' }, payload)), { TTL: 43200 }); n++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) ctx.gone.push(s.id); else console.error('push', e && e.statusCode, e && e.body); }
  }
  ctx.sent += n; return n;
}
const isSecretTrip = t => !!(t && t.occasion && t.secret);
const dayUrl = m => `#day/${m.tripId || 'none'}_${m.date}`;
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// ---------- 1. something changed ----------
async function onChange(b) {
  const r = b.record || {}, c = b.collection, op = b.op, now = Date.now();
  const recent = t => typeof t === 'number' && now - t < 3600e3;   // don't replay old records when a phone syncs for the first time
  const ctx = makeCtx(await coll('users'), await coll('push'));
  if (c === 'pushtest' && op === 'INSERT') await send(ctx, r.userId, { title: 'Notifications are on ♡', body: 'This is how ' + name(ctx, (other(ctx, r.userId) || {}).id) + '’s bubbles will reach you.', url: '#home', tag: 'test' });
  else if (c === 'bubbles' && op === 'INSERT' && recent(r.at)) { const to = other(ctx, r.userId); const body = r.photo ? (r.video ? (r.auto ? 'sent a video 🎬' : '🎬 “' + r.text + '”') : r.auto ? 'sent a photo 📷' : '📷 “' + r.text + '”') : r.sticker ? 'sent a sticker' : '“' + r.text + '”'; if (to) await send(ctx, to.id, { title: name(ctx, r.userId) + (r.kind === 'think' ? ' is thinking of you' : r.photo || r.sticker ? '' : ' says'), body, url: '#chat', tag: 'bubble' }, 'say'); }
  // a pile of imported photos: one notification for the lot, not one per memory
  else if (c === 'imports' && op === 'INSERT' && recent(r.at)) { const to = other(ctx, r.by); const t = r.tripId ? await one(r.tripId) : null; if (to && !isSecretTrip(t)) await send(ctx, to.id, { title: name(ctx, r.by) + ' added ' + plural(r.count || 0, 'photo'), body: plural(r.memories || 0, 'new memory').replace('memorys', 'memories') + (t ? ' from ' + t.city : ''), url: t ? '#days/' + t.id : '#memories', tag: 'import-' + r.id }, 'memories'); }
  else if (c === 'moments' && op === 'INSERT' && recent(r.createdAt) && !r.fromPresent && !r.imported) {
    const t = r.tripId ? await one(r.tripId) : null; if (isSecretTrip(t)) return { skipped: 'hidden' };
    const to = other(ctx, r.authorId); if (!to) return {};
    if (r.kind === 'plan') { if (r.hidden) return { skipped: 'hidden' }; await send(ctx, to.id, { title: name(ctx, r.authorId) + ' added a plan', body: (r.title || 'A plan') + ' · ' + fmtDow(r.date) + (r.time ? ' · ' + r.time : ''), url: dayUrl(r), tag: 'plan-' + r.id }, 'plans'); }
    else if (r.kind === 'moment') { const ph = (r.photos || []).length, items = r.items || []; const bits = [ph ? plural(ph, 'photo') : '', items.filter(i => i.type === 'voice').length ? 'a voice note' : '', items.filter(i => i.type === 'song').length ? 'a song' : '', items.filter(i => i.type === 'video').length ? 'a video' : ''].filter(Boolean);
      await send(ctx, to.id, { title: name(ctx, r.authorId) + ' added a memory', body: [r.text, bits.join(' · ')].filter(Boolean).join(' · ') || (t ? t.city : fmtD(r.date)), url: dayUrl(r), tag: 'mem-' + r.id }, 'memories'); }
  }
  else if (c === 'comments' && op === 'INSERT' && recent(r.at)) {
    const m = await one(r.mid); if (!m) return {}; const t = m.tripId ? await one(m.tripId) : null; if (isSecretTrip(t)) return {};
    const to = other(ctx, r.by); const p = (m.photos || []).find(x => x.asset === r.asset) || {};
    if (to) await send(ctx, to.id, { title: name(ctx, r.by) + ' commented on “' + (p.caption || m.text || 'your photo').slice(0, 40) + '”', body: '“' + r.text + '”', url: dayUrl(m), tag: 'cm-' + r.asset }, 'comments');
  }
  else if (c === 'presents' && op === 'UPDATE' && r.openedAt && !(b.old || {}).openedAt) {
    const opener = ctx.users.find(u => u.id === r.forUser) || {}; const at = parts(opener.tz, r.openedAt);
    await send(ctx, r.fromUser, { title: (opener.name || 'They') + ' opened your present ♡', body: 'Opened at ' + clock([at.hour, at.min]) + ' ' + (opener.name || 'their') + '’s time', url: '#home', tag: 'present-' + r.id }, 'birthdays');
  }
  await del(ctx.gone);
  return { sent: ctx.sent };
}

// ---------- 2. every minute: your reminders; every 5 minutes: trips, flights, birthdays, the 23rd ----------
async function tick(nowOverride) {
  const now = nowOverride || Date.now(); const full = !!nowOverride || new Date(now).getUTCMinutes() % 5 === 0;
  const none = Promise.resolve([]);
  const [users, subs, trips, rems, logRows, settingsL, bookings, presents] = await Promise.all([coll('users'), coll('push'), coll('trips'), coll('reminders'), q(`select=id&collection=eq.pushlog&updated_at=gt.${new Date(now - 20 * 864e5).toISOString()}`),
    full ? coll('settings') : none, full ? q(`select=id,data&collection=eq.moments&data->>kind=eq.booking`).then(rs => rs.map(r => Object.assign({ id: r.id }, r.data))) : none, full ? coll('presents') : none]);
  const ctx = makeCtx(users, subs); const settings = settingsL.find(s => s.id === 'settings') || settingsL[0] || {};
  const done = new Set(logRows.map(r => r.id)); const log = [];
  const once = async (key, fn) => { const id = 'pl_' + key; if (done.has(id)) return; await fn(); done.add(id); log.push({ id, collection: 'pushlog', data: { id, at: now }, updated_at: new Date(now).toISOString() }); };
  const trips2 = trips.filter(t => !t.occasion);
  // reminders you set for each other (or yourselves): on time in that person's own time zone, once a day each;
  // with a ✓ check-in, one more nudge 45 minutes later if there's no ✓; optionally skipped on days you're together
  if (rems.length) {
    const rdRows = await q(`select=id,data&collection=eq.rdone&updated_at=gt.${new Date(now - 3 * 864e5).toISOString()}`); const ticked = new Set(rdRows.map(r => r.id));
    // V2.17.1: someone ✓'d a reminder → tell the one who set it (and, for "both of you", the other one)
    for (const row of rdRows) { const d = Object.assign({ id: row.id }, row.data); const r = rems.find(x => x.id === d.rid); if (!r || !d.uid || !(now - (d.at || 0) < 15 * 60000 && d.at <= now + 60000)) continue;
      const whoFor = r.for === 'both' ? users.map(u => u.id) : [r.for]; const tell = [...new Set([r.by, ...whoFor])].filter(x => x && x !== d.uid);
      const by = users.find(u => u.id === d.uid) || {}; const at = parts(by.tz, d.at);
      for (const to of tell) { const tu = users.find(u => u.id === to) || {}; const mine = parts(tu.tz, d.at);
        await once(`remdone_${d.id}_${to}`, () => send(ctx, to, { title: name(ctx, d.uid) + ' ✓ ' + r.text, body: 'Done at ' + clock([at.hour, at.min]) + (by.tz && tu.tz && by.tz !== tu.tz ? ' ' + (by.name || 'their') + '’s time (' + clock([mine.hour, mine.min]) + ' yours)' : ''), url: '#reminders', tag: 'remdone-' + r.id }, 'remdone')); } }
    for (const r of rems) { const t0 = hm(r.time); if (r.paused || !r.text || !t0) continue;
      for (const uid of r.for === 'both' ? users.map(u => u.id) : [r.for]) {
        const u = users.find(x => x.id === uid); if (!u || !subs.some(s => s.userId === uid)) continue;
        const L = parts(u.tz, now); const dow = new Date(L.date + 'T12:00:00Z').getUTCDay();
        if (r.once ? r.once !== L.date : !(r.days || []).includes(dow)) continue;
        if (!r.once && r.together && trips2.some(t => L.date >= t.start && L.date <= t.end)) continue;
        const due = zoned(L.date, t0[0], t0[1], u.tz); if (due < (r.since || r.createdAt || 0) - 60000) continue;   // set after today's time: starts tomorrow
        const mins = (now - due) / 60000; const from = r.by && r.by !== uid ? name(ctx, r.by) : '';
        const key = `rem_${r.id}_${uid}_${L.date}_${r.time}`;
        if (mins >= 0 && mins < 30) await once(key, () => send(ctx, uid, { title: r.text, body: (from ? 'from ' + from + ' ♡' : 'Reminder') + (r.checkin ? ' · tap when it’s done' : ''), url: '#rem/' + r.id, tag: 'rem-' + r.id }));
        else if (r.checkin && r.nudge && mins >= 45 && mins < 90 && done.has('pl_' + key) && !ticked.has(`rd_${r.id}_${uid}_${L.date}`))
          await once(key + '_n', () => send(ctx, uid, { title: r.text, body: 'Still time ♡' + (from ? ' — ' + from : '') + ' · tap when it’s done', url: '#rem/' + r.id, tag: 'rem-' + r.id }));
      } }
  }
  if (full) for (const u of users) {
    if (!subs.some(s => s.userId === u.id)) continue;
    const L = parts(u.tz, now); const o = other(ctx, u.id);
    // the 23rd
    const an = settings.anniversary;
    if (an && L.date.slice(8) === an.slice(8) && L.date > an && L.hour >= 9) { const [ay, am] = an.split('-').map(Number), [y, mo] = L.date.split('-').map(Number); const n = (y - ay) * 12 + (mo - am);
      await once(`anni_${u.id}_${L.date}`, () => send(ctx, u.id, { title: n + ' Month' + (n === 1 ? '' : 's') + ' today ♡', body: 'since ' + MONTHS[am - 1] + ' ' + (+an.slice(8)), url: '#home', tag: 'anni' }, 'anni')); }
    // trips: a week before and the day before
    for (const t of trips2) { const d = daysBetween(L.date, t.start); if ((d === 7 || d === 1) && L.hour >= 9) {
      const fl = bookings.filter(m => m.tripId === t.id && m.flight && m.date === t.start).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).pop();
      const who = fl ? (fl.flight.who || t.flyer) : t.flyer; const arr = fl && hm(fl.flight.arr);
      const body = d === 7 ? fmtD(t.start) + ' – ' + fmtD(t.end) : fl && who ? (who === u.id ? 'You fly tomorrow' + (fl.flight.dep ? ' at ' + (hm(fl.flight.dep) ? clock(hm(fl.flight.dep)) : fl.flight.dep) : '') : name(ctx, who) + ' lands tomorrow' + (arr ? ' at ' + clock(arr) : '') + ' ♡') : fmtD(t.start) + ' – ' + fmtD(t.end);
      await once(`trip_${t.id}_${d}_${u.id}`, () => send(ctx, u.id, { title: t.city + ' in ' + plural(d, 'day'), body, url: '#trip/' + t.id, tag: 'trip-' + t.id }, 'trips')); } }
    // flights: tell the one who's waiting
    for (const m of bookings) { if (!m.flight) continue; const who = m.flight.who || (trips.find(t => t.id === m.tripId) || {}).flyer; if (!who || who === u.id) continue; const t = landsAt(m); if (!t) continue; const f = m.flight; const a = AIRPORT[f.to];
      const arrTxt = hm(f.arr) ? clock(hm(f.arr)) : f.arr; const mins = Math.round((t - now) / 60000);
      if (mins > 0 && mins <= 75) await once(`f1_${m.id}_${u.id}`, () => send(ctx, u.id, { title: name(ctx, who) + '’s flight lands in ' + (mins >= 50 ? '1 hour' : mins + ' min'), body: [f.no, (AIRPORT[f.from] || [f.from])[0] + ' → ' + a[0], 'lands ' + arrTxt].filter(Boolean).join(' · '), url: dayUrl(m), tag: 'flight-' + m.id }, 'flights'));
      if (mins <= 0 && mins > -120) await once(`fl_${m.id}_${u.id}`, () => send(ctx, u.id, { title: name(ctx, who) + ' landed ♡', body: a[0] + ' · ' + arrTxt, url: dayUrl(m), tag: 'flight-' + m.id }, 'flights')); }
    // birthdays
    if (o && o.birthday) { const y = +L.date.slice(0, 4); let bd = y + o.birthday.slice(4); if (bd < L.date) bd = (y + 1) + o.birthday.slice(4); const d = daysBetween(L.date, bd);
      const pr = presents.find(p => p.fromUser === u.id && p.forUser === o.id && p.date === bd);
      if (d === 7 && L.hour >= 9) { const occ = trips.find(t => t.occasion && t.kind === 'birthday' && t.forUser === o.id && t.bday === bd && t.authorId === u.id);
        let spent = 0; if (occ) { const ms = (await q(`select=data&collection=eq.moments&data->>tripId=eq.${occ.id}`)).map(r => r.data); ms.forEach(m => { if (m.cost && +m.cost.amount) spent += +m.cost.amount; (m.items || []).forEach(i => { if (i.type === 'cost') spent += +i.amount || 0; }); }); }
        await once(`bw_${o.id}_${bd}_${u.id}`, () => send(ctx, u.id, { title: o.name + '’s birthday is in a week', body: [pr ? 'Present wrapped ✓' : 'Wrap a present', occ ? 'birthday budget $' + Math.round(spent) + ' so far' : ''].filter(Boolean).join(' · '), url: '#home', tag: 'bday' }, 'birthdays')); }
      if (d === 0 && L.hour >= 9) await once(`bd_${o.id}_${bd}_${u.id}`, () => send(ctx, u.id, { title: 'It’s ' + o.name + '’s birthday!', body: pr ? (pr.openedAt ? o.name + ' opened your present ♡' : 'Your present is waiting for ' + o.name) : 'Say happy birthday ♡', url: '#home', tag: 'bday' }, 'birthdays')); }
    // your own birthday
    if (u.birthday && L.date.slice(5) === u.birthday.slice(5) && L.hour >= 8) { const pr = o && presents.find(p => p.fromUser === o.id && p.forUser === u.id && p.date === L.date && !p.openedAt);
      await once(`hb_${u.id}_${L.date}`, () => send(ctx, u.id, { title: 'Happy birthday, ' + u.name + ' ♡', body: pr ? o.name + ' left you a present' : 'from ' + (o ? o.name : 'us'), url: '#home', tag: 'bday' }, 'birthdays')); }
  }
  await upsert(log); await del(ctx.gone);
  return { sent: ctx.sent, logged: log.length };
}

// ---------- 3. a new version was published (Netlify "deploy succeeded" webhook) ----------
// The site's version.json says which version it is and whether it's worth a notification (minor fixes say no).
async function onRelease(body, siteOverride) {
  const site = siteOverride || body.ssl_url || body.url || body.deploy_ssl_url; if (!site) return { skipped: 'no site' };
  let v = null; try { const r = await fetch(site.replace(/\/$/, '') + '/version.json?t=' + Date.now()); if (r.ok) v = await r.json(); } catch (e) {}
  if (!v || !v.version) return { skipped: 'no version.json' }; if (!v.notify) return { skipped: 'quiet release ' + v.version };
  const id = 'pl_release_' + v.version; if (await one(id)) return { skipped: 'already announced ' + v.version };
  const ctx = makeCtx(await coll('users'), await coll('push'));
  for (const u of ctx.users) await send(ctx, u.id, { title: v.title || 'Des & Jett updated ♡', body: v.body || 'Tap to see what\'s new', url: '#whatsnew', tag: 'release' });
  await upsert([{ id, collection: 'pushlog', data: { id, at: Date.now() }, updated_at: new Date().toISOString() }]); await del(ctx.gone);
  return { sent: ctx.sent, version: v.version };
}

Deno.serve(async req => {
  const u = new URL(req.url || 'http://local/'); const viaQuery = u.searchParams.get('secret');
  if (!SECRET || (req.headers.get('x-notify-secret') !== SECRET && viaQuery !== SECRET)) return new Response('not allowed', { status: 401 });
  const body = await req.json().catch(() => ({}));
  try { const out = u.searchParams.get('release') ? await onRelease(body, u.searchParams.get('site')) : body.type === 'tick' ? await tick(body.now) : await onChange(body); return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } }); }
  catch (e) { console.error(e); return new Response(String(e && e.message || e), { status: 500 }); }
});
