/* San Giorgio — service worker
   Fa una cosa sola: tenere in cache i file dell'app perché funzioni senza
   rete. Non intercetta nient'altro, non ha accesso ai dati (che stanno
   cifrati in IndexedDB) e non parla con nessun indirizzo esterno. */

var CACHE = "san-giorgio-d01c5b053a5a";

/* Essenziali: senza questi l'app non parte, quindi se uno manca l'installazione
   deve fallire e vale la pena saperlo. */
var ESSENZIALI = ["index.html", "app.css", "vendor.js", "app.js"];

/* Accessori: icone e manifesto. Se mancano, l'app funziona lo stesso — e
   soprattutto continua a funzionare offline. Qui sta la differenza con
   cache.addAll(), che fallisce in blocco al primo file assente e lascia
   l'installazione a metà senza dirlo. */
var ACCESSORI = [
  ".", "manifest.webmanifest",
  "icona-180.png", "icona-192.png", "icona-512.png", "icona-maskable-512.png",
];

function metti(cache, url) {
  return fetch(new Request(url, { cache: "reload" })).then(function (res) {
    if (!res || !res.ok) throw new Error(url);
    return cache.put(url, res);
  });
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ESSENZIALI.map(function (u) { return metti(c, u); }))
        .then(function () {
          /* gli accessori si provano, ma un fallimento non ferma nulla */
          return Promise.allSettled(ACCESSORI.map(function (u) { return metti(c, u); }));
        });
    }).then(function () { return self.skipWaiting(); })
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
        /* offline e non in cache: per una navigazione si torna alla pagina */
        if (e.request.mode === "navigate") return caches.match("index.html");
        return Response.error();
      });
    })
  );
});
