/* Trucks2U offline support.
   Network first: with signal you always get the newest version (so a push to GitHub shows up right away);
   with no signal (job sites!) the app opens from the last copy saved on the phone. */
const CACHE = "trucks2u-v1";
const SHELL = ["./", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !isFont) return;

  // The app page itself: ignore the ?v=... cache-buster so one saved copy serves every visit
  const key = req.mode === "navigate" ? new Request(new URL("./", self.registration.scope)) : req;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      })
      .catch(() => caches.match(key).then(hit => hit || caches.match("./")))
  );
});
