/* BabySteps by Guide — service worker (makes the site installable, fast on repeat visits, and graceful offline).
 *
 * Rules (safety first):
 *  - Never cached: anything that isn't a GET, /api/*, admin, accounts, client galleries, payments. Always live.
 *  - Pages: network first (fresh content and correct SEO tags), cached copy only when offline, else offline.html.
 *  - /assets/* (hashed by the build, never change): cache first.
 *  - Photos and icons: cache first, refreshed in the background, capped in size.
 *  - Google Fonts: cache first.
 * Bump VERSION to force every visitor onto a fresh cache.
 */
const VERSION = 'bs-v2';
const PRIVATE = [/^\/api\//, /^\/admin(\/|$)/, /^\/account(\/|$)/, /^\/client(\/|$)/, /^\/sw\.js$/];
const PRECACHE = ['/offline.html', '/icon-192.png', '/icon-512.png', '/logo.png'];
const C = { pages: `${VERSION}-pages`, assets: `${VERSION}-assets`, images: `${VERSION}-images`, fonts: `${VERSION}-fonts`, core: `${VERSION}-core` };
const LIMITS = { pages: 40, images: 160 };

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(C.core).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!key.startsWith(`${VERSION}-`)) await caches.delete(key);
    // make sure the offline page & icons are there (storage can be cleared by the phone at any time)
    await caches.open(C.core).then((c) => c.addAll(PRECACHE)).catch(() => {});
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

// Last-resort page if even offline.html is missing from the cache.
const OFFLINE_FALLBACK = () => new Response(
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>'
  + '<body style="margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:24px">'
  + '<div><h1 style="font-weight:400">You’re offline</h1><p>Check your connection and try again.</p>'
  + '<button onclick="location.reload()" style="padding:12px 22px;border:0;background:#222;color:#fff">Try again</button></div>',
  { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
);
const offline = async () => (await caches.match('/offline.html')) || OFFLINE_FALLBACK();

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
}

// Copy the response *synchronously* (before the page starts reading it), then store the copy.
function put(name, req, res, max) {
  if (!res || !res.ok || res.type === 'opaqueredirect') return;
  const copy = res.clone();
  caches.open(name).then((cache) => cache.put(req, copy)).then(() => max && trim(name, max)).catch(() => {});
}

async function page(event) {
  const { request } = event;
  try {
    const preload = await event.preloadResponse;
    const res = preload || await fetch(request);
    if (res.ok && res.headers.get('content-type')?.includes('text/html')) put(C.pages, request, res, LIMITS.pages);
    return res;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || offline();
  }
}

async function cacheFirst(name, request, max) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  put(name, request, res, max);
  return res;
}

async function staleWhileRevalidate(name, request, max) {
  const hit = await caches.match(request);
  const fresh = fetch(request).then((res) => { put(name, request, res, max); return res; }).catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (PRIVATE.some((rx) => rx.test(url.pathname))) {
      // Private areas: always live; only show the offline page if the network is down.
      if (request.mode === 'navigate') event.respondWith(fetch(request).catch(offline));
      return;
    }
    if (request.mode === 'navigate') return event.respondWith(page(event));
    if (url.pathname.startsWith('/assets/')) return event.respondWith(cacheFirst(C.assets, request));
    if (request.destination === 'image' || /^\/(images|uploads)\//.test(url.pathname) || /^\/(icon-|favicon|monogram|logo)/.test(url.pathname)) {
      return event.respondWith(staleWhileRevalidate(C.images, request, LIMITS.images));
    }
    return; // everything else (sitemap, manifest, …) straight from the network
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(C.fonts, request));
  }
});
