/* Lets Android install the app. Pages always come from the network so every push shows up right away;
   the last good copy of the page is kept only for when the phone is offline. Nothing else is cached. */
const CACHE = 'nfl-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)); }
    return res;
  }).catch(() => caches.match('./')));
});
