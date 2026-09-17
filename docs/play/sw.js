// Offline-first service worker for the PWA build.
//
// This file is the TEMPLATE. `tools/precache.mjs` runs after `vite build`, walks
// dist/, and rewrites the two marked lines below in dist/sw.js with a real cache
// name (hashed from the file list) and the full list of files to precache. Don't
// hand-edit those two lines — edit this file's behavior, not its generated data.
const CACHE = 'islamabad-runner-9896db2250';
const PRECACHE = ["./assets/main-B7YYE50i.css","./assets/main-BRADjJ0U.js","./draco/draco_decoder.js","./draco/draco_decoder.wasm","./draco/draco_wasm_wrapper.js","./icons/icon-192.png","./icons/icon-512.png","./index.html","./manifest.webmanifest","./models/biker.glb","./models/pickups.glb","./models/props.glb","./models/ranger.glb","./models/scenery.glb","./privacy.html"];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const net = await fetch(req);
      if (net && net.ok) cache.put(req, net.clone());
      return net;
    } catch (err) {
      // Offline and not in cache: navigations fall back to the app shell so a
      // deep link / reload still boots the game instead of showing a browser error.
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
