// Offline shell + notifications.
const C = 'dj-v4';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'store.js', 'config.js', 'manifest.webmanifest', 'assets/bunny.png', 'assets/puppy.png', 'assets/icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
// a notification arrives
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Des & Jett', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Des & Jett', { body: d.body || '', icon: d.icon || 'assets/icon-192.png', badge: 'assets/icon-192.png', tag: d.tag, data: { url: d.url || '#home' } }));
});
// tapping it opens the right screen
self.addEventListener('notificationclick', e => {
  e.notification.close(); const hash = (e.notification.data && e.notification.data.url) || '#home'; const target = new URL('./' + hash, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => { for (const c of list) { if ('focus' in c) { c.postMessage({ go: hash }); return c.focus(); } } return self.clients.openWindow(target); }));
});
