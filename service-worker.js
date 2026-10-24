/* Atomic install: an incomplete cache never replaces a working offline version. */
importScripts('offline-assets.js');
const CACHE = OfflineAssets.version;
const absolute = asset => new URL(asset, self.registration.scope).href;
async function populate() {
  const cache = await caches.open(CACHE);
  try {
    await Promise.all(OfflineAssets.assets.map(async asset => {
      const url = absolute(asset);
      let response;
      try { response = await fetch(url, { cache: 'reload' }); if (!response.ok) throw new Error('HTTP ' + response.status); }
      catch (error) {
        // The identical vendored copy keeps offline setup working when a CDN is blocked.
        if (!asset.startsWith('https://cdnjs.cloudflare.com/')) throw error;
        response = await fetch(absolute('vendor/lz-string.min.js'), { cache: 'reload' });
        if (!response.ok) throw new Error('Compression library unavailable.');
      }
      await cache.put(url, response);
    }));
  } catch (error) { await caches.delete(CACHE); throw error; }
}
self.addEventListener('install', event => event.waitUntil(populate()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  // Older page clients can continue using their matching assets until they reload.
  const names = await caches.keys();
  for (const name of names) if (name.startsWith('gnuplot-') && name !== CACHE) await caches.delete(name);
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && !OfflineAssets.assets.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Query strings carry documents or version tags, never change the static bytes.
    const key = url.origin === self.location.origin ? url.origin + url.pathname : url.href;
    const navigation = event.request.mode === 'navigate';
    let cached = await cache.match(key);
    if (!cached && navigation && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'))) cached = await cache.match(absolute('index.html'));
    if (cached) return cached;
    return fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'activate-update') { self.skipWaiting(); return; }
  if (!['offline-status', 'repair-offline'].includes(event.data?.type)) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'repair-offline') await populate();
      const cache = await caches.open(CACHE);
      const entries = await Promise.all(OfflineAssets.assets.map(asset => cache.match(absolute(asset))));
      event.ports[0]?.postMessage({ ready: entries.every(Boolean), version: CACHE });
    } catch (_) { event.ports[0]?.postMessage({ ready: false }); }
  })());
});
