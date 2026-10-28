/* Atomic install: an incomplete cache never replaces a working offline version. */
importScripts('offline-assets.js');
const CACHE = OfflineAssets.version;
const absolute = asset => new URL(asset, self.registration.scope).href;
const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', wasm: 'application/wasm', webmanifest: 'application/manifest+json' };
const type = url => types[/\.([a-z]+)$/.exec(new URL(url).pathname)?.[1]] || 'text/plain';
const assetHash = url => OfflineAssets.hashes[url] || (url.startsWith(self.registration.scope) ? OfflineAssets.hashes[url.slice(self.registration.scope.length)] : undefined);
// Cache Storage is shared by every app on this origin, so bytes are checked against the manifest before they are stored or served.
async function verified(response, url) {
  const expected = assetHash(url);
  if (!response?.ok || !expected) return null;
  const body = await response.arrayBuffer();
  if (hex(await crypto.subtle.digest('SHA-256', body)) !== expected) return null;
  return new Response(body, { status: 200, headers: { 'Content-Type': type(url) } });
}
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
      const checked = await verified(response, url);
      if (!checked) throw new Error('Offline download did not match its manifest: ' + asset);
      await cache.put(url, checked);
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
    const entry = !assetHash(key) && navigation && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) ? absolute('index.html') : key;
    const cached = await verified(await cache.match(entry), entry);
    if (cached) return cached;
    // A missing or altered entry is never served; offline status reports it until repaired.
    await cache.delete(entry);
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
      const entries = await Promise.all(OfflineAssets.assets.map(async asset => verified(await cache.match(absolute(asset)), absolute(asset))));
      event.ports[0]?.postMessage({ ready: entries.every(Boolean), version: CACHE });
    } catch (_) { event.ports[0]?.postMessage({ ready: false }); }
  })());
});
