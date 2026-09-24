# Optional pieces that need a service of their own

## 1. Google Calendar live sync (ICS proxy)
Google's "secret address in iCal format" usually can't be fetched straight from a browser (no CORS header).
A tiny proxy fixes that. Any of these work; pick the one you already have:

**Cloudflare Worker** (free) — `ics-proxy.js`:
```js
export default { async fetch(req) {
  const u = new URL(req.url).searchParams.get('url') || '';
  if (!/^https:\/\/calendar\.google\.com\//.test(u)) return new Response('no', { status: 400 });
  const r = await fetch(u); const t = await r.text();
  return new Response(t, { headers: { 'content-type': 'text/calendar', 'access-control-allow-origin': '*' } });
}};
```
Deploy it, then in `app/config.js` set `ICS_PROXY: "https://<your-worker>.workers.dev"`.
The app tries a direct fetch first and falls back to the proxy. It refreshes every hour while open.

## 2. Forwarding trip emails to an address
Cloudflare Email Routing (free with a domain) → Email Worker → your Supabase `docs` table.
`email-worker.js`:
```js
export default { async email(msg, env) {
  const raw = await new Response(msg.raw).text();
  const text = raw.replace(/=\r?\n/g,'').replace(/<[^>]+>/g,' ');
  const id = 'in_' + Date.now().toString(36);
  await fetch(env.SUPABASE_URL + '/rest/v1/docs', { method:'POST', headers: { apikey: env.SERVICE_KEY, Authorization: 'Bearer ' + env.SERVICE_KEY, 'content-type':'application/json', Prefer:'return=minimal' },
    body: JSON.stringify({ id, collection:'inbox', data: { id, at: Date.now(), title: (raw.match(/^Subject: (.*)$/m)||[])[1] || 'Email', kind:'email', status:'Review', raw: text } }) });
}};
```
Bind `SUPABASE_URL` and `SERVICE_KEY` (service role key) as secrets, route e.g. `trips@yourdomain.com` to the worker,
then set `INBOUND_EMAIL: "trips@yourdomain.com"` in `app/config.js`. Forwarded emails show up under Profile → Trip emails with a Review button.
