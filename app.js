/* ---- 01-engine.js ---- */
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
  ground: "#e7e9e1",
  card: "#f5f6f1",
  sunk: "#dde0d6",
  ink: "#191d17",
  ink2: "#3d423a",
  muted: "#6c7167",
  rule: "#c7cbbf",
  ruleSoft: "#d6dacd",
  red: "#b23a2c",
  green: "#2e6b4f",
  brass: "#a8811f",
  brassDark: "#8c6b14",
  cobalt: "#2b4e86",
  clay: "#a65a3c",
  teal: "#3e7a78",
  slate: "#8a8f82",
  plum: "#6b4e8f",
  onFill: "#ffffff",
  barBg: "rgba(43,78,134,.26)"
};
var VAR_CSS = {
  ground: "--ground",
  card: "--card",
  sunk: "--sunk",
  ink: "--ink",
  ink2: "--ink2",
  muted: "--muted",
  rule: "--rule",
  ruleSoft: "--rule-soft",
  red: "--red",
  green: "--green",
  brass: "--brass",
  brassDark: "--brass-dark",
  cobalt: "--cobalt",
  clay: "--clay",
  teal: "--teal",
  slate: "--slate",
  plum: "--plum",
  onFill: "--on-fill",
  barBg: "--bar-bg"
};
var CLASS_COLOR = {
  Azionario: T.cobalt,
  "Obblig. HY": T.clay,
  "Obblig. IG": T.teal,
  Oro: T.brass,
  "Liquidità": T.slate
};

/* rilegge i colori dal foglio di stile e aggiorna le tabelle sul posto */
function sincronizzaTema() {
  try {
    var cs = getComputedStyle(document.documentElement);
    Object.keys(VAR_CSS).forEach(function (k) {
      var v = cs.getPropertyValue(VAR_CSS[k]).trim();
      if (v) T[k] = v;
    });
  } catch (e) {/* si tengono i valori di partenza */}
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
  IE00B4L5Y983: {
    n: "iShares Core MSCI World",
    t: "SWDA",
    c: "Azionario",
    usd: 0.7257,
    reg: {
      US: 0.7213,
      EU: 0.145,
      JP: 0.0587,
      ALTRO: 0.075
    },
    tax: "capitale",
    rate: 0.26,
    ai: {
      t1: 0.1341,
      t2: 0.2128,
      t3: 0.0235,
      spec: 0,
      dif: 0.1817,
      resto: 0.4479
    }
  },
  XS2427355958: {
    n: "WisdomTree S&P 500",
    t: "WSPX",
    c: "Azionario",
    usd: 1.0,
    reg: {
      US: 1
    },
    tax: "diversi",
    rate: 0.26,
    ai: {
      t1: 0.1715,
      t2: 0.2946,
      t3: 0.0211,
      spec: 0,
      dif: 0.1733,
      resto: 0.3395
    }
  },
  XS2427362145: {
    n: "WisdomTree EURO STOXX 50",
    t: "WS5X",
    c: "Azionario",
    usd: 0.0,
    reg: {
      EU: 1
    },
    tax: "diversi",
    rate: 0.26,
    ai: {
      t1: 0.1005,
      t2: 0,
      t3: 0.0687,
      spec: 0,
      dif: 0,
      resto: 0.8308
    }
  },
  IE000YU9K6K2: {
    n: "VanEck Space Innovators",
    t: "JEDI",
    c: "Azionario",
    usd: 0.671,
    reg: {
      US: 0.671,
      EU: 0.091,
      JP: 0.065,
      ALTRO: 0.173
    },
    tax: "capitale",
    rate: 0.26,
    ai: {
      t1: 0,
      t2: 0,
      t3: 0,
      spec: 1,
      dif: 0,
      resto: 0
    }
  },
  IE00BF2B0L69: {
    n: "Franklin Euro Quality Dividend",
    t: "FLXD",
    c: "Azionario",
    usd: 0.0,
    reg: {
      EU: 1
    },
    tax: "capitale",
    rate: 0.26,
    ai: {
      t1: 0,
      t2: 0,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 1
    }
  },
  IE0003R87OG3: {
    n: "Avantis Global Small Cap Value",
    t: "AVWS",
    c: "Azionario",
    usd: 0.63,
    reg: {
      US: 0.63,
      EU: 0.1,
      JP: 0.098,
      ALTRO: 0.172
    },
    tax: "capitale",
    rate: 0.26,
    ai: {
      t1: 0,
      t2: 0,
      t3: 0.0001,
      spec: 0,
      dif: 0,
      resto: 0.9999
    }
  },
  US09290D1019: {
    n: "BlackRock Inc.",
    t: "BLK",
    c: "Azionario",
    usd: 1.0,
    reg: {
      US: 1
    },
    tax: "diversi",
    rate: 0.26,
    az: true,
    ai: {
      t1: 0,
      t2: 1,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 0
    }
  },
  IT0005366767: {
    n: "Nexi",
    t: "NEXI",
    c: "Azionario",
    usd: 0.0,
    reg: {
      EU: 1
    },
    tax: "diversi",
    rate: 0.26,
    az: true,
    ai: {
      t1: 0,
      t2: 0,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 1
    }
  },
  DE000PAH0038: {
    n: "Porsche Automobil Holding",
    t: "PAH3",
    c: "Azionario",
    usd: 0.0,
    reg: {
      EU: 1
    },
    tax: "diversi",
    rate: 0.26,
    az: true,
    ai: {
      t1: 0,
      t2: 0,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 1
    }
  },
  ES0127797019: {
    n: "EDP Renewables",
    t: "EDPR",
    c: "Azionario",
    usd: 0.0,
    reg: {
      EU: 1
    },
    tax: "diversi",
    rate: 0.26,
    az: true,
    ai: {
      t1: 0,
      t2: 0,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 1
    }
  },
  IE00B7N3YW49: {
    n: "PIMCO US Short-Term HY",
    t: "STHY",
    c: "Obblig. HY",
    usd: 1.0,
    reg: {},
    tax: "capitale",
    rate: 0.26
  },
  IE00B66F4759: {
    n: "iShares EUR High Yield Corp",
    t: "IHYG",
    c: "Obblig. HY",
    usd: 0.0,
    reg: {},
    tax: "capitale",
    rate: 0.26
  },
  US298785JR84: {
    n: "EIB 1,75% 15.03.29",
    t: "EIB29a",
    c: "Obblig. IG",
    usd: 1.0,
    reg: {},
    tax: "diversi",
    rate: 0.125
  },
  US298785JA59: {
    n: "EIB 1,625% 09.10.29",
    t: "EIB29b",
    c: "Obblig. IG",
    usd: 1.0,
    reg: {},
    tax: "diversi",
    rate: 0.125
  },
  XS1490787113: {
    n: "Banca IMI 28.09.26",
    t: "B IMI",
    c: "Obblig. IG",
    usd: 0.0,
    reg: {},
    tax: "diversi",
    rate: 0.26,
    pinned: true
  },
  FR0013416716: {
    n: "Amundi Physical Gold",
    t: "GOLD",
    c: "Oro",
    usd: 1.0,
    reg: {},
    tax: "diversi",
    rate: 0.26
  },
  LU0290358497: {
    n: "Xtrackers EUR Overnight Rate",
    t: "XEON",
    c: "Liquidità",
    usd: 0.0,
    reg: {},
    tax: "capitale",
    rate: 0.26
  },
  /* uscite — servono a riconoscere export più vecchi */
  IE00BYPC1H27: {
    n: "iShares China CNY Bond",
    t: "CNYB",
    c: "Obblig. IG",
    usd: 0.0,
    reg: {},
    tax: "capitale",
    rate: 0.26
  },
  US0231351067: {
    n: "Amazon.com",
    t: "AMZN",
    c: "Azionario",
    usd: 1.0,
    reg: {
      US: 1
    },
    tax: "diversi",
    rate: 0.26,
    az: true,
    ai: {
      t1: 0,
      t2: 1,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 0
    }
  }
};
var BENCHMARK = "IE00B4L5Y983"; /* SWDA — MSCI World in euro */
var RISK_FREE = "LU0290358497"; /* XEON — tasso overnight in euro */
var MIN_OSS = 12;

/* ------------------------- canali di esposizione AI ----------------------- */

var AI_TIER = {
  t1: {
    lab: "Fornitori del capex AI",
    col: T.red,
    desc: "Semiconduttori, memorie, apparecchiature, server e ottica. Il fatturato dipende dagli ordini dei data center, quindi una revisione delle attese colpisce utili e multiplo insieme."
  },
  t2: {
    lab: "Chi finanzia il capex",
    col: T.clay,
    desc: "Hyperscaler e mega-cap tecnologiche. Pagano loro gli investimenti: un ripensamento libera flusso di cassa ma cancella la narrativa che regge il multiplo."
  },
  t3: {
    lab: "Infrastruttura elettrica",
    col: T.brass,
    desc: "Rete, componentistica di potenza, generazione dedicata ai data center. È il canale che si vede meno: non sono titoli tecnologici, ma la domanda che li ha rivalutati è la stessa."
  },
  spec: {
    lab: "Tecnologia speculativa",
    col: T.plum,
    desc: "Crescita a lunga duration senza utili stabili. Non è AI, ma vive dello stesso appetito per il rischio e si sgonfia con lui."
  },
  resto: {
    lab: "Resto dell'azionario",
    col: T.cobalt,
    desc: "Contagio generico: il de-risking colpisce anche ciò che con l'AI non c'entra."
  },
  dif: {
    lab: "Difensivi",
    col: T.green,
    desc: "Consumi di base, salute, utility regolate, immobiliare. Nella rotazione fuori dalla crescita tendono a essere comprati."
  }
};
var AI_TIER_ORDER = ["t1", "t2", "t3", "spec", "resto", "dif"];
var TICK_T1 = new Set(("NVDA AVGO AMD MU ASML AMAT LRCX KLAC KLA TER MRVL ARM SMCI VRT ANET " + "CRDO COHR MPWR ONTO ASM ASMI BESI SNPS CDNS DELL WDC STX NVMI CAMT AEIS FORM ACLS ICHR UCTT " + "SITM ALAB TSM QCOM SWKS QRVO").split(/\s+/));
var TICK_T2 = new Set(("MSFT GOOGL GOOG AMZN META ORCL AAPL PLTR NOW CRM SNOW ADBE INTU PANW " + "CRWD DDOG MDB NET TEAM WDAY ZS OKTA HUBS TSLA INTC IBM ACN CSCO").split(/\s+/));
var TICK_T3 = new Set(("ETN PWR GEV CEG VST NRG TLN HUBB NVT MOD FIX TT JCI EMR ROK AME PH " + "SU SIE ABB ENR LR NEX PRY VIE BWXT PSN AGX IESC EME").split(/\s+/));
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
  if (NOMI_T1.some(function (x) {
    return nm.indexOf(x) === 0;
  })) return "t1";
  if (NOMI_T3.some(function (x) {
    return nm.indexOf(x) === 0;
  })) return "t3";
  if (SETT_DIF.test(String(r.sett || ""))) return "dif";
  return "resto";
}

/* ---------------------------- beta ex ante -------------------------------- */

var SETT_BETA = {
  IT: 1.25,
  Comunicazione: 1.05,
  "Consumi Discrezionali": 1.15,
  Finanziari: 1.05,
  Industriali: 1.05,
  Materiali: 1.05,
  Energia: 0.9,
  Salute: 0.75,
  "Generi di largo consumo": 0.6,
  "Imprese di servizi di pubblica utilità": 0.65,
  Immobili: 0.9
};
var BETA_EX_ANTE = {
  IE00B4L5Y983: {
    b: 1.0,
    f: "definizione"
  },
  XS2427355958: {
    b: 1.02,
    f: "ipotesi"
  },
  XS2427362145: {
    b: 0.97,
    f: "ipotesi"
  },
  IE000YU9K6K2: {
    b: 1.45,
    f: "ipotesi"
  },
  IE00BF2B0L69: {
    b: 0.85,
    f: "ipotesi"
  },
  IE0003R87OG3: {
    b: 1.05,
    f: "ipotesi"
  },
  US09290D1019: {
    b: 1.35,
    f: "ipotesi"
  },
  IT0005366767: {
    b: 1.15,
    f: "ipotesi"
  },
  DE000PAH0038: {
    b: 1.25,
    f: "ipotesi"
  },
  ES0127797019: {
    b: 0.85,
    f: "ipotesi"
  },
  IE00B7N3YW49: {
    b: 0.2,
    f: "ipotesi"
  },
  IE00B66F4759: {
    b: 0.35,
    f: "ipotesi"
  },
  US298785JR84: {
    b: -0.05,
    f: "ipotesi"
  },
  US298785JA59: {
    b: -0.05,
    f: "ipotesi"
  },
  XS1490787113: {
    b: 0.0,
    f: "in scadenza"
  },
  FR0013416716: {
    b: 0.05,
    f: "ipotesi"
  },
  LU0290358497: {
    b: 0.0,
    f: "definizione"
  },
  IE00BYPC1H27: {
    b: 0.1,
    f: "ipotesi"
  },
  US0231351067: {
    b: 1.2,
    f: "ipotesi"
  }
};

/* -------------------------------- scenari --------------------------------- */

var SCENARIOS = [{
  id: "gfc",
  nome: "Crisi 2008",
  nota: "Set 2008 – mar 2009. Azionario in caduta, credito illiquido, dollaro rifugio.",
  s: {
    Azionario: -0.42,
    "Obblig. HY": -0.28,
    "Obblig. IG": 0.06,
    Oro: 0.05,
    "Liquidità": 0.01
  },
  fx: 0.18
}, {
  id: "covid",
  nome: "Covid 2020",
  nota: "Feb – mar 2020. Discesa verticale, oro venduto per fare cassa nelle prime settimane.",
  s: {
    Azionario: -0.32,
    "Obblig. HY": -0.2,
    "Obblig. IG": 0.02,
    Oro: -0.03,
    "Liquidità": 0
  },
  fx: 0.06
}, {
  id: "2022",
  nome: "Inflazione 2022",
  nota: "L'anno in cui azioni e obbligazioni sono scese insieme. Il dollaro ha fatto da unico cuscinetto.",
  s: {
    Azionario: -0.18,
    "Obblig. HY": -0.12,
    "Obblig. IG": -0.14,
    Oro: -0.01,
    "Liquidità": 0
  },
  fx: 0.12
}, {
  id: "tassi",
  nome: "Tassi +200 bp",
  nota: "Rialzo rapido e disordinato della curva, senza fuga verso il dollaro.",
  s: {
    Azionario: -0.1,
    "Obblig. HY": -0.08,
    "Obblig. IG": -0.08,
    Oro: -0.05,
    "Liquidità": 0
  },
  fx: 0
}, {
  id: "aiBolla",
  nome: "Bolla AI",
  ai: true,
  nota: "Le attese di spesa dei data center vengono riviste al ribasso e il mercato smette di pagare in anticipo la crescita futura. Non è un crollo di sistema: il credito regge, i tassi scendono, ma tutto ciò che è stato rivalutato sulla tesi AI si sgonfia. Lo shock colpisce per canale, non per settore.",
  tier: {
    t1: -0.55,
    t2: -0.35,
    t3: -0.3,
    spec: -0.32,
    resto: -0.12,
    dif: -0.05
  },
  s: {
    "Obblig. HY": -0.1,
    "Obblig. IG": 0.04,
    Oro: 0.08,
    "Liquidità": 0
  },
  fx: 0.04
}, {
  id: "aiBollaGrave",
  nome: "Bolla AI severa",
  ai: true,
  nota: "La stessa dinamica, ma con il credito che si rompe. Il capex dei data center è stato finanziato anche a debito: se il rifinanziamento si inceppa lo shock passa dall'azionario alle obbligazioni societarie e il contagio si allarga.",
  tier: {
    t1: -0.7,
    t2: -0.48,
    t3: -0.42,
    spec: -0.45,
    resto: -0.2,
    dif: -0.08
  },
  s: {
    "Obblig. HY": -0.16,
    "Obblig. IG": 0.06,
    Oro: 0.12,
    "Liquidità": 0
  },
  fx: 0.07
}, {
  id: "dollaro",
  nome: "Dollaro −15%",
  nota: "Solo cambio. Nessuno shock sugli attivi: isola l'effetto valutario.",
  s: {
    Azionario: 0,
    "Obblig. HY": 0,
    "Obblig. IG": 0,
    Oro: 0,
    "Liquidità": 0
  },
  fx: -0.15
}];

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
  return String(s || "").toUpperCase().replace(/[.,'"&()\-/]/g, " ").replace(SUFFISSI, " ").replace(/\s+/g, " ").trim();
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
    var r = (grid[i] || []).map(function (c) {
      return String(c == null ? "" : c).trim();
    });
    if (r.filter(Boolean).length < 3) continue;
    var cPeso = r.findIndex(function (h) {
      return PESO.test(h);
    });
    var cNome = r.findIndex(function (h) {
      return NOME_STRETTO.test(h);
    });
    if (cNome < 0) cNome = r.findIndex(function (h) {
      return NOME_LARGO.test(h);
    });
    var cIsin = r.findIndex(function (h) {
      return ISINH.test(h);
    });
    var punteggio = (cIsin > -1 ? 2 : 0) + (cNome > -1 ? 2 : 0) + (cPeso > -1 ? 3 : 0);
    if (punteggio >= 5 && (!best || punteggio > best.punteggio)) {
      best = {
        riga: i,
        cIsin: cIsin,
        cNome: cNome,
        cPeso: cPeso,
        cSett: r.findIndex(function (h) {
          return SETT.test(h);
        }),
        cPaese: r.findIndex(function (h) {
          return PAESE.test(h);
        }),
        cVal: r.findIndex(function (h) {
          return VALUTA.test(h) && !/valore/i.test(h);
        }),
        cTipo: r.findIndex(function (h) {
          return TIPO.test(h);
        }),
        cTick: r.findIndex(function (h) {
          return TICKER.test(h);
        }),
        punteggio: punteggio
      };
    }
  }
  if (!best) return {
    rows: [],
    errore: "Non trovo le colonne del peso o del titolo."
  };

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
    if (usaTipo ? SCARTA.test(tipo) : SCARTA.test(nome)) {
      scartate++;
      continue;
    }
    rows.push({
      isin: isISIN(isin) ? isin : "",
      nome: nome || isin,
      tick: best.cTick > -1 ? String(row[best.cTick] == null ? "" : row[best.cTick]).trim().split(/\s+/)[0] : "",
      peso: peso,
      sett: best.cSett > -1 ? String(row[best.cSett] == null ? "" : row[best.cSett]).trim() : "",
      paese: best.cPaese > -1 ? String(row[best.cPaese] == null ? "" : row[best.cPaese]).trim() : "",
      val: best.cVal > -1 ? String(row[best.cVal] == null ? "" : row[best.cVal]).trim() : ""
    });
  }
  if (!rows.length) return {
    rows: [],
    errore: "Intestazione riconosciuta ma nessuna riga valida."
  };
  var somma = rows.reduce(function (a, r) {
    return a + r.peso;
  }, 0);
  var fattore = somma > 0 && somma < 2 ? 100 : 1;
  rows.forEach(function (r) {
    r.peso *= fattore;
  });
  return {
    rows: rows,
    somma: somma * fattore,
    scartate: scartate,
    errore: null
  };
}

/* Costituenti EURO STOXX 50. WS5X è un ETC sintetico: non esiste un elenco di
   titoli detenuti, quindi l'esposizione economica è quella dell'indice. */
var ESTX50 = "ASML HLDG 8.47|LVMH MOET HENNESSY 7.18|TOTALENERGIES 4.27|SAP 4.12|SIEMENS 3.91|SANOFI 3.48|L'OREAL 3.20|SCHNEIDER ELECTRIC 2.96|AIR LIQUIDE 2.80|ALLIANZ 2.70|AIRBUS 2.44|HERMES INTERNATIONAL 2.23|IBERDROLA 2.22|DEUTSCHE TELEKOM 2.15|VINCI 2.08|BNP PARIBAS 2.05|MERCEDES-BENZ GROUP 1.91|BCO SANTANDER 1.72|SAFRAN 1.70|ESSILORLUXOTTICA 1.67|AXA 1.67|BAYER 1.64|INFINEON TECHNOLOGIES 1.58|PROSUS 1.58|ANHEUSER-BUSCH INBEV 1.52|ENEL 1.51|MUENCHENER RUECK 1.47|ING GRP 1.46|ADYEN 1.44|DEUTSCHE POST 1.39|BCO BILBAO VIZCAYA ARGENTARIA 1.30|BASF 1.30|PERNOD RICARD 1.29|INTESA SANPAOLO 1.27|INDUSTRIA DE DISENO TEXTIL 1.22|KERING 1.21|UNICREDIT 1.19|STELLANTIS 1.18|CRH 1.17|NORDEA BANK 1.15|BMW 1.14|DANONE 1.13|FLUTTER ENTERTAINMENT 1.05|DEUTSCHE BOERSE 1.05|ENI 1.02|AHOLD DELHAIZE 0.95|ADIDAS 0.93|VOLKSWAGEN PREF 0.85|NOKIA 0.67|VONOVIA 0.42".split("|").map(function (s) {
  var i = s.lastIndexOf(" ");
  return {
    isin: "",
    nome: s.slice(0, i),
    tick: "",
    peso: parseFloat(s.slice(i + 1)),
    sett: "",
    paese: "",
    val: "EUR"
  };
});
var COMPOSIZIONI_INTERNE = {
  XS2427362145: {
    file: "EURO STOXX 50 — costituenti dell'indice",
    interno: true,
    data: "indice",
    rows: ESTX50
  }
};

/* ------------------- rendimenti di periodo e regressione ------------------- */

/* Rendimento fra due rilevazioni, dai prezzi per quota e pesato con i valori
   di inizio periodo. Così è immune sia ai versamenti sia alle vendite: un
   acquisto cambia le quantità, non i prezzi. La formula basata sulla
   variazione di valore scambierebbe ogni movimento di cassa per rendimento. */
function rendimentoPeriodo(prima, dopo) {
  if (!prima || !dopo || !prima.px || !dopo.px) return null;
  var comuni = Object.keys(prima.px).filter(function (k) {
    return dopo.px[k] > 0 && prima.px[k] > 0 && (prima.val && prima.val[k] || 0) > 0;
  });
  if (!comuni.length) return null;
  var base = comuni.reduce(function (a, k) {
    return a + prima.val[k];
  }, 0);
  if (base <= 0) return null;
  var r = comuni.reduce(function (a, k) {
    return a + prima.val[k] / base * (dopo.px[k] / prima.px[k] - 1);
  }, 0);
  var rb = prima.px[BENCHMARK] > 0 && dopo.px[BENCHMARK] > 0 ? dopo.px[BENCHMARK] / prima.px[BENCHMARK] - 1 : null;
  var rf = prima.px[RISK_FREE] > 0 && dopo.px[RISK_FREE] > 0 ? dopo.px[RISK_FREE] / prima.px[RISK_FREE] - 1 : 0;
  var giorni = Math.round((new Date(dopo.date) - new Date(prima.date)) / 86400000);
  return {
    da: prima.date,
    a: dopo.date,
    giorni: giorni,
    r: r,
    rb: rb,
    rf: rf,
    copertura: prima.mkt ? base / prima.mkt : 0
  };
}

/* Regressione dei rendimenti in eccesso: r_p − r_f = alpha + beta (r_b − r_f).
   Restituisce anche gli errori standard: senza quelli una stima da poche
   osservazioni sembra più solida di quanto sia. */
function regressione(oss) {
  var d = oss.filter(function (o) {
    return o && o.rb != null;
  });
  var n = d.length;
  if (n < 2) return {
    n: n,
    ok: false
  };
  var x = d.map(function (o) {
    return o.rb - o.rf;
  });
  var y = d.map(function (o) {
    return o.r - o.rf;
  });
  var mx = x.reduce(function (a, v) {
    return a + v;
  }, 0) / n;
  var my = y.reduce(function (a, v) {
    return a + v;
  }, 0) / n;
  var sxx = x.reduce(function (a, v) {
    return a + Math.pow(v - mx, 2);
  }, 0);
  if (sxx <= 0) return {
    n: n,
    ok: false
  };
  var sxy = x.reduce(function (a, v, i) {
    return a + (v - mx) * (y[i] - my);
  }, 0);
  var beta = sxy / sxx;
  var alpha = my - beta * mx;
  var sse = y.reduce(function (a, v, i) {
    return a + Math.pow(v - alpha - beta * x[i], 2);
  }, 0);
  var syy = y.reduce(function (a, v) {
    return a + Math.pow(v - my, 2);
  }, 0);
  var gl = n - 2;
  var s2 = gl > 0 ? sse / gl : NaN;
  var seBeta = gl > 0 ? Math.sqrt(s2 / sxx) : NaN;
  var seAlpha = gl > 0 ? Math.sqrt(s2 * (1 / n + mx * mx / sxx)) : NaN;
  var gg = d.reduce(function (a, o) {
    return a + o.giorni;
  }, 0) / n;
  var perAnno = gg > 0 ? 365 / gg : 12;
  return {
    n: n,
    ok: true,
    beta: beta,
    alpha: alpha,
    seBeta: seBeta,
    seAlpha: seAlpha,
    r2: syy > 0 ? 1 - sse / syy : NaN,
    alphaAnnuo: Math.pow(1 + alpha, perAnno) - 1,
    perAnno: perAnno,
    punti: d.map(function (o, i) {
      return {
        x: x[i] * 100,
        y: y[i] * 100,
        data: o.a
      };
    })
  };
}

/* ------------------------------- formatters -------------------------------- */

function eur(v, d) {
  d = d || 0;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: d,
    maximumFractionDigits: d
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
    minimumFractionDigits: d,
    maximumFractionDigits: d
  }) + "%";
}
function num(v, d) {
  if (d == null) d = 2;
  return (v || 0).toLocaleString("it-IT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}
function signed(v) {
  return v >= 0 ? T.green : T.red;
}
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
    if (r && r.some(function (c) {
      return String(c).trim() === "ISIN";
    })) {
      hIdx = i;
      break;
    }
  }
  if (hIdx < 0) throw new Error("Intestazione non trovata: manca la colonna ISIN.");
  var head = grid[hIdx].map(function (c) {
    return String(c || "").trim();
  });
  function col(name) {
    return head.findIndex(function (h) {
      return h.toLowerCase() === name.toLowerCase();
    });
  }
  var cIsin = col("ISIN"),
    cNome = col("Titolo"),
    cQty = col("Quantità");
  var cCar = col("Valore di carico"),
    cMkt = col("Valore di mercato €");
  var cTer = col("TER"),
    cRat = col("Rateo");
  var out = [],
    ignoti = [];
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
      rateo: cRat >= 0 ? Number(row[cRat]) || 0 : 0
    });
  }
  if (!out.length) throw new Error("Nessuna posizione riconosciuta nel file.");
  return {
    rows: out,
    ignoti: ignoti
  };
}

/* abbina un file di composizione al fondo, dal nome file e dall'intestazione */
function abbinaFondo(nomeFile, testa, fondi) {
  var spia = (nomeFile + " " + testa).toUpperCase();
  var match = null,
    max = 0;
  fondi.forEach(function (p) {
    var s = 0;
    if (spia.indexOf(p.isin) > -1) s += 10;
    if (new RegExp("(^|[^A-Z0-9])" + p.t + "([^A-Z0-9]|$)").test(spia)) s += 6;
    p.n.toUpperCase().split(/[^A-Z0-9&]+/).filter(function (w) {
      return w.length >= 5 && !/^(GLOBAL|WORLD|SMALL|VALUE|QUALITY|CORE|INDEX)$/.test(w);
    }).forEach(function (w) {
      if (spia.indexOf(w) > -1) s += 2;
    });
    if (s > max) {
      max = s;
      match = p;
    }
  });
  return max < 2 ? null : match;
}

/* ---- 02-vault.js ---- */
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
    req.onsuccess = function () {
      res(req.result);
    };
    req.onerror = function () {
      rej(req.error || new Error("Archivio locale non accessibile."));
    };
  });
}
function idbGet(key) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(VAULT_STORE, "readonly");
      var rq = tx.objectStore(VAULT_STORE).get(key);
      rq.onsuccess = function () {
        res(rq.result);
      };
      rq.onerror = function () {
        rej(rq.error);
      };
    });
  });
}
function idbPut(key, val) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(VAULT_STORE, "readwrite");
      tx.objectStore(VAULT_STORE).put(val, key);
      tx.oncomplete = function () {
        res(true);
      };
      tx.onerror = function () {
        rej(tx.error);
      };
    });
  });
}
function idbDel(key) {
  return idbOpen().then(function (db) {
    return new Promise(function (res, rej) {
      var tx = db.transaction(VAULT_STORE, "readwrite");
      tx.objectStore(VAULT_STORE).delete(key);
      tx.oncomplete = function () {
        res(true);
      };
      tx.onerror = function () {
        rej(tx.error);
      };
    });
  });
}

/* ------------------------------ cifratura --------------------------------- */

function cryptoOk() {
  return !!(self.crypto && self.crypto.subtle && self.crypto.getRandomValues);
}
function derivaChiave(passphrase, salt, iter) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]).then(function (base) {
    return crypto.subtle.deriveKey({
      name: "PBKDF2",
      salt: salt,
      iterations: iter,
      hash: "SHA-256"
    }, base, {
      name: "AES-GCM",
      length: 256
    }, false, /* non estraibile: la chiave non può essere letta dal codice */
    ["encrypt", "decrypt"]);
  });
}
function cifra(chiave, oggetto) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var dati = new TextEncoder().encode(JSON.stringify(oggetto));
  return crypto.subtle.encrypt({
    name: "AES-GCM",
    iv: iv
  }, chiave, dati).then(function (ct) {
    return {
      iv: iv,
      ct: new Uint8Array(ct)
    };
  });
}
function decifra(chiave, iv, ct) {
  return crypto.subtle.decrypt({
    name: "AES-GCM",
    iv: iv
  }, chiave, ct).then(function (buf) {
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
    }).catch(function () {
      return false;
    });
  },
  /* chiede al browser di non sfrattare i dati alla prima pulizia */
  chiediPersistenza: function () {
    try {
      if (navigator.storage && navigator.storage.persist) return navigator.storage.persist();
    } catch (e) {/* non supportato: si continua */}
    return Promise.resolve(false);
  },
  /* prima apertura: crea la cassaforte con i dati iniziali */
  crea: function (passphrase, dati) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var self_ = this;
    return derivaChiave(passphrase, salt, VAULT_ITER).then(function (k) {
      return cifra(k, dati).then(function (c) {
        var inv = {
          v: 1,
          salt: salt,
          iter: VAULT_ITER,
          iv: c.iv,
          ct: c.ct,
          agg: new Date().toISOString()
        };
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
      var inv = Object.assign({}, self_.involucro, {
        iv: c.iv,
        ct: c.ct,
        agg: new Date().toISOString()
      });
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
        var inv = {
          v: 1,
          salt: salt,
          iter: VAULT_ITER,
          iv: c.iv,
          ct: c.ct,
          agg: new Date().toISOString()
        };
        return idbPut(VAULT_KEY, inv).then(function () {
          self_.chiave = k;
          self_.involucro = inv;
          return true;
        });
      });
    });
  },
  chiudi: function () {
    this.chiave = null;
  },
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
        agg: inv.agg
      };
    });
  },
  /* ripristino da copia cifrata: serve la passphrase di quando fu creata */
  importaCifrato: function (file, passphrase) {
    var self_ = this;
    var salt = unb64(file.salt),
      iv = unb64(file.iv),
      ct = unb64(file.ct);
    return derivaChiave(passphrase, salt, file.iter || VAULT_ITER).then(function (k) {
      return decifra(k, iv, ct).then(function (dati) {
        var inv = {
          v: 1,
          salt: salt,
          iter: file.iter || VAULT_ITER,
          iv: iv,
          ct: ct,
          agg: new Date().toISOString()
        };
        return idbPut(VAULT_KEY, inv).then(function () {
          self_.chiave = k;
          self_.involucro = inv;
          return dati;
        });
      }).catch(function () {
        throw new Error("passphrase");
      });
    });
  }
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
    rows: [],
    /* posizioni dell'ultimo export */
    asOf: "",
    /* data della situazione */
    snapshots: [],
    /* serie storica, con prezzi per quota */
    holdings: {},
    /* composizioni dei fondi */
    opz: {
      /* preferenze */
      zainetto: 0,
      /* da impostare nel simulatore: è un dato personale */
      sogliaUsd: 45,
      proxySP: false,
      usdOverride: {},
      betaOverride: {},
      minutiBlocco: 5
    }
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
    opz: Object.assign(base.opz, d.opz && typeof d.opz === "object" ? d.opz : {})
  };
}

/* ---- 03-app.jsx ---- */
/* ==========================================================================
   San Giorgio — interfaccia
   Pensata per il pollice su iPhone e per la larghezza su iPad: barra in basso,
   elenchi al posto delle tabelle sullo schermo stretto, tabelle quando lo
   spazio c'è.
   ========================================================================== */

var useState = React.useState;
var useMemo = React.useMemo;
var useEffect = React.useEffect;
var useCallback = React.useCallback;
var useRef = React.useRef;

/* ------------------------------- utilità ---------------------------------- */

/* vero quando lo schermo è abbastanza largo per una tabella vera */
function useLargo() {
  var q = "(min-width: 760px)";
  var [largo, setLargo] = useState(function () {
    return typeof matchMedia === "function" ? matchMedia(q).matches : false;
  });
  useEffect(function () {
    if (typeof matchMedia !== "function") return;
    var mq = matchMedia(q);
    var h = function (e) {
      setLargo(e.matches);
    };
    if (mq.addEventListener) mq.addEventListener("change", h);else mq.addListener(h);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", h);else mq.removeListener(h);
    };
  }, []);
  return largo;
}
function scarica(nome, testo, tipo) {
  var blob = new Blob([testo], {
    type: tipo || "application/json"
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ------------------------------- icone ------------------------------------ */
/* disegnate qui: nessun file, nessuna libreria, nitide a ogni densità */

function Icona(p) {
  var s = p.size || 23;
  var c = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: p.attiva ? 2.1 : 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };
  if (p.nome === "sintesi") return /*#__PURE__*/React.createElement("svg", c, /*#__PURE__*/React.createElement("path", {
    d: "M3 20h18"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "12",
    width: "4",
    height: "5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "7",
    width: "4",
    height: "10"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "16",
    y: "10",
    width: "4",
    height: "7"
  }));
  if (p.nome === "titoli") return /*#__PURE__*/React.createElement("svg", c, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.5",
    strokeDasharray: "2 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"
  }));
  if (p.nome === "rischio") return /*#__PURE__*/React.createElement("svg", c, /*#__PURE__*/React.createElement("path", {
    d: "M3 17L9 11l4 3 7-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 11V7h-4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "11",
    r: "1.3"
  }));
  if (p.nome === "stress") return /*#__PURE__*/React.createElement("svg", c, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l9 16H3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 10v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16.5v.5"
  }));
  if (p.nome === "altro") return /*#__PURE__*/React.createElement("svg", c, /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1.4"
  }));
  if (p.nome === "indietro") return /*#__PURE__*/React.createElement("svg", {
    ...c,
    width: "20",
    height: "20"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 6l-6 6 6 6"
  }));
  if (p.nome === "chev") return /*#__PURE__*/React.createElement("svg", {
    ...c,
    width: "18",
    height: "18",
    strokeWidth: "1.8"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 6l6 6-6 6"
  }));
  if (p.nome === "lucchetto") return /*#__PURE__*/React.createElement("svg", {
    ...c,
    width: s,
    height: s
  }, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "14",
    height: "9",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V8a4 4 0 018 0v3"
  }));
  return null;
}

/* ------------------------- mattoni dell'interfaccia ----------------------- */

function Stat(p) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "stat-lab"
  }, p.label), /*#__PURE__*/React.createElement("div", {
    className: "stat-val num",
    style: {
      color: p.color || T.ink
    }
  }, p.v), p.sub ? /*#__PURE__*/React.createElement("div", {
    className: "stat-sub num"
  }, p.sub) : null);
}
function Riga(p) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      padding: "9px 0",
      borderBottom: "1px solid " + T.ruleSoft,
      minHeight: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: p.muted ? T.muted : T.ink2
    }
  }, p.l), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      fontSize: p.strong ? 17 : 14.5,
      fontWeight: p.strong ? 600 : 400,
      color: p.color || T.ink
    }
  }, p.v), p.sub ? /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      display: "block",
      fontSize: 11.5,
      color: p.color || T.muted
    }
  }, p.sub) : null));
}

/* barra che parte da sinistra */
function Bar(p) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bar",
    style: {
      height: p.h || 8
    }
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: Math.max(0, Math.min(100, p.pct)) + "%",
      background: p.col || T.cobalt
    }
  }));
}

/* barra con lo zero al centro, per i contributi che possono essere negativi */
function BarMid(p) {
  var w = Math.abs(p.v) / (p.max || 1) * 50;
  return /*#__PURE__*/React.createElement("div", {
    className: "bar-mid",
    style: {
      height: p.h || 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "zero"
  }), /*#__PURE__*/React.createElement("i", {
    style: {
      background: p.v >= 0 ? T.green : T.red,
      left: p.v >= 0 ? "50%" : 50 - w + "%",
      width: w + "%"
    }
  }));
}

/* ------------- elemento firma: la striscia a due assi, toccabile ---------- */

function Striscia(p) {
  var tot = p.tot,
    soglia = p.soglia;
  var [apri, setApri] = useState(null);
  var W = 1000,
    H = 86;
  var x = 0;
  var segs = CLASS_ORDER.filter(function (c) {
    return tot.byClass[c] > 0;
  }).map(function (c) {
    var w = tot.byClass[c] / tot.mkt * W;
    var s = {
      c: c,
      x: x,
      w: w,
      pctv: tot.byClass[c] / tot.mkt * 100
    };
    x += w;
    return s;
  });
  var usdW = tot.usdNoGoldPct / 100 * W;
  var oroW = (tot.usdPct - tot.usdNoGoldPct) / 100 * W;
  var sogliaX = soglia / 100 * W;
  var oltre = tot.usdNoGoldPct > soglia;
  var dett = apri ? segs.filter(function (s) {
    return s.c === apri;
  })[0] : null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    className: "strip",
    viewBox: "0 0 " + W + " " + H,
    role: "img",
    "aria-label": "Composizione per classe di attivo e ripartizione valutaria"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "tratteggio",
    width: "7",
    height: "7",
    patternTransform: "rotate(45)",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "7",
    height: "7",
    fill: T.brass
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "7",
    stroke: T.brassDark,
    strokeWidth: "3"
  }))), segs.map(function (s) {
    var att = apri === s.c;
    return /*#__PURE__*/React.createElement("g", {
      key: s.c,
      onClick: function () {
        setApri(att ? null : s.c);
      },
      style: {
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("rect", {
      x: s.x,
      y: 0,
      width: Math.max(s.w - 2, 1),
      height: 34,
      fill: CLASS_COLOR[s.c],
      opacity: apri && !att ? 0.42 : 1
    }), s.w > 150 ? /*#__PURE__*/React.createElement("text", {
      x: s.x + 9,
      y: 22,
      fontSize: "15",
      fill: T.onFill,
      fontWeight: "600",
      style: {
        fontVariantNumeric: "tabular-nums"
      }
    }, pct(s.pctv, 0)) : null);
  }), /*#__PURE__*/React.createElement("rect", {
    x: 0,
    y: 44,
    width: W,
    height: 26,
    fill: T.barBg
  }), /*#__PURE__*/React.createElement("rect", {
    x: 0,
    y: 44,
    width: usdW,
    height: 26,
    fill: T.brass
  }), /*#__PURE__*/React.createElement("rect", {
    x: usdW,
    y: 44,
    width: oroW,
    height: 26,
    fill: "url(#tratteggio)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: sogliaX,
    y1: 38,
    x2: sogliaX,
    y2: 76,
    stroke: oltre ? T.red : T.ink,
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("text", {
    x: 9,
    y: 62,
    fontSize: "14",
    fill: T.onFill,
    fontWeight: "600",
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, "USD ", pct(tot.usdNoGoldPct, 0)), /*#__PURE__*/React.createElement("text", {
    x: W - 9,
    y: 62,
    fontSize: "14",
    fill: T.ink,
    textAnchor: "end",
    fontWeight: "600",
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, "EUR ", pct(100 - tot.usdPct, 0)), /*#__PURE__*/React.createElement("text", {
    x: sogliaX + 7,
    y: 84,
    fontSize: "12",
    fill: oltre ? T.red : T.muted,
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, "soglia ", soglia, "%")), dett ? /*#__PURE__*/React.createElement("div", {
    className: "reveal",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 10,
      padding: "8px 0 2px",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: T.ink2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      width: 9,
      height: 9,
      borderRadius: 2,
      background: CLASS_COLOR[dett.c],
      marginRight: 7
    }
  }), dett.c), /*#__PURE__*/React.createElement("span", {
    className: "num",
    style: {
      color: T.ink
    }
  }, eur(tot.byClass[dett.c]), " · ", pct(dett.pctv))) : /*#__PURE__*/React.createElement("div", {
    className: "tiny",
    style: {
      paddingTop: 6
    }
  }, "Tocca una banda per il valore. La fascia tratteggiata è l'oro, contato a parte: prezzato in dollari ma non è un rischio-paese."));
}

/* --------------- grafico dello storico, disegnato a mano ----------------- */
/* Niente libreria di grafici: due serie su due scale, poche decine di punti.
   Scritto a mano pesa qualche riga e toglie una dipendenza esterna. */

function LineaStorico(p) {
  var dati = p.dati;
  if (dati.length < 2) return null;
  var W = 680,
    H = 200,
    mL = 48,
    mR = 40,
    mT = 10,
    mB = 26;
  var vals = dati.map(function (d) {
    return d.mkt;
  });
  var usds = dati.map(function (d) {
    return d.usd;
  });
  var vMin = Math.min.apply(null, vals),
    vMax = Math.max.apply(null, vals);
  var pad = (vMax - vMin) * 0.12 || Math.max(vMax * 0.02, 100);
  vMin -= pad;
  vMax += pad;
  var uMin = Math.min.apply(null, usds),
    uMax = Math.max.apply(null, usds);
  var uPad = (uMax - uMin) * 0.2 || 2;
  uMin -= uPad;
  uMax += uPad;
  var px = function (i) {
    return mL + (dati.length === 1 ? 0 : i / (dati.length - 1) * (W - mL - mR));
  };
  var pyV = function (v) {
    return mT + (1 - (v - vMin) / (vMax - vMin || 1)) * (H - mT - mB);
  };
  var pyU = function (v) {
    return mT + (1 - (v - uMin) / (uMax - uMin || 1)) * (H - mT - mB);
  };
  var linea = function (acc, f) {
    return dati.map(function (d, i) {
      return (i ? "L" : "M") + px(i) + " " + f(acc(d));
    }).join(" ");
  };
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 " + W + " " + H,
    className: "strip",
    role: "img",
    "aria-label": "Valore del portafoglio ed esposizione al dollaro nel tempo"
  }, [0, 0.5, 1].map(function (f) {
    var y = mT + f * (H - mT - mB);
    return /*#__PURE__*/React.createElement("line", {
      key: f,
      x1: mL,
      y1: y,
      x2: W - mR,
      y2: y,
      stroke: T.ruleSoft,
      strokeDasharray: "2 4"
    });
  }), /*#__PURE__*/React.createElement("text", {
    x: mL - 6,
    y: pyV(vMax) + 4,
    fontSize: "11",
    fill: T.muted,
    textAnchor: "end",
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, Math.round(vMax / 1000) + "k"), /*#__PURE__*/React.createElement("text", {
    x: mL - 6,
    y: pyV(vMin) + 4,
    fontSize: "11",
    fill: T.muted,
    textAnchor: "end",
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, Math.round(vMin / 1000) + "k"), /*#__PURE__*/React.createElement("text", {
    x: W - mR + 6,
    y: pyU(uMax) + 4,
    fontSize: "11",
    fill: T.brass,
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, Math.round(uMax) + "%"), /*#__PURE__*/React.createElement("text", {
    x: W - mR + 6,
    y: pyU(uMin) + 4,
    fontSize: "11",
    fill: T.brass,
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }, Math.round(uMin) + "%"), /*#__PURE__*/React.createElement("path", {
    d: linea(function (d) {
      return d.usd;
    }, pyU),
    fill: "none",
    stroke: T.brass,
    strokeWidth: "2",
    strokeDasharray: "5 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: linea(function (d) {
      return d.mkt;
    }, pyV),
    fill: "none",
    stroke: T.cobalt,
    strokeWidth: "2.4"
  }), dati.map(function (d, i) {
    return /*#__PURE__*/React.createElement("circle", {
      key: d.date,
      cx: px(i),
      cy: pyV(d.mkt),
      r: "3.4",
      fill: T.cobalt
    });
  }), /*#__PURE__*/React.createElement("text", {
    x: mL,
    y: H - 7,
    fontSize: "11",
    fill: T.muted
  }, dateIt(dati[0].date).slice(0, 5)), /*#__PURE__*/React.createElement("text", {
    x: W - mR,
    y: H - 7,
    fontSize: "11",
    fill: T.muted,
    textAnchor: "end"
  }, dateIt(dati[dati.length - 1].date).slice(0, 5)));
}

/* nuvola dei periodi: pochi punti, quindi grandi e leggibili */
function Nuvola(p) {
  var punti = p.punti;
  if (!punti.length) return null;
  var W = 320,
    H = 240,
    m = 36;
  var lim = Math.max(1, Math.max.apply(null, punti.map(function (q) {
    return Math.max(Math.abs(q.x), Math.abs(q.y));
  }))) * 1.25;
  var px = function (v) {
    return m + (v + lim) / (2 * lim) * (W - m - 10);
  };
  var py = function (v) {
    return H - m - (v + lim) / (2 * lim) * (H - m - 10);
  };
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 " + W + " " + H,
    className: "strip",
    style: {
      maxWidth: 360
    },
    role: "img",
    "aria-label": "Rendimenti del portafoglio contro quelli del benchmark"
  }, /*#__PURE__*/React.createElement("line", {
    x1: m,
    y1: py(0),
    x2: W - 10,
    y2: py(0),
    stroke: T.rule
  }), /*#__PURE__*/React.createElement("line", {
    x1: px(0),
    y1: 10,
    x2: px(0),
    y2: H - m,
    stroke: T.rule
  }), /*#__PURE__*/React.createElement("line", {
    x1: px(-lim),
    y1: py(-lim),
    x2: px(lim),
    y2: py(lim),
    stroke: T.rule,
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("text", {
    x: W - 12,
    y: py(lim) + 12,
    fontSize: "10",
    fill: T.muted,
    textAnchor: "end"
  }, "beta 1"), p.mostraRetta ? /*#__PURE__*/React.createElement("line", {
    x1: px(-lim),
    y1: py(p.alpha + p.beta * -lim),
    x2: px(lim),
    y2: py(p.alpha + p.beta * lim),
    stroke: T.cobalt,
    strokeWidth: "2.4"
  }) : null, punti.map(function (q, i) {
    return /*#__PURE__*/React.createElement("circle", {
      key: q.data + i,
      cx: px(q.x),
      cy: py(q.y),
      r: "6",
      fill: T.brass,
      opacity: "0.85"
    });
  }), /*#__PURE__*/React.createElement("text", {
    x: m,
    y: H - 10,
    fontSize: "10",
    fill: T.muted
  }, "−", num(lim, 1), "%"), /*#__PURE__*/React.createElement("text", {
    x: W - 10,
    y: H - 10,
    fontSize: "10",
    fill: T.muted,
    textAnchor: "end"
  }, "+", num(lim, 1), "%"));
}

/* ------------------------------ avvisi ------------------------------------ */

function Avvisi(p) {
  if (!p.alerts.length) return null;
  return /*#__PURE__*/React.createElement("div", null, p.alerts.map(function (a, i) {
    var col = a.lv === "alto" ? T.red : a.lv === "medio" ? T.brass : T.slate;
    return /*#__PURE__*/React.createElement("div", {
      className: "alert",
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "alert-dot",
      style: {
        background: col
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "alert-t"
    }, a.t), /*#__PURE__*/React.createElement("div", {
      className: "alert-d"
    }, a.d)));
  }));
}

/* ====================== schermata di blocco e avvio ====================== */

function Blocco(p) {
  var [pw, setPw] = useState("");
  var [pw2, setPw2] = useState("");
  var [err, setErr] = useState("");
  var [lav, setLav] = useState(false);
  var nuova = p.modo === "crea";
  function invia(e) {
    e.preventDefault();
    setErr("");
    if (nuova) {
      if (pw.length < 8) {
        setErr("Serve una passphrase di almeno 8 caratteri.");
        return;
      }
      if (pw !== pw2) {
        setErr("Le due passphrase non coincidono.");
        return;
      }
    } else if (!pw) {
      return;
    }
    setLav(true);
    p.onInvia(pw).catch(function (e2) {
      setLav(false);
      setErr(e2 && e2.message === "passphrase" ? "Passphrase non valida." : "Non riesco ad aprire l'archivio. " + (e2 && e2.message || ""));
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "lock"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "lock-mark",
    width: "54",
    height: "54",
    viewBox: "0 0 48 48",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "10",
    width: "40",
    height: "11",
    rx: "2",
    fill: T.cobalt
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "25",
    width: "40",
    height: "11",
    rx: "2",
    fill: T.brass
  }), /*#__PURE__*/React.createElement("line", {
    x1: "31",
    y1: "5",
    x2: "31",
    y2: "43",
    stroke: T.red,
    strokeWidth: "3.4",
    strokeLinecap: "round"
  })), /*#__PURE__*/React.createElement("h1", null, "San Giorgio"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, nuova ? "Scegli una passphrase. Protegge i dati sul dispositivo e non viene salvata da nessuna parte: se la perdi, l'archivio non è recuperabile." : "Inserisci la passphrase per aprire l'archivio."), /*#__PURE__*/React.createElement("form", {
    onSubmit: invia
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "password",
    value: pw,
    autoComplete: nuova ? "new-password" : "current-password",
    onChange: function (e) {
      setPw(e.target.value);
    },
    placeholder: "Passphrase",
    autoFocus: true,
    "aria-label": "Passphrase"
  }), nuova ? /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "password",
    value: pw2,
    autoComplete: "new-password",
    onChange: function (e) {
      setPw2(e.target.value);
    },
    placeholder: "Ripeti la passphrase",
    "aria-label": "Ripeti la passphrase"
  }) : null, err ? /*#__PURE__*/React.createElement("div", {
    className: "err"
  }, err) : null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-pri",
    type: "submit",
    disabled: lav
  }, lav ? "Un momento…" : nuova ? "Crea l'archivio" : "Apri")), !nuova && p.onRipristina ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "btn btn-sm",
    style: {
      display: "inline-flex"
    }
  }, "Ripristina da una copia", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json,application/json",
    style: {
      display: "none"
    },
    onChange: p.onRipristina
  }))) : null, /*#__PURE__*/React.createElement("p", {
    className: "tiny",
    style: {
      marginTop: 22
    }
  }, nuova ? "Niente account, niente server: l'archivio vive solo in questo browser, su questo dispositivo." : "Hai dimenticato la passphrase? Non esiste un recupero. Si può ripartire da zero da Altro → Sicurezza, dopo aver sbloccato, oppure ripristinare una copia."));
}

/* ---- 04-derive.js ---- */
/* ==========================================================================
   San Giorgio — derivazioni
   Funzioni pure: prendono le posizioni e le opzioni, restituiscono numeri.
   Nessuno stato, nessun React: così si possono collaudare da sole.
   ========================================================================== */

function calcPositions(rows, usdOverride, ordine) {
  var total = rows.reduce(function (a, r) {
    return a + r.mkt;
  }, 0) || 1;
  return rows.map(function (r) {
    var b = BOOK[r.isin] || {
      n: r.nome || r.isin,
      t: (r.nome || r.isin).slice(0, 6),
      c: "Azionario",
      usd: 0,
      reg: {},
      tax: "diversi",
      rate: 0.26
    };
    var usd = usdOverride && usdOverride[r.isin] != null ? usdOverride[r.isin] / 100 : b.usd;
    return Object.assign({}, r, b, {
      usd: usd,
      peso: r.mkt / total * 100,
      pl: r.mkt - r.carico,
      plPct: r.carico ? (r.mkt / r.carico - 1) * 100 : 0
    });
  }).sort(function (a, b) {
    if (ordine === "pl") return a.plPct - b.plPct;
    if (ordine === "nome") return a.n.localeCompare(b.n);
    return b.mkt - a.mkt;
  });
}
function calcTot(positions) {
  var mkt = positions.reduce(function (a, p) {
    return a + p.mkt;
  }, 0);
  var carico = positions.reduce(function (a, p) {
    return a + p.carico;
  }, 0);
  var ratei = positions.reduce(function (a, p) {
    return a + (p.rateo || 0);
  }, 0);
  var terEur = positions.reduce(function (a, p) {
    return a + (p.ter ? p.mkt * p.ter / 100 : 0);
  }, 0);
  var usdEur = positions.reduce(function (a, p) {
    return a + p.mkt * p.usd;
  }, 0);
  var usdNoGold = positions.reduce(function (a, p) {
    return a + (p.c === "Oro" ? 0 : p.mkt * p.usd);
  }, 0);
  var byClass = {};
  CLASS_ORDER.forEach(function (c) {
    byClass[c] = 0;
  });
  positions.forEach(function (p) {
    byClass[p.c] = (byClass[p.c] || 0) + p.mkt;
  });
  var reg = {
    US: 0,
    EU: 0,
    JP: 0,
    ALTRO: 0
  };
  var eqTot = 0;
  positions.forEach(function (p) {
    if (p.c !== "Azionario") return;
    eqTot += p.mkt;
    Object.keys(p.reg || {}).forEach(function (k) {
      reg[k] += p.mkt * p.reg[k];
    });
  });
  return {
    mkt: mkt,
    carico: carico,
    ratei: ratei,
    terEur: terEur,
    terPct: mkt ? terEur / mkt * 100 : 0,
    pl: mkt - carico,
    plPct: carico ? (mkt / carico - 1) * 100 : 0,
    usdEur: usdEur,
    usdPct: mkt ? usdEur / mkt * 100 : 0,
    usdNoGoldPct: mkt ? usdNoGold / mkt * 100 : 0,
    byClass: byClass,
    reg: reg,
    eqTot: eqTot
  };
}
function calcTitoli(positions, holdings, totMkt, proxySP) {
  var mappa = new Map();
  var fondiCoperti = [];
  var eqTot = 0,
    eqCoperto = 0;
  var comp = Object.assign({}, COMPOSIZIONI_INTERNE, holdings);

  /* l'ETC sull'S&P 500 è sintetico: si può approssimare con la parte USA di
     SWDA rinormalizzata, ed è una stima, non il paniere reale */
  if (proxySP && comp[BENCHMARK] && comp[BENCHMARK].rows && comp[BENCHMARK].rows.length && !comp.XS2427355958) {
    var us = comp[BENCHMARK].rows.filter(function (r) {
      return /stati uniti|united states/i.test(r.paese || "") || /^US/.test(r.isin || "");
    });
    var sUs = us.reduce(function (a, r) {
      return a + r.peso;
    }, 0);
    if (sUs > 20) {
      comp.XS2427355958 = {
        file: "Stima: parte USA di SWDA rinormalizzata",
        stima: true,
        data: "stima",
        rows: us.map(function (r) {
          return Object.assign({}, r, {
            peso: r.peso / sUs * 100
          });
        })
      };
    }
  }
  function aggiungi(chiave, nome, isin, val, fonte, tier, sett, paese) {
    if (!mappa.has(chiave)) {
      mappa.set(chiave, {
        chiave: chiave,
        nome: nome,
        isin: isin,
        eur: 0,
        fonti: {},
        sett: sett,
        paese: paese,
        tier: tier
      });
    }
    var t = mappa.get(chiave);
    t.eur += val;
    t.fonti[fonte] = (t.fonti[fonte] || 0) + val;
    if (!t.isin && isin) t.isin = isin;
    if (!t.sett && sett) t.sett = sett;
    if (!t.paese && paese) t.paese = paese;
    /* il canale più diretto vince: un titolo riconosciuto t1 da una fonte resta
       t1 anche se un'altra fonte non ha i dati per riconoscerlo */
    if (AI_TIER_ORDER.indexOf(tier) < AI_TIER_ORDER.indexOf(t.tier)) t.tier = tier;
    if (nome && nome.length < t.nome.length && nome.length > 3) t.nome = nome;
  }
  var aiQuote = {};
  positions.forEach(function (p) {
    if (p.c !== "Azionario") return;
    eqTot += p.mkt;
    if (p.az) {
      eqCoperto += p.mkt;
      var tier = p.ai && AI_TIER_ORDER.filter(function (k) {
        return p.ai[k] === 1;
      })[0] || "resto";
      aggiungi(p.isin, p.n, p.isin, p.mkt, p.t, tier, "", "");
      aiQuote[p.isin] = p.ai || {
        resto: 1
      };
      return;
    }
    var h = comp[p.isin];
    if (!h || !h.rows || !h.rows.length) return;
    eqCoperto += p.mkt;
    fondiCoperti.push({
      isin: p.isin,
      t: p.t,
      mkt: p.mkt,
      n: h.rows.length,
      data: h.data,
      stima: !!h.stima,
      interno: !!h.interno
    });
    var q = {
      t1: 0,
      t2: 0,
      t3: 0,
      spec: 0,
      dif: 0,
      resto: 0
    };
    var somma = 0;
    h.rows.forEach(function (r) {
      var chiave = r.isin || normNome(r.nome);
      if (!chiave) return;
      var tr = tierDiTitolo(r, p.t);
      q[tr] += r.peso;
      somma += r.peso;
      aggiungi(chiave, r.nome, r.isin, p.mkt * r.peso / 100, p.t, tr, r.sett, r.paese);
    });
    if (somma > 0) {
      AI_TIER_ORDER.forEach(function (k) {
        q[k] /= somma;
      });
      aiQuote[p.isin] = q;
    }
  });
  var lista = Array.from(mappa.values()).map(function (t) {
    return Object.assign({}, t, {
      pct: totMkt ? t.eur / totMkt * 100 : 0,
      pctEq: eqCoperto ? t.eur / eqCoperto * 100 : 0
    });
  }).sort(function (a, b) {
    return b.eur - a.eur;
  });
  var top10 = lista.slice(0, 10).reduce(function (a, t) {
    return a + t.eur;
  }, 0);
  var hhi = lista.reduce(function (a, t) {
    return a + Math.pow(t.eur / (eqCoperto || 1), 2);
  }, 0);

  /* sovrapposizione: somma dei pesi minimi comuni fra due fondi */
  var coppie = [];
  for (var i = 0; i < fondiCoperti.length; i++) {
    for (var j = i + 1; j < fondiCoperti.length; j++) {
      var ha = comp[fondiCoperti[i].isin].rows;
      var hb = comp[fondiCoperti[j].isin].rows;
      var mb = new Map(hb.map(function (r) {
        return [r.isin || normNome(r.nome), r.peso];
      }));
      var ov = 0,
        comuni = 0;
      ha.forEach(function (r) {
        var k = r.isin || normNome(r.nome);
        if (mb.has(k)) {
          ov += Math.min(r.peso, mb.get(k));
          comuni++;
        }
      });
      coppie.push({
        a: fondiCoperti[i].t,
        b: fondiCoperti[j].t,
        ov: ov,
        comuni: comuni
      });
    }
  }
  coppie.sort(function (x, y) {
    return y.ov - x.ov;
  });
  return {
    lista: lista,
    fondiCoperti: fondiCoperti,
    comp: comp,
    aiQuote: aiQuote,
    eqTot: eqTot,
    eqCoperto: eqCoperto,
    copertura: eqTot ? eqCoperto / eqTot * 100 : 0,
    top10pct: totMkt ? top10 / totMkt * 100 : 0,
    effN: hhi > 0 ? 1 / hhi : 0,
    coppie: coppie,
    nTitoli: lista.length
  };
}
function calcAi(positions, titoli, totMkt, eqTot) {
  var perCanale = {
    t1: 0,
    t2: 0,
    t3: 0,
    spec: 0,
    dif: 0,
    resto: 0
  };
  var dalVivo = 0,
    daDefault = 0;
  positions.forEach(function (p) {
    if (p.c !== "Azionario") return;
    var q = titoli.aiQuote[p.isin] || p.ai;
    if (!q) {
      perCanale.resto += p.mkt;
      daDefault += p.mkt;
      return;
    }
    if (titoli.aiQuote[p.isin]) dalVivo += p.mkt;else daDefault += p.mkt;
    AI_TIER_ORDER.forEach(function (k) {
      perCanale[k] += p.mkt * (q[k] || 0);
    });
  });
  var esposto = perCanale.t1 + perCanale.t2 + perCanale.t3;
  return {
    perCanale: perCanale,
    esposto: esposto,
    espostoPct: totMkt ? esposto / totMkt * 100 : 0,
    espostoEqPct: eqTot ? esposto / eqTot * 100 : 0,
    dalVivo: dalVivo,
    daDefault: daDefault,
    titoliAI: titoli.lista.filter(function (t) {
      return t.tier === "t1" || t.tier === "t2" || t.tier === "t3";
    }).slice(0, 20)
  };
}
function calcRischio(positions, titoli, totMkt, betaOverride) {
  var comp = titoli.comp || {};

  /* Beta dal mix settoriale, quando la composizione lo consente. La costante di
     taratura viene dal benchmark stesso: il beta di SWDA calcolato dai suoi
     settori deve valere 1,00 per definizione, e lo scarto misura quanto la
     tabella settoriale è tarata male. Correggerlo lì raddrizza anche gli altri. */
  function mixBeta(rows) {
    var s = {},
      t = 0;
    rows.forEach(function (r) {
      var k = r.sett;
      if (!k || SETT_BETA[k] == null) return;
      s[k] = (s[k] || 0) + r.peso;
      t += r.peso;
    });
    if (t < 60) return null; /* troppo poco coperto per fidarsi */
    return Object.keys(s).reduce(function (a, k) {
      return a + s[k] / t * SETT_BETA[k];
    }, 0);
  }
  var bench = comp[BENCHMARK] && comp[BENCHMARK].rows && comp[BENCHMARK].rows.length ? mixBeta(comp[BENCHMARK].rows) : null;
  var cal = bench && bench > 0 ? 1 / bench : null;
  var perPos = positions.map(function (p) {
    var b = BETA_EX_ANTE[p.isin] ? BETA_EX_ANTE[p.isin].b : p.c === "Azionario" ? 1 : 0;
    var f = BETA_EX_ANTE[p.isin] ? BETA_EX_ANTE[p.isin].f : "ipotesi";
    if (betaOverride && betaOverride[p.isin] != null) {
      b = betaOverride[p.isin];
      f = "tua stima";
    } else if (cal && p.c === "Azionario" && comp[p.isin] && comp[p.isin].rows && comp[p.isin].rows.length) {
      var m = mixBeta(comp[p.isin].rows);
      if (m != null) {
        b = m * cal;
        f = "settori";
      }
    }
    return Object.assign({}, p, {
      beta: b,
      betaFonte: f,
      contrib: p.mkt * b / (totMkt || 1)
    });
  });
  var beta = perPos.reduce(function (a, p) {
    return a + p.contrib;
  }, 0);
  var eq = perPos.filter(function (p) {
    return p.c === "Azionario";
  });
  var vEq = eq.reduce(function (a, p) {
    return a + p.mkt;
  }, 0);
  var hy = perPos.filter(function (p) {
    return p.c === "Obblig. HY";
  });
  var betaHy = hy.reduce(function (a, p) {
    return a + p.contrib;
  }, 0);
  var isCore = function (p) {
    return p.isin === BENCHMARK || p.isin === "XS2427355958";
  };
  var core = perPos.filter(isCore);
  var vCore = core.reduce(function (a, p) {
    return a + p.mkt;
  }, 0);
  var attive = perPos.filter(function (p) {
    return !isCore(p);
  });
  var vAtt = attive.reduce(function (a, p) {
    return a + p.mkt;
  }, 0);
  return {
    perPos: perPos,
    beta: beta,
    calibrato: !!cal,
    cal: cal,
    betaEq: vEq ? eq.reduce(function (a, p) {
      return a + p.mkt * p.beta;
    }, 0) / vEq : 0,
    vEq: vEq,
    betaHy: betaHy,
    hyEquivalente: betaHy * (totMkt || 0),
    betaSenzaHy: perPos.filter(function (p) {
      return p.c !== "Obblig. HY";
    }).reduce(function (a, p) {
      return a + p.contrib;
    }, 0),
    vCore: vCore,
    betaCore: vCore ? core.reduce(function (a, p) {
      return a + p.mkt * p.beta;
    }, 0) / vCore : 0,
    vAtt: vAtt,
    betaAtt: vAtt ? attive.reduce(function (a, p) {
      return a + p.mkt * p.beta;
    }, 0) / vAtt : 0
  };
}
function calcSerie(snapshots) {
  var ord = snapshots.slice().sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });
  var oss = [];
  for (var i = 1; i < ord.length; i++) {
    var o = rendimentoPeriodo(ord[i - 1], ord[i]);
    if (o) oss.push(o);
  }
  var reg = regressione(oss);
  var cum = oss.reduce(function (a, o) {
    return a * (1 + o.r);
  }, 1) - 1;
  var cumB = oss.reduce(function (a, o) {
    return o.rb == null ? a : a * (1 + o.rb);
  }, 1) - 1;
  return {
    oss: oss,
    reg: reg,
    cum: cum,
    cumB: cumB,
    nSnap: ord.length,
    ordinati: ord
  };
}
function calcAlerts(positions, tot, sogliaUsd, titoli, ai) {
  var out = [];
  if (tot.usdNoGoldPct > sogliaUsd) {
    out.push({
      lv: "alto",
      t: "Dollaro al " + pct(tot.usdNoGoldPct) + " contro una soglia del " + sogliaUsd + "%",
      d: "Look-through escluso oro. Nuovi versamenti in area euro riducono il divario più in fretta di uno switch."
    });
  }
  if (ai.espostoPct > 15) {
    out.push({
      lv: "medio",
      t: "Tesi AI al " + pct(ai.espostoPct) + " del portafoglio",
      d: "Somma dei tre canali: fornitori del capex, chi lo finanzia, infrastruttura elettrica. È " + pct(ai.espostoEqPct) + " dell'azionario, e nessuna riga si chiama così."
    });
  }
  var top = positions[0];
  if (top && top.peso > 30) {
    out.push({
      lv: "medio",
      t: top.t + " pesa il " + pct(top.peso) + " del portafoglio",
      d: "Concentrazione su singolo strumento. Accettabile per un core globale, da tenere sotto osservazione."
    });
  }
  var hy = tot.mkt ? tot.byClass["Obblig. HY"] / tot.mkt * 100 : 0;
  if (hy > 12) {
    out.push({
      lv: "medio",
      t: "High yield al " + pct(hy),
      d: "In stress l'HY si muove con l'azionario: l'esposizione direzionale reale è più alta di quanto dica la riga azionario."
    });
  }
  var haCopertura = positions.some(function (p) {
    return p.c === "Obblig. IG" && p.usd === 0 && !p.pinned && tot.mkt && p.mkt / tot.mkt > 0.05;
  });
  if (positions.length && !haCopertura) {
    out.push({
      lv: "alto",
      t: "Nessun attivo che sale quando l'azionario scende",
      d: "Manca un governativo euro a duration medio-lunga. Oro e liquidità attutiscono, non compensano."
    });
  }
  var inScadenza = positions.filter(function (p) {
    return p.pinned;
  });
  if (inScadenza.length) {
    out.push({
      lv: "basso",
      t: inScadenza.map(function (p) {
        return p.t;
      }).join(", ") + " in rimborso",
      d: "Il capitale torna liquidità a breve: " + eur(inScadenza.reduce(function (a, p) {
        return a + p.mkt + (p.rateo || 0);
      }, 0)) + " da reimpiegare, senza vendere nulla e senza conseguenze fiscali."
    });
  }
  var capofila = titoli.lista[0];
  if (capofila && capofila.pct > 2 && Object.keys(capofila.fonti).length > 1) {
    out.push({
      lv: "medio",
      t: capofila.nome + " vale " + pct(capofila.pct) + " del portafoglio",
      d: "Esposizione sommata su " + Object.keys(capofila.fonti).join(", ") + ". Nessuna di queste righe da sola la rende visibile."
    });
  }
  return out;
}
function calcSim(positions, sellQty, zainetto, totUsdNoGoldPct) {
  var vendite = positions.map(function (p) {
    var q = sellQty[p.isin] || 0;
    if (!q) return null;
    var frazione = Math.min(1, q / 100);
    var ricavo = p.mkt * frazione;
    return Object.assign({}, p, {
      frazione: frazione,
      ricavo: ricavo,
      costo: p.carico * frazione,
      realizzo: ricavo - p.carico * frazione
    });
  }).filter(Boolean);
  var plusDiversi = vendite.filter(function (v) {
    return v.realizzo > 0 && v.tax === "diversi";
  }).reduce(function (a, v) {
    return a + v.realizzo;
  }, 0);
  var plusCapitale = vendite.filter(function (v) {
    return v.realizzo > 0 && v.tax === "capitale";
  }).reduce(function (a, v) {
    return a + v.realizzo;
  }, 0);
  var minus = vendite.filter(function (v) {
    return v.realizzo < 0;
  }).reduce(function (a, v) {
    return a - v.realizzo;
  }, 0);

  /* le minus della stessa operazione si compensano subito con le plus "diversi" */
  var netDiversi = plusDiversi - minus;
  var compensabile = Math.max(0, netDiversi);
  var usaZainetto = Math.min(zainetto, compensabile);
  var imponibileDiversi = compensabile - usaZainetto;
  var rateW = plusDiversi > 0 ? vendite.filter(function (v) {
    return v.realizzo > 0 && v.tax === "diversi";
  }).reduce(function (a, v) {
    return a + v.realizzo * v.rate;
  }, 0) / plusDiversi : 0.26;
  var rateCap = plusCapitale > 0 ? vendite.filter(function (v) {
    return v.realizzo > 0 && v.tax === "capitale";
  }).reduce(function (a, v) {
    return a + v.realizzo * v.rate;
  }, 0) / plusCapitale : 0.26;
  var imposta = imponibileDiversi * rateW + plusCapitale * rateCap;
  var resid = positions.map(function (p) {
    var f = 1 - Math.min(1, (sellQty[p.isin] || 0) / 100);
    return Object.assign({}, p, {
      mkt: p.mkt * f
    });
  });
  var newTot = resid.reduce(function (a, p) {
    return a + p.mkt;
  }, 0);
  var newUsd = resid.reduce(function (a, p) {
    return a + (p.c === "Oro" ? 0 : p.mkt * p.usd);
  }, 0);
  return {
    vendite: vendite,
    plusDiversi: plusDiversi,
    plusCapitale: plusCapitale,
    minus: minus,
    usaZainetto: usaZainetto,
    imponibileDiversi: imponibileDiversi,
    imposta: imposta,
    nuovoZainetto: zainetto - usaZainetto + Math.max(0, -netDiversi),
    liquidita: vendite.reduce(function (a, v) {
      return a + v.ricavo;
    }, 0) - imposta,
    newTot: newTot,
    newUsdPct: newTot ? newUsd / newTot * 100 : 0,
    deltaUsdPct: (newTot ? newUsd / newTot * 100 : 0) - totUsdNoGoldPct,
    chiuse: vendite.filter(function (v) {
      return v.frazione >= 1;
    }).length,
    nPos: resid.filter(function (p) {
      return p.mkt > 0.5;
    }).length
  };
}
function shockDiPosizione(p, sc, aiQuote, tiers) {
  if (p.pinned) return 0;
  if (sc.ai && p.c === "Azionario") {
    var q = aiQuote[p.isin] || p.ai || {
      resto: 1
    };
    var tt = tiers || sc.tier;
    return AI_TIER_ORDER.reduce(function (a, k) {
      return a + (q[k] || 0) * tt[k];
    }, 0);
  }
  return sc.s[p.c] == null ? 0 : sc.s[p.c];
}
function calcStress(positions, scenarioId, useCustom, customShock, totMkt, titoli, tierShock) {
  var sc = SCENARIOS.filter(function (s) {
    return s.id === scenarioId;
  })[0] || SCENARIOS[0];
  var perCanale = !useCustom && !!sc.ai;
  var tiers = perCanale ? Object.assign({}, sc.tier, tierShock || {}) : null;
  var shocks = useCustom ? {
    Azionario: customShock.Azionario / 100,
    "Obblig. HY": customShock["Obblig. HY"] / 100,
    "Obblig. IG": customShock["Obblig. IG"] / 100,
    Oro: customShock.Oro / 100,
    "Liquidità": customShock["Liquidità"] / 100
  } : sc.s;
  var fx = useCustom ? customShock.fx / 100 : sc.fx;
  var scEff = useCustom ? {
    s: shocks,
    fx: fx
  } : sc;
  var perPos = positions.map(function (p) {
    if (p.pinned) return Object.assign({}, p, {
      delta: 0,
      base: 0,
      cambio: 0,
      shock: 0
    });
    var shock = perCanale ? shockDiPosizione(p, sc, titoli.aiQuote, tiers) : shocks[p.c] == null ? 0 : shocks[p.c];
    var base = shock * p.mkt;
    var cambio = p.usd * fx * p.mkt;
    return Object.assign({}, p, {
      delta: base + cambio,
      base: base,
      cambio: cambio,
      shock: shock
    });
  });
  var delta = perPos.reduce(function (a, p) {
    return a + p.delta;
  }, 0);
  var deltaFx = perPos.reduce(function (a, p) {
    return a + p.cambio;
  }, 0);
  var deltaAsset = perPos.reduce(function (a, p) {
    return a + p.base;
  }, 0);
  var byClass = {};
  CLASS_ORDER.forEach(function (c) {
    byClass[c] = 0;
  });
  perPos.forEach(function (p) {
    byClass[p.c] += p.delta;
  });
  var byTier = {};
  if (perCanale) {
    AI_TIER_ORDER.forEach(function (k) {
      byTier[k] = 0;
    });
    positions.forEach(function (p) {
      if (p.c !== "Azionario" || p.pinned) return;
      var q = titoli.aiQuote[p.isin] || p.ai || {
        resto: 1
      };
      AI_TIER_ORDER.forEach(function (k) {
        byTier[k] += p.mkt * (q[k] || 0) * tiers[k];
      });
    });
  }
  return {
    sc: sc,
    scEff: scEff,
    fx: fx,
    perCanale: perCanale,
    tiers: tiers,
    perPos: perPos,
    delta: delta,
    deltaFx: deltaFx,
    deltaAsset: deltaAsset,
    pct: totMkt ? delta / totMkt * 100 : 0,
    fxPct: totMkt ? deltaFx / totMkt * 100 : 0,
    assetPct: totMkt ? deltaAsset / totMkt * 100 : 0,
    byClass: byClass,
    byTier: byTier,
    dopo: totMkt + delta
  };
}
function calcConfronto(positions, titoli, totMkt) {
  return SCENARIOS.map(function (sc) {
    var d = 0;
    positions.forEach(function (p) {
      if (p.pinned) return;
      d += p.mkt * (shockDiPosizione(p, sc, titoli.aiQuote, null) + p.usd * sc.fx);
    });
    return {
      id: sc.id,
      nome: sc.nome,
      ai: !!sc.ai,
      delta: d,
      pct: totMkt ? d / totMkt * 100 : 0
    };
  }).sort(function (a, b) {
    return a.pct - b.pct;
  });
}

/* snapshot dalla situazione corrente: i prezzi per quota sono ciò che rende
   calcolabili i rendimenti di periodo, e con essi alpha e beta */
function creaSnapshot(asOf, positions, tot, aiPct, beta) {
  var px = {},
    val = {};
  positions.forEach(function (p) {
    if (p.qty > 0) px[p.isin] = p.mkt / p.qty;
    val[p.isin] = p.mkt;
  });
  return {
    date: asOf,
    mkt: tot.mkt,
    carico: tot.carico,
    usdPct: tot.usdNoGoldPct,
    aiPct: aiPct,
    beta: beta,
    n: positions.length,
    byClass: tot.byClass,
    px: px,
    val: val
  };
}

/* ---- 05-screens.jsx ---- */
/* ==========================================================================
   San Giorgio — schermate
   ========================================================================== */

/* ------------------------------- Sintesi ---------------------------------- */

function ScSintesi(p) {
  var tot = p.tot,
    positions = p.positions;
  var largo = useLargo();
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement(Striscia, {
    tot: tot,
    soglia: p.sogliaUsd
  })), p.alerts.length ? /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Da tenere d'occhio"), /*#__PURE__*/React.createElement(Avvisi, {
    alerts: p.alerts
  })) : null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Valore di carico",
    v: eur(tot.carico)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Costo annuo (TER)",
    v: eur(tot.terEur),
    sub: pct(tot.terPct, 2) + " del valore"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Ratei maturati",
    v: eur(tot.ratei, 2)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Posizioni",
    v: String(positions.length)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Posizioni"), /*#__PURE__*/React.createElement("div", {
    className: "btn-row",
    style: {
      marginBottom: 10
    }
  }, [["mkt", "Per valore"], ["pl", "Per perdita"], ["nome", "Per nome"]].map(function (o) {
    return /*#__PURE__*/React.createElement("button", {
      key: o[0],
      className: "chip",
      "aria-pressed": p.ordine === o[0],
      onClick: function () {
        p.setOrdine(o[0]);
      }
    }, o[1]);
  })), largo ? /*#__PURE__*/React.createElement("table", {
    className: "tbl"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "Strumento"), /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "Classe"), /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "Valore"), /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "Peso"), /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "Plus/minus"), /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "USD"), /*#__PURE__*/React.createElement("th", {
    className: "col"
  }, "Fisco"))), /*#__PURE__*/React.createElement("tbody", null, positions.map(function (q) {
    return /*#__PURE__*/React.createElement("tr", {
      key: q.isin
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600
      }
    }, q.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, q.n)), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: "left",
        fontSize: 12.5,
        color: T.ink2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 2,
        background: CLASS_COLOR[q.c],
        marginRight: 6
      }
    }), q.c), /*#__PURE__*/React.createElement("td", {
      className: "num"
    }, eur(q.mkt)), /*#__PURE__*/React.createElement("td", {
      className: "num"
    }, pct(q.peso)), /*#__PURE__*/React.createElement("td", {
      className: "num",
      style: {
        color: signed(q.pl)
      }
    }, pct(q.plPct), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        opacity: 0.85
      }
    }, (q.pl >= 0 ? "+" : "−") + eur(Math.abs(q.pl)))), /*#__PURE__*/React.createElement("td", {
      className: "num"
    }, q.usd ? pct(q.usd * 100, 0) : "—"), /*#__PURE__*/React.createElement("td", {
      style: {
        fontSize: 12,
        textAlign: "right",
        color: q.tax === "diversi" ? T.green : T.muted
      }
    }, q.tax === "diversi" ? "compensa" : "non compensa", /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        color: T.muted
      }
    }, pct(q.rate * 100, q.rate === 0.125 ? 1 : 0))));
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, positions.map(function (q) {
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: q.isin
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 4,
        alignSelf: "stretch",
        borderRadius: 2,
        background: CLASS_COLOR[q.c],
        flex: "0 0 auto"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t"
    }, q.t), /*#__PURE__*/React.createElement("div", {
      className: "row-s"
    }, q.n)), /*#__PURE__*/React.createElement("div", {
      className: "row-n"
    }, /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 15
      }
    }, eur(q.mkt)), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 12.5,
        color: signed(q.pl)
      }
    }, pct(q.plPct), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.muted
      }
    }, "· ", pct(q.peso)))));
  })), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 12
    }
  }, "La colonna Fisco riguarda le ", /*#__PURE__*/React.createElement("em", null, "plusvalenze"), ". Le minusvalenze confluiscono sempre nei redditi diversi, qualunque sia lo strumento: è l'asimmetria che rende difficile smaltire lo zainetto vendendo ETF.")));
}

/* ------------------------------- Titoli ----------------------------------- */

function ScTitoli(p) {
  var titoli = p.titoli;
  var [n, setN] = useState(25);
  var [q, setQ] = useState("");
  var fondiAttesi = p.positions.filter(function (x) {
    return x.c === "Azionario" && !x.az;
  });
  var comp = titoli.comp || {};
  var mancanti = fondiAttesi.filter(function (x) {
    return !(comp[x.isin] && comp[x.isin].rows && comp[x.isin].rows.length);
  });
  var daAssegnare = Object.keys(p.holdings).filter(function (k) {
    return k.charAt(0) === "?";
  });
  var filtrata = q ? titoli.lista.filter(function (t) {
    return t.nome.toLowerCase().indexOf(q.toLowerCase()) > -1 || (t.isin || "").toLowerCase().indexOf(q.toLowerCase()) > -1;
  }) : titoli.lista;
  var maxEur = titoli.lista.length ? titoli.lista[0].eur : 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Composizioni dei fondi"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Carica i file dei gestori in CSV o XLSX. Da questi l'app ricostruisce quanto pesa ogni singola società sommando fondi e azioni dirette."), /*#__PURE__*/React.createElement("div", {
    className: "btn-row",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "btn"
  }, "Scegli i file", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".csv,.xls,.xlsx,.txt",
    multiple: true,
    style: {
      display: "none"
    },
    onChange: p.onHoldingsFiles
  }))), /*#__PURE__*/React.createElement("div", {
    className: "num",
    style: {
      fontSize: 13,
      color: T.muted,
      marginTop: 10
    }
  }, "Copertura dell'azionario ", pct(titoli.copertura), " · ", eur(titoli.eqCoperto), " su ", eur(titoli.eqTot)), p.holdNote ? /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: "12px 0 0",
      paddingLeft: 18,
      fontSize: 13,
      lineHeight: 1.7
    }
  }, p.holdNote.map(function (r, i) {
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        color: r.ok ? T.ink2 : T.red
      }
    }, /*#__PURE__*/React.createElement("strong", null, r.file), " — ", r.msg, r.ok ? r.fondo ? " · abbinato a " + r.fondo : " · fondo da indicare" : "");
  })) : null, daAssegnare.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: "grid",
      gap: 10
    }
  }, daAssegnare.map(function (k) {
    return /*#__PURE__*/React.createElement("div", {
      key: k
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        marginBottom: 4
      }
    }, p.holdings[k].file), /*#__PURE__*/React.createElement("select", {
      className: "inp",
      defaultValue: "",
      onChange: function (e) {
        p.assegnaFondo(k, e.target.value);
      },
      "aria-label": "Fondo per " + p.holdings[k].file
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Indica il fondo…"), fondiAttesi.map(function (x) {
      return /*#__PURE__*/React.createElement("option", {
        key: x.isin,
        value: x.isin
      }, x.t, " — ", x.n);
    })));
  })) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, fondiAttesi.map(function (x) {
    var h = comp[x.isin];
    var ok = h && h.rows && h.rows.length;
    var col = !ok ? T.rule : h.stima ? T.brass : h.interno ? T.cobalt : T.green;
    return /*#__PURE__*/React.createElement("span", {
      className: "pill",
      key: x.isin,
      style: {
        borderColor: col,
        color: ok ? col : T.muted
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontSize: 11.5
      }
    }, x.t), ok ? /*#__PURE__*/React.createElement("span", {
      className: "num"
    }, h.rows.length, " ", h.stima ? "stima" : h.interno ? "indice" : "") : /*#__PURE__*/React.createElement("span", null, "manca"), ok && p.holdings[x.isin] ? /*#__PURE__*/React.createElement("button", {
      onClick: function () {
        p.rimuoviFondo(x.isin);
      },
      "aria-label": "Rimuovi la composizione di " + x.t,
      style: {
        border: 0,
        background: "none",
        color: T.muted,
        fontSize: 16,
        lineHeight: 1,
        padding: 0,
        cursor: "pointer"
      }
    }, "×") : null);
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginTop: 14,
      minHeight: 44,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: p.proxySP,
    onChange: function (e) {
      p.setProxySP(e.target.checked);
    }
  }), /*#__PURE__*/React.createElement("span", null, "Stima l'ETC sull'S&P 500 dalla parte USA di SWDA")), mancanti.length ? /*#__PURE__*/React.createElement("p", {
    className: "tiny",
    style: {
      color: T.brass,
      marginTop: 10
    }
  }, "I file restano sul dispositivo e vanno scelti su ciascuno. Finché mancano", " ", mancanti.map(function (x) {
    return x.t;
  }).join(", "), ", i pesi qui sotto riguardano solo la parte coperta e sottostimano l'esposizione reale.") : null), titoli.eqCoperto === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card card-warn"
  }, /*#__PURE__*/React.createElement("h3", null, "Nessuna composizione caricata"), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      margin: 0
    }
  }, "Senza i file dei gestori la trasparenza si limita alle azioni detenute direttamente. L'Euro Stoxx 50 è già incluso perché WS5X è sintetico e la sua esposizione è quella dell'indice."))) : /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stats",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Titoli distinti",
    v: titoli.nTitoli.toLocaleString("it-IT")
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Primi dieci",
    v: pct(titoli.top10pct),
    sub: "del portafoglio"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Titoli effettivi",
    v: String(Math.round(titoli.effN)),
    sub: "equivalente non concentrato"
  })), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    placeholder: "Cerca un titolo o un ISIN",
    value: q,
    onChange: function (e) {
      setQ(e.target.value);
      setN(25);
    },
    "aria-label": "Cerca un titolo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tiny",
    style: {
      margin: "8px 0 4px"
    }
  }, filtrata.length.toLocaleString("it-IT"), " risultati"), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, filtrata.slice(0, n).map(function (t, i) {
    var fonti = Object.keys(t.fonti).sort(function (a, b) {
      return t.fonti[b] - t.fonti[a];
    });
    var tier = AI_TIER[t.tier];
    var aiRilevante = t.tier === "t1" || t.tier === "t2" || t.tier === "t3";
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: t.chiave
    }, /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12,
        color: T.muted,
        width: 24,
        flex: "0 0 auto"
      }
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t"
    }, t.nome), /*#__PURE__*/React.createElement("div", {
      className: "row-s"
    }, fonti.join(" · "), aiRilevante ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: tier.col
      }
    }, " · ", tier.lab) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 5,
        maxWidth: 160
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      pct: t.eur / maxEur * 100,
      h: 4,
      col: fonti.length > 1 ? T.brass : T.cobalt
    }))), /*#__PURE__*/React.createElement("div", {
      className: "row-n"
    }, /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 15
      }
    }, eur(t.eur)), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 12.5,
        color: T.muted
      }
    }, pct(t.pct, 2))));
  })), filtrata.length > n ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginTop: 12
    },
    onClick: function () {
      setN(n + 25);
    }
  }, "Mostra altri 25") : null, titoli.coppie.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement("h3", null, "Sovrapposizione fra fondi"), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "Quota di portafoglio che due fondi detengono negli stessi titoli con lo stesso peso. Una sovrapposizione alta significa pagare due commissioni per le stesse società."), titoli.coppie.slice(0, 8).map(function (c) {
    return /*#__PURE__*/React.createElement("div", {
      key: c.a + c.b,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        width: 104,
        color: T.ink2,
        flex: "0 0 auto"
      }
    }, c.a, " / ", c.b), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      pct: Math.min(100, c.ov),
      h: 10,
      col: T.clay
    })), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12.5,
        width: 86,
        textAlign: "right"
      }
    }, pct(c.ov), " · ", c.comuni));
  })) : null));
}

/* ------------------------------- Rischio ---------------------------------- */

function ScRischio(p) {
  var r = p.serie.reg,
    rischio = p.rischio,
    tot = p.tot;
  var abbastanza = r.ok && r.n >= MIN_OSS;
  var righe = rischio.perPos.slice().sort(function (a, b) {
    return b.contrib - a.contrib;
  });
  var maxC = Math.max.apply(null, righe.map(function (x) {
    return Math.abs(x.contrib);
  }).concat([0.01]));
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Beta — quanto ti muovi quando si muove il mercato"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Calcolato dalla composizione attuale, non dallo storico: è la sensibilità di adesso. Il mercato di riferimento è l'MSCI World in euro, cioè SWDA, che è anche la posizione più grande."), /*#__PURE__*/React.createElement("div", {
    className: "stats",
    style: {
      margin: "18px 0"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Beta del portafoglio",
    v: num(rischio.beta, 2),
    sub: "mercato −10% → " + pct(-10 * rischio.beta, 1)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Beta dell'azionario",
    v: num(rischio.betaEq, 2),
    color: rischio.betaEq > 1 ? T.brass : T.ink,
    sub: "su " + eur(rischio.vEq)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Nucleo indicizzato",
    v: num(rischio.betaCore, 2),
    sub: tot.mkt ? pct(rischio.vCore / tot.mkt * 100) + " del ptf" : ""
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Resto",
    v: num(rischio.betaAtt, 2),
    sub: tot.mkt ? pct(rischio.vAtt / tot.mkt * 100) + " del ptf" : ""
  })), rischio.betaEq > 1 ? /*#__PURE__*/React.createElement("div", {
    className: "card card-note"
  }, /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      margin: 0,
      color: T.ink2
    }
  }, "L'azionario che possiedi ha beta ", /*#__PURE__*/React.createElement("strong", null, num(rischio.betaEq, 2)), ": è più reattivo dell'indice, non meno. Il beta complessivo di ", num(rischio.beta, 2), " sta sotto l'uno solo perché un terzo del portafoglio non è azionario — non perché le azioni che hai siano prudenti.")) : null), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Chi porta il beta"), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, righe.map(function (x) {
    var colF = x.betaFonte === "settori" ? T.green : x.betaFonte === "tua stima" ? T.cobalt : T.muted;
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: x.isin
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t"
    }, x.t), /*#__PURE__*/React.createElement("div", {
      className: "row-s"
    }, pct(x.peso), " del ptf · ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: colF
      }
    }, x.betaFonte)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 5,
        maxWidth: 150
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      pct: Math.abs(x.contrib) / maxC * 100,
      h: 4,
      col: x.contrib >= 0 ? T.cobalt : T.green
    }))), /*#__PURE__*/React.createElement("div", {
      className: "row-n",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("input", {
      className: "inp inp-sm num",
      type: "number",
      step: "0.05",
      inputMode: "decimal",
      value: Number(x.beta.toFixed(2)),
      "aria-label": "Beta di " + x.t,
      onChange: function (e) {
        p.setBetaOverride(Object.assign({}, p.betaOverride, function () {
          var o = {};
          o[x.isin] = Number(e.target.value);
          return o;
        }()));
      },
      style: {
        width: 74,
        textAlign: "right"
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12.5,
        color: T.muted,
        width: 46,
        textAlign: "right"
      }
    }, num(x.contrib, 3))));
  })), Object.keys(p.betaOverride).length ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginTop: 12
    },
    onClick: function () {
      p.setBetaOverride({});
    }
  }, "Ripristina i beta") : null, /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 12
    }
  }, "\"settori\" significa che il beta viene dal mix settoriale reale del fondo, tarato perché SWDA valga esattamente 1,00 — come dev'essere, visto che è il metro.", " ", rischio.calibrato ? "La taratura in corso vale " + num(rischio.cal, 3) + "." : "Senza le composizioni caricate questa via non è disponibile e valgono le ipotesi.")), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      borderLeft: "3px solid " + T.clay
    }
  }, /*#__PURE__*/React.createElement("h3", null, "L'high yield conta come azionario"), /*#__PURE__*/React.createElement("div", {
    className: "stats",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Beta con l'HY",
    v: num(rischio.beta, 3)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Beta senza l'HY",
    v: num(rischio.betaSenzaHy, 3)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Azionario equivalente",
    v: eur(rischio.hyEquivalente)
  })), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      margin: 0,
      color: T.ink2
    }
  }, "I fondi high yield aggiungono ", num(rischio.betaHy, 3), " di beta: in termini di rischio di mercato equivalgono ad altri ", eur(rischio.hyEquivalente), " di azionario. L'esposizione direzionale reale è vicina al", " ", tot.mkt ? pct((rischio.vEq + rischio.hyEquivalente) / tot.mkt * 100) : "—", ", contro il ", tot.mkt ? pct(rischio.vEq / tot.mkt * 100) : "—", " che dice la riga azionario."))), /*#__PURE__*/React.createElement("div", {
    className: "sect",
    style: {
      borderTop: "2px solid " + T.ink
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Alpha — quanto rendi al netto del rischio"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Questa metà non si ricava dalla composizione: serve una serie di rendimenti. Ogni snapshot aggiunge un'osservazione, con il rendimento calcolato dai prezzi per quota — immune a versamenti e vendite — confrontato con SWDA e con l'overnight di XEON come tasso privo di rischio."), /*#__PURE__*/React.createElement("div", {
    className: "stats",
    style: {
      margin: "18px 0"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Osservazioni",
    v: String(r.n || 0),
    sub: "servono " + MIN_OSS,
    color: abbastanza ? T.green : T.brass
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Rendimento cumulato",
    v: pct(p.serie.cum * 100, 2),
    color: signed(p.serie.cum)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Benchmark",
    v: pct(p.serie.cumB * 100, 2),
    color: signed(p.serie.cumB)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Differenza",
    v: pct((p.serie.cum - p.serie.cumB) * 100, 2),
    color: signed(p.serie.cum - p.serie.cumB)
  })), !abbastanza ? /*#__PURE__*/React.createElement("div", {
    className: "card card-warn"
  }, /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      margin: 0,
      color: T.ink2
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Non abbastanza dati."), " Con ", r.n || 0, " ", r.n === 1 ? "osservazione" : "osservazioni", " alpha e beta da regressione avrebbero un margine di errore più largo del valore stesso: non direbbero se stai battendo il mercato o se hai solo avuto un mese storto. Con uno snapshot al mese la stima diventa leggibile dopo ", Math.max(0, MIN_OSS - (r.n || 0)), " rilevazioni. Fino ad allora il numero che conta è il beta qui sopra, che non ha bisogno di storia.")) : null, r.ok ? /*#__PURE__*/React.createElement("div", {
    className: "duo",
    style: {
      marginTop: 18,
      opacity: abbastanza ? 1 : 0.65
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Regressione", abbastanza ? "" : " — indicativa"), /*#__PURE__*/React.createElement(Riga, {
    l: "Beta stimato",
    v: num(r.beta, 3),
    strong: true,
    sub: isFinite(r.seBeta) ? "± " + num(r.seBeta, 3) : "errore non calcolabile"
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Beta dalla composizione",
    v: num(rischio.beta, 3)
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Alpha per periodo",
    v: pct(r.alpha * 100, 3),
    color: signed(r.alpha),
    sub: isFinite(r.seAlpha) ? "± " + num(r.seAlpha * 100, 3) + " pp" : "errore non calcolabile"
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Alpha su base annua",
    v: pct(r.alphaAnnuo * 100, 2),
    color: signed(r.alpha),
    strong: true
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "R²",
    v: isFinite(r.r2) ? num(r.r2, 3) : "—"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Ogni punto è un periodo"), /*#__PURE__*/React.createElement(Nuvola, {
    punti: r.punti,
    beta: r.beta,
    alpha: r.alpha * 100,
    mostraRetta: abbastanza
  }), /*#__PURE__*/React.createElement("p", {
    className: "tiny",
    style: {
      marginTop: 6
    }
  }, "Orizzontale: il benchmark in eccesso. Verticale: il tuo. La pendenza della nuvola è il beta, l'altezza a cui passa è l'alpha."))) : null, p.serie.oss.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement("h3", null, "Periodi rilevati"), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, p.serie.oss.slice().reverse().map(function (o) {
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: o.a
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t num",
      style: {
        fontSize: 14
      }
    }, dateIt(o.da).slice(0, 5), " → ", dateIt(o.a).slice(0, 5)), /*#__PURE__*/React.createElement("div", {
      className: "row-s num"
    }, o.giorni, " giorni")), /*#__PURE__*/React.createElement("div", {
      className: "row-n"
    }, /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 14.5,
        color: signed(o.r)
      }
    }, pct(o.r * 100, 2)), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, "bmk ", o.rb == null ? "—" : pct(o.rb * 100, 2))));
  }))) : null, /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 16
    }
  }, "L'alpha può nascere solo dal ", tot.mkt ? pct(rischio.vAtt / tot.mkt * 100) : "—", " che non è nucleo indicizzato. Sul resto, per costruzione, stai comprando il benchmark e l'alpha atteso è zero meno i costi.")));
}

/* -------------------------------- Stress ---------------------------------- */

function ScStress(p) {
  var stress = p.stress,
    tot = p.tot,
    confronto = p.confronto;
  var maxConf = Math.max.apply(null, confronto.map(function (c) {
    return Math.abs(c.pct);
  }).concat([1]));
  var maxCl = Math.max.apply(null, CLASS_ORDER.map(function (k) {
    return Math.abs(tot.mkt ? stress.byClass[k] / tot.mkt * 100 : 0);
  }).concat([1]));
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rail",
    style: {
      paddingTop: 14
    }
  }, SCENARIOS.map(function (s) {
    var att = !p.useCustom && p.scenarioId === s.id;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      className: "chip" + (s.ai ? " chip-ai" : ""),
      "aria-pressed": att,
      onClick: function () {
        p.setScenarioId(s.id);
        p.setUseCustom(false);
        p.setTierShock(null);
      }
    }, s.nome);
  }), /*#__PURE__*/React.createElement("button", {
    className: "chip",
    "aria-pressed": p.useCustom,
    onClick: function () {
      p.setUseCustom(true);
    }
  }, "Scenario mio")), !p.useCustom ? /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      color: T.ink2
    }
  }, stress.sc.nota) : null, p.useCustom ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, CLASS_ORDER.concat(["fx"]).map(function (k) {
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.ink2
      }
    }, k === "fx" ? "Cambio EUR/USD" : k), /*#__PURE__*/React.createElement("span", {
      className: "num"
    }, (p.customShock[k] > 0 ? "+" : "") + p.customShock[k], "%")), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: "-60",
      max: "30",
      value: p.customShock[k],
      "aria-label": "Shock " + k,
      onChange: function (e) {
        var o = Object.assign({}, p.customShock);
        o[k] = Number(e.target.value);
        p.setCustomShock(o);
      }
    }));
  }), /*#__PURE__*/React.createElement("p", {
    className: "tiny",
    style: {
      margin: 0
    }
  }, "Il cambio positivo significa dollaro forte: rivaluta in euro gli attivi in USD.")) : null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Impatto",
    v: pct(stress.pct),
    color: signed(stress.delta),
    sub: (stress.delta >= 0 ? "+" : "−") + eur(Math.abs(stress.delta))
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Valore dopo",
    v: eur(stress.dopo)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "di cui attivi",
    v: pct(stress.assetPct),
    color: signed(stress.deltaAsset)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "di cui cambio",
    v: pct(stress.fxPct),
    color: signed(stress.deltaFx)
  }))), stress.perCanale ? /*#__PURE__*/React.createElement(PannelloAI, {
    stress: stress,
    ai: p.ai,
    tot: tot,
    tierShock: p.tierShock,
    setTierShock: p.setTierShock
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Contributo per classe"), CLASS_ORDER.filter(function (c) {
    return tot.byClass[c] > 0;
  }).map(function (c) {
    var d = stress.byClass[c];
    var pc = tot.mkt ? d / tot.mkt * 100 : 0;
    return /*#__PURE__*/React.createElement("div", {
      key: c,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        width: 78,
        color: T.ink2,
        flex: "0 0 auto"
      }
    }, c.replace("Obblig. ", "")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(BarMid, {
      v: pc,
      max: maxCl,
      h: 14
    })), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12.5,
        width: 60,
        textAlign: "right",
        color: signed(d)
      }
    }, pct(pc)));
  })), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Tutti gli scenari a confronto"), confronto.map(function (c) {
    var att = c.id === p.scenarioId && !p.useCustom;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        width: 96,
        flex: "0 0 auto",
        color: att ? T.ink : T.muted,
        fontWeight: att ? 600 : 400
      }
    }, c.nome), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bar",
      style: {
        height: 12
      }
    }, /*#__PURE__*/React.createElement("i", {
      style: {
        width: Math.abs(c.pct) / maxConf * 100 + "%",
        background: c.pct >= 0 ? T.green : c.ai ? T.brass : T.red,
        opacity: att ? 1 : 0.55
      }
    }))), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12.5,
        width: 60,
        textAlign: "right",
        color: signed(c.delta)
      }
    }, pct(c.pct)));
  }), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 12
    }
  }, "La bolla AI non è lo scenario peggiore: 2008 e Covid restano più profondi perché colpiscono tutto. È però l'unico in cui la perdita è concentrata in una parte identificabile — e quindi l'unico su cui si può agire in anticipo."), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "In tutti gli scenari di crisi la riga \"cambio\" è positiva: è il dollaro che fa da cuscinetto, non un attivo difensivo. Nella bolla AI è l'ipotesi più fragile, perché lo shock nasce negli Stati Uniti: se il dollaro si indebolisse, l'effetto cambierebbe segno.")));
}
function PannelloAI(p) {
  var [apri, setApri] = useState(false);
  var ai = p.ai,
    tot = p.tot,
    stress = p.stress;
  var W = 1000,
    x = 0;
  var segs = AI_TIER_ORDER.filter(function (k) {
    return ai.perCanale[k] > 0;
  }).map(function (k) {
    var w = tot.eqTot ? ai.perCanale[k] / tot.eqTot * W : 0;
    var s = {
      k: k,
      x: x,
      w: w,
      val: ai.perCanale[k]
    };
    x += w;
    return s;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card card-note"
  }, /*#__PURE__*/React.createElement("h3", null, "Dove entra la tesi AI"), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "Ricomposizione dell'azionario per canale, titolo per titolo. Nessuna riga del portafoglio si chiama \"AI\": l'esposizione è tutta indiretta."), /*#__PURE__*/React.createElement("div", {
    className: "stats",
    style: {
      margin: "12px 0"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Esposto alla tesi",
    v: eur(ai.esposto),
    sub: pct(ai.espostoPct) + " del ptf"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Sull'azionario",
    v: pct(ai.espostoEqPct)
  })), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 " + W + " 30",
    className: "strip",
    role: "img",
    "aria-label": "Azionario per canale di esposizione alla tesi AI"
  }, segs.map(function (s) {
    return /*#__PURE__*/React.createElement("rect", {
      key: s.k,
      x: s.x,
      y: 0,
      width: Math.max(s.w - 2, 1),
      height: 26,
      fill: AI_TIER[s.k].col
    });
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, AI_TIER_ORDER.map(function (k) {
    var v = ai.perCanale[k];
    if (!v) return null;
    var d = stress.byTier[k] || 0;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        padding: "10px 0",
        borderBottom: "1px solid " + T.ruleSoft
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "baseline"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: 2,
        background: AI_TIER[k].col,
        marginRight: 7
      }
    }), AI_TIER[k].lab), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 13.5,
        textAlign: "right",
        flex: "0 0 auto"
      }
    }, eur(v), /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.muted
      }
    }, " · ", tot.mkt ? pct(v / tot.mkt * 100) : ""))), /*#__PURE__*/React.createElement("p", {
      className: "tiny",
      style: {
        margin: "3px 0 6px"
      }
    }, AI_TIER[k].desc), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: "-80",
      max: "10",
      value: Math.round(stress.tiers[k] * 100),
      "aria-label": "Shock " + AI_TIER[k].lab,
      onChange: function (e) {
        var o = Object.assign({}, p.tierShock || {});
        o[k] = Number(e.target.value) / 100;
        p.setTierShock(o);
      },
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 13,
        width: 46,
        textAlign: "right"
      }
    }, pct(stress.tiers[k] * 100, 0)), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 13,
        width: 76,
        textAlign: "right",
        color: signed(d)
      }
    }, (d >= 0 ? "+" : "−") + eur(Math.abs(d)))));
  })), p.tierShock ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginTop: 12
    },
    onClick: function () {
      p.setTierShock(null);
    }
  }, "Ripristina gli shock dello scenario") : null, /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 20
    }
  }, "Cosa significa per ogni strumento"), stress.perPos.filter(function (q) {
    return q.c === "Azionario";
  }).sort(function (a, b) {
    return a.shock - b.shock;
  }).map(function (q) {
    return /*#__PURE__*/React.createElement("div", {
      key: q.isin,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        width: 58,
        color: T.ink2,
        flex: "0 0 auto"
      }
    }, q.t), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(Bar, {
      pct: Math.abs(q.shock) / 0.7 * 100,
      h: 10,
      col: T.red
    })), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 12.5,
        width: 52,
        textAlign: "right"
      }
    }, pct(q.shock * 100, 1)));
  }), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 10
    }
  }, "In un crollo generalizzato due ETF azionari prendono lo stesso colpo; in una bolla AI la distanza fra il più e il meno esposto supera i venti punti. Un aggiustamento mirato costa molto meno che ridurre l'azionario in blocco."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: function () {
      setApri(!apri);
    }
  }, apri ? "Nascondi i titoli" : "Quali titoli, esattamente"), apri ? ai.titoliAI.length ? /*#__PURE__*/React.createElement("div", {
    className: "rows",
    style: {
      marginTop: 10
    }
  }, ai.titoliAI.map(function (t) {
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: t.chiave
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t"
    }, t.nome), /*#__PURE__*/React.createElement("div", {
      className: "row-s",
      style: {
        color: AI_TIER[t.tier].col
      }
    }, AI_TIER[t.tier].lab)), /*#__PURE__*/React.createElement("div", {
      className: "row-n"
    }, /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 14
      }
    }, eur(t.eur)), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, pct(t.pct, 2))));
  })) : /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 10
    }
  }, "Senza le composizioni caricate il dettaglio per titolo non è disponibile: i numeri qui sopra usano i coefficienti di ripiego per fondo.") : null));
}

/* --------------------------------- Valute --------------------------------- */

function ScValute(p) {
  var tot = p.tot;
  var contrib = p.positions.filter(function (q) {
    return q.usd > 0;
  }).map(function (q) {
    return Object.assign({}, q, {
      quota: tot.mkt ? q.mkt * q.usd / tot.mkt * 100 : 0
    });
  }).sort(function (a, b) {
    return b.quota - a.quota;
  });
  var regTot = Object.keys(tot.reg).reduce(function (a, k) {
    return a + tot.reg[k];
  }, 0) || 1;
  var nomiReg = {
    US: "Stati Uniti",
    EU: "Europa",
    JP: "Giappone",
    ALTRO: "Resto del mondo"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Esposizione al dollaro"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Esposizione economica del sottostante, non valuta di negoziazione: STHY e gli EIB si scambiano in euro ma il rischio resta in dollari."), /*#__PURE__*/React.createElement("div", {
    className: "stats",
    style: {
      margin: "16px 0"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Escluso oro",
    v: pct(tot.usdNoGoldPct),
    color: tot.usdNoGoldPct > p.sogliaUsd ? T.red : T.ink
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Incluso oro",
    v: pct(tot.usdPct)
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Dentro l'azionario",
    v: pct(tot.eqTot ? tot.reg.US / tot.eqTot * 100 : 0)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: T.ink2
    }
  }, "Soglia di allerta"), /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, p.sogliaUsd, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "20",
    max: "80",
    value: p.sogliaUsd,
    "aria-label": "Soglia di allerta esposizione dollaro",
    onChange: function (e) {
      p.setSogliaUsd(Number(e.target.value));
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Chi porta il dollaro"), /*#__PURE__*/React.createElement("div", {
    className: "rows"
  }, contrib.map(function (q) {
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: q.isin
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t"
    }, q.t), /*#__PURE__*/React.createElement("div", {
      className: "row-s"
    }, num(q.quota, 1), " punti sul totale")), /*#__PURE__*/React.createElement("div", {
      className: "row-n",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("input", {
      className: "inp inp-sm num",
      type: "number",
      min: "0",
      max: "100",
      step: "1",
      inputMode: "numeric",
      value: Math.round(q.usd * 100),
      "aria-label": "Coefficiente dollaro " + q.t,
      onChange: function (e) {
        var o = Object.assign({}, p.usdOverride);
        o[q.isin] = Number(e.target.value);
        p.setUsdOverride(o);
      },
      style: {
        width: 70,
        textAlign: "right"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: T.muted
      }
    }, "%")));
  })), Object.keys(p.usdOverride).length ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    style: {
      marginTop: 12
    },
    onClick: function () {
      p.setUsdOverride({});
    }
  }, "Ripristina i coefficienti") : null), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Geografia dell'azionario"), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "Su ", eur(tot.eqTot), " di azionario complessivo."), Object.keys(tot.reg).sort(function (a, b) {
    return tot.reg[b] - tot.reg[a];
  }).map(function (k) {
    var q = tot.reg[k] / regTot * 100;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: T.ink2
      }
    }, nomiReg[k]), /*#__PURE__*/React.createElement("span", {
      className: "num"
    }, pct(q), " · ", eur(tot.reg[k]))), /*#__PURE__*/React.createElement(Bar, {
      pct: q
    }));
  }), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 14
    }
  }, "In uno stress il dollaro si è storicamente rivalutato, attenuando il drawdown in euro. Il problema non è tanto la valuta quanto la concentrazione su un unico mercato e sulle sue valutazioni.")));
}

/* ------------------------------ Simulatore -------------------------------- */

function ScSimulatore(p) {
  var sim = p.sim;
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Simulatore fiscale"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Scegli quanto vendere di ciascuna posizione e vedi l'effetto su imposta, zainetto fiscale ed esposizione al dollaro."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-end",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 190
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-lab",
    style: {
      marginBottom: 4
    }
  }, "Zainetto disponibile"), /*#__PURE__*/React.createElement("input", {
    className: "inp num",
    type: "number",
    step: "50",
    inputMode: "numeric",
    value: p.zainetto,
    "aria-label": "Zainetto fiscale disponibile in euro",
    onChange: function (e) {
      p.setZainetto(Number(e.target.value) || 0);
    }
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: function () {
      p.setSellQty({});
    }
  }, "Azzera"))), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, p.positions.map(function (q) {
    var qq = p.sellQty[q.isin] || 0;
    var rea = (q.mkt - q.carico) * qq / 100;
    return /*#__PURE__*/React.createElement("div", {
      key: q.isin,
      style: {
        padding: "10px 0",
        borderBottom: "1px solid " + T.ruleSoft
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 600
      }
    }, q.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: q.tax === "diversi" ? T.green : T.muted
      }
    }, q.tax === "diversi" ? "compensa" : "non compensa", " ·", " ", pct(q.rate * 100, q.rate === 0.125 ? 1 : 0))), /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        textAlign: "right",
        flex: "0 0 auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        color: qq ? T.ink : T.muted
      }
    }, eur(q.mkt * qq / 100)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: qq ? signed(rea) : T.muted
      }
    }, (rea >= 0 ? "+" : "−") + eur(Math.abs(rea))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: qq,
      "aria-label": "Quota da vendere di " + q.t,
      onChange: function (e) {
        var o = Object.assign({}, p.sellQty);
        o[q.isin] = Number(e.target.value);
        p.setSellQty(o);
      },
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "num",
      style: {
        fontSize: 13,
        width: 42,
        textAlign: "right"
      }
    }, qq, "%")));
  })), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "duo"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Conto fiscale"), /*#__PURE__*/React.createElement(Riga, {
    l: "Plusvalenze compensabili",
    v: eur(sim.plusDiversi)
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Plusvalenze non compensabili",
    v: eur(sim.plusCapitale),
    muted: true
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Minusvalenze realizzate",
    v: eur(sim.minus),
    color: sim.minus ? T.red : null
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Zainetto utilizzato",
    v: eur(sim.usaZainetto),
    color: sim.usaZainetto ? T.green : null
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Imposta stimata",
    v: eur(sim.imposta),
    strong: true
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Zainetto residuo",
    v: eur(sim.nuovoZainetto),
    color: sim.nuovoZainetto > p.zainetto ? T.red : T.ink
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Portafoglio risultante"), /*#__PURE__*/React.createElement(Riga, {
    l: "Liquidità generata",
    v: eur(sim.liquidita),
    strong: true
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Valore residuo",
    v: eur(sim.newTot)
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Dollaro (escl. oro)",
    v: pct(sim.newUsdPct),
    sub: (sim.deltaUsdPct >= 0 ? "+" : "−") + num(Math.abs(sim.deltaUsdPct), 1) + " punti",
    color: sim.deltaUsdPct > 0 ? T.red : T.green
  }), /*#__PURE__*/React.createElement(Riga, {
    l: "Posizioni residue",
    v: String(sim.nPos),
    sub: sim.chiuse ? sim.chiuse + " chiuse" : null
  }))), sim.plusCapitale > 0 ? /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 14,
      color: T.ink2
    }
  }, /*#__PURE__*/React.createElement("strong", null, eur(sim.plusCapitale)), " di guadagno finisce fra i redditi di capitale: paga imposta piena e lascia lo zainetto dov'è. Per smaltire le minus pregresse servono plusvalenze su ETC, azioni o obbligazioni.") : null, sim.minus > 0 && sim.plusDiversi < sim.minus ? /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 10,
      color: T.red
    }
  }, "Questa combinazione genera altre minusvalenze anziché consumarle: lo zainetto sale a", " ", eur(sim.nuovoZainetto), " e il problema di scadenza si allarga.") : null));
}

/* -------------------------------- Storico --------------------------------- */

function ScStorico(p) {
  var snaps = p.serie.ordinati;
  var esiste = snaps.some(function (s) {
    return s.date === p.asOf;
  });
  var dati = snaps.map(function (s) {
    return {
      date: s.date,
      mkt: s.mkt,
      usd: s.usdPct || 0
    };
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Storico"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Ogni snapshot fissa valore, esposizione e prezzi per quota di quel giorno. È da questi che nascono i rendimenti di periodo, e con essi alpha e beta."), /*#__PURE__*/React.createElement("div", {
    className: "btn-row",
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-pri",
    onClick: p.salvaSnapshot,
    disabled: !p.positions.length
  }, esiste ? "Aggiorna il " + dateIt(p.asOf) : "Salva il " + dateIt(p.asOf)))), snaps.length < 2 ? /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card card-warn"
  }, /*#__PURE__*/React.createElement("h3", null, snaps.length ? "Una sola rilevazione" : "Nessuna rilevazione"), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      margin: 0
    }
  }, snaps.length ? "Serve almeno una seconda rilevazione perché nasca un rendimento di periodo." : "Carica un export e salva il primo snapshot per avviare la serie."))) : /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement(LineaStorico, {
    dati: dati
  }), /*#__PURE__*/React.createElement("div", {
    className: "tiny",
    style: {
      marginTop: 4
    }
  }, "Continua: valore in euro. Tratteggiata: esposizione al dollaro."), /*#__PURE__*/React.createElement("div", {
    className: "rows",
    style: {
      marginTop: 16
    }
  }, snaps.slice().reverse().map(function (s) {
    return /*#__PURE__*/React.createElement("div", {
      className: "row",
      key: s.date
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "row-t num"
    }, dateIt(s.date)), /*#__PURE__*/React.createElement("div", {
      className: "row-s num"
    }, s.n, " posizioni · USD ", pct(s.usdPct || 0), s.aiPct != null ? " · AI " + pct(s.aiPct) : "")), /*#__PURE__*/React.createElement("div", {
      className: "row-n"
    }, /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 15
      }
    }, eur(s.mkt)), s.beta != null ? /*#__PURE__*/React.createElement("div", {
      className: "num",
      style: {
        fontSize: 12,
        color: T.muted
      }
    }, "beta ", num(s.beta, 2)) : null), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-sm",
      "aria-label": "Elimina lo snapshot del " + dateIt(s.date),
      onClick: function () {
        p.eliminaSnapshot(s.date);
      },
      style: {
        minHeight: 34,
        padding: "0 10px",
        color: T.muted
      }
    }, "×"));
  }))));
}

/* ---------------------------------- Dati ---------------------------------- */

function ScDati(p) {
  var tot = p.tot;
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Carica un export"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Serve il file \"Portafoglio di sintesi\" di Fineco, in .xls o .xlsx. Viene letto qui dentro e non esce dal dispositivo. La data si ricava dal nome del file quando c'è."), /*#__PURE__*/React.createElement("div", {
    className: "btn-row",
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "btn btn-pri"
  }, "Scegli il file", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".xls,.xlsx",
    style: {
      display: "none"
    },
    onChange: p.onFile
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      maxWidth: 220
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-lab",
    style: {
      marginBottom: 4
    }
  }, "Data della situazione"), /*#__PURE__*/React.createElement("input", {
    className: "inp num",
    type: "date",
    value: p.asOf,
    "aria-label": "Data della situazione",
    onChange: function (e) {
      p.setAsOf(e.target.value);
    }
  })), p.parseNote ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginTop: 14,
      borderColor: p.parseNote.ok ? T.rule : T.red
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: p.parseNote.ok ? T.green : T.red
    }
  }, p.parseNote.msg), p.parseNote.ignoti && p.parseNote.ignoti.length ? /*#__PURE__*/React.createElement("div", {
    className: "fine",
    style: {
      marginTop: 8
    }
  }, "Strumenti non in anagrafica, trattati come azionario con dollaro a zero. Vanno aggiunti al codice per un look-through corretto:", /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: "6px 0 0 18px",
      padding: 0
    }
  }, p.parseNote.ignoti.map(function (x) {
    return /*#__PURE__*/React.createElement("li", {
      key: x
    }, x);
  }))) : null) : null), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Esporta"), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: p.esportaCsv,
    disabled: !p.positions.length
  }, "Posizioni in CSV")), /*#__PURE__*/React.createElement("p", {
    className: "tiny",
    style: {
      marginTop: 8
    }
  }, "Il CSV esce in chiaro: è pensato per aprirlo subito in un foglio di calcolo, non per conservarlo. Per le copie di sicurezza usa quelle cifrate in Sicurezza.")), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Ipotesi in uso"), /*#__PURE__*/React.createElement("ul", {
    className: "fine",
    style: {
      paddingLeft: 18,
      margin: 0,
      lineHeight: 1.75
    }
  }, /*#__PURE__*/React.createElement("li", null, "I coefficienti di look-through sul dollaro sono stime di composizione, non la valuta di quotazione. Da riverificare su JustETF quando l'indice cambia."), /*#__PURE__*/React.createElement("li", null, "Le obbligazioni EIB sono trattate come sovranazionali white list, con aliquota al 12,5% sulla plusvalenza."), /*#__PURE__*/React.createElement("li", null, "L'oro entra nell'esposizione al dollaro solo nella cifra \"incluso oro\": è prezzato in USD ma non è esposizione all'economia americana."), /*#__PURE__*/React.createElement("li", null, "Un titolo a ridosso del rimborso è ancorato alla pari e non reagisce a nessuno scenario."), /*#__PURE__*/React.createElement("li", null, "Gli scenari storici sono approssimazioni per classe. Non modellano duration, spread creditizio né dispersione fra titoli."), /*#__PURE__*/React.createElement("li", null, "Gli scenari \"bolla AI\" lavorano titolo per titolo: ogni società va in un canale in base a ticker, nome e settore, e lo shock dello strumento è la media pesata dei canali che contiene. Ora", " ", pct(p.ai.dalVivo / (p.ai.dalVivo + p.ai.daDefault || 1) * 100), " dell'azionario è classificato dalle composizioni caricate, il resto dai coefficienti di ripiego."), /*#__PURE__*/React.createElement("li", null, "Il beta ex ante usa il mix settoriale dove disponibile, tarato perché SWDA valga 1,00; altrove sono ipotesi modificabili."), /*#__PURE__*/React.createElement("li", null, "TER complessivo: ", pct(tot.terPct, 2), " annuo, pari a ", eur(tot.terEur), ".")), /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 14
    }
  }, "Strumento di analisi personale, non consulenza. Il calcolo fiscale segue le regole generali del regime amministrato italiano e non sostituisce il conteggio del sostituto d'imposta.")));
}

/* ------------------------------- Sicurezza -------------------------------- */

function ScSicurezza(p) {
  var [pw1, setPw1] = useState("");
  var [pw2, setPw2] = useState("");
  var [msg, setMsg] = useState(null);
  var [conferma, setConferma] = useState(false);
  function cambia(e) {
    e.preventDefault();
    if (pw1.length < 8) {
      setMsg({
        ok: false,
        t: "Serve una passphrase di almeno 8 caratteri."
      });
      return;
    }
    if (pw1 !== pw2) {
      setMsg({
        ok: false,
        t: "Le due passphrase non coincidono."
      });
      return;
    }
    p.cambiaPassphrase(pw1).then(function () {
      setPw1("");
      setPw2("");
      setMsg({
        ok: true,
        t: "Passphrase cambiata. Le copie di sicurezza vecchie restano leggibili con la passphrase precedente."
      });
    }).catch(function (e2) {
      setMsg({
        ok: false,
        t: "Non riuscito. " + (e2 && e2.message || "")
      });
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h2", null, "Dove stanno i tuoi dati"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Le posizioni, lo storico e le composizioni stanno solo in questo browser, su questo dispositivo, cifrate con AES-256. La chiave si ricava dalla passphrase e vive in memoria: chiusa l'app, serve di nuovo."), /*#__PURE__*/React.createElement("ul", {
    className: "fine",
    style: {
      paddingLeft: 18,
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("li", null, "Nessun account, nessun server, nessuna statistica."), /*#__PURE__*/React.createElement("li", null, "L'app non può fare richieste di rete: è il browser a impedirlo, per una regola dichiarata nella pagina stessa."), /*#__PURE__*/React.createElement("li", null, "Il codice è pubblico su GitHub; i dati no, perché non sono nel codice."), /*#__PURE__*/React.createElement("li", null, "Chi aprisse l'indirizzo senza la tua passphrase troverebbe un'app vuota."))), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Blocco automatico"), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "Dopo questo tempo di inattività, o quando l'app va in secondo piano abbastanza a lungo, serve di nuovo la passphrase."), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, [1, 5, 15, 60].map(function (m) {
    return /*#__PURE__*/React.createElement("button", {
      key: m,
      className: "chip",
      "aria-pressed": p.minutiBlocco === m,
      onClick: function () {
        p.setMinutiBlocco(m);
      }
    }, m === 60 ? "1 ora" : m + " min");
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      marginTop: 14
    },
    onClick: p.bloccaOra
  }, "Blocca adesso")), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Copia di sicurezza"), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "Il file esce già cifrato con la tua passphrase: può stare nei File o in iCloud senza esporre nulla. Serve anche a spostare i dati su un altro dispositivo — e a non perderli, perché Safari può liberare l'archivio dei siti poco usati."), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: p.esportaBackup
  }, "Salva una copia cifrata"), /*#__PURE__*/React.createElement("label", {
    className: "btn"
  }, "Ripristina da una copia", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json,application/json",
    style: {
      display: "none"
    },
    onChange: p.importaBackup
  }))), p.backupNota ? /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 10,
      color: p.backupNota.ok ? T.green : T.red
    }
  }, p.backupNota.t) : null), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Cambia passphrase"), /*#__PURE__*/React.createElement("form", {
    onSubmit: cambia,
    style: {
      display: "grid",
      gap: 10,
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "password",
    placeholder: "Nuova passphrase",
    value: pw1,
    autoComplete: "new-password",
    "aria-label": "Nuova passphrase",
    onChange: function (e) {
      setPw1(e.target.value);
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "inp",
    type: "password",
    placeholder: "Ripeti",
    value: pw2,
    autoComplete: "new-password",
    "aria-label": "Ripeti la nuova passphrase",
    onChange: function (e) {
      setPw2(e.target.value);
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    type: "submit"
  }, "Cambia")), msg ? /*#__PURE__*/React.createElement("p", {
    className: "fine",
    style: {
      marginTop: 10,
      color: msg.ok ? T.green : T.red
    }
  }, msg.t) : null), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("h3", null, "Cancella tutto"), /*#__PURE__*/React.createElement("p", {
    className: "fine"
  }, "Elimina l'archivio cifrato da questo dispositivo. Le copie di sicurezza che hai salvato altrove restano valide; senza quelle, i dati non tornano."), conferma ? /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dim",
    onClick: p.distruggi
  }, "Sì, cancella tutto"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: function () {
      setConferma(false);
    }
  }, "Annulla")) : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dim",
    onClick: function () {
      setConferma(true);
    }
  }, "Cancella l'archivio")));
}

/* --------------------------------- Altro ---------------------------------- */

function ScAltro(p) {
  var voci = [["valute", "Valute e geografia", "Esposizione al dollaro e ripartizione per mercato"], ["simulatore", "Simulatore fiscale", "Vendite, imposta e zainetto"], ["storico", "Storico", p.nSnap ? p.nSnap + " rilevazioni" : "Nessuna rilevazione"], ["dati", "Dati", "Carica l'export, esporta, ipotesi in uso"], ["sicurezza", "Sicurezza", "Passphrase, blocco, copie di sicurezza"]];
  return /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, voci.map(function (v) {
    return /*#__PURE__*/React.createElement("button", {
      className: "nav-row",
      key: v[0],
      onClick: function () {
        p.vai(v[0]);
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block"
      }
    }, v[1]), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "block",
        fontSize: 12.5,
        color: T.muted
      }
    }, v[2])), /*#__PURE__*/React.createElement("span", {
      className: "chev"
    }, /*#__PURE__*/React.createElement(Icona, {
      nome: "chev"
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, /*#__PURE__*/React.createElement("p", {
    className: "tiny"
  }, "San Giorgio · analisi personale, non consulenza. I dati restano su questo dispositivo, cifrati.")));
}

/* ---- 06-root.jsx ---- */
/* ==========================================================================
   San Giorgio — radice
   Gestisce la cassaforte, il blocco automatico, il salvataggio e la
   navigazione fra le schede.
   ========================================================================== */

function App() {
  /* stato della cassaforte: "avvio" | "crea" | "chiuso" | "aperto" | "guasto" */
  var [stato, setStato] = useState("avvio");
  var [guasto, setGuasto] = useState("");
  var [dati, setDati] = useState(datiVuoti);
  var [tab, setTab] = useState("sintesi");
  var [vista, setVista] = useState(null);
  var [ordine, setOrdine] = useState("mkt");
  var [sellQty, setSellQty] = useState({});
  var [scenarioId, setScenarioId] = useState("aiBolla");
  var [tierShock, setTierShock] = useState(null);
  var [useCustom, setUseCustom] = useState(false);
  var [customShock, setCustomShock] = useState({
    Azionario: -30,
    "Obblig. HY": -20,
    "Obblig. IG": 0,
    Oro: 5,
    "Liquidità": 0,
    fx: 10
  });
  var [parseNote, setParseNote] = useState(null);
  var [holdNote, setHoldNote] = useState(null);
  var [backupNota, setBackupNota] = useState(null);
  var [tema, setTema] = useState(0);

  /* i colori per gli SVG arrivano dal foglio di stile: si rileggono quando il
     sistema passa da chiaro a scuro, e il contatore forza un nuovo disegno */
  useEffect(function () {
    sincronizzaTema();
    setTema(function (n) {
      return n + 1;
    });
    if (typeof matchMedia !== "function") return;
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var h = function () {
      sincronizzaTema();
      setTema(function (n) {
        return n + 1;
      });
    };
    if (mq.addEventListener) mq.addEventListener("change", h);else if (mq.addListener) mq.addListener(h);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", h);else if (mq.removeListener) mq.removeListener(h);
    };
  }, []);
  var sporco = useRef(false);
  var timerSalva = useRef(null);
  var ultimoTocco = useRef(Date.now());
  var nascostoDa = useRef(0);

  /* --------------------------- avvio e cassaforte ------------------------- */

  useEffect(function () {
    if (!cryptoOk()) {
      setGuasto("Questo browser non offre la cifratura necessaria. Serve Safari 14 o successivo, su una connessione sicura.");
      setStato("guasto");
      return;
    }
    Vault.esiste().then(function (c) {
      setStato(c ? "chiuso" : "crea");
    }).catch(function (e) {
      setGuasto("Archivio locale non accessibile. In navigazione privata l'app non può conservare nulla. " + (e.message || ""));
      setStato("guasto");
    });
  }, []);
  var apri = useCallback(function (pw) {
    return Vault.apri(pw).then(function (d) {
      setDati(normalizzaDati(d));
      setStato("aperto");
      Vault.chiediPersistenza();
      ultimoTocco.current = Date.now();
    });
  }, []);
  var crea = useCallback(function (pw) {
    var vuoti = datiVuoti();
    return Vault.crea(pw, vuoti).then(function () {
      setDati(vuoti);
      setStato("aperto");
      Vault.chiediPersistenza();
      ultimoTocco.current = Date.now();
    });
  }, []);

  /* ------------------------------ salvataggio ----------------------------- */

  /* Non si ricifra a ogni movimento di uno slider: si segna il cambiamento e si
     scrive poco dopo, oltre che prima di bloccare o di andare in secondo piano. */
  var salvaOra = useCallback(function (d) {
    if (!Vault.chiave) return Promise.resolve(false);
    sporco.current = false;
    return Vault.salva(d || dati).catch(function () {
      return false;
    });
  }, [dati]);
  var aggiorna = useCallback(function (patch) {
    setDati(function (prec) {
      var nuovo = Object.assign({}, prec, typeof patch === "function" ? patch(prec) : patch);
      sporco.current = true;
      if (timerSalva.current) clearTimeout(timerSalva.current);
      timerSalva.current = setTimeout(function () {
        if (Vault.chiave) Vault.salva(nuovo).catch(function () {});
        sporco.current = false;
      }, 1200);
      return nuovo;
    });
  }, []);
  var opz = useCallback(function (chiave, valore) {
    aggiorna(function (prec) {
      var o = Object.assign({}, prec.opz);
      o[chiave] = valore;
      return {
        opz: o
      };
    });
  }, [aggiorna]);

  /* ---------------------------- blocco automatico ------------------------- */

  var blocca = useCallback(function () {
    if (sporco.current && Vault.chiave) Vault.salva(dati).catch(function () {});
    Vault.chiudi();
    setDati(datiVuoti());
    setVista(null);
    setStato("chiuso");
  }, [dati]);
  useEffect(function () {
    if (stato !== "aperto") return;
    var minuti = dati.opz.minutiBlocco || 5;
    var ms = minuti * 60000;
    function tocca() {
      ultimoTocco.current = Date.now();
    }
    var eventi = ["pointerdown", "keydown", "wheel", "touchstart"];
    eventi.forEach(function (e) {
      window.addEventListener(e, tocca, {
        passive: true
      });
    });
    var iv = setInterval(function () {
      if (Date.now() - ultimoTocco.current > ms) blocca();
    }, 15000);
    function visibilita() {
      if (document.visibilityState === "hidden") {
        nascostoDa.current = Date.now();
        if (sporco.current && Vault.chiave) Vault.salva(dati).catch(function () {});
      } else if (nascostoDa.current && Date.now() - nascostoDa.current > ms) {
        blocca();
      } else {
        ultimoTocco.current = Date.now();
      }
    }
    document.addEventListener("visibilitychange", visibilita);
    return function () {
      eventi.forEach(function (e) {
        window.removeEventListener(e, tocca);
      });
      clearInterval(iv);
      document.removeEventListener("visibilitychange", visibilita);
    };
  }, [stato, dati, blocca]);

  /* ------------------------------ derivazioni ----------------------------- */

  var positions = useMemo(function () {
    return calcPositions(dati.rows, dati.opz.usdOverride, ordine);
  }, [dati.rows, dati.opz.usdOverride, ordine]);
  var tot = useMemo(function () {
    return calcTot(positions);
  }, [positions]);
  var titoli = useMemo(function () {
    return calcTitoli(positions, dati.holdings, tot.mkt, dati.opz.proxySP);
  }, [positions, dati.holdings, tot.mkt, dati.opz.proxySP]);
  var ai = useMemo(function () {
    return calcAi(positions, titoli, tot.mkt, tot.eqTot);
  }, [positions, titoli, tot.mkt, tot.eqTot]);
  var rischio = useMemo(function () {
    return calcRischio(positions, titoli, tot.mkt, dati.opz.betaOverride);
  }, [positions, titoli, tot.mkt, dati.opz.betaOverride]);
  var serie = useMemo(function () {
    return calcSerie(dati.snapshots);
  }, [dati.snapshots]);
  var alerts = useMemo(function () {
    return calcAlerts(positions, tot, dati.opz.sogliaUsd, titoli, ai);
  }, [positions, tot, dati.opz.sogliaUsd, titoli, ai]);
  var sim = useMemo(function () {
    return calcSim(positions, sellQty, dati.opz.zainetto, tot.usdNoGoldPct);
  }, [positions, sellQty, dati.opz.zainetto, tot.usdNoGoldPct]);
  var stress = useMemo(function () {
    return calcStress(positions, scenarioId, useCustom, customShock, tot.mkt, titoli, tierShock);
  }, [positions, scenarioId, useCustom, customShock, tot.mkt, titoli, tierShock]);
  var confronto = useMemo(function () {
    return calcConfronto(positions, titoli, tot.mkt);
  }, [positions, titoli, tot.mkt]);

  /* ------------------------------- import --------------------------------- */

  var onFile = useCallback(function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setParseNote(null);
    f.arrayBuffer().then(function (ab) {
      /* Uint8Array, non l'ArrayBuffer grezzo: con quello la lettura degli
         .xlsx, che sono archivi zip, fallisce senza dire niente. */
      var wb = XLSX.read(new Uint8Array(ab), {
        type: "array"
      });
      var sh = wb.Sheets[wb.SheetNames[0]];
      var grid = XLSX.utils.sheet_to_json(sh, {
        header: 1,
        raw: true
      });
      var r = leggiExport(grid);
      var m = f.name.match(/(\d{2})[._-](\d{2})[._-](\d{4})/);
      aggiorna({
        rows: r.rows,
        asOf: m ? m[3] + "-" + m[2] + "-" + m[1] : oggiISO()
      });
      setSellQty({});
      setParseNote({
        ok: true,
        msg: r.rows.length + " posizioni caricate.",
        ignoti: r.ignoti
      });
    }).catch(function (err) {
      setParseNote({
        ok: false,
        ignoti: [],
        msg: "Import non riuscito. " + (err.message || "") + " Serve l'export \"Portafoglio di sintesi\" di Fineco."
      });
    });
  }, [aggiorna]);
  var onHoldingsFiles = useCallback(function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    var fondi = positions.filter(function (q) {
      return q.c === "Azionario" && !q.az;
    });
    var next = Object.assign({}, dati.holdings);
    var esiti = [];
    files.reduce(function (cat, f) {
      return cat.then(function () {
        return f.arrayBuffer().then(function (ab) {
          var wb = XLSX.read(new Uint8Array(ab), {
            type: "array",
            codepage: 65001
          });
          var sh = wb.Sheets[wb.SheetNames[0]];
          var grid = XLSX.utils.sheet_to_json(sh, {
            header: 1,
            raw: false,
            defval: ""
          });
          var out = leggiComposizione(grid);
          if (out.errore) {
            esiti.push({
              file: f.name,
              ok: false,
              msg: out.errore
            });
            return;
          }
          var testa = grid.slice(0, 12).reduce(function (a, r) {
            return a.concat((r || []).map(function (c) {
              return String(c == null ? "" : c);
            }));
          }, []).join(" ");
          var match = abbinaFondo(f.name, testa, fondi);
          next[match ? match.isin : "?" + f.name] = {
            file: f.name,
            fondo: match ? match.t : null,
            data: oggiISO(),
            somma: out.somma,
            rows: out.rows
          };
          esiti.push({
            file: f.name,
            ok: true,
            fondo: match ? match.t : null,
            msg: out.rows.length + " titoli, somma pesi " + num(out.somma, 1) + "%"
          });
        }).catch(function (err) {
          esiti.push({
            file: f.name,
            ok: false,
            msg: err.message || "file non leggibile"
          });
        });
      });
    }, Promise.resolve()).then(function () {
      aggiorna({
        holdings: next
      });
      setHoldNote(esiti);
    });
  }, [positions, dati.holdings, aggiorna]);
  var assegnaFondo = useCallback(function (chiave, isinFondo) {
    var next = Object.assign({}, dati.holdings);
    var d = next[chiave];
    if (!d) return;
    delete next[chiave];
    if (isinFondo) next[isinFondo] = Object.assign({}, d, {
      fondo: BOOK[isinFondo] ? BOOK[isinFondo].t : isinFondo
    });
    aggiorna({
      holdings: next
    });
    setHoldNote(null);
  }, [dati.holdings, aggiorna]);
  var rimuoviFondo = useCallback(function (chiave) {
    var next = Object.assign({}, dati.holdings);
    delete next[chiave];
    aggiorna({
      holdings: next
    });
  }, [dati.holdings, aggiorna]);

  /* ------------------------------ snapshot -------------------------------- */

  var salvaSnapshot = useCallback(function () {
    var s = creaSnapshot(dati.asOf || oggiISO(), positions, tot, ai.espostoPct, rischio.beta);
    var next = dati.snapshots.filter(function (x) {
      return x.date !== s.date;
    }).concat([s]).sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
    aggiorna({
      snapshots: next
    });
  }, [dati.asOf, dati.snapshots, positions, tot, ai.espostoPct, rischio.beta, aggiorna]);
  var eliminaSnapshot = useCallback(function (date) {
    aggiorna({
      snapshots: dati.snapshots.filter(function (x) {
        return x.date !== date;
      })
    });
  }, [dati.snapshots, aggiorna]);

  /* ------------------------- copie e sicurezza ---------------------------- */

  var esportaBackup = useCallback(function () {
    if (sporco.current) {
      salvaOra(dati);
    }
    Vault.esportaCifrato().then(function (f) {
      scarica("san-giorgio-" + oggiISO() + ".json", JSON.stringify(f));
      setBackupNota({
        ok: true,
        t: "Copia salvata. Serve la passphrase di adesso per rileggerla."
      });
    }).catch(function (e) {
      setBackupNota({
        ok: false,
        t: "Non riuscito. " + (e.message || "")
      });
    });
  }, [dati, salvaOra]);
  var importaBackup = useCallback(function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBackupNota(null);
    f.text().then(function (txt) {
      var file = JSON.parse(txt);
      if (file.sangiorgio === "dati-chiari" && file.dati) {
        /* seme in chiaro: entra nella cassaforte già aperta e viene cifrato */
        var d = normalizzaDati(Object.assign({}, dati, file.dati));
        setDati(d);
        return salvaOra(d).then(function () {
          setBackupNota({
            ok: true,
            t: "Dati importati e cifrati nell'archivio."
          });
        });
      }
      if (file.sangiorgio !== "backup-cifrato") throw new Error("Non è una copia di San Giorgio.");
      var pw = window.prompt("Passphrase della copia che stai ripristinando:");
      if (!pw) return;
      return Vault.importaCifrato(file, pw).then(function (d2) {
        setDati(normalizzaDati(d2));
        setBackupNota({
          ok: true,
          t: "Copia ripristinata. Da adesso vale la passphrase di quella copia."
        });
      });
    }).catch(function (err) {
      setBackupNota({
        ok: false,
        t: err && err.message === "passphrase" ? "Passphrase della copia non valida." : "Non riuscito. " + (err && err.message || "")
      });
    });
  }, [dati, salvaOra]);

  /* ripristino dalla schermata di blocco, quando la cassaforte è chiusa */
  var ripristinaDaChiuso = useCallback(function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    f.text().then(function (txt) {
      var file = JSON.parse(txt);
      if (file.sangiorgio !== "backup-cifrato") throw new Error("Non è una copia cifrata di San Giorgio.");
      var pw = window.prompt("Passphrase della copia:");
      if (!pw) return;
      return Vault.importaCifrato(file, pw).then(function (d) {
        setDati(normalizzaDati(d));
        setStato("aperto");
        Vault.chiediPersistenza();
        ultimoTocco.current = Date.now();
      });
    }).catch(function (err) {
      window.alert(err && err.message === "passphrase" ? "Passphrase non valida." : "Ripristino non riuscito. " + (err && err.message || ""));
    });
  }, []);
  var cambiaPassphrase = useCallback(function (pw) {
    return Vault.cambiaPassphrase(pw, dati);
  }, [dati]);
  var distruggi = useCallback(function () {
    Vault.distruggi().then(function () {
      setDati(datiVuoti());
      setVista(null);
      setStato("crea");
    });
  }, []);
  var esportaCsv = useCallback(function () {
    var head = "Strumento;ISIN;Classe;Valore;Peso%;PL%;USD%;Fisco\n";
    var body = positions.map(function (q) {
      return [q.n, q.isin, q.c, num(q.mkt, 2), num(q.peso, 2), num(q.plPct, 2), num(q.usd * 100, 0), q.tax].join(";");
    }).join("\n");
    scarica("portafoglio-" + (dati.asOf || oggiISO()) + ".csv", head + body, "text/csv;charset=utf-8");
  }, [positions, dati.asOf]);

  /* ------------------------------ rendering ------------------------------- */

  if (stato === "avvio") {
    return /*#__PURE__*/React.createElement("div", {
      className: "lock"
    }, /*#__PURE__*/React.createElement("p", {
      className: "lede"
    }, "Apertura…"));
  }
  if (stato === "guasto") {
    return /*#__PURE__*/React.createElement("div", {
      className: "lock"
    }, /*#__PURE__*/React.createElement("h1", null, "San Giorgio"), /*#__PURE__*/React.createElement("p", {
      className: "lede",
      style: {
        color: T.red
      }
    }, guasto));
  }
  if (stato === "crea" || stato === "chiuso") {
    return /*#__PURE__*/React.createElement(Blocco, {
      modo: stato === "crea" ? "crea" : "apri",
      onInvia: stato === "crea" ? crea : apri,
      onRipristina: stato === "chiuso" ? ripristinaDaChiuso : null
    });
  }
  var vuoto = !positions.length;
  var schede = [["sintesi", "Sintesi"], ["titoli", "Titoli"], ["rischio", "Rischio"], ["stress", "Stress"], ["altro", "Altro"]];
  var titoliVista = {
    valute: "Valute e geografia",
    simulatore: "Simulatore fiscale",
    storico: "Storico",
    dati: "Dati",
    sicurezza: "Sicurezza"
  };
  function contenuto() {
    if (vista) {
      var v = null;
      if (vista === "valute") v = /*#__PURE__*/React.createElement(ScValute, {
        positions: positions,
        tot: tot,
        sogliaUsd: dati.opz.sogliaUsd,
        setSogliaUsd: function (x) {
          opz("sogliaUsd", x);
        },
        usdOverride: dati.opz.usdOverride,
        setUsdOverride: function (x) {
          opz("usdOverride", x);
        }
      });
      if (vista === "simulatore") v = /*#__PURE__*/React.createElement(ScSimulatore, {
        positions: positions,
        sim: sim,
        sellQty: sellQty,
        setSellQty: setSellQty,
        zainetto: dati.opz.zainetto,
        setZainetto: function (x) {
          opz("zainetto", x);
        }
      });
      if (vista === "storico") v = /*#__PURE__*/React.createElement(ScStorico, {
        serie: serie,
        asOf: dati.asOf || oggiISO(),
        positions: positions,
        salvaSnapshot: salvaSnapshot,
        eliminaSnapshot: eliminaSnapshot
      });
      if (vista === "dati") v = /*#__PURE__*/React.createElement(ScDati, {
        onFile: onFile,
        parseNote: parseNote,
        asOf: dati.asOf || oggiISO(),
        setAsOf: function (x) {
          aggiorna({
            asOf: x
          });
        },
        tot: tot,
        positions: positions,
        ai: ai,
        esportaCsv: esportaCsv
      });
      if (vista === "sicurezza") v = /*#__PURE__*/React.createElement(ScSicurezza, {
        cambiaPassphrase: cambiaPassphrase,
        esportaBackup: esportaBackup,
        importaBackup: importaBackup,
        backupNota: backupNota,
        distruggi: distruggi,
        bloccaOra: blocca,
        minutiBlocco: dati.opz.minutiBlocco,
        setMinutiBlocco: function (x) {
          opz("minutiBlocco", x);
        }
      });
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "sheet-head"
      }, /*#__PURE__*/React.createElement("button", {
        className: "back",
        onClick: function () {
          setVista(null);
        }
      }, /*#__PURE__*/React.createElement(Icona, {
        nome: "indietro"
      }), " Altro"), /*#__PURE__*/React.createElement("h1", {
        style: {
          fontSize: 17
        }
      }, titoliVista[vista])), v);
    }
    if (vuoto && tab !== "altro") {
      return /*#__PURE__*/React.createElement("div", {
        className: "wrap"
      }, /*#__PURE__*/React.createElement("div", {
        className: "sect"
      }, /*#__PURE__*/React.createElement("div", {
        className: "card"
      }, /*#__PURE__*/React.createElement("h2", null, "Nessun dato, per ora"), /*#__PURE__*/React.createElement("p", {
        className: "fine"
      }, "Scarica da Fineco l'export \"Portafoglio di sintesi\" e caricalo: resta su questo dispositivo e finisce nell'archivio cifrato. Poi, se vuoi il dettaglio per singolo titolo, aggiungi i file di composizione dei fondi."), /*#__PURE__*/React.createElement("div", {
        className: "btn-row",
        style: {
          marginTop: 12
        }
      }, /*#__PURE__*/React.createElement("label", {
        className: "btn btn-pri"
      }, "Carica l'export", /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: ".xls,.xlsx",
        style: {
          display: "none"
        },
        onChange: onFile
      }))), parseNote && !parseNote.ok ? /*#__PURE__*/React.createElement("p", {
        className: "fine",
        style: {
          color: T.red,
          marginTop: 10
        }
      }, parseNote.msg) : null)));
    }
    if (tab === "sintesi") return /*#__PURE__*/React.createElement(ScSintesi, {
      positions: positions,
      tot: tot,
      alerts: alerts,
      sogliaUsd: dati.opz.sogliaUsd,
      ordine: ordine,
      setOrdine: setOrdine
    });
    if (tab === "titoli") return /*#__PURE__*/React.createElement(ScTitoli, {
      titoli: titoli,
      positions: positions,
      holdings: dati.holdings,
      onHoldingsFiles: onHoldingsFiles,
      holdNote: holdNote,
      assegnaFondo: assegnaFondo,
      rimuoviFondo: rimuoviFondo,
      proxySP: dati.opz.proxySP,
      setProxySP: function (x) {
        opz("proxySP", x);
      }
    });
    if (tab === "rischio") return /*#__PURE__*/React.createElement(ScRischio, {
      rischio: rischio,
      serie: serie,
      tot: tot,
      betaOverride: dati.opz.betaOverride,
      setBetaOverride: function (x) {
        opz("betaOverride", x);
      }
    });
    if (tab === "stress") return /*#__PURE__*/React.createElement(ScStress, {
      stress: stress,
      tot: tot,
      ai: ai,
      confronto: confronto,
      scenarioId: scenarioId,
      setScenarioId: setScenarioId,
      useCustom: useCustom,
      setUseCustom: setUseCustom,
      customShock: customShock,
      setCustomShock: setCustomShock,
      tierShock: tierShock,
      setTierShock: setTierShock
    });
    return /*#__PURE__*/React.createElement(ScAltro, {
      vai: setVista,
      nSnap: dati.snapshots.length
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, !vista ? /*#__PURE__*/React.createElement("header", {
    className: "top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "top-in"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "top-val num"
  }, vuoto ? "San Giorgio" : eurK(tot.mkt)), /*#__PURE__*/React.createElement("div", {
    className: "top-meta"
  }, vuoto ? "archivio aperto" : "al " + dateIt(dati.asOf))), !vuoto ? /*#__PURE__*/React.createElement("div", {
    className: "top-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "top-delta num",
    style: {
      color: signed(tot.pl)
    }
  }, (tot.pl >= 0 ? "+" : "−") + eur(Math.abs(tot.pl))), /*#__PURE__*/React.createElement("div", {
    className: "top-meta num",
    style: {
      color: signed(tot.pl)
    }
  }, pct(tot.plPct, 2))) : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-sm",
    onClick: blocca,
    "aria-label": "Blocca l'archivio"
  }, /*#__PURE__*/React.createElement(Icona, {
    nome: "lucchetto",
    size: 17
  })))) : null, /*#__PURE__*/React.createElement("div", {
    className: "scroll"
  }, contenuto()), /*#__PURE__*/React.createElement("nav", {
    className: "tabbar",
    "aria-label": "Sezioni"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tabbar-in"
  }, schede.map(function (s) {
    var att = tab === s[0] && !vista;
    return /*#__PURE__*/React.createElement("button", {
      key: s[0],
      className: "tab",
      "aria-current": att ? "page" : undefined,
      onClick: function () {
        setTab(s[0]);
        setVista(null);
      }
    }, /*#__PURE__*/React.createElement(Icona, {
      nome: s[0],
      attiva: att
    }), /*#__PURE__*/React.createElement("span", null, s[1]));
  }))));
}

/* --------------------------------- avvio ---------------------------------- */

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

/* Il service worker serve solo a far funzionare l'app senza rete: mette in
   cache i propri file e non parla con nessun altro. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {/* pazienza */});
  });
}