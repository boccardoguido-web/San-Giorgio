/* ==========================================================================
   San Giorgio — cassaforte locale
   I dati non lasciano mai il dispositivo e sull'archivio del browser stanno
   cifrati. La chiave si ricava dalla passphrase e vive solo in memoria: chiusa
   l'app, per rileggere i dati serve di nuovo la passphrase.

   Cifratura:  AES-GCM 256 bit (autenticata: una passphrase sbagliata non
               "decifra male", fallisce)
   Chiave:     PBKDF2-SHA256, sale casuale da 16 byte, iterazioni nell'involucro
   Archivio:   IndexedDB, un solo record, contenuto illeggibile senza chiave
   ========================================================================== */

var VAULT_DB = "sangiorgio";
var VAULT_STORE = "vault";
var VAULT_KEY = "main";
var VAULT_ITER = 600000;

/* ------------------------------ IndexedDB --------------------------------- */

function idbOpen() {
  return new Promise(function (res, rej) {
    if (!self.indexedDB) return rej(new Error("Questo browser non offre un archivio locale."));
    var req = indexedDB.open(VAULT_DB, 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE);
    };
    req.onsuccess = function () { res(req.result); };
    req.onerror = function () { rej(req.error || new Error("Archivio locale non accessibile.")); };
  });
}

function idbGet(key) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(VAULT_STORE, "readonly");
      var rq = tx.objectStore(VAULT_STORE).get(key);
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  });
}

function idbPut(key, val) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(VAULT_STORE, "readwrite");
      tx.objectStore(VAULT_STORE).put(val, key);
      tx.oncomplete = function () { res(true); };
      tx.onerror = function () { rej(tx.error); };
    });
  });
}

function idbDel(key) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(VAULT_STORE, "readwrite");
      tx.objectStore(VAULT_STORE).delete(key);
      tx.oncomplete = function () { res(true); };
      tx.onerror = function () { rej(tx.error); };
    });
  });
}

/* ------------------------------ cifratura --------------------------------- */

function cryptoOk() {
  return !!(self.crypto && self.crypto.subtle && self.crypto.getRandomValues);
}

function derivaChiave(passphrase, salt, iter) {
  return crypto.subtle
    .importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"])
    .then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: iter, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false, /* non estraibile: la chiave non può essere letta dal codice */
        ["encrypt", "decrypt"]
      );
    });
}

function cifra(chiave, oggetto) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var dati = new TextEncoder().encode(JSON.stringify(oggetto));
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, chiave, dati).then(function (ct) {
    return { iv: iv, ct: new Uint8Array(ct) };
  });
}

function decifra(chiave, iv, ct) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, chiave, ct).then(function (buf) {
    return JSON.parse(new TextDecoder().decode(buf));
  });
}

/* ---------------------------- la cassaforte ------------------------------- */

var Vault = {
  chiave: null,
  involucro: null,

  /* esiste già una cassaforte su questo dispositivo? */
  esiste: function () {
    return idbGet(VAULT_KEY).then(function (v) {
      return !!(v && v.ct);
    }).catch(function () { return false; });
  },

  /* chiede al browser di non sfrattare i dati alla prima pulizia */
  chiediPersistenza: function () {
    try {
      if (navigator.storage && navigator.storage.persist) return navigator.storage.persist();
    } catch (e) { /* non supportato: si continua */ }
    return Promise.resolve(false);
  },

  /* prima apertura: crea la cassaforte con i dati iniziali */
  crea: function (passphrase, dati) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var self_ = this;
    return derivaChiave(passphrase, salt, VAULT_ITER).then(function (k) {
      return cifra(k, dati).then(function (c) {
        var inv = { v: 1, salt: salt, iter: VAULT_ITER, iv: c.iv, ct: c.ct, agg: new Date().toISOString() };
        return idbPut(VAULT_KEY, inv).then(function () {
          self_.chiave = k;
          self_.involucro = inv;
          return dati;
        });
      });
    });
  },

  /* apre la cassaforte; una passphrase sbagliata fa fallire l'autenticazione */
  apri: function (passphrase) {
    var self_ = this;
    return idbGet(VAULT_KEY).then(function (inv) {
      if (!inv || !inv.ct) throw new Error("vuota");
      return derivaChiave(passphrase, inv.salt, inv.iter || VAULT_ITER).then(function (k) {
        return decifra(k, inv.iv, inv.ct).then(function (dati) {
          self_.chiave = k;
          self_.involucro = inv;
          return dati;
        }).catch(function () {
          throw new Error("passphrase");
        });
      });
    });
  },

  /* salva: richiede la cassaforte aperta */
  salva: function (dati) {
    var self_ = this;
    if (!this.chiave) return Promise.reject(new Error("chiusa"));
    return cifra(this.chiave, dati).then(function (c) {
      var inv = Object.assign({}, self_.involucro, { iv: c.iv, ct: c.ct, agg: new Date().toISOString() });
      return idbPut(VAULT_KEY, inv).then(function () {
        self_.involucro = inv;
        return true;
      });
    });
  },

  /* cambia passphrase ricifrando lo stesso contenuto */
  cambiaPassphrase: function (nuova, dati) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var self_ = this;
    return derivaChiave(nuova, salt, VAULT_ITER).then(function (k) {
      return cifra(k, dati).then(function (c) {
        var inv = { v: 1, salt: salt, iter: VAULT_ITER, iv: c.iv, ct: c.ct, agg: new Date().toISOString() };
        return idbPut(VAULT_KEY, inv).then(function () {
          self_.chiave = k;
          self_.involucro = inv;
          return true;
        });
      });
    });
  },

  chiudi: function () { this.chiave = null; },

  distruggi: function () {
    this.chiave = null;
    this.involucro = null;
    return idbDel(VAULT_KEY);
  },

  /* copia di sicurezza: l'involucro cifrato, così com'è. Senza la passphrase
     il file non dice nulla, quindi può stare in iCloud o nei File. */
  esportaCifrato: function () {
    return idbGet(VAULT_KEY).then(function (inv) {
      if (!inv || !inv.ct) throw new Error("vuota");
      return {
        sangiorgio: "backup-cifrato",
        v: 1,
        iter: inv.iter || VAULT_ITER,
        salt: b64(inv.salt),
        iv: b64(inv.iv),
        ct: b64(inv.ct),
        agg: inv.agg,
      };
    });
  },

  /* ripristino da copia cifrata: serve la passphrase di quando fu creata */
  importaCifrato: function (file, passphrase) {
    var self_ = this;
    var salt = unb64(file.salt), iv = unb64(file.iv), ct = unb64(file.ct);
    return derivaChiave(passphrase, salt, file.iter || VAULT_ITER).then(function (k) {
      return decifra(k, iv, ct).then(function (dati) {
        var inv = { v: 1, salt: salt, iter: file.iter || VAULT_ITER, iv: iv, ct: ct, agg: new Date().toISOString() };
        return idbPut(VAULT_KEY, inv).then(function () {
          self_.chiave = k;
          self_.involucro = inv;
          return dati;
        });
      }).catch(function () { throw new Error("passphrase"); });
    });
  },
};

/* base64 senza passare da stringhe enormi in una sola volta */
function b64(u8) {
  var a = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8);
  var s = "";
  for (var i = 0; i < a.length; i += 8192) {
    s += String.fromCharCode.apply(null, a.subarray(i, i + 8192));
  }
  return btoa(s);
}

function unb64(str) {
  var s = atob(str);
  var a = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

/* ------------------------- forma dei dati salvati ------------------------- */

function datiVuoti() {
  return {
    v: 1,
    rows: [],          /* posizioni dell'ultimo export */
    asOf: "",          /* data della situazione */
    snapshots: [],     /* serie storica, con prezzi per quota */
    holdings: {},      /* composizioni dei fondi */
    opz: {             /* preferenze */
      zainetto: 0,      /* da impostare nel simulatore: è un dato personale */
      sogliaUsd: 45,
      proxySP: false,
      usdOverride: {},
      betaOverride: {},
      minutiBlocco: 5,
    },
  };
}

/* unisce i dati letti con la forma attesa: una versione vecchia del file non
   deve far esplodere l'app, le chiavi mancanti prendono il valore iniziale */
function normalizzaDati(d) {
  var base = datiVuoti();
  if (!d || typeof d !== "object") return base;
  return {
    v: 1,
    rows: Array.isArray(d.rows) ? d.rows : [],
    asOf: typeof d.asOf === "string" ? d.asOf : "",
    snapshots: Array.isArray(d.snapshots) ? d.snapshots : [],
    holdings: d.holdings && typeof d.holdings === "object" ? d.holdings : {},
    opz: Object.assign(base.opz, d.opz && typeof d.opz === "object" ? d.opz : {}),
  };
}
