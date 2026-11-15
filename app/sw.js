/* Trucks2U offline support.
   Network first: with signal you always get the newest version (so a push to GitHub shows up right away);
   with no signal (job sites!) the app opens from the last copy saved on the phone. */
const CACHE = "trucks2u-v3";
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

  // "no-cache" = always check with the server (a quick "has it changed?"), so a refresh never shows an old version.
  // Without it the browser can reuse its own copy for up to 10 minutes after a push.
  e.respondWith(
    (sameOrigin ? fetch(req.mode === "navigate" ? req.url : req, { cache: "no-cache" }) : fetch(req))
      .then(res => {
        if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      })
      .catch(() => caches.match(key).then(hit => hit || caches.match("./")))
  );
});

// Phone notifications. The push server sends { title, body, url, tag }; tapping one opens that screen.
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Trucks2U", {
    body: d.body || "", icon: "icons/icon-192.png", badge: "icons/favicon-32.png", tag: d.tag || undefined, data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.registration.scope));
    return open ? open.navigate(url).then(c => (c || open).focus()) : self.clients.openWindow(url);
  }));
});
