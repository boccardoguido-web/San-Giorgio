/* ==========================================================================
   San Giorgio — motore analitico
   Nessun dato personale in questo file: solo anagrafica degli strumenti,
   ipotesi dichiarate e matematica. Le posizioni arrivano dall'export, che
   resta sul dispositivo.
   ========================================================================== */

/* I colori stanno nel foglio di stile, che li cambia da solo col tema scuro.
   Qui dentro però servono come valori veri: negli attributi SVG (fill, stroke)
   la funzione var() non viene risolta da Safari, quindi una banda colorata con
   "var(--cobalt)" resterebbe nera. Si leggono una volta all'avvio e a ogni
   cambio di tema, e restano gli stessi oggetti perché le tabelle qui sotto li
   referenziano. I valori di partenza sono il tema chiaro, nel caso la lettura
   non risponda. */

var T = {
  ground: "#e7e9e1", card: "#f5f6f1", sunk: "#dde0d6",
  ink: "#191d17", ink2: "#3d423a", muted: "#6c7167",
  rule: "#c7cbbf", ruleSoft: "#d6dacd",
  red: "#b23a2c", green: "#2e6b4f", brass: "#a8811f", brassDark: "#8c6b14",
  cobalt: "#2b4e86", clay: "#a65a3c", teal: "#3e7a78", slate: "#8a8f82",
  plum: "#6b4e8f", onFill: "#ffffff", barBg: "rgba(43,78,134,.26)",
};

var VAR_CSS = {
  ground: "--ground", card: "--card", sunk: "--sunk", ink: "--ink", ink2: "--ink2",
  muted: "--muted", rule: "--rule", ruleSoft: "--rule-soft", red: "--red",
  green: "--green", brass: "--brass", brassDark: "--brass-dark", cobalt: "--cobalt",
  clay: "--clay", teal: "--teal", slate: "--slate", plum: "--plum",
  onFill: "--on-fill", barBg: "--bar-bg",
};

var CLASS_COLOR = {
  Azionario: T.cobalt,
  "Obblig. HY": T.clay,
  "Obblig. IG": T.teal,
  Oro: T.brass,
  "Liquidità": T.slate,
};

/* rilegge i colori dal foglio di stile e aggiorna le tabelle sul posto */
function sincronizzaTema() {
  try {
    var cs = getComputedStyle(document.documentElement);
    Object.keys(VAR_CSS).forEach(function (k) {
      var v = cs.getPropertyValue(VAR_CSS[k]).trim();
      if (v) T[k] = v;
    });
  } catch (e) { /* si tengono i valori di partenza */ }
  CLASS_COLOR.Azionario = T.cobalt;
  CLASS_COLOR["Obblig. HY"] = T.clay;
  CLASS_COLOR["Obblig. IG"] = T.teal;
  CLASS_COLOR.Oro = T.brass;
  CLASS_COLOR["Liquidità"] = T.slate;
  if (typeof AI_TIER !== "undefined") {
    AI_TIER.t1.col = T.red;
    AI_TIER.t2.col = T.clay;
    AI_TIER.t3.col = T.brass;
    AI_TIER.spec.col = T.plum;
    AI_TIER.resto.col = T.cobalt;
    AI_TIER.dif.col = T.green;
  }
}

var CLASS_ORDER = ["Azionario", "Obblig. HY", "Obblig. IG", "Oro", "Liquidità"];

/* ------------------------------ anagrafica -------------------------------- */
/* usd    = quota di esposizione economica in dollari (look-through, non la
            valuta di negoziazione)
   reg    = ripartizione geografica dell'azionario sottostante
   tax    = trattamento della plusvalenza: "diversi" compensa lo zainetto
            fiscale, "capitale" no
   rate   = aliquota sulla plusvalenza
   ai     = quote per canale di esposizione alla tesi AI, dalle composizioni
            reali. Ricalcolate dal vivo quando i file dei gestori sono
            caricati; questi valori sono il ripiego.
   pinned = titolo a ridosso del rimborso: prezzo ancorato alla pari.         */

var BOOK = {
  IE00B4L5Y983: { n: "iShares Core MSCI World", t: "SWDA", c: "Azionario", usd: 0.7257, reg: { US: 0.7213, EU: 0.145, JP: 0.0587, ALTRO: 0.075 }, tax: "capitale", rate: 0.26,
    ai: { t1: 0.1341, t2: 0.2128, t3: 0.0235, spec: 0, dif: 0.1817, resto: 0.4479 } },
  XS2427355958: { n: "WisdomTree S&P 500", t: "WSPX", c: "Azionario", usd: 1.0, reg: { US: 1 }, tax: "diversi", rate: 0.26,
    ai: { t1: 0.1715, t2: 0.2946, t3: 0.0211, spec: 0, dif: 0.1733, resto: 0.3395 } },
  XS2427362145: { n: "WisdomTree EURO STOXX 50", t: "WS5X", c: "Azionario", usd: 0.0, reg: { EU: 1 }, tax: "diversi", rate: 0.26,
    ai: { t1: 0.1005, t2: 0, t3: 0.0687, spec: 0, dif: 0, resto: 0.8308 } },
  IE000YU9K6K2: { n: "VanEck Space Innovators", t: "JEDI", c: "Azionario", usd: 0.671, reg: { US: 0.671, EU: 0.091, JP: 0.065, ALTRO: 0.173 }, tax: "capitale", rate: 0.26,
    ai: { t1: 0, t2: 0, t3: 0, spec: 1, dif: 0, resto: 0 } },
  IE00BF2B0L69: { n: "Franklin Euro Quality Dividend", t: "FLXD", c: "Azionario", usd: 0.0, reg: { EU: 1 }, tax: "capitale", rate: 0.26,
    ai: { t1: 0, t2: 0, t3: 0, spec: 0, dif: 0, resto: 1 } },
  IE0003R87OG3: { n: "Avantis Global Small Cap Value", t: "AVWS", c: "Azionario", usd: 0.63, reg: { US: 0.63, EU: 0.1, JP: 0.098, ALTRO: 0.172 }, tax: "capitale", rate: 0.26,
    ai: { t1: 0, t2: 0, t3: 0.0001, spec: 0, dif: 0, resto: 0.9999 } },
  US09290D1019: { n: "BlackRock Inc.", t: "BLK", c: "Azionario", usd: 1.0, reg: { US: 1 }, tax: "diversi", rate: 0.26, az: true,
    ai: { t1: 0, t2: 1, t3: 0, spec: 0, dif: 0, resto: 0 } },
  IT0005366767: { n: "Nexi", t: "NEXI", c: "Azionario", usd: 0.0, reg: { EU: 1 }, tax: "diversi", rate: 0.26, az: true,
    ai: { t1: 0, t2: 0, t3: 0, spec: 0, dif: 0, resto: 1 } },
  DE000PAH0038: { n: "Porsche Automobil Holding", t: "PAH3", c: "Azionario", usd: 0.0, reg: { EU: 1 }, tax: "diversi", rate: 0.26, az: true,
    ai: { t1: 0, t2: 0, t3: 0, spec: 0, dif: 0, resto: 1 } },
  ES0127797019: { n: "EDP Renewables", t: "EDPR", c: "Azionario", usd: 0.0, reg: { EU: 1 }, tax: "diversi", rate: 0.26, az: true,
    ai: { t1: 0, t2: 0, t3: 0, spec: 0, dif: 0, resto: 1 } },
  IE00B7N3YW49: { n: "PIMCO US Short-Term HY", t: "STHY", c: "Obblig. HY", usd: 1.0, reg: {}, tax: "capitale", rate: 0.26 },
  IE00B66F4759: { n: "iShares EUR High Yield Corp", t: "IHYG", c: "Obblig. HY", usd: 0.0, reg: {}, tax: "capitale", rate: 0.26 },
  US298785JR84: { n: "EIB 1,75% 15.03.29", t: "EIB29a", c: "Obblig. IG", usd: 1.0, reg: {}, tax: "diversi", rate: 0.125 },
  US298785JA59: { n: "EIB 1,625% 09.10.29", t: "EIB29b", c: "Obblig. IG", usd: 1.0, reg: {}, tax: "diversi", rate: 0.125 },
  XS1490787113: { n: "Banca IMI 28.09.26", t: "B IMI", c: "Obblig. IG", usd: 0.0, reg: {}, tax: "diversi", rate: 0.26, pinned: true },
  FR0013416716: { n: "Amundi Physical Gold", t: "GOLD", c: "Oro", usd: 1.0, reg: {}, tax: "diversi", rate: 0.26 },
  LU0290358497: { n: "Xtrackers EUR Overnight Rate", t: "XEON", c: "Liquidità", usd: 0.0, reg: {}, tax: "capitale", rate: 0.26 },
  /* uscite — servono a riconoscere export più vecchi */
  IE00BYPC1H27: { n: "iShares China CNY Bond", t: "CNYB", c: "Obblig. IG", usd: 0.0, reg: {}, tax: "capitale", rate: 0.26 },
  US0231351067: { n: "Amazon.com", t: "AMZN", c: "Azionario", usd: 1.0, reg: { US: 1 }, tax: "diversi", rate: 0.26, az: true,
    ai: { t1: 0, t2: 1, t3: 0, spec: 0, dif: 0, resto: 0 } },
};

var BENCHMARK = "IE00B4L5Y983"; /* SWDA — MSCI World in euro */
var RISK_FREE = "LU0290358497"; /* XEON — tasso overnight in euro */
var MIN_OSS = 12;

/* ------------------------- canali di esposizione AI ----------------------- */

var AI_TIER = {
  t1: { lab: "Fornitori del capex AI", col: T.red,
    desc: "Semiconduttori, memorie, apparecchiature, server e ottica. Il fatturato dipende dagli ordini dei data center, quindi una revisione delle attese colpisce utili e multiplo insieme." },
  t2: { lab: "Chi finanzia il capex", col: T.clay,
    desc: "Hyperscaler e mega-cap tecnologiche. Pagano loro gli investimenti: un ripensamento libera flusso di cassa ma cancella la narrativa che regge il multiplo." },
  t3: { lab: "Infrastruttura elettrica", col: T.brass,
    desc: "Rete, componentistica di potenza, generazione dedicata ai data center. È il canale che si vede meno: non sono titoli tecnologici, ma la domanda che li ha rivalutati è la stessa." },
  spec: { lab: "Tecnologia speculativa", col: T.plum,
    desc: "Crescita a lunga duration senza utili stabili. Non è AI, ma vive dello stesso appetito per il rischio e si sgonfia con lui." },
  resto: { lab: "Resto dell'azionario", col: T.cobalt,
    desc: "Contagio generico: il de-risking colpisce anche ciò che con l'AI non c'entra." },
  dif: { lab: "Difensivi", col: T.green,
    desc: "Consumi di base, salute, utility regolate, immobiliare. Nella rotazione fuori dalla crescita tendono a essere comprati." },
};

var AI_TIER_ORDER = ["t1", "t2", "t3", "spec", "resto", "dif"];

var TICK_T1 = new Set(("NVDA AVGO AMD MU ASML AMAT LRCX KLAC KLA TER MRVL ARM SMCI VRT ANET " +
  "CRDO COHR MPWR ONTO ASM ASMI BESI SNPS CDNS DELL WDC STX NVMI CAMT AEIS FORM ACLS ICHR UCTT " +
  "SITM ALAB TSM QCOM SWKS QRVO").split(/\s+/));

var TICK_T2 = new Set(("MSFT GOOGL GOOG AMZN META ORCL AAPL PLTR NOW CRM SNOW ADBE INTU PANW " +
  "CRWD DDOG MDB NET TEAM WDAY ZS OKTA HUBS TSLA INTC IBM ACN CSCO").split(/\s+/));

var TICK_T3 = new Set(("ETN PWR GEV CEG VST NRG TLN HUBB NVT MOD FIX TT JCI EMR ROK AME PH " +
  "SU SIE ABB ENR LR NEX PRY VIE BWXT PSN AGX IESC EME").split(/\s+/));

var NOMI_T1 = ["ASML", "INFINEON", "ASM INTERNATIONAL", "BE SEMICONDUCTOR"];
var NOMI_T3 = ["SCHNEIDER ELECTRIC", "SIEMENS", "PRYSMIAN", "LEGRAND", "NEXANS", "SIEMENS ENERGY"];
var SETT_DIF = /^(salute|generi di largo consumo|imprese di servizi|immobili|health|staples|utilities|real estate)/i;

function tierDiTitolo(r, tickerFondo) {
  if (tickerFondo === "JEDI") return "spec";
  var tk = String(r.tick || "").toUpperCase().split(".")[0];
  var nm = String(r.nome || "").toUpperCase();
  if (tk && TICK_T1.has(tk)) return "t1";
  if (tk && TICK_T2.has(tk)) return "t2";
  if (tk && TICK_T3.has(tk)) return "t3";
  if (NOMI_T1.some(function (x) { return nm.indexOf(x) === 0; })) return "t1";
  if (NOMI_T3.some(function (x) { return nm.indexOf(x) === 0; })) return "t3";
  if (SETT_DIF.test(String(r.sett || ""))) return "dif";
  return "resto";
}

/* ---------------------------- beta ex ante -------------------------------- */

var SETT_BETA = {
  IT: 1.25, Comunicazione: 1.05, "Consumi Discrezionali": 1.15, Finanziari: 1.05,
  Industriali: 1.05, Materiali: 1.05, Energia: 0.9, Salute: 0.75,
  "Generi di largo consumo": 0.6, "Imprese di servizi di pubblica utilità": 0.65, Immobili: 0.9,
};

var BETA_EX_ANTE = {
  IE00B4L5Y983: { b: 1.0, f: "definizione" },
  XS2427355958: { b: 1.02, f: "ipotesi" },
  XS2427362145: { b: 0.97, f: "ipotesi" },
  IE000YU9K6K2: { b: 1.45, f: "ipotesi" },
  IE00BF2B0L69: { b: 0.85, f: "ipotesi" },
  IE0003R87OG3: { b: 1.05, f: "ipotesi" },
  US09290D1019: { b: 1.35, f: "ipotesi" },
  IT0005366767: { b: 1.15, f: "ipotesi" },
  DE000PAH0038: { b: 1.25, f: "ipotesi" },
  ES0127797019: { b: 0.85, f: "ipotesi" },
  IE00B7N3YW49: { b: 0.2, f: "ipotesi" },
  IE00B66F4759: { b: 0.35, f: "ipotesi" },
  US298785JR84: { b: -0.05, f: "ipotesi" },
  US298785JA59: { b: -0.05, f: "ipotesi" },
  XS1490787113: { b: 0.0, f: "in scadenza" },
  FR0013416716: { b: 0.05, f: "ipotesi" },
  LU0290358497: { b: 0.0, f: "definizione" },
  IE00BYPC1H27: { b: 0.1, f: "ipotesi" },
  US0231351067: { b: 1.2, f: "ipotesi" },
};

/* -------------------------------- scenari --------------------------------- */

var SCENARIOS = [
  { id: "gfc", nome: "Crisi 2008",
    nota: "Set 2008 – mar 2009. Azionario in caduta, credito illiquido, dollaro rifugio.",
    s: { Azionario: -0.42, "Obblig. HY": -0.28, "Obblig. IG": 0.06, Oro: 0.05, "Liquidità": 0.01 }, fx: 0.18 },
  { id: "covid", nome: "Covid 2020",
    nota: "Feb – mar 2020. Discesa verticale, oro venduto per fare cassa nelle prime settimane.",
    s: { Azionario: -0.32, "Obblig. HY": -0.2, "Obblig. IG": 0.02, Oro: -0.03, "Liquidità": 0 }, fx: 0.06 },
  { id: "2022", nome: "Inflazione 2022",
    nota: "L'anno in cui azioni e obbligazioni sono scese insieme. Il dollaro ha fatto da unico cuscinetto.",
    s: { Azionario: -0.18, "Obblig. HY": -0.12, "Obblig. IG": -0.14, Oro: -0.01, "Liquidità": 0 }, fx: 0.12 },
  { id: "tassi", nome: "Tassi +200 bp",
    nota: "Rialzo rapido e disordinato della curva, senza fuga verso il dollaro.",
    s: { Azionario: -0.1, "Obblig. HY": -0.08, "Obblig. IG": -0.08, Oro: -0.05, "Liquidità": 0 }, fx: 0 },
  { id: "aiBolla", nome: "Bolla AI", ai: true,
    nota: "Le attese di spesa dei data center vengono riviste al ribasso e il mercato smette di pagare in anticipo la crescita futura. Non è un crollo di sistema: il credito regge, i tassi scendono, ma tutto ciò che è stato rivalutato sulla tesi AI si sgonfia. Lo shock colpisce per canale, non per settore.",
    tier: { t1: -0.55, t2: -0.35, t3: -0.3, spec: -0.32, resto: -0.12, dif: -0.05 },
    s: { "Obblig. HY": -0.1, "Obblig. IG": 0.04, Oro: 0.08, "Liquidità": 0 }, fx: 0.04 },
  { id: "aiBollaGrave", nome: "Bolla AI severa", ai: true,
    nota: "La stessa dinamica, ma con il credito che si rompe. Il capex dei data center è stato finanziato anche a debito: se il rifinanziamento si inceppa lo shock passa dall'azionario alle obbligazioni societarie e il contagio si allarga.",
    tier: { t1: -0.7, t2: -0.48, t3: -0.42, spec: -0.45, resto: -0.2, dif: -0.08 },
    s: { "Obblig. HY": -0.16, "Obblig. IG": 0.06, Oro: 0.12, "Liquidità": 0 }, fx: 0.07 },
  { id: "dollaro", nome: "Dollaro −15%",
    nota: "Solo cambio. Nessuno shock sugli attivi: isola l'effetto valutario.",
    s: { Azionario: 0, "Obblig. HY": 0, "Obblig. IG": 0, Oro: 0, "Liquidità": 0 }, fx: -0.15 },
];

/* --------------------- lettura dei file di composizione -------------------- */

function toNum(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (v == null) return null;
  var s = String(v).trim().replace(/[%$\s ]/g, "");
  if (!s || s === "-" || s === "--" || s === "—") return null;
  var neg = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");
  var lastC = s.lastIndexOf(",");
  var lastD = s.lastIndexOf(".");
  if (lastC > -1 && lastD > -1) {
    s = lastC > lastD ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastC > -1) {
    s = s.split(",").length === 2 && s.length - lastC - 1 !== 3 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  var n = parseFloat(s);
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}

var SUFFISSI = /\b(INC|CORP|CORPORATION|CO|COMPANY|PLC|NV|N V|SA|S A|AG|SE|LTD|LIMITED|HLDG|HLDGS|HOLDING|HOLDINGS|GROUP|CLASS [A-C]|CL [A-C]|ORD|COM|SPA|S P A|AB|AS|OYJ|KGAA|REG|NPV)\b/g;

function normNome(s) {
  return String(s || "").toUpperCase()
    .replace(/[.,'"&()\-/]/g, " ")
    .replace(SUFFISSI, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isISIN(s) {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(String(s || "").trim().toUpperCase());
}

/* Trova intestazione e colonne in un foglio di composizione. Tarato sui
   formati reali: iShares Italia, Avantis, VanEck, Franklin. */
function leggiComposizione(grid) {
  var PESO = /(weight|ponderazione|il peso|% di patrimonio|% del patrimonio|peso|allocation)/i;
  var NOME_STRETTO = /^(nome|name|nome del titolo|security name|titolo|posizione|company|descrizione|description|holding)$/i;
  var NOME_LARGO = /(name|nome|security|descri|titolo|holding|posizione|company)/i;
  var ISINH = /^isin$|codice isin/i;
  var SETT = /(sector|settore|industry|industria)/i;
  var PAESE = /(area geografica|location|country|paese|domicil|geograf)/i;
  var VALUTA = /(valuta|currency|valute)/i;
  var TIPO = /(asset class|security type|categoria|tipo di sicurezza|tipo)/i;
  var TICKER = /(ticker|simbolo|symbol)/i;

  var best = null;
  for (var i = 0; i < Math.min(grid.length, 40); i++) {
    var r = (grid[i] || []).map(function (c) { return String(c == null ? "" : c).trim(); });
    if (r.filter(Boolean).length < 3) continue;
    var cPeso = r.findIndex(function (h) { return PESO.test(h); });
    var cNome = r.findIndex(function (h) { return NOME_STRETTO.test(h); });
    if (cNome < 0) cNome = r.findIndex(function (h) { return NOME_LARGO.test(h); });
    var cIsin = r.findIndex(function (h) { return ISINH.test(h); });
    var punteggio = (cIsin > -1 ? 2 : 0) + (cNome > -1 ? 2 : 0) + (cPeso > -1 ? 3 : 0);
    if (punteggio >= 5 && (!best || punteggio > best.punteggio)) {
      best = {
        riga: i, cIsin: cIsin, cNome: cNome, cPeso: cPeso,
        cSett: r.findIndex(function (h) { return SETT.test(h); }),
        cPaese: r.findIndex(function (h) { return PAESE.test(h); }),
        cVal: r.findIndex(function (h) { return VALUTA.test(h) && !/valore/i.test(h); }),
        cTipo: r.findIndex(function (h) { return TIPO.test(h); }),
        cTick: r.findIndex(function (h) { return TICKER.test(h); }),
        punteggio: punteggio,
      };
    }
  }
  if (!best) return { rows: [], errore: "Non trovo le colonne del peso o del titolo." };

  /* Righe che non sono titoli: liquidità, derivati, valute. Il confine di
     parola non è un dettaglio: senza, "TOTALENERGIES" passerebbe per una riga
     di totale e "Future plc" per un contratto future. Dove c'è una colonna di
     categoria ci si fida di quella e si lascia stare il nome. */
  var SCARTA = /\b(cash|liquid\w*|derivat\w*|futures?|repo|money market|forward|swap|margin|collateral|contant\w*|currency|valuta)\b/i;
  var RIGA_TOTALE = /^(total|totale|net current assets|attività nette)\b/i;
  var usaTipo = best.cTipo > -1;

  var rows = [];
  var scartate = 0;
  for (var j = best.riga + 1; j < grid.length; j++) {
    var row = grid[j];
    if (!row) continue;
    var peso = toNum(row[best.cPeso]);
    var nome = best.cNome > -1 ? String(row[best.cNome] == null ? "" : row[best.cNome]).trim() : "";
    var isin = best.cIsin > -1 ? String(row[best.cIsin] == null ? "" : row[best.cIsin]).trim().toUpperCase() : "";
    if (peso == null || peso === 0) continue;
    if (!nome && !isISIN(isin)) continue;
    if (RIGA_TOTALE.test(nome)) continue;
    var tipo = usaTipo ? String(row[best.cTipo] == null ? "" : row[best.cTipo]) : "";
    if (usaTipo ? SCARTA.test(tipo) : SCARTA.test(nome)) { scartate++; continue; }
    rows.push({
      isin: isISIN(isin) ? isin : "",
      nome: nome || isin,
      tick: best.cTick > -1 ? String(row[best.cTick] == null ? "" : row[best.cTick]).trim().split(/\s+/)[0] : "",
      peso: peso,
      sett: best.cSett > -1 ? String(row[best.cSett] == null ? "" : row[best.cSett]).trim() : "",
      paese: best.cPaese > -1 ? String(row[best.cPaese] == null ? "" : row[best.cPaese]).trim() : "",
      val: best.cVal > -1 ? String(row[best.cVal] == null ? "" : row[best.cVal]).trim() : "",
    });
  }
  if (!rows.length) return { rows: [], errore: "Intestazione riconosciuta ma nessuna riga valida." };

  var somma = rows.reduce(function (a, r) { return a + r.peso; }, 0);
  var fattore = somma > 0 && somma < 2 ? 100 : 1;
  rows.forEach(function (r) { r.peso *= fattore; });
  return { rows: rows, somma: somma * fattore, scartate: scartate, errore: null };
}

/* Costituenti EURO STOXX 50. WS5X è un ETC sintetico: non esiste un elenco di
   titoli detenuti, quindi l'esposizione economica è quella dell'indice. */
var ESTX50 = ("ASML HLDG 8.47|LVMH MOET HENNESSY 7.18|TOTALENERGIES 4.27|SAP 4.12|SIEMENS 3.91|SANOFI 3.48|L'OREAL 3.20|SCHNEIDER ELECTRIC 2.96|AIR LIQUIDE 2.80|ALLIANZ 2.70|AIRBUS 2.44|HERMES INTERNATIONAL 2.23|IBERDROLA 2.22|DEUTSCHE TELEKOM 2.15|VINCI 2.08|BNP PARIBAS 2.05|MERCEDES-BENZ GROUP 1.91|BCO SANTANDER 1.72|SAFRAN 1.70|ESSILORLUXOTTICA 1.67|AXA 1.67|BAYER 1.64|INFINEON TECHNOLOGIES 1.58|PROSUS 1.58|ANHEUSER-BUSCH INBEV 1.52|ENEL 1.51|MUENCHENER RUECK 1.47|ING GRP 1.46|ADYEN 1.44|DEUTSCHE POST 1.39|BCO BILBAO VIZCAYA ARGENTARIA 1.30|BASF 1.30|PERNOD RICARD 1.29|INTESA SANPAOLO 1.27|INDUSTRIA DE DISENO TEXTIL 1.22|KERING 1.21|UNICREDIT 1.19|STELLANTIS 1.18|CRH 1.17|NORDEA BANK 1.15|BMW 1.14|DANONE 1.13|FLUTTER ENTERTAINMENT 1.05|DEUTSCHE BOERSE 1.05|ENI 1.02|AHOLD DELHAIZE 0.95|ADIDAS 0.93|VOLKSWAGEN PREF 0.85|NOKIA 0.67|VONOVIA 0.42")
  .split("|").map(function (s) {
    var i = s.lastIndexOf(" ");
    return { isin: "", nome: s.slice(0, i), tick: "", peso: parseFloat(s.slice(i + 1)), sett: "", paese: "", val: "EUR" };
  });

var COMPOSIZIONI_INTERNE = {
  XS2427362145: { file: "EURO STOXX 50 — costituenti dell'indice", interno: true, data: "indice", rows: ESTX50 },
};

/* ------------------- rendimenti di periodo e regressione ------------------- */

/* Rendimento fra due rilevazioni, dai prezzi per quota e pesato con i valori
   di inizio periodo. Così è immune sia ai versamenti sia alle vendite: un
   acquisto cambia le quantità, non i prezzi. La formula basata sulla
   variazione di valore scambierebbe ogni movimento di cassa per rendimento. */
function rendimentoPeriodo(prima, dopo) {
  if (!prima || !dopo || !prima.px || !dopo.px) return null;
  var comuni = Object.keys(prima.px).filter(function (k) {
    return dopo.px[k] > 0 && prima.px[k] > 0 && ((prima.val && prima.val[k]) || 0) > 0;
  });
  if (!comuni.length) return null;
  var base = comuni.reduce(function (a, k) { return a + prima.val[k]; }, 0);
  if (base <= 0) return null;
  var r = comuni.reduce(function (a, k) {
    return a + (prima.val[k] / base) * (dopo.px[k] / prima.px[k] - 1);
  }, 0);
  var rb = prima.px[BENCHMARK] > 0 && dopo.px[BENCHMARK] > 0
    ? dopo.px[BENCHMARK] / prima.px[BENCHMARK] - 1 : null;
  var rf = prima.px[RISK_FREE] > 0 && dopo.px[RISK_FREE] > 0
    ? dopo.px[RISK_FREE] / prima.px[RISK_FREE] - 1 : 0;
  var giorni = Math.round((new Date(dopo.date) - new Date(prima.date)) / 86400000);
  return { da: prima.date, a: dopo.date, giorni: giorni, r: r, rb: rb, rf: rf,
    copertura: prima.mkt ? base / prima.mkt : 0 };
}

/* Regressione dei rendimenti in eccesso: r_p − r_f = alpha + beta (r_b − r_f).
   Restituisce anche gli errori standard: senza quelli una stima da poche
   osservazioni sembra più solida di quanto sia. */
function regressione(oss) {
  var d = oss.filter(function (o) { return o && o.rb != null; });
  var n = d.length;
  if (n < 2) return { n: n, ok: false };
  var x = d.map(function (o) { return o.rb - o.rf; });
  var y = d.map(function (o) { return o.r - o.rf; });
  var mx = x.reduce(function (a, v) { return a + v; }, 0) / n;
  var my = y.reduce(function (a, v) { return a + v; }, 0) / n;
  var sxx = x.reduce(function (a, v) { return a + Math.pow(v - mx, 2); }, 0);
  if (sxx <= 0) return { n: n, ok: false };
  var sxy = x.reduce(function (a, v, i) { return a + (v - mx) * (y[i] - my); }, 0);
  var beta = sxy / sxx;
  var alpha = my - beta * mx;
  var sse = y.reduce(function (a, v, i) { return a + Math.pow(v - alpha - beta * x[i], 2); }, 0);
  var syy = y.reduce(function (a, v) { return a + Math.pow(v - my, 2); }, 0);
  var gl = n - 2;
  var s2 = gl > 0 ? sse / gl : NaN;
  var seBeta = gl > 0 ? Math.sqrt(s2 / sxx) : NaN;
  var seAlpha = gl > 0 ? Math.sqrt(s2 * (1 / n + (mx * mx) / sxx)) : NaN;
  var gg = d.reduce(function (a, o) { return a + o.giorni; }, 0) / n;
  var perAnno = gg > 0 ? 365 / gg : 12;
  return {
    n: n, ok: true, beta: beta, alpha: alpha, seBeta: seBeta, seAlpha: seAlpha,
    r2: syy > 0 ? 1 - sse / syy : NaN,
    alphaAnnuo: Math.pow(1 + alpha, perAnno) - 1,
    perAnno: perAnno,
    punti: d.map(function (o, i) { return { x: x[i] * 100, y: y[i] * 100, data: o.a }; }),
  };
}

/* ------------------------------- formatters -------------------------------- */

function eur(v, d) {
  d = d || 0;
  return new Intl.NumberFormat("it-IT", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: d, maximumFractionDigits: d,
  }).format(v || 0);
}

/* valore compatto per la testata: oltre i centomila passa a migliaia */
function eurK(v) {
  var a = Math.abs(v || 0);
  if (a >= 100000) return Math.round(v / 1000).toLocaleString("it-IT") + "k €";
  return eur(v);
}

function pct(v, d) {
  if (d == null) d = 1;
  return (v >= 0 ? "" : "−") + Math.abs(v).toLocaleString("it-IT", {
    minimumFractionDigits: d, maximumFractionDigits: d,
  }) + "%";
}

function num(v, d) {
  if (d == null) d = 2;
  return (v || 0).toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function signed(v) { return v >= 0 ? T.green : T.red; }

function dateIt(iso) {
  if (!iso) return "—";
  var p = String(iso).split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

function oggiISO() {
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* ----------------------- lettura dell'export Fineco ----------------------- */

function leggiExport(grid) {
  var hIdx = -1;
  for (var i = 0; i < grid.length; i++) {
    var r = grid[i];
    if (r && r.some(function (c) { return String(c).trim() === "ISIN"; })) { hIdx = i; break; }
  }
  if (hIdx < 0) throw new Error("Intestazione non trovata: manca la colonna ISIN.");
  var head = grid[hIdx].map(function (c) { return String(c || "").trim(); });
  function col(name) {
    return head.findIndex(function (h) { return h.toLowerCase() === name.toLowerCase(); });
  }
  var cIsin = col("ISIN"), cNome = col("Titolo"), cQty = col("Quantità");
  var cCar = col("Valore di carico"), cMkt = col("Valore di mercato €");
  var cTer = col("TER"), cRat = col("Rateo");
  var out = [], ignoti = [];
  for (var j = hIdx + 1; j < grid.length; j++) {
    var row = grid[j];
    if (!row) continue;
    var isin = String(row[cIsin] || "").trim();
    if (!isISIN(isin)) continue;
    var mkt = Number(row[cMkt]);
    if (!isFinite(mkt) || mkt === 0) continue;
    if (!BOOK[isin]) ignoti.push(String(row[cNome] || "").trim() + " (" + isin + ")");
    out.push({
      isin: isin,
      nome: String(row[cNome] || "").trim(),
      qty: Number(row[cQty]) || 0,
      carico: Number(row[cCar]) || 0,
      mkt: mkt,
      ter: cTer >= 0 && row[cTer] !== "" && row[cTer] != null ? Number(row[cTer]) : null,
      rateo: cRat >= 0 ? Number(row[cRat]) || 0 : 0,
    });
  }
  if (!out.length) throw new Error("Nessuna posizione riconosciuta nel file.");
  return { rows: out, ignoti: ignoti };
}

/* abbina un file di composizione al fondo, dal nome file e dall'intestazione */
function abbinaFondo(nomeFile, testa, fondi) {
  var spia = (nomeFile + " " + testa).toUpperCase();
  var match = null, max = 0;
  fondi.forEach(function (p) {
    var s = 0;
    if (spia.indexOf(p.isin) > -1) s += 10;
    if (new RegExp("(^|[^A-Z0-9])" + p.t + "([^A-Z0-9]|$)").test(spia)) s += 6;
    p.n.toUpperCase().split(/[^A-Z0-9&]+/)
      .filter(function (w) { return w.length >= 5 && !/^(GLOBAL|WORLD|SMALL|VALUE|QUALITY|CORE|INDEX)$/.test(w); })
      .forEach(function (w) { if (spia.indexOf(w) > -1) s += 2; });
    if (s > max) { max = s; match = p; }
  });
  return max < 2 ? null : match;
}
