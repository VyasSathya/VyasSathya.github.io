// Shared service worker logic for /portal/ and /studio/: shows pushed notices, opens the right page
// when one is tapped, and keeps the last loaded shell for when the network drops.
const CACHE = 'vp-shell-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

// Network first for the app's own files; the cache is only a fallback. API calls are never cached.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      if (res.ok) { const c = await caches.open(CACHE); c.put(e.request, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});

// Payloads are Declarative Web Push JSON ({web_push: 8030, notification: {...}}); iOS 18.4+ can show
// them without this worker, everything else lands here. Every push must show a notification.
self.addEventListener('push', e => {
  let n = { title: 'Project update', body: '', navigate: self.registration.scope, tag: '' };
  try { const d = e.data ? e.data.json() : {}; n = { ...n, ...(d.notification || d) }; } catch (_) {}
  e.waitUntil((async () => {
    await self.registration.showNotification(n.title, {
      body: n.body || '',
      tag: n.tag || undefined,
      renotify: !!n.tag,
      icon: self.registration.scope + 'icon-192.png',
      badge: self.registration.scope + 'icon-192.png',
      data: { url: n.navigate || n.url || self.registration.scope },
    });
    // Any open page of the app refreshes itself so the new state is already there.
    for (const w of await self.clients.matchAll({ type: 'window' })) w.postMessage({ type: 'refresh', title: n.title });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || self.registration.scope, self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) { await w.focus(); return w.navigate(url).catch(() => w.postMessage({ type: 'refresh' })); }
    }
    return self.clients.openWindow(url);
  })());
});
