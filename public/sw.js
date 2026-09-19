// Islamic Website service worker. Cache-first for content (Quran, duas, tutorials),
// stale-while-revalidate for audio, network-first for prayer-times pages.
// Kept small and dependency-free.

const CACHE = "iw-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  "/",
  "/quran",
  "/duas",
  "/prayer-times",
  "/qibla",
  "/learn-salah",
  "/names-of-allah",
  "/calendar",
  "/tools",
  "/offline",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Audio: stale-while-revalidate.
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

  // Same-origin navigations: network-first, fall back to cache or offline page.
  if (url.origin === self.location.origin && req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Static assets: cache-first.
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
