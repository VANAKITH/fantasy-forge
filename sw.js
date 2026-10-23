// Offline support. Caches the site's own files after the first visit.
// Network first, so edits to pools.json show up as soon as you're online;
// the cache is only used when the network fails or is too slow.
// Stores nothing about the user.

const CACHE = 'story-forge-v1';
const NETWORK_TIMEOUT_MS = 4000;
const PRECACHE = [
  './',
  'index.html',
  'favicon.svg',
  'content/pools.json',
  'src/main.js',
  'src/content.js',
  'src/random.js',
  'src/render.js',
  'src/symbols.js',
  'src/styles.css',
  'fonts/cormorant-garamond-latin-wght-normal.woff2',
  'fonts/source-serif-4-latin-wght-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ??
      (request.mode === 'navigate' ? await cache.match('index.html') : undefined);
    return cached ?? Response.error();
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
