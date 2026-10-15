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
    Azionario: -30, "Obblig. HY": -20, "Obblig. IG": 0, Oro: 5, "Liquidità": 0, fx: 10,
  });
  var [parseNote, setParseNote] = useState(null);
  var [holdNote, setHoldNote] = useState(null);
  var [backupNota, setBackupNota] = useState(null);
  var [tema, setTema] = useState(0);

  /* i colori per gli SVG arrivano dal foglio di stile: si rileggono quando il
     sistema passa da chiaro a scuro, e il contatore forza un nuovo disegno */
  useEffect(function () {
    sincronizzaTema();
    setTema(function (n) { return n + 1; });
    if (typeof matchMedia !== "function") return;
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var h = function () {
      sincronizzaTema();
      setTema(function (n) { return n + 1; });
    };
    if (mq.addEventListener) mq.addEventListener("change", h);
    else if (mq.addListener) mq.addListener(h);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", h);
      else if (mq.removeListener) mq.removeListener(h);
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
    return Vault.salva(d || dati).catch(function () { return false; });
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
      return { opz: o };
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

    function tocca() { ultimoTocco.current = Date.now(); }
    var eventi = ["pointerdown", "keydown", "wheel", "touchstart"];
    eventi.forEach(function (e) { window.addEventListener(e, tocca, { passive: true }); });

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
      eventi.forEach(function (e) { window.removeEventListener(e, tocca); });
      clearInterval(iv);
      document.removeEventListener("visibilitychange", visibilita);
    };
  }, [stato, dati, blocca]);

  /* ------------------------------ derivazioni ----------------------------- */

  var positions = useMemo(function () {
    return calcPositions(dati.rows, dati.opz.usdOverride, ordine);
  }, [dati.rows, dati.opz.usdOverride, ordine]);

  var tot = useMemo(function () { return calcTot(positions); }, [positions]);

  var titoli = useMemo(function () {
    return calcTitoli(positions, dati.holdings, tot.mkt, dati.opz.proxySP);
  }, [positions, dati.holdings, tot.mkt, dati.opz.proxySP]);

  var ai = useMemo(function () {
    return calcAi(positions, titoli, tot.mkt, tot.eqTot);
  }, [positions, titoli, tot.mkt, tot.eqTot]);

  var rischio = useMemo(function () {
    return calcRischio(positions, titoli, tot.mkt, dati.opz.betaOverride);
  }, [positions, titoli, tot.mkt, dati.opz.betaOverride]);

  var serie = useMemo(function () { return calcSerie(dati.snapshots); }, [dati.snapshots]);

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
      var wb = XLSX.read(new Uint8Array(ab), { type: "array" });
      var sh = wb.Sheets[wb.SheetNames[0]];
      var grid = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true });
      var r = leggiExport(grid);
      var m = f.name.match(/(\d{2})[._-](\d{2})[._-](\d{4})/);
      aggiorna({ rows: r.rows, asOf: m ? m[3] + "-" + m[2] + "-" + m[1] : oggiISO() });
      setSellQty({});
      setParseNote({ ok: true, msg: r.rows.length + " posizioni caricate.", ignoti: r.ignoti });
    }).catch(function (err) {
      setParseNote({ ok: false, ignoti: [],
        msg: "Import non riuscito. " + (err.message || "") +
          " Serve l'export \"Portafoglio di sintesi\" di Fineco." });
    });
  }, [aggiorna]);

  var onHoldingsFiles = useCallback(function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    var fondi = positions.filter(function (q) { return q.c === "Azionario" && !q.az; });
    var next = Object.assign({}, dati.holdings);
    var esiti = [];

    files.reduce(function (cat, f) {
      return cat.then(function () {
        return f.arrayBuffer().then(function (ab) {
          var wb = XLSX.read(new Uint8Array(ab), { type: "array", codepage: 65001 });
          var sh = wb.Sheets[wb.SheetNames[0]];
          var grid = XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, defval: "" });
          var out = leggiComposizione(grid);
          if (out.errore) { esiti.push({ file: f.name, ok: false, msg: out.errore }); return; }
          var testa = grid.slice(0, 12).reduce(function (a, r) {
            return a.concat((r || []).map(function (c) { return String(c == null ? "" : c); }));
          }, []).join(" ");
          var match = abbinaFondo(f.name, testa, fondi);
          next[match ? match.isin : "?" + f.name] = {
            file: f.name, fondo: match ? match.t : null,
            data: oggiISO(), somma: out.somma, rows: out.rows,
          };
          esiti.push({ file: f.name, ok: true, fondo: match ? match.t : null,
            msg: out.rows.length + " titoli, somma pesi " + num(out.somma, 1) + "%" });
        }).catch(function (err) {
          esiti.push({ file: f.name, ok: false, msg: err.message || "file non leggibile" });
        });
      });
    }, Promise.resolve()).then(function () {
      aggiorna({ holdings: next });
      setHoldNote(esiti);
    });
  }, [positions, dati.holdings, aggiorna]);

  var assegnaFondo = useCallback(function (chiave, isinFondo) {
    var next = Object.assign({}, dati.holdings);
    var d = next[chiave];
    if (!d) return;
    delete next[chiave];
    if (isinFondo) next[isinFondo] = Object.assign({}, d, { fondo: BOOK[isinFondo] ? BOOK[isinFondo].t : isinFondo });
    aggiorna({ holdings: next });
    setHoldNote(null);
  }, [dati.holdings, aggiorna]);

  var rimuoviFondo = useCallback(function (chiave) {
    var next = Object.assign({}, dati.holdings);
    delete next[chiave];
    aggiorna({ holdings: next });
  }, [dati.holdings, aggiorna]);

  /* ------------------------------ snapshot -------------------------------- */

  var salvaSnapshot = useCallback(function () {
    var s = creaSnapshot(dati.asOf || oggiISO(), positions, tot, ai.espostoPct, rischio.beta);
    var next = dati.snapshots.filter(function (x) { return x.date !== s.date; }).concat([s])
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    aggiorna({ snapshots: next });
  }, [dati.asOf, dati.snapshots, positions, tot, ai.espostoPct, rischio.beta, aggiorna]);

  var eliminaSnapshot = useCallback(function (date) {
    aggiorna({ snapshots: dati.snapshots.filter(function (x) { return x.date !== date; }) });
  }, [dati.snapshots, aggiorna]);

  /* ------------------------- copie e sicurezza ---------------------------- */

  var esportaBackup = useCallback(function () {
    if (sporco.current) { salvaOra(dati); }
    Vault.esportaCifrato().then(function (f) {
      scarica("san-giorgio-" + oggiISO() + ".json", JSON.stringify(f));
      setBackupNota({ ok: true, t: "Copia salvata. Serve la passphrase di adesso per rileggerla." });
    }).catch(function (e) {
      setBackupNota({ ok: false, t: "Non riuscito. " + (e.message || "") });
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
          setBackupNota({ ok: true, t: "Dati importati e cifrati nell'archivio." });
        });
      }
      if (file.sangiorgio !== "backup-cifrato") throw new Error("Non è una copia di San Giorgio.");
      var pw = window.prompt("Passphrase della copia che stai ripristinando:");
      if (!pw) return;
      return Vault.importaCifrato(file, pw).then(function (d2) {
        setDati(normalizzaDati(d2));
        setBackupNota({ ok: true, t: "Copia ripristinata. Da adesso vale la passphrase di quella copia." });
      });
    }).catch(function (err) {
      setBackupNota({ ok: false, t: err && err.message === "passphrase"
        ? "Passphrase della copia non valida."
        : "Non riuscito. " + ((err && err.message) || "") });
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
      window.alert(err && err.message === "passphrase"
        ? "Passphrase non valida."
        : "Ripristino non riuscito. " + ((err && err.message) || ""));
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
      return [q.n, q.isin, q.c, num(q.mkt, 2), num(q.peso, 2), num(q.plPct, 2),
        num(q.usd * 100, 0), q.tax].join(";");
    }).join("\n");
    scarica("portafoglio-" + (dati.asOf || oggiISO()) + ".csv", head + body, "text/csv;charset=utf-8");
  }, [positions, dati.asOf]);

  /* ------------------------------ rendering ------------------------------- */

  if (stato === "avvio") {
    return <div className="lock"><p className="lede">Apertura…</p></div>;
  }
  if (stato === "guasto") {
    return (
      <div className="lock">
        <h1>San Giorgio</h1>
        <p className="lede" style={{ color: T.red }}>{guasto}</p>
      </div>
    );
  }
  if (stato === "crea" || stato === "chiuso") {
    return (
      <Blocco modo={stato === "crea" ? "crea" : "apri"}
        onInvia={stato === "crea" ? crea : apri}
        onRipristina={stato === "chiuso" ? ripristinaDaChiuso : null} />
    );
  }

  var vuoto = !positions.length;

  var schede = [
    ["sintesi", "Sintesi"],
    ["titoli", "Titoli"],
    ["rischio", "Rischio"],
    ["stress", "Stress"],
    ["altro", "Altro"],
  ];

  var titoliVista = {
    valute: "Valute e geografia",
    simulatore: "Simulatore fiscale",
    storico: "Storico",
    dati: "Dati",
    sicurezza: "Sicurezza",
  };

  function contenuto() {
    if (vista) {
      var v = null;
      if (vista === "valute") v = <ScValute positions={positions} tot={tot}
        sogliaUsd={dati.opz.sogliaUsd} setSogliaUsd={function (x) { opz("sogliaUsd", x); }}
        usdOverride={dati.opz.usdOverride} setUsdOverride={function (x) { opz("usdOverride", x); }} />;
      if (vista === "simulatore") v = <ScSimulatore positions={positions} sim={sim}
        sellQty={sellQty} setSellQty={setSellQty}
        zainetto={dati.opz.zainetto} setZainetto={function (x) { opz("zainetto", x); }} />;
      if (vista === "storico") v = <ScStorico serie={serie} asOf={dati.asOf || oggiISO()}
        positions={positions} salvaSnapshot={salvaSnapshot} eliminaSnapshot={eliminaSnapshot} />;
      if (vista === "dati") v = <ScDati onFile={onFile} parseNote={parseNote}
        asOf={dati.asOf || oggiISO()} setAsOf={function (x) { aggiorna({ asOf: x }); }}
        tot={tot} positions={positions} ai={ai} esportaCsv={esportaCsv} />;
      if (vista === "sicurezza") v = <ScSicurezza cambiaPassphrase={cambiaPassphrase}
        esportaBackup={esportaBackup} importaBackup={importaBackup} backupNota={backupNota}
        distruggi={distruggi} bloccaOra={blocca}
        minutiBlocco={dati.opz.minutiBlocco} setMinutiBlocco={function (x) { opz("minutiBlocco", x); }} />;
      return (
        <div>
          <div className="sheet-head">
            <button className="back" onClick={function () { setVista(null); }}>
              <Icona nome="indietro" /> Altro
            </button>
            <h1 style={{ fontSize: 17 }}>{titoliVista[vista]}</h1>
          </div>
          {v}
        </div>
      );
    }

    if (vuoto && tab !== "altro") {
      return (
        <div className="wrap">
          <div className="sect">
            <div className="card">
              <h2>Nessun dato, per ora</h2>
              <p className="fine">
                Scarica da Fineco l'export "Portafoglio di sintesi" e caricalo: resta su questo
                dispositivo e finisce nell'archivio cifrato. Poi, se vuoi il dettaglio per singolo
                titolo, aggiungi i file di composizione dei fondi.
              </p>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <label className="btn btn-pri">
                  Carica l'export
                  <input type="file" accept=".xls,.xlsx" style={{ display: "none" }} onChange={onFile} />
                </label>
              </div>
              {parseNote && !parseNote.ok ? (
                <p className="fine" style={{ color: T.red, marginTop: 10 }}>{parseNote.msg}</p>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (tab === "sintesi") return <ScSintesi positions={positions} tot={tot} alerts={alerts}
      sogliaUsd={dati.opz.sogliaUsd} ordine={ordine} setOrdine={setOrdine} />;
    if (tab === "titoli") return <ScTitoli titoli={titoli} positions={positions}
      holdings={dati.holdings} onHoldingsFiles={onHoldingsFiles} holdNote={holdNote}
      assegnaFondo={assegnaFondo} rimuoviFondo={rimuoviFondo}
      proxySP={dati.opz.proxySP} setProxySP={function (x) { opz("proxySP", x); }} />;
    if (tab === "rischio") return <ScRischio rischio={rischio} serie={serie} tot={tot}
      betaOverride={dati.opz.betaOverride}
      setBetaOverride={function (x) { opz("betaOverride", x); }} />;
    if (tab === "stress") return <ScStress stress={stress} tot={tot} ai={ai} confronto={confronto}
      scenarioId={scenarioId} setScenarioId={setScenarioId} useCustom={useCustom}
      setUseCustom={setUseCustom} customShock={customShock} setCustomShock={setCustomShock}
      tierShock={tierShock} setTierShock={setTierShock} />;
    return <ScAltro vai={setVista} nSnap={dati.snapshots.length} />;
  }

  return (
    <div className="app">
      {!vista ? (
        <header className="top">
          <div className="top-in">
            <div>
              <div className="top-val num">{vuoto ? "San Giorgio" : eurK(tot.mkt)}</div>
              <div className="top-meta">
                {vuoto ? "archivio aperto" : "al " + dateIt(dati.asOf)}
              </div>
            </div>
            {!vuoto ? (
              <div className="top-right">
                <div className="top-delta num" style={{ color: signed(tot.pl) }}>
                  {(tot.pl >= 0 ? "+" : "−") + eur(Math.abs(tot.pl))}
                </div>
                <div className="top-meta num" style={{ color: signed(tot.pl) }}>
                  {pct(tot.plPct, 2)}
                </div>
              </div>
            ) : (
              <button className="btn btn-sm" onClick={blocca} aria-label="Blocca l'archivio">
                <Icona nome="lucchetto" size={17} />
              </button>
            )}
          </div>
        </header>
      ) : null}

      <div className="scroll">{contenuto()}</div>

      <nav className="tabbar" aria-label="Sezioni">
        <div className="tabbar-in">
          {schede.map(function (s) {
            var att = tab === s[0] && !vista;
            return (
              <button key={s[0]} className="tab" aria-current={att ? "page" : undefined}
                onClick={function () { setTab(s[0]); setVista(null); }}>
                <Icona nome={s[0]} attiva={att} />
                <span>{s[1]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* --------------------------------- avvio ---------------------------------- */

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

/* Il service worker serve solo a far funzionare l'app senza rete: mette in
   cache i propri file e non parla con nessun altro. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { /* pazienza */ });
  });
}
