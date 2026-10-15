/* San Giorgio — service worker
   Fa una cosa sola: tenere in cache i file dell'app perché funzioni senza
   rete. Non intercetta nient'altro, non ha accesso ai dati (che stanno
   cifrati in IndexedDB) e non parla con nessun indirizzo esterno. */

var CACHE = "san-giorgio-v1";
var FILE = [
  ".", "index.html", "app.css", "vendor.js", "app.js", "manifest.webmanifest",
  "icone/icona-180.png", "icone/icona-192.png", "icone/icona-512.png",
  "icone/icona-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (k) {
      return Promise.all(k.filter(function (n) { return n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  /* solo richieste GET a questa stessa origine: tutto il resto non ci riguarda */
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
        }
        return res;
      }).catch(function () {
        return caches.match("index.html");
      });
    })
  );
});
