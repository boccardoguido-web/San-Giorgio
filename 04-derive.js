/* ==========================================================================
   San Giorgio — derivazioni
   Funzioni pure: prendono le posizioni e le opzioni, restituiscono numeri.
   Nessuno stato, nessun React: così si possono collaudare da sole.
   ========================================================================== */

function calcPositions(rows, usdOverride, ordine) {
  var total = rows.reduce(function (a, r) { return a + r.mkt; }, 0) || 1;
  return rows.map(function (r) {
    var b = BOOK[r.isin] || {
      n: r.nome || r.isin, t: (r.nome || r.isin).slice(0, 6),
      c: "Azionario", usd: 0, reg: {}, tax: "diversi", rate: 0.26,
    };
    var usd = usdOverride && usdOverride[r.isin] != null ? usdOverride[r.isin] / 100 : b.usd;
    return Object.assign({}, r, b, {
      usd: usd,
      peso: (r.mkt / total) * 100,
      pl: r.mkt - r.carico,
      plPct: r.carico ? (r.mkt / r.carico - 1) * 100 : 0,
    });
  }).sort(function (a, b) {
    if (ordine === "pl") return a.plPct - b.plPct;
    if (ordine === "nome") return a.n.localeCompare(b.n);
    return b.mkt - a.mkt;
  });
}

function calcTot(positions) {
  var mkt = positions.reduce(function (a, p) { return a + p.mkt; }, 0);
  var carico = positions.reduce(function (a, p) { return a + p.carico; }, 0);
  var ratei = positions.reduce(function (a, p) { return a + (p.rateo || 0); }, 0);
  var terEur = positions.reduce(function (a, p) { return a + (p.ter ? (p.mkt * p.ter) / 100 : 0); }, 0);
  var usdEur = positions.reduce(function (a, p) { return a + p.mkt * p.usd; }, 0);
  var usdNoGold = positions.reduce(function (a, p) { return a + (p.c === "Oro" ? 0 : p.mkt * p.usd); }, 0);
  var byClass = {};
  CLASS_ORDER.forEach(function (c) { byClass[c] = 0; });
  positions.forEach(function (p) { byClass[p.c] = (byClass[p.c] || 0) + p.mkt; });
  var reg = { US: 0, EU: 0, JP: 0, ALTRO: 0 };
  var eqTot = 0;
  positions.forEach(function (p) {
    if (p.c !== "Azionario") return;
    eqTot += p.mkt;
    Object.keys(p.reg || {}).forEach(function (k) { reg[k] += p.mkt * p.reg[k]; });
  });
  return {
    mkt: mkt, carico: carico, ratei: ratei, terEur: terEur,
    terPct: mkt ? (terEur / mkt) * 100 : 0,
    pl: mkt - carico,
    plPct: carico ? (mkt / carico - 1) * 100 : 0,
    usdEur: usdEur,
    usdPct: mkt ? (usdEur / mkt) * 100 : 0,
    usdNoGoldPct: mkt ? (usdNoGold / mkt) * 100 : 0,
    byClass: byClass, reg: reg, eqTot: eqTot,
  };
}

function calcTitoli(positions, holdings, totMkt, proxySP) {
  var mappa = new Map();
  var fondiCoperti = [];
  var eqTot = 0, eqCoperto = 0;
  var comp = Object.assign({}, COMPOSIZIONI_INTERNE, holdings);

  /* l'ETC sull'S&P 500 è sintetico: si può approssimare con la parte USA di
     SWDA rinormalizzata, ed è una stima, non il paniere reale */
  if (proxySP && comp[BENCHMARK] && comp[BENCHMARK].rows && comp[BENCHMARK].rows.length && !comp.XS2427355958) {
    var us = comp[BENCHMARK].rows.filter(function (r) {
      return /stati uniti|united states/i.test(r.paese || "") || /^US/.test(r.isin || "");
    });
    var sUs = us.reduce(function (a, r) { return a + r.peso; }, 0);
    if (sUs > 20) {
      comp.XS2427355958 = {
        file: "Stima: parte USA di SWDA rinormalizzata", stima: true, data: "stima",
        rows: us.map(function (r) { return Object.assign({}, r, { peso: (r.peso / sUs) * 100 }); }),
      };
    }
  }

  function aggiungi(chiave, nome, isin, val, fonte, tier, sett, paese) {
    if (!mappa.has(chiave)) {
      mappa.set(chiave, { chiave: chiave, nome: nome, isin: isin, eur: 0, fonti: {},
        sett: sett, paese: paese, tier: tier });
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
      var tier = (p.ai && AI_TIER_ORDER.filter(function (k) { return p.ai[k] === 1; })[0]) || "resto";
      aggiungi(p.isin, p.n, p.isin, p.mkt, p.t, tier, "", "");
      aiQuote[p.isin] = p.ai || { resto: 1 };
      return;
    }
    var h = comp[p.isin];
    if (!h || !h.rows || !h.rows.length) return;
    eqCoperto += p.mkt;
    fondiCoperti.push({ isin: p.isin, t: p.t, mkt: p.mkt, n: h.rows.length,
      data: h.data, stima: !!h.stima, interno: !!h.interno });
    var q = { t1: 0, t2: 0, t3: 0, spec: 0, dif: 0, resto: 0 };
    var somma = 0;
    h.rows.forEach(function (r) {
      var chiave = r.isin || normNome(r.nome);
      if (!chiave) return;
      var tr = tierDiTitolo(r, p.t);
      q[tr] += r.peso;
      somma += r.peso;
      aggiungi(chiave, r.nome, r.isin, (p.mkt * r.peso) / 100, p.t, tr, r.sett, r.paese);
    });
    if (somma > 0) {
      AI_TIER_ORDER.forEach(function (k) { q[k] /= somma; });
      aiQuote[p.isin] = q;
    }
  });

  var lista = Array.from(mappa.values()).map(function (t) {
    return Object.assign({}, t, {
      pct: totMkt ? (t.eur / totMkt) * 100 : 0,
      pctEq: eqCoperto ? (t.eur / eqCoperto) * 100 : 0,
    });
  }).sort(function (a, b) { return b.eur - a.eur; });

  var top10 = lista.slice(0, 10).reduce(function (a, t) { return a + t.eur; }, 0);
  var hhi = lista.reduce(function (a, t) { return a + Math.pow(t.eur / (eqCoperto || 1), 2); }, 0);

  /* sovrapposizione: somma dei pesi minimi comuni fra due fondi */
  var coppie = [];
  for (var i = 0; i < fondiCoperti.length; i++) {
    for (var j = i + 1; j < fondiCoperti.length; j++) {
      var ha = comp[fondiCoperti[i].isin].rows;
      var hb = comp[fondiCoperti[j].isin].rows;
      var mb = new Map(hb.map(function (r) { return [r.isin || normNome(r.nome), r.peso]; }));
      var ov = 0, comuni = 0;
      ha.forEach(function (r) {
        var k = r.isin || normNome(r.nome);
        if (mb.has(k)) { ov += Math.min(r.peso, mb.get(k)); comuni++; }
      });
      coppie.push({ a: fondiCoperti[i].t, b: fondiCoperti[j].t, ov: ov, comuni: comuni });
    }
  }
  coppie.sort(function (x, y) { return y.ov - x.ov; });

  return {
    lista: lista, fondiCoperti: fondiCoperti, comp: comp, aiQuote: aiQuote,
    eqTot: eqTot, eqCoperto: eqCoperto,
    copertura: eqTot ? (eqCoperto / eqTot) * 100 : 0,
    top10pct: totMkt ? (top10 / totMkt) * 100 : 0,
    effN: hhi > 0 ? 1 / hhi : 0,
    coppie: coppie, nTitoli: lista.length,
  };
}

function calcAi(positions, titoli, totMkt, eqTot) {
  var perCanale = { t1: 0, t2: 0, t3: 0, spec: 0, dif: 0, resto: 0 };
  var dalVivo = 0, daDefault = 0;
  positions.forEach(function (p) {
    if (p.c !== "Azionario") return;
    var q = titoli.aiQuote[p.isin] || p.ai;
    if (!q) { perCanale.resto += p.mkt; daDefault += p.mkt; return; }
    if (titoli.aiQuote[p.isin]) dalVivo += p.mkt; else daDefault += p.mkt;
    AI_TIER_ORDER.forEach(function (k) { perCanale[k] += p.mkt * (q[k] || 0); });
  });
  var esposto = perCanale.t1 + perCanale.t2 + perCanale.t3;
  return {
    perCanale: perCanale, esposto: esposto,
    espostoPct: totMkt ? (esposto / totMkt) * 100 : 0,
    espostoEqPct: eqTot ? (esposto / eqTot) * 100 : 0,
    dalVivo: dalVivo, daDefault: daDefault,
    titoliAI: titoli.lista.filter(function (t) {
      return t.tier === "t1" || t.tier === "t2" || t.tier === "t3";
    }).slice(0, 20),
  };
}

function calcRischio(positions, titoli, totMkt, betaOverride) {
  var comp = titoli.comp || {};

  /* Beta dal mix settoriale, quando la composizione lo consente. La costante di
     taratura viene dal benchmark stesso: il beta di SWDA calcolato dai suoi
     settori deve valere 1,00 per definizione, e lo scarto misura quanto la
     tabella settoriale è tarata male. Correggerlo lì raddrizza anche gli altri. */
  function mixBeta(rows) {
    var s = {}, t = 0;
    rows.forEach(function (r) {
      var k = r.sett;
      if (!k || SETT_BETA[k] == null) return;
      s[k] = (s[k] || 0) + r.peso;
      t += r.peso;
    });
    if (t < 60) return null; /* troppo poco coperto per fidarsi */
    return Object.keys(s).reduce(function (a, k) { return a + (s[k] / t) * SETT_BETA[k]; }, 0);
  }

  var bench = comp[BENCHMARK] && comp[BENCHMARK].rows && comp[BENCHMARK].rows.length
    ? mixBeta(comp[BENCHMARK].rows) : null;
  var cal = bench && bench > 0 ? 1 / bench : null;

  var perPos = positions.map(function (p) {
    var b = BETA_EX_ANTE[p.isin] ? BETA_EX_ANTE[p.isin].b : (p.c === "Azionario" ? 1 : 0);
    var f = BETA_EX_ANTE[p.isin] ? BETA_EX_ANTE[p.isin].f : "ipotesi";
    if (betaOverride && betaOverride[p.isin] != null) {
      b = betaOverride[p.isin];
      f = "tua stima";
    } else if (cal && p.c === "Azionario" && comp[p.isin] && comp[p.isin].rows && comp[p.isin].rows.length) {
      var m = mixBeta(comp[p.isin].rows);
      if (m != null) { b = m * cal; f = "settori"; }
    }
    return Object.assign({}, p, { beta: b, betaFonte: f, contrib: (p.mkt * b) / (totMkt || 1) });
  });

  var beta = perPos.reduce(function (a, p) { return a + p.contrib; }, 0);
  var eq = perPos.filter(function (p) { return p.c === "Azionario"; });
  var vEq = eq.reduce(function (a, p) { return a + p.mkt; }, 0);
  var hy = perPos.filter(function (p) { return p.c === "Obblig. HY"; });
  var betaHy = hy.reduce(function (a, p) { return a + p.contrib; }, 0);
  var isCore = function (p) { return p.isin === BENCHMARK || p.isin === "XS2427355958"; };
  var core = perPos.filter(isCore);
  var vCore = core.reduce(function (a, p) { return a + p.mkt; }, 0);
  var attive = perPos.filter(function (p) { return !isCore(p); });
  var vAtt = attive.reduce(function (a, p) { return a + p.mkt; }, 0);

  return {
    perPos: perPos, beta: beta, calibrato: !!cal, cal: cal,
    betaEq: vEq ? eq.reduce(function (a, p) { return a + p.mkt * p.beta; }, 0) / vEq : 0,
    vEq: vEq, betaHy: betaHy, hyEquivalente: betaHy * (totMkt || 0),
    betaSenzaHy: perPos.filter(function (p) { return p.c !== "Obblig. HY"; })
      .reduce(function (a, p) { return a + p.contrib; }, 0),
    vCore: vCore,
    betaCore: vCore ? core.reduce(function (a, p) { return a + p.mkt * p.beta; }, 0) / vCore : 0,
    vAtt: vAtt,
    betaAtt: vAtt ? attive.reduce(function (a, p) { return a + p.mkt * p.beta; }, 0) / vAtt : 0,
  };
}

function calcSerie(snapshots) {
  var ord = snapshots.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
  var oss = [];
  for (var i = 1; i < ord.length; i++) {
    var o = rendimentoPeriodo(ord[i - 1], ord[i]);
    if (o) oss.push(o);
  }
  var reg = regressione(oss);
  var cum = oss.reduce(function (a, o) { return a * (1 + o.r); }, 1) - 1;
  var cumB = oss.reduce(function (a, o) { return o.rb == null ? a : a * (1 + o.rb); }, 1) - 1;
  return { oss: oss, reg: reg, cum: cum, cumB: cumB, nSnap: ord.length, ordinati: ord };
}

function calcAlerts(positions, tot, sogliaUsd, titoli, ai) {
  var out = [];
  if (tot.usdNoGoldPct > sogliaUsd) {
    out.push({ lv: "alto",
      t: "Dollaro al " + pct(tot.usdNoGoldPct) + " contro una soglia del " + sogliaUsd + "%",
      d: "Look-through escluso oro. Nuovi versamenti in area euro riducono il divario più in fretta di uno switch." });
  }
  if (ai.espostoPct > 15) {
    out.push({ lv: "medio",
      t: "Tesi AI al " + pct(ai.espostoPct) + " del portafoglio",
      d: "Somma dei tre canali: fornitori del capex, chi lo finanzia, infrastruttura elettrica. È " +
        pct(ai.espostoEqPct) + " dell'azionario, e nessuna riga si chiama così." });
  }
  var top = positions[0];
  if (top && top.peso > 30) {
    out.push({ lv: "medio",
      t: top.t + " pesa il " + pct(top.peso) + " del portafoglio",
      d: "Concentrazione su singolo strumento. Accettabile per un core globale, da tenere sotto osservazione." });
  }
  var hy = tot.mkt ? (tot.byClass["Obblig. HY"] / tot.mkt) * 100 : 0;
  if (hy > 12) {
    out.push({ lv: "medio", t: "High yield al " + pct(hy),
      d: "In stress l'HY si muove con l'azionario: l'esposizione direzionale reale è più alta di quanto dica la riga azionario." });
  }
  var haCopertura = positions.some(function (p) {
    return p.c === "Obblig. IG" && p.usd === 0 && !p.pinned && tot.mkt && p.mkt / tot.mkt > 0.05;
  });
  if (positions.length && !haCopertura) {
    out.push({ lv: "alto", t: "Nessun attivo che sale quando l'azionario scende",
      d: "Manca un governativo euro a duration medio-lunga. Oro e liquidità attutiscono, non compensano." });
  }
  var inScadenza = positions.filter(function (p) { return p.pinned; });
  if (inScadenza.length) {
    out.push({ lv: "basso",
      t: inScadenza.map(function (p) { return p.t; }).join(", ") + " in rimborso",
      d: "Il capitale torna liquidità a breve: " +
        eur(inScadenza.reduce(function (a, p) { return a + p.mkt + (p.rateo || 0); }, 0)) +
        " da reimpiegare, senza vendere nulla e senza conseguenze fiscali." });
  }
  var capofila = titoli.lista[0];
  if (capofila && capofila.pct > 2 && Object.keys(capofila.fonti).length > 1) {
    out.push({ lv: "medio",
      t: capofila.nome + " vale " + pct(capofila.pct) + " del portafoglio",
      d: "Esposizione sommata su " + Object.keys(capofila.fonti).join(", ") +
        ". Nessuna di queste righe da sola la rende visibile." });
  }
  return out;
}

function calcSim(positions, sellQty, zainetto, totUsdNoGoldPct) {
  var vendite = positions.map(function (p) {
    var q = sellQty[p.isin] || 0;
    if (!q) return null;
    var frazione = Math.min(1, q / 100);
    var ricavo = p.mkt * frazione;
    return Object.assign({}, p, { frazione: frazione, ricavo: ricavo,
      costo: p.carico * frazione, realizzo: ricavo - p.carico * frazione });
  }).filter(Boolean);

  var plusDiversi = vendite.filter(function (v) { return v.realizzo > 0 && v.tax === "diversi"; })
    .reduce(function (a, v) { return a + v.realizzo; }, 0);
  var plusCapitale = vendite.filter(function (v) { return v.realizzo > 0 && v.tax === "capitale"; })
    .reduce(function (a, v) { return a + v.realizzo; }, 0);
  var minus = vendite.filter(function (v) { return v.realizzo < 0; })
    .reduce(function (a, v) { return a - v.realizzo; }, 0);

  /* le minus della stessa operazione si compensano subito con le plus "diversi" */
  var netDiversi = plusDiversi - minus;
  var compensabile = Math.max(0, netDiversi);
  var usaZainetto = Math.min(zainetto, compensabile);
  var imponibileDiversi = compensabile - usaZainetto;

  var rateW = plusDiversi > 0
    ? vendite.filter(function (v) { return v.realizzo > 0 && v.tax === "diversi"; })
        .reduce(function (a, v) { return a + v.realizzo * v.rate; }, 0) / plusDiversi
    : 0.26;
  var rateCap = plusCapitale > 0
    ? vendite.filter(function (v) { return v.realizzo > 0 && v.tax === "capitale"; })
        .reduce(function (a, v) { return a + v.realizzo * v.rate; }, 0) / plusCapitale
    : 0.26;

  var imposta = imponibileDiversi * rateW + plusCapitale * rateCap;
  var resid = positions.map(function (p) {
    var f = 1 - Math.min(1, (sellQty[p.isin] || 0) / 100);
    return Object.assign({}, p, { mkt: p.mkt * f });
  });
  var newTot = resid.reduce(function (a, p) { return a + p.mkt; }, 0);
  var newUsd = resid.reduce(function (a, p) { return a + (p.c === "Oro" ? 0 : p.mkt * p.usd); }, 0);

  return {
    vendite: vendite, plusDiversi: plusDiversi, plusCapitale: plusCapitale, minus: minus,
    usaZainetto: usaZainetto, imponibileDiversi: imponibileDiversi, imposta: imposta,
    nuovoZainetto: zainetto - usaZainetto + Math.max(0, -netDiversi),
    liquidita: vendite.reduce(function (a, v) { return a + v.ricavo; }, 0) - imposta,
    newTot: newTot,
    newUsdPct: newTot ? (newUsd / newTot) * 100 : 0,
    deltaUsdPct: (newTot ? (newUsd / newTot) * 100 : 0) - totUsdNoGoldPct,
    chiuse: vendite.filter(function (v) { return v.frazione >= 1; }).length,
    nPos: resid.filter(function (p) { return p.mkt > 0.5; }).length,
  };
}

function shockDiPosizione(p, sc, aiQuote, tiers) {
  if (p.pinned) return 0;
  if (sc.ai && p.c === "Azionario") {
    var q = aiQuote[p.isin] || p.ai || { resto: 1 };
    var tt = tiers || sc.tier;
    return AI_TIER_ORDER.reduce(function (a, k) { return a + (q[k] || 0) * tt[k]; }, 0);
  }
  return sc.s[p.c] == null ? 0 : sc.s[p.c];
}

function calcStress(positions, scenarioId, useCustom, customShock, totMkt, titoli, tierShock) {
  var sc = SCENARIOS.filter(function (s) { return s.id === scenarioId; })[0] || SCENARIOS[0];
  var perCanale = !useCustom && !!sc.ai;
  var tiers = perCanale ? Object.assign({}, sc.tier, tierShock || {}) : null;

  var shocks = useCustom ? {
    Azionario: customShock.Azionario / 100,
    "Obblig. HY": customShock["Obblig. HY"] / 100,
    "Obblig. IG": customShock["Obblig. IG"] / 100,
    Oro: customShock.Oro / 100,
    "Liquidità": customShock["Liquidità"] / 100,
  } : sc.s;
  var fx = useCustom ? customShock.fx / 100 : sc.fx;
  var scEff = useCustom ? { s: shocks, fx: fx } : sc;

  var perPos = positions.map(function (p) {
    if (p.pinned) return Object.assign({}, p, { delta: 0, base: 0, cambio: 0, shock: 0 });
    var shock = perCanale
      ? shockDiPosizione(p, sc, titoli.aiQuote, tiers)
      : (shocks[p.c] == null ? 0 : shocks[p.c]);
    var base = shock * p.mkt;
    var cambio = p.usd * fx * p.mkt;
    return Object.assign({}, p, { delta: base + cambio, base: base, cambio: cambio, shock: shock });
  });

  var delta = perPos.reduce(function (a, p) { return a + p.delta; }, 0);
  var deltaFx = perPos.reduce(function (a, p) { return a + p.cambio; }, 0);
  var deltaAsset = perPos.reduce(function (a, p) { return a + p.base; }, 0);
  var byClass = {};
  CLASS_ORDER.forEach(function (c) { byClass[c] = 0; });
  perPos.forEach(function (p) { byClass[p.c] += p.delta; });

  var byTier = {};
  if (perCanale) {
    AI_TIER_ORDER.forEach(function (k) { byTier[k] = 0; });
    positions.forEach(function (p) {
      if (p.c !== "Azionario" || p.pinned) return;
      var q = titoli.aiQuote[p.isin] || p.ai || { resto: 1 };
      AI_TIER_ORDER.forEach(function (k) { byTier[k] += p.mkt * (q[k] || 0) * tiers[k]; });
    });
  }

  return {
    sc: sc, scEff: scEff, fx: fx, perCanale: perCanale, tiers: tiers, perPos: perPos,
    delta: delta, deltaFx: deltaFx, deltaAsset: deltaAsset,
    pct: totMkt ? (delta / totMkt) * 100 : 0,
    fxPct: totMkt ? (deltaFx / totMkt) * 100 : 0,
    assetPct: totMkt ? (deltaAsset / totMkt) * 100 : 0,
    byClass: byClass, byTier: byTier, dopo: totMkt + delta,
  };
}

function calcConfronto(positions, titoli, totMkt) {
  return SCENARIOS.map(function (sc) {
    var d = 0;
    positions.forEach(function (p) {
      if (p.pinned) return;
      d += p.mkt * (shockDiPosizione(p, sc, titoli.aiQuote, null) + p.usd * sc.fx);
    });
    return { id: sc.id, nome: sc.nome, ai: !!sc.ai, delta: d,
      pct: totMkt ? (d / totMkt) * 100 : 0 };
  }).sort(function (a, b) { return a.pct - b.pct; });
}

/* snapshot dalla situazione corrente: i prezzi per quota sono ciò che rende
   calcolabili i rendimenti di periodo, e con essi alpha e beta */
function creaSnapshot(asOf, positions, tot, aiPct, beta) {
  var px = {}, val = {};
  positions.forEach(function (p) {
    if (p.qty > 0) px[p.isin] = p.mkt / p.qty;
    val[p.isin] = p.mkt;
  });
  return {
    date: asOf, mkt: tot.mkt, carico: tot.carico, usdPct: tot.usdNoGoldPct,
    aiPct: aiPct, beta: beta, n: positions.length, byClass: tot.byClass,
    px: px, val: val,
  };
}
