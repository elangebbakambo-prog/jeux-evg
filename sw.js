// L'appli « Vegas EVG » (carnet + jeux) : toujours la dernière version quand il y a du réseau,
// la copie gardée sinon. Les jeux sur un seul téléphone sont gardés d'avance, pour jouer dans l'avion.
const CACHE = "vegas-evg-v4";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./vegas/",
  "./vegas/index.html",
  "./vegas/icon-180.png",
  "./vegas/icon-192.png",
  "./vegas/icon-512.png",
  "./mafia-pas-mafia/",
  "./mafia-pas-mafia/index.html",
  "./mafia-pas-mafia/style.css?v=20261105a",
  "./commun/menu.css?v=20261105a",
  "./mafia-pas-mafia/donnees.js?v=20261105a",
  "./commun/musique.js?v=20261105a",
  "./mafia-pas-mafia/script.js?v=20261105a",
  "./draft-des-anciens/",
  "./draft-des-anciens/index.html",
  "./draft-des-anciens/style.css?v=20261105a",
  "./draft-des-anciens/cartes.js?v=20261105a",
  "./draft-des-anciens/script.js?v=20261105a",
  "./qui-a-dit-ca/",
  "./qui-a-dit-ca/index.html",
  "./qui-a-dit-ca/style.css?v=20261104b",
  "./commun/menu.css?v=20261104b",
  "./qui-a-dit-ca/script.js?v=20261104b"
];
self.addEventListener("install", e => {
  // Chaque fichier séparément : un seul raté ne doit pas empêcher de garder les autres.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
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
    }).catch(async () => {
      const hit = await caches.match(req) || await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") {
        const page = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname + "/index.html";
        return (await caches.match(page, { ignoreSearch: true })) || (await caches.match("./vegas/index.html")) || Response.error();
      }
      return Response.error();
    })
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
  // On garde la destination : l'appli la relit en s'ouvrant (sur iPhone, le message ci-dessous n'arrive pas toujours).
  const keep = caches.open("vegas-goto").then(c => c.put("goto", new Response(JSON.stringify({ url, t:Date.now() }), { headers:{ "Content-Type":"application/json" } }))).catch(() => {});
  e.waitUntil(keep.then(() => self.clients.matchAll({ type:"window", includeUncontrolled:true })).then(list => {
    const app = list.find(c => c.url.includes("/vegas/"));
    if(app){ app.postMessage({ goto:url }); return app.focus ? app.focus().catch(() => self.clients.openWindow(url)) : null; }
    return self.clients.openWindow(url);
  }));
});
