/* Compila i sorgenti in app.js e mette insieme vendor.js.
   Uso: npm install && npm run build

   I sorgenti sono i sei file numerati qui nella radice, compilati in
   quest'ordine. Stanno nella radice e non in una cartella perché il
   caricamento via web di GitHub non gestisce le sottocartelle. */
const fs = require("fs"), babel = require("@babel/core");
const B = __dirname, N = __dirname + "/node_modules";

const SORGENTI = [
  "01-engine.js",   // tavolozza, anagrafica strumenti, scenari, lettura export
  "02-vault.js",    // archivio cifrato su IndexedDB
  "03-app.jsx",     // componenti di base e grafici
  "04-derive.js",   // tutti i calcoli derivati dal portafoglio
  "05-screens.jsx", // le schermate
  "06-root.jsx",    // App(): ciclo di vita, blocco, navigazione
];

const mancanti = SORGENTI.filter(f => !fs.existsSync(B + "/" + f));
if (mancanti.length) {
  console.error("sorgenti mancanti: " + mancanti.join(", "));
  process.exit(1);
}

fs.writeFileSync(B + "/vendor.js", [
  N + "/react/umd/react.production.min.js",
  N + "/react-dom/umd/react-dom.production.min.js",
  N + "/xlsx/dist/xlsx.full.min.js",
].map(f => fs.readFileSync(f, "utf8")).join("\n;\n"));

const sorgente = SORGENTI
  .map(f => "/* ===== " + f + " ===== */\n" + fs.readFileSync(B + "/" + f, "utf8"))
  .join("\n");

fs.writeFileSync(B + "/app.js", babel.transformSync(sorgente, {
  presets: [[require.resolve("@babel/preset-react"), { runtime: "classic" }]],
  compact: false,
}).code);

/* Marchia il service worker con l'impronta dei file serviti.
   Senza questo l'app non si aggiorna mai: il service worker preferisce la
   cache alla rete, e il browser lo sostituisce solo se sw.js stesso cambia.
   Se resta identico, la versione nuova non arriva sul dispositivo. */
const crypto = require("crypto");
const impronta = crypto.createHash("sha256");
["index.html", "app.css", "vendor.js", "app.js"].forEach(f => {
  impronta.update(fs.readFileSync(B + "/" + f));
});
const ver = impronta.digest("hex").slice(0, 12);

const sw = fs.readFileSync(B + "/sw.js", "utf8");
const swNuovo = sw.replace(/var CACHE = "san-giorgio-[^"]*";/,
  'var CACHE = "san-giorgio-' + ver + '";');
if (swNuovo === sw && !sw.includes('san-giorgio-' + ver)) {
  console.error("non riesco a marchiare sw.js: riga 'var CACHE' non trovata");
  process.exit(1);
}
fs.writeFileSync(B + "/sw.js", swNuovo);

const kb = p => (fs.statSync(p).size / 1024).toFixed(0) + "KB";
console.log("vendor.js " + kb(B + "/vendor.js") + "  app.js " + kb(B + "/app.js")
  + "  cache " + ver);
