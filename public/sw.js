// Islamic Website service worker. Cache-first for content (Quran, duas, tutorials),
// stale-while-revalidate for audio, network-first for HTML navigations.
// Kept small and dependency-free.
//
// Bump CACHE when the precache list or fetch strategy changes — old caches are
// deleted on activate. Users get the new SW on their next visit (30s+ engagement)
// or immediately if they close and reopen the app.

const CACHE = "iw-v4";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  // English (default) core routes
  "/",
  "/quran",
  "/duas",
  "/prayer-times",
  "/qibla",
  "/learn-salah",
  "/names-of-allah",
  "/calendar",
  "/tools",
  "/hadith",
  "/seerah",
  "/hajj",
  "/ramadan",
  "/reverts",
  "/memorize",
  "/iqamah",
  "/install",
  "/account",
  "/offline",
  // Other locale roots — instant offline home for every language
  "/id",
  "/ar",
  "/ur",
  "/tr",
  "/fr",
  // App-shell essentials
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Use individual add() calls so one 404 doesn't abort the whole precache.
      .then((c) =>
        Promise.all(
          PRECACHE.map((url) =>
            c.add(new Request(url, { cache: "reload" })).catch(() => {
              // A missing route shouldn't prevent SW install.
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Extract the locale prefix from a same-origin path so we can pick a locale-aware
// offline fallback (e.g. /ar/... → /ar/offline). Returns null for the default locale.
function localeFromPath(pathname) {
  const m = pathname.match(/^\/(id|ar|ur|tr|fr)(\/|$)/);
  return m ? m[1] : null;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Audio (CDN): stale-while-revalidate.
  if (url.hostname === "cdn.islamic.network") {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
    return;
  }

  // Same-origin HTML navigations: network-first, fall back to cached copy of the
  // page, then to the locale-appropriate offline placeholder.
  if (url.origin === self.location.origin && req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const locale = localeFromPath(url.pathname);
          const offlinePath = locale ? `/${locale}/offline` : OFFLINE_URL;
          return (
            (await caches.match(offlinePath)) ||
            (await caches.match(OFFLINE_URL)) ||
            new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } })
          );
        }),
    );
    return;
  }

  // Static assets (same-origin): cache-first.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res.ok && url.origin === self.location.origin) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached ?? new Response("", { status: 504 })),
    ),
  );
});

// Allow the page to force-activate a new SW (used by the "New version available"
// banner if we add one later).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
