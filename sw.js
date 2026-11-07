// L'appli « Vegas EVG » (carnet + jeux) : toujours la dernière version quand il y a du réseau,
// la copie gardée sinon (le carnet s'ouvre même dans le désert).
const CACHE = "vegas-evg-v3";
const FILES = ["./vegas/", "./vegas/index.html", "./manifest.webmanifest", "./vegas/icon-180.png", "./vegas/icon-192.png", "./vegas/icon-512.png", "./"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonts = url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com";
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || caches.match("./vegas/index.html")))
  );
});

// Notifications : la base envoie { title, body, tag, url } ; un tap ouvre l'appli sur le Live.
self.addEventListener("push", e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Vegas EVG", {
    body: d.body || "Il se passe un truc sur le Live !",
    icon: "vegas/icon-192.png", badge: "vegas/icon-192.png",
    tag: d.tag || "evg", renotify: true,
    data: { url: d.url || new URL("vegas/#live", self.registration.scope).href }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || new URL("vegas/#live", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const app = list.find(c => c.url.includes("/vegas/"));
    if(app){ app.postMessage({ goto: "live" }); return app.focus(); }
    return self.clients.openWindow(url);
  }));
});
