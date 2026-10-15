/* ==========================================================================
   San Giorgio — schermate
   ========================================================================== */

/* ------------------------------- Sintesi ---------------------------------- */

function ScSintesi(p) {
  var tot = p.tot, positions = p.positions;
  var largo = useLargo();
  return (
    <div className="wrap">
      <div className="sect">
        <Striscia tot={tot} soglia={p.sogliaUsd} />
      </div>

      {p.alerts.length ? (
        <div className="sect">
          <h2>Da tenere d'occhio</h2>
          <Avvisi alerts={p.alerts} />
        </div>
      ) : null}

      <div className="sect">
        <div className="stats">
          <Stat label="Valore di carico" v={eur(tot.carico)} />
          <Stat label="Costo annuo (TER)" v={eur(tot.terEur)} sub={pct(tot.terPct, 2) + " del valore"} />
          <Stat label="Ratei maturati" v={eur(tot.ratei, 2)} />
          <Stat label="Posizioni" v={String(positions.length)} />
        </div>
      </div>

      <div className="sect">
        <h2>Posizioni</h2>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          {[["mkt", "Per valore"], ["pl", "Per perdita"], ["nome", "Per nome"]].map(function (o) {
            return (
              <button key={o[0]} className="chip" aria-pressed={p.ordine === o[0]}
                onClick={function () { p.setOrdine(o[0]); }}>{o[1]}</button>
            );
          })}
        </div>

        {largo ? (
          <table className="tbl">
            <thead>
              <tr>
                <th className="col">Strumento</th>
                <th className="col">Classe</th>
                <th className="col">Valore</th>
                <th className="col">Peso</th>
                <th className="col">Plus/minus</th>
                <th className="col">USD</th>
                <th className="col">Fisco</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(function (q) {
                return (
                  <tr key={q.isin}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.t}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{q.n}</div>
                    </td>
                    <td style={{ textAlign: "left", fontSize: 12.5, color: T.ink2 }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2,
                        background: CLASS_COLOR[q.c], marginRight: 6 }} />{q.c}
                    </td>
                    <td className="num">{eur(q.mkt)}</td>
                    <td className="num">{pct(q.peso)}</td>
                    <td className="num" style={{ color: signed(q.pl) }}>
                      {pct(q.plPct)}
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        {(q.pl >= 0 ? "+" : "−") + eur(Math.abs(q.pl))}
                      </div>
                    </td>
                    <td className="num">{q.usd ? pct(q.usd * 100, 0) : "—"}</td>
                    <td style={{ fontSize: 12, textAlign: "right",
                      color: q.tax === "diversi" ? T.green : T.muted }}>
                      {q.tax === "diversi" ? "compensa" : "non compensa"}
                      <div className="num" style={{ color: T.muted }}>
                        {pct(q.rate * 100, q.rate === 0.125 ? 1 : 0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="rows">
            {positions.map(function (q) {
              return (
                <div className="row" key={q.isin}>
                  <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2,
                    background: CLASS_COLOR[q.c], flex: "0 0 auto" }} />
                  <div className="row-main">
                    <div className="row-t">{q.t}</div>
                    <div className="row-s">{q.n}</div>
                  </div>
                  <div className="row-n">
                    <div className="num" style={{ fontSize: 15 }}>{eur(q.mkt)}</div>
                    <div className="num" style={{ fontSize: 12.5, color: signed(q.pl) }}>
                      {pct(q.plPct)} <span style={{ color: T.muted }}>· {pct(q.peso)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="fine" style={{ marginTop: 12 }}>
          La colonna Fisco riguarda le <em>plusvalenze</em>. Le minusvalenze confluiscono sempre nei
          redditi diversi, qualunque sia lo strumento: è l'asimmetria che rende difficile smaltire
          lo zainetto vendendo ETF.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- Titoli ----------------------------------- */

function ScTitoli(p) {
  var titoli = p.titoli;
  var [n, setN] = useState(25);
  var [q, setQ] = useState("");
  var fondiAttesi = p.positions.filter(function (x) { return x.c === "Azionario" && !x.az; });
  var comp = titoli.comp || {};
  var mancanti = fondiAttesi.filter(function (x) {
    return !(comp[x.isin] && comp[x.isin].rows && comp[x.isin].rows.length);
  });
  var daAssegnare = Object.keys(p.holdings).filter(function (k) { return k.charAt(0) === "?"; });
  var filtrata = q
    ? titoli.lista.filter(function (t) {
        return t.nome.toLowerCase().indexOf(q.toLowerCase()) > -1 ||
          (t.isin || "").toLowerCase().indexOf(q.toLowerCase()) > -1;
      })
    : titoli.lista;
  var maxEur = titoli.lista.length ? titoli.lista[0].eur : 1;

  return (
    <div className="wrap">
      <div className="sect">
        <h2>Composizioni dei fondi</h2>
        <p className="lede">
          Carica i file dei gestori in CSV o XLSX. Da questi l'app ricostruisce quanto pesa ogni
          singola società sommando fondi e azioni dirette.
        </p>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <label className="btn">
            Scegli i file
            <input type="file" multiple style={{ display: "none" }}
              onChange={p.onHoldingsFiles} />
          </label>
        </div>
        <div className="num" style={{ fontSize: 13, color: T.muted, marginTop: 10 }}>
          Copertura dell'azionario {pct(titoli.copertura)} · {eur(titoli.eqCoperto)} su {eur(titoli.eqTot)}
        </div>

        {p.holdNote ? (
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            {p.holdNote.map(function (r, i) {
              return (
                <li key={i} style={{ color: r.ok ? T.ink2 : T.red }}>
                  <strong>{r.file}</strong> — {r.msg}
                  {r.ok ? (r.fondo ? " · abbinato a " + r.fondo : " · fondo da indicare") : ""}
                </li>
              );
            })}
          </ul>
        ) : null}

        {daAssegnare.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {daAssegnare.map(function (k) {
              return (
                <div key={k}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>{p.holdings[k].file}</div>
                  <select className="inp" defaultValue=""
                    onChange={function (e) { p.assegnaFondo(k, e.target.value); }}
                    aria-label={"Fondo per " + p.holdings[k].file}>
                    <option value="">Indica il fondo…</option>
                    {fondiAttesi.map(function (x) {
                      return <option key={x.isin} value={x.isin}>{x.t} — {x.n}</option>;
                    })}
                  </select>
                </div>
              );
            })}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {fondiAttesi.map(function (x) {
            var h = comp[x.isin];
            var ok = h && h.rows && h.rows.length;
            var col = !ok ? T.rule : h.stima ? T.brass : h.interno ? T.cobalt : T.green;
            return (
              <span className="pill" key={x.isin}
                style={{ borderColor: col, color: ok ? col : T.muted }}>
                <strong style={{ fontSize: 11.5 }}>{x.t}</strong>
                {ok ? (
                  <span className="num">{h.rows.length} {h.stima ? "stima" : h.interno ? "indice" : ""}</span>
                ) : <span>manca</span>}
                {ok && p.holdings[x.isin] ? (
                  <button onClick={function () { p.rimuoviFondo(x.isin); }}
                    aria-label={"Rimuovi la composizione di " + x.t}
                    style={{ border: 0, background: "none", color: T.muted, fontSize: 16,
                      lineHeight: 1, padding: 0, cursor: "pointer" }}>×</button>
                ) : null}
              </span>
            );
          })}
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14,
          minHeight: 44, fontSize: 14 }}>
          <input type="checkbox" checked={p.proxySP}
            onChange={function (e) { p.setProxySP(e.target.checked); }} />
          <span>Stima l'ETC sull'S&P 500 dalla parte USA di SWDA</span>
        </label>

        {mancanti.length ? (
          <p className="tiny" style={{ color: T.brass, marginTop: 10 }}>
            I file restano sul dispositivo e vanno scelti su ciascuno. Finché mancano{" "}
            {mancanti.map(function (x) { return x.t; }).join(", ")}, i pesi qui sotto riguardano
            solo la parte coperta e sottostimano l'esposizione reale.
          </p>
        ) : null}
      </div>

      {titoli.eqCoperto === 0 ? (
        <div className="sect">
          <div className="card card-warn">
            <h3>Nessuna composizione caricata</h3>
            <p className="fine" style={{ margin: 0 }}>
              Senza i file dei gestori la trasparenza si limita alle azioni detenute direttamente.
              L'Euro Stoxx 50 è già incluso perché WS5X è sintetico e la sua esposizione è quella
              dell'indice.
            </p>
          </div>
        </div>
      ) : (
        <div className="sect">
          <div className="stats" style={{ marginBottom: 16 }}>
            <Stat label="Titoli distinti" v={titoli.nTitoli.toLocaleString("it-IT")} />
            <Stat label="Primi dieci" v={pct(titoli.top10pct)} sub="del portafoglio" />
            <Stat label="Titoli effettivi" v={String(Math.round(titoli.effN))} sub="equivalente non concentrato" />
          </div>

          <input className="inp" placeholder="Cerca un titolo o un ISIN" value={q}
            onChange={function (e) { setQ(e.target.value); setN(25); }} aria-label="Cerca un titolo" />
          <div className="tiny" style={{ margin: "8px 0 4px" }}>
            {filtrata.length.toLocaleString("it-IT")} risultati
          </div>

          <div className="rows">
            {filtrata.slice(0, n).map(function (t, i) {
              var fonti = Object.keys(t.fonti).sort(function (a, b) { return t.fonti[b] - t.fonti[a]; });
              var tier = AI_TIER[t.tier];
              var aiRilevante = t.tier === "t1" || t.tier === "t2" || t.tier === "t3";
              return (
                <div className="row" key={t.chiave}>
                  <span className="num" style={{ fontSize: 12, color: T.muted, width: 24,
                    flex: "0 0 auto" }}>{i + 1}</span>
                  <div className="row-main">
                    <div className="row-t">{t.nome}</div>
                    <div className="row-s">
                      {fonti.join(" · ")}
                      {aiRilevante ? <span style={{ color: tier.col }}> · {tier.lab}</span> : null}
                    </div>
                    <div style={{ marginTop: 5, maxWidth: 160 }}>
                      <Bar pct={(t.eur / maxEur) * 100} h={4}
                        col={fonti.length > 1 ? T.brass : T.cobalt} />
                    </div>
                  </div>
                  <div className="row-n">
                    <div className="num" style={{ fontSize: 15 }}>{eur(t.eur)}</div>
                    <div className="num" style={{ fontSize: 12.5, color: T.muted }}>{pct(t.pct, 2)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtrata.length > n ? (
            <button className="btn btn-sm" style={{ marginTop: 12 }}
              onClick={function () { setN(n + 25); }}>Mostra altri 25</button>
          ) : null}

          {titoli.coppie.length ? (
            <div style={{ marginTop: 26 }}>
              <h3>Sovrapposizione fra fondi</h3>
              <p className="fine">
                Quota di portafoglio che due fondi detengono negli stessi titoli con lo stesso peso.
                Una sovrapposizione alta significa pagare due commissioni per le stesse società.
              </p>
              {titoli.coppie.slice(0, 8).map(function (c) {
                return (
                  <div key={c.a + c.b} style={{ display: "flex", alignItems: "center", gap: 10,
                    marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, width: 104, color: T.ink2, flex: "0 0 auto" }}>
                      {c.a} / {c.b}
                    </span>
                    <div style={{ flex: 1 }}><Bar pct={Math.min(100, c.ov)} h={10} col={T.clay} /></div>
                    <span className="num" style={{ fontSize: 12.5, width: 86, textAlign: "right" }}>
                      {pct(c.ov)} · {c.comuni}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Rischio ---------------------------------- */

function ScRischio(p) {
  var r = p.serie.reg, rischio = p.rischio, tot = p.tot;
  var abbastanza = r.ok && r.n >= MIN_OSS;
  var righe = rischio.perPos.slice().sort(function (a, b) { return b.contrib - a.contrib; });
  var maxC = Math.max.apply(null, righe.map(function (x) { return Math.abs(x.contrib); }).concat([0.01]));

  return (
    <div className="wrap">
      <div className="sect">
        <h2>Beta — quanto ti muovi quando si muove il mercato</h2>
        <p className="lede">
          Calcolato dalla composizione attuale, non dallo storico: è la sensibilità di adesso. Il
          mercato di riferimento è l'MSCI World in euro, cioè SWDA, che è anche la posizione più
          grande.
        </p>
        <div className="stats" style={{ margin: "18px 0" }}>
          <Stat label="Beta del portafoglio" v={num(rischio.beta, 2)}
            sub={"mercato −10% → " + pct(-10 * rischio.beta, 1)} />
          <Stat label="Beta dell'azionario" v={num(rischio.betaEq, 2)}
            color={rischio.betaEq > 1 ? T.brass : T.ink} sub={"su " + eur(rischio.vEq)} />
          <Stat label="Nucleo indicizzato" v={num(rischio.betaCore, 2)}
            sub={tot.mkt ? pct((rischio.vCore / tot.mkt) * 100) + " del ptf" : ""} />
          <Stat label="Resto" v={num(rischio.betaAtt, 2)}
            sub={tot.mkt ? pct((rischio.vAtt / tot.mkt) * 100) + " del ptf" : ""} />
        </div>

        {rischio.betaEq > 1 ? (
          <div className="card card-note">
            <p className="fine" style={{ margin: 0, color: T.ink2 }}>
              L'azionario che possiedi ha beta <strong>{num(rischio.betaEq, 2)}</strong>: è più
              reattivo dell'indice, non meno. Il beta complessivo di {num(rischio.beta, 2)} sta
              sotto l'uno solo perché un terzo del portafoglio non è azionario — non perché le
              azioni che hai siano prudenti.
            </p>
          </div>
        ) : null}
      </div>

      <div className="sect">
        <h3>Chi porta il beta</h3>
        <div className="rows">
          {righe.map(function (x) {
            var colF = x.betaFonte === "settori" ? T.green
              : x.betaFonte === "tua stima" ? T.cobalt : T.muted;
            return (
              <div className="row" key={x.isin}>
                <div className="row-main">
                  <div className="row-t">{x.t}</div>
                  <div className="row-s">
                    {pct(x.peso)} del ptf · <span style={{ color: colF }}>{x.betaFonte}</span>
                  </div>
                  <div style={{ marginTop: 5, maxWidth: 150 }}>
                    <Bar pct={(Math.abs(x.contrib) / maxC) * 100} h={4}
                      col={x.contrib >= 0 ? T.cobalt : T.green} />
                  </div>
                </div>
                <div className="row-n" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input className="inp inp-sm num" type="number" step="0.05" inputMode="decimal"
                    value={Number(x.beta.toFixed(2))} aria-label={"Beta di " + x.t}
                    onChange={function (e) {
                      p.setBetaOverride(Object.assign({}, p.betaOverride,
                        (function () { var o = {}; o[x.isin] = Number(e.target.value); return o; })()));
                    }}
                    style={{ width: 74, textAlign: "right" }} />
                  <span className="num" style={{ fontSize: 12.5, color: T.muted, width: 46,
                    textAlign: "right" }}>{num(x.contrib, 3)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {Object.keys(p.betaOverride).length ? (
          <button className="btn btn-sm" style={{ marginTop: 12 }}
            onClick={function () { p.setBetaOverride({}); }}>Ripristina i beta</button>
        ) : null}
        <p className="fine" style={{ marginTop: 12 }}>
          "settori" significa che il beta viene dal mix settoriale reale del fondo, tarato perché
          SWDA valga esattamente 1,00 — come dev'essere, visto che è il metro.{" "}
          {rischio.calibrato
            ? "La taratura in corso vale " + num(rischio.cal, 3) + "."
            : "Senza le composizioni caricate questa via non è disponibile e valgono le ipotesi."}
        </p>
      </div>

      <div className="sect">
        <div className="card" style={{ borderLeft: "3px solid " + T.clay }}>
          <h3>L'high yield conta come azionario</h3>
          <div className="stats" style={{ marginBottom: 10 }}>
            <Stat label="Beta con l'HY" v={num(rischio.beta, 3)} />
            <Stat label="Beta senza l'HY" v={num(rischio.betaSenzaHy, 3)} />
            <Stat label="Azionario equivalente" v={eur(rischio.hyEquivalente)} />
          </div>
          <p className="fine" style={{ margin: 0, color: T.ink2 }}>
            I fondi high yield aggiungono {num(rischio.betaHy, 3)} di beta: in termini di rischio di
            mercato equivalgono ad altri {eur(rischio.hyEquivalente)} di azionario. L'esposizione
            direzionale reale è vicina al{" "}
            {tot.mkt ? pct(((rischio.vEq + rischio.hyEquivalente) / tot.mkt) * 100) : "—"}, contro
            il {tot.mkt ? pct((rischio.vEq / tot.mkt) * 100) : "—"} che dice la riga azionario.
          </p>
        </div>
      </div>

      <div className="sect" style={{ borderTop: "2px solid " + T.ink }}>
        <h2>Alpha — quanto rendi al netto del rischio</h2>
        <p className="lede">
          Questa metà non si ricava dalla composizione: serve una serie di rendimenti. Ogni
          snapshot aggiunge un'osservazione, con il rendimento calcolato dai prezzi per quota —
          immune a versamenti e vendite — confrontato con SWDA e con l'overnight di XEON come
          tasso privo di rischio.
        </p>
        <div className="stats" style={{ margin: "18px 0" }}>
          <Stat label="Osservazioni" v={String(r.n || 0)} sub={"servono " + MIN_OSS}
            color={abbastanza ? T.green : T.brass} />
          <Stat label="Rendimento cumulato" v={pct(p.serie.cum * 100, 2)} color={signed(p.serie.cum)} />
          <Stat label="Benchmark" v={pct(p.serie.cumB * 100, 2)} color={signed(p.serie.cumB)} />
          <Stat label="Differenza" v={pct((p.serie.cum - p.serie.cumB) * 100, 2)}
            color={signed(p.serie.cum - p.serie.cumB)} />
        </div>

        {!abbastanza ? (
          <div className="card card-warn">
            <p className="fine" style={{ margin: 0, color: T.ink2 }}>
              <strong>Non abbastanza dati.</strong> Con {r.n || 0}{" "}
              {r.n === 1 ? "osservazione" : "osservazioni"} alpha e beta da regressione avrebbero un
              margine di errore più largo del valore stesso: non direbbero se stai battendo il
              mercato o se hai solo avuto un mese storto. Con uno snapshot al mese la stima diventa
              leggibile dopo {Math.max(0, MIN_OSS - (r.n || 0))} rilevazioni. Fino ad allora il
              numero che conta è il beta qui sopra, che non ha bisogno di storia.
            </p>
          </div>
        ) : null}

        {r.ok ? (
          <div className="duo" style={{ marginTop: 18, opacity: abbastanza ? 1 : 0.65 }}>
            <div>
              <h3>Regressione{abbastanza ? "" : " — indicativa"}</h3>
              <Riga l="Beta stimato" v={num(r.beta, 3)} strong
                sub={isFinite(r.seBeta) ? "± " + num(r.seBeta, 3) : "errore non calcolabile"} />
              <Riga l="Beta dalla composizione" v={num(rischio.beta, 3)} />
              <Riga l="Alpha per periodo" v={pct(r.alpha * 100, 3)} color={signed(r.alpha)}
                sub={isFinite(r.seAlpha) ? "± " + num(r.seAlpha * 100, 3) + " pp" : "errore non calcolabile"} />
              <Riga l="Alpha su base annua" v={pct(r.alphaAnnuo * 100, 2)} color={signed(r.alpha)} strong />
              <Riga l="R²" v={isFinite(r.r2) ? num(r.r2, 3) : "—"} />
            </div>
            <div>
              <h3>Ogni punto è un periodo</h3>
              <Nuvola punti={r.punti} beta={r.beta} alpha={r.alpha * 100} mostraRetta={abbastanza} />
              <p className="tiny" style={{ marginTop: 6 }}>
                Orizzontale: il benchmark in eccesso. Verticale: il tuo. La pendenza della nuvola è
                il beta, l'altezza a cui passa è l'alpha.
              </p>
            </div>
          </div>
        ) : null}

        {p.serie.oss.length ? (
          <div style={{ marginTop: 22 }}>
            <h3>Periodi rilevati</h3>
            <div className="rows">
              {p.serie.oss.slice().reverse().map(function (o) {
                return (
                  <div className="row" key={o.a}>
                    <div className="row-main">
                      <div className="row-t num" style={{ fontSize: 14 }}>
                        {dateIt(o.da).slice(0, 5)} → {dateIt(o.a).slice(0, 5)}
                      </div>
                      <div className="row-s num">{o.giorni} giorni</div>
                    </div>
                    <div className="row-n">
                      <div className="num" style={{ fontSize: 14.5, color: signed(o.r) }}>
                        {pct(o.r * 100, 2)}
                      </div>
                      <div className="num" style={{ fontSize: 12, color: T.muted }}>
                        bmk {o.rb == null ? "—" : pct(o.rb * 100, 2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="fine" style={{ marginTop: 16 }}>
          L'alpha può nascere solo dal {tot.mkt ? pct((rischio.vAtt / tot.mkt) * 100) : "—"} che non
          è nucleo indicizzato. Sul resto, per costruzione, stai comprando il benchmark e l'alpha
          atteso è zero meno i costi.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------- Stress ---------------------------------- */

function ScStress(p) {
  var stress = p.stress, tot = p.tot, confronto = p.confronto;
  var maxConf = Math.max.apply(null, confronto.map(function (c) { return Math.abs(c.pct); }).concat([1]));
  var maxCl = Math.max.apply(null, CLASS_ORDER.map(function (k) {
    return Math.abs(tot.mkt ? (stress.byClass[k] / tot.mkt) * 100 : 0);
  }).concat([1]));

  return (
    <div className="wrap">
      <div className="rail" style={{ paddingTop: 14 }}>
        {SCENARIOS.map(function (s) {
          var att = !p.useCustom && p.scenarioId === s.id;
          return (
            <button key={s.id} className={"chip" + (s.ai ? " chip-ai" : "")} aria-pressed={att}
              onClick={function () { p.setScenarioId(s.id); p.setUseCustom(false); p.setTierShock(null); }}>
              {s.nome}
            </button>
          );
        })}
        <button className="chip" aria-pressed={p.useCustom}
          onClick={function () { p.setUseCustom(true); }}>Scenario mio</button>
      </div>

      {!p.useCustom ? <p className="fine" style={{ color: T.ink2 }}>{stress.sc.nota}</p> : null}

      {p.useCustom ? (
        <div className="card" style={{ marginBottom: 16 }}>
          {CLASS_ORDER.concat(["fx"]).map(function (k) {
            return (
              <div key={k} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.ink2 }}>{k === "fx" ? "Cambio EUR/USD" : k}</span>
                  <span className="num">{(p.customShock[k] > 0 ? "+" : "") + p.customShock[k]}%</span>
                </div>
                <input type="range" min="-60" max="30" value={p.customShock[k]}
                  aria-label={"Shock " + k}
                  onChange={function (e) {
                    var o = Object.assign({}, p.customShock);
                    o[k] = Number(e.target.value);
                    p.setCustomShock(o);
                  }} />
              </div>
            );
          })}
          <p className="tiny" style={{ margin: 0 }}>
            Il cambio positivo significa dollaro forte: rivaluta in euro gli attivi in USD.
          </p>
        </div>
      ) : null}

      <div className="sect">
        <div className="stats">
          <Stat label="Impatto" v={pct(stress.pct)} color={signed(stress.delta)}
            sub={(stress.delta >= 0 ? "+" : "−") + eur(Math.abs(stress.delta))} />
          <Stat label="Valore dopo" v={eur(stress.dopo)} />
          <Stat label="di cui attivi" v={pct(stress.assetPct)} color={signed(stress.deltaAsset)} />
          <Stat label="di cui cambio" v={pct(stress.fxPct)} color={signed(stress.deltaFx)} />
        </div>
      </div>

      {stress.perCanale ? (
        <PannelloAI stress={stress} ai={p.ai} tot={tot}
          tierShock={p.tierShock} setTierShock={p.setTierShock} />
      ) : null}

      <div className="sect">
        <h3>Contributo per classe</h3>
        {CLASS_ORDER.filter(function (c) { return tot.byClass[c] > 0; }).map(function (c) {
          var d = stress.byClass[c];
          var pc = tot.mkt ? (d / tot.mkt) * 100 : 0;
          return (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, width: 78, color: T.ink2, flex: "0 0 auto" }}>
                {c.replace("Obblig. ", "")}
              </span>
              <div style={{ flex: 1 }}><BarMid v={pc} max={maxCl} h={14} /></div>
              <span className="num" style={{ fontSize: 12.5, width: 60, textAlign: "right",
                color: signed(d) }}>{pct(pc)}</span>
            </div>
          );
        })}
      </div>

      <div className="sect">
        <h3>Tutti gli scenari a confronto</h3>
        {confronto.map(function (c) {
          var att = c.id === p.scenarioId && !p.useCustom;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, width: 96, flex: "0 0 auto",
                color: att ? T.ink : T.muted, fontWeight: att ? 600 : 400 }}>{c.nome}</span>
              <div style={{ flex: 1 }}>
                <div className="bar" style={{ height: 12 }}>
                  <i style={{ width: (Math.abs(c.pct) / maxConf) * 100 + "%",
                    background: c.pct >= 0 ? T.green : c.ai ? T.brass : T.red,
                    opacity: att ? 1 : 0.55 }} />
                </div>
              </div>
              <span className="num" style={{ fontSize: 12.5, width: 60, textAlign: "right",
                color: signed(c.delta) }}>{pct(c.pct)}</span>
            </div>
          );
        })}
        <p className="fine" style={{ marginTop: 12 }}>
          La bolla AI non è lo scenario peggiore: 2008 e Covid restano più profondi perché
          colpiscono tutto. È però l'unico in cui la perdita è concentrata in una parte
          identificabile — e quindi l'unico su cui si può agire in anticipo.
        </p>
        <p className="fine">
          In tutti gli scenari di crisi la riga "cambio" è positiva: è il dollaro che fa da
          cuscinetto, non un attivo difensivo. Nella bolla AI è l'ipotesi più fragile, perché lo
          shock nasce negli Stati Uniti: se il dollaro si indebolisse, l'effetto cambierebbe segno.
        </p>
      </div>
    </div>
  );
}

function PannelloAI(p) {
  var [apri, setApri] = useState(false);
  var ai = p.ai, tot = p.tot, stress = p.stress;
  var W = 1000, x = 0;
  var segs = AI_TIER_ORDER.filter(function (k) { return ai.perCanale[k] > 0; }).map(function (k) {
    var w = tot.eqTot ? (ai.perCanale[k] / tot.eqTot) * W : 0;
    var s = { k: k, x: x, w: w, val: ai.perCanale[k] };
    x += w;
    return s;
  });

  return (
    <div className="sect">
      <div className="card card-note">
        <h3>Dove entra la tesi AI</h3>
        <p className="fine">
          Ricomposizione dell'azionario per canale, titolo per titolo. Nessuna riga del portafoglio
          si chiama "AI": l'esposizione è tutta indiretta.
        </p>
        <div className="stats" style={{ margin: "12px 0" }}>
          <Stat label="Esposto alla tesi" v={eur(ai.esposto)} sub={pct(ai.espostoPct) + " del ptf"} />
          <Stat label="Sull'azionario" v={pct(ai.espostoEqPct)} />
        </div>

        <svg viewBox={"0 0 " + W + " 30"} className="strip" role="img"
          aria-label="Azionario per canale di esposizione alla tesi AI">
          {segs.map(function (s) {
            return <rect key={s.k} x={s.x} y={0} width={Math.max(s.w - 2, 1)} height={26}
              fill={AI_TIER[s.k].col} />;
          })}
        </svg>

        <div style={{ marginTop: 14 }}>
          {AI_TIER_ORDER.map(function (k) {
            var v = ai.perCanale[k];
            if (!v) return null;
            var d = stress.byTier[k] || 0;
            return (
              <div key={k} style={{ padding: "10px 0", borderBottom: "1px solid " + T.ruleSoft }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10,
                  alignItems: "baseline" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2,
                      background: AI_TIER[k].col, marginRight: 7 }} />
                    {AI_TIER[k].lab}
                  </div>
                  <div className="num" style={{ fontSize: 13.5, textAlign: "right", flex: "0 0 auto" }}>
                    {eur(v)}<span style={{ color: T.muted }}> · {tot.mkt ? pct((v / tot.mkt) * 100) : ""}</span>
                  </div>
                </div>
                <p className="tiny" style={{ margin: "3px 0 6px" }}>{AI_TIER[k].desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="range" min="-80" max="10" value={Math.round(stress.tiers[k] * 100)}
                    aria-label={"Shock " + AI_TIER[k].lab}
                    onChange={function (e) {
                      var o = Object.assign({}, p.tierShock || {});
                      o[k] = Number(e.target.value) / 100;
                      p.setTierShock(o);
                    }} style={{ flex: 1 }} />
                  <span className="num" style={{ fontSize: 13, width: 46, textAlign: "right" }}>
                    {pct(stress.tiers[k] * 100, 0)}
                  </span>
                  <span className="num" style={{ fontSize: 13, width: 76, textAlign: "right",
                    color: signed(d) }}>{(d >= 0 ? "+" : "−") + eur(Math.abs(d))}</span>
                </div>
              </div>
            );
          })}
        </div>

        {p.tierShock ? (
          <button className="btn btn-sm" style={{ marginTop: 12 }}
            onClick={function () { p.setTierShock(null); }}>Ripristina gli shock dello scenario</button>
        ) : null}

        <h3 style={{ marginTop: 20 }}>Cosa significa per ogni strumento</h3>
        {stress.perPos.filter(function (q) { return q.c === "Azionario"; })
          .sort(function (a, b) { return a.shock - b.shock; }).map(function (q) {
          return (
            <div key={q.isin} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <span style={{ fontSize: 12.5, width: 58, color: T.ink2, flex: "0 0 auto" }}>{q.t}</span>
              <div style={{ flex: 1 }}>
                <Bar pct={(Math.abs(q.shock) / 0.7) * 100} h={10} col={T.red} />
              </div>
              <span className="num" style={{ fontSize: 12.5, width: 52, textAlign: "right" }}>
                {pct(q.shock * 100, 1)}
              </span>
            </div>
          );
        })}
        <p className="fine" style={{ marginTop: 10 }}>
          In un crollo generalizzato due ETF azionari prendono lo stesso colpo; in una bolla AI la
          distanza fra il più e il meno esposto supera i venti punti. Un aggiustamento mirato costa
          molto meno che ridurre l'azionario in blocco.
        </p>

        <button className="btn btn-sm" onClick={function () { setApri(!apri); }}>
          {apri ? "Nascondi i titoli" : "Quali titoli, esattamente"}
        </button>
        {apri ? (
          ai.titoliAI.length ? (
            <div className="rows" style={{ marginTop: 10 }}>
              {ai.titoliAI.map(function (t) {
                return (
                  <div className="row" key={t.chiave}>
                    <div className="row-main">
                      <div className="row-t">{t.nome}</div>
                      <div className="row-s" style={{ color: AI_TIER[t.tier].col }}>
                        {AI_TIER[t.tier].lab}
                      </div>
                    </div>
                    <div className="row-n">
                      <div className="num" style={{ fontSize: 14 }}>{eur(t.eur)}</div>
                      <div className="num" style={{ fontSize: 12, color: T.muted }}>{pct(t.pct, 2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="fine" style={{ marginTop: 10 }}>
              Senza le composizioni caricate il dettaglio per titolo non è disponibile: i numeri qui
              sopra usano i coefficienti di ripiego per fondo.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------- Valute --------------------------------- */

function ScValute(p) {
  var tot = p.tot;
  var contrib = p.positions.filter(function (q) { return q.usd > 0; })
    .map(function (q) { return Object.assign({}, q, { quota: tot.mkt ? (q.mkt * q.usd) / tot.mkt * 100 : 0 }); })
    .sort(function (a, b) { return b.quota - a.quota; });
  var regTot = Object.keys(tot.reg).reduce(function (a, k) { return a + tot.reg[k]; }, 0) || 1;
  var nomiReg = { US: "Stati Uniti", EU: "Europa", JP: "Giappone", ALTRO: "Resto del mondo" };

  return (
    <div className="wrap">
      <div className="sect">
        <h2>Esposizione al dollaro</h2>
        <p className="lede">
          Esposizione economica del sottostante, non valuta di negoziazione: STHY e gli EIB si
          scambiano in euro ma il rischio resta in dollari.
        </p>
        <div className="stats" style={{ margin: "16px 0" }}>
          <Stat label="Escluso oro" v={pct(tot.usdNoGoldPct)}
            color={tot.usdNoGoldPct > p.sogliaUsd ? T.red : T.ink} />
          <Stat label="Incluso oro" v={pct(tot.usdPct)} />
          <Stat label="Dentro l'azionario"
            v={pct(tot.eqTot ? (tot.reg.US / tot.eqTot) * 100 : 0)} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: T.ink2 }}>Soglia di allerta</span>
          <span className="num">{p.sogliaUsd}%</span>
        </div>
        <input type="range" min="20" max="80" value={p.sogliaUsd}
          aria-label="Soglia di allerta esposizione dollaro"
          onChange={function (e) { p.setSogliaUsd(Number(e.target.value)); }} />
      </div>

      <div className="sect">
        <h3>Chi porta il dollaro</h3>
        <div className="rows">
          {contrib.map(function (q) {
            return (
              <div className="row" key={q.isin}>
                <div className="row-main">
                  <div className="row-t">{q.t}</div>
                  <div className="row-s">{num(q.quota, 1)} punti sul totale</div>
                </div>
                <div className="row-n" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input className="inp inp-sm num" type="number" min="0" max="100" step="1"
                    inputMode="numeric" value={Math.round(q.usd * 100)}
                    aria-label={"Coefficiente dollaro " + q.t}
                    onChange={function (e) {
                      var o = Object.assign({}, p.usdOverride);
                      o[q.isin] = Number(e.target.value);
                      p.setUsdOverride(o);
                    }} style={{ width: 70, textAlign: "right" }} />
                  <span style={{ fontSize: 13, color: T.muted }}>%</span>
                </div>
              </div>
            );
          })}
        </div>
        {Object.keys(p.usdOverride).length ? (
          <button className="btn btn-sm" style={{ marginTop: 12 }}
            onClick={function () { p.setUsdOverride({}); }}>Ripristina i coefficienti</button>
        ) : null}
      </div>

      <div className="sect">
        <h3>Geografia dell'azionario</h3>
        <p className="fine">Su {eur(tot.eqTot)} di azionario complessivo.</p>
        {Object.keys(tot.reg).sort(function (a, b) { return tot.reg[b] - tot.reg[a]; })
          .map(function (k) {
            var q = (tot.reg[k] / regTot) * 100;
            return (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13,
                  marginBottom: 4 }}>
                  <span style={{ color: T.ink2 }}>{nomiReg[k]}</span>
                  <span className="num">{pct(q)} · {eur(tot.reg[k])}</span>
                </div>
                <Bar pct={q} />
              </div>
            );
          })}
        <p className="fine" style={{ marginTop: 14 }}>
          In uno stress il dollaro si è storicamente rivalutato, attenuando il drawdown in euro. Il
          problema non è tanto la valuta quanto la concentrazione su un unico mercato e sulle sue
          valutazioni.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Simulatore -------------------------------- */

function ScSimulatore(p) {
  var sim = p.sim;
  return (
    <div className="wrap">
      <div className="sect">
        <h2>Simulatore fiscale</h2>
        <p className="lede">
          Scegli quanto vendere di ciascuna posizione e vedi l'effetto su imposta, zainetto fiscale
          ed esposizione al dollaro.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 14 }}>
          <div style={{ flex: 1, maxWidth: 190 }}>
            <div className="stat-lab" style={{ marginBottom: 4 }}>Zainetto disponibile</div>
            <input className="inp num" type="number" step="50" inputMode="numeric"
              value={p.zainetto} aria-label="Zainetto fiscale disponibile in euro"
              onChange={function (e) { p.setZainetto(Number(e.target.value) || 0); }} />
          </div>
          <button className="btn" onClick={function () { p.setSellQty({}); }}>Azzera</button>
        </div>
      </div>

      <div className="sect">
        {p.positions.map(function (q) {
          var qq = p.sellQty[q.isin] || 0;
          var rea = ((q.mkt - q.carico) * qq) / 100;
          return (
            <div key={q.isin} style={{ padding: "10px 0", borderBottom: "1px solid " + T.ruleSoft }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{q.t}</div>
                  <div style={{ fontSize: 12, color: q.tax === "diversi" ? T.green : T.muted }}>
                    {q.tax === "diversi" ? "compensa" : "non compensa"} ·{" "}
                    {pct(q.rate * 100, q.rate === 0.125 ? 1 : 0)}
                  </div>
                </div>
                <div className="num" style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <div style={{ fontSize: 14.5, color: qq ? T.ink : T.muted }}>
                    {eur((q.mkt * qq) / 100)}
                  </div>
                  <div style={{ fontSize: 12.5, color: qq ? signed(rea) : T.muted }}>
                    {(rea >= 0 ? "+" : "−") + eur(Math.abs(rea))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min="0" max="100" step="5" value={qq}
                  aria-label={"Quota da vendere di " + q.t}
                  onChange={function (e) {
                    var o = Object.assign({}, p.sellQty);
                    o[q.isin] = Number(e.target.value);
                    p.setSellQty(o);
                  }} style={{ flex: 1 }} />
                <span className="num" style={{ fontSize: 13, width: 42, textAlign: "right" }}>{qq}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sect">
        <div className="duo">
          <div>
            <h3>Conto fiscale</h3>
            <Riga l="Plusvalenze compensabili" v={eur(sim.plusDiversi)} />
            <Riga l="Plusvalenze non compensabili" v={eur(sim.plusCapitale)} muted />
            <Riga l="Minusvalenze realizzate" v={eur(sim.minus)} color={sim.minus ? T.red : null} />
            <Riga l="Zainetto utilizzato" v={eur(sim.usaZainetto)}
              color={sim.usaZainetto ? T.green : null} />
            <Riga l="Imposta stimata" v={eur(sim.imposta)} strong />
            <Riga l="Zainetto residuo" v={eur(sim.nuovoZainetto)}
              color={sim.nuovoZainetto > p.zainetto ? T.red : T.ink} />
          </div>
          <div>
            <h3>Portafoglio risultante</h3>
            <Riga l="Liquidità generata" v={eur(sim.liquidita)} strong />
            <Riga l="Valore residuo" v={eur(sim.newTot)} />
            <Riga l="Dollaro (escl. oro)" v={pct(sim.newUsdPct)}
              sub={(sim.deltaUsdPct >= 0 ? "+" : "−") + num(Math.abs(sim.deltaUsdPct), 1) + " punti"}
              color={sim.deltaUsdPct > 0 ? T.red : T.green} />
            <Riga l="Posizioni residue" v={String(sim.nPos)}
              sub={sim.chiuse ? sim.chiuse + " chiuse" : null} />
          </div>
        </div>

        {sim.plusCapitale > 0 ? (
          <p className="fine" style={{ marginTop: 14, color: T.ink2 }}>
            <strong>{eur(sim.plusCapitale)}</strong> di guadagno finisce fra i redditi di capitale:
            paga imposta piena e lascia lo zainetto dov'è. Per smaltire le minus pregresse servono
            plusvalenze su ETC, azioni o obbligazioni.
          </p>
        ) : null}
        {sim.minus > 0 && sim.plusDiversi < sim.minus ? (
          <p className="fine" style={{ marginTop: 10, color: T.red }}>
            Questa combinazione genera altre minusvalenze anziché consumarle: lo zainetto sale a{" "}
            {eur(sim.nuovoZainetto)} e il problema di scadenza si allarga.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------- Storico --------------------------------- */

function ScStorico(p) {
  var snaps = p.serie.ordinati;
  var esiste = snaps.some(function (s) { return s.date === p.asOf; });
  var dati = snaps.map(function (s) {
    return { date: s.date, mkt: s.mkt, usd: s.usdPct || 0 };
  });

  return (
    <div className="wrap">
      <div className="sect">
        <h2>Storico</h2>
        <p className="lede">
          Ogni rilevazione fissa valore, esposizione e prezzi per quota di quel giorno. È da queste
          che nascono i rendimenti di periodo, e con essi alpha e beta.
        </p>
        <p className="fine">
          Si prende da sé a ogni export caricato, quindi di norma qui non c'è niente da fare. Il
          pulsante serve a rifarla a mano, se i dati sono cambiati senza un export nuovo.
        </p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-pri" onClick={p.salvaSnapshot} disabled={!p.positions.length}>
            {esiste ? "Aggiorna il " + dateIt(p.asOf) : "Salva il " + dateIt(p.asOf)}
          </button>
        </div>
      </div>

      {snaps.length < 2 ? (
        <div className="sect">
          <div className="card card-warn">
            <h3>{snaps.length ? "Una sola rilevazione" : "Nessuna rilevazione"}</h3>
            <p className="fine" style={{ margin: 0 }}>
              {snaps.length
                ? "Serve almeno una seconda rilevazione perché nasca un rendimento di periodo."
                : "Carica un export e salva il primo snapshot per avviare la serie."}
            </p>
          </div>
        </div>
      ) : (
        <div className="sect">
          <LineaStorico dati={dati} />
          <div className="tiny" style={{ marginTop: 4 }}>
            Continua: valore in euro. Tratteggiata: esposizione al dollaro.
          </div>
          <div className="rows" style={{ marginTop: 16 }}>
            {snaps.slice().reverse().map(function (s) {
              return (
                <div className="row" key={s.date}>
                  <div className="row-main">
                    <div className="row-t num">{dateIt(s.date)}</div>
                    <div className="row-s num">
                      {s.n} posizioni · USD {pct(s.usdPct || 0)}
                      {s.aiPct != null ? " · AI " + pct(s.aiPct) : ""}
                    </div>
                  </div>
                  <div className="row-n">
                    <div className="num" style={{ fontSize: 15 }}>{eur(s.mkt)}</div>
                    {s.beta != null ? (
                      <div className="num" style={{ fontSize: 12, color: T.muted }}>
                        beta {num(s.beta, 2)}
                      </div>
                    ) : null}
                  </div>
                  <button className="btn btn-sm" aria-label={"Elimina lo snapshot del " + dateIt(s.date)}
                    onClick={function () { p.eliminaSnapshot(s.date); }}
                    style={{ minHeight: 34, padding: "0 10px", color: T.muted }}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Dati ---------------------------------- */

function ScDati(p) {
  var tot = p.tot;
  return (
    <div className="wrap">
      <div className="sect">
        <h2>Carica un export</h2>
        <p className="lede">
          Serve il file "Portafoglio di sintesi" di Fineco, in .xls o .xlsx. Viene letto qui dentro
          e non esce dal dispositivo. La data si ricava dal nome del file quando c'è.
        </p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <label className="btn btn-pri">
            Scegli il file
            <input type="file" style={{ display: "none" }} onChange={p.onFile} />
          </label>
        </div>
        <div style={{ marginTop: 14, maxWidth: 220 }}>
          <div className="stat-lab" style={{ marginBottom: 4 }}>Data della situazione</div>
          <input className="inp num" type="date" value={p.asOf} aria-label="Data della situazione"
            onChange={function (e) { p.setAsOf(e.target.value); }} />
        </div>

        {p.parseNote ? (
          <div className="card" style={{ marginTop: 14,
            borderColor: p.parseNote.ok ? T.rule : T.red }}>
            <div style={{ fontSize: 14, color: p.parseNote.ok ? T.green : T.red }}>
              {p.parseNote.msg}
            </div>
            {p.parseNote.ignoti && p.parseNote.ignoti.length ? (
              <div className="fine" style={{ marginTop: 8 }}>
                Strumenti non in anagrafica, trattati come azionario con dollaro a zero. Vanno
                aggiunti al codice per un look-through corretto:
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  {p.parseNote.ignoti.map(function (x) { return <li key={x}>{x}</li>; })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sect">
        <h3>Esporta</h3>
        <div className="btn-row">
          <button className="btn" onClick={p.esportaCsv} disabled={!p.positions.length}>
            Posizioni in CSV
          </button>
        </div>
        <p className="tiny" style={{ marginTop: 8 }}>
          Il CSV esce in chiaro: è pensato per aprirlo subito in un foglio di calcolo, non per
          conservarlo. Per le copie di sicurezza usa quelle cifrate in Sicurezza.
        </p>
      </div>

      <div className="sect">
        <h3>Ipotesi in uso</h3>
        <ul className="fine" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.75 }}>
          <li>I coefficienti di look-through sul dollaro sono stime di composizione, non la valuta
            di quotazione. Da riverificare su JustETF quando l'indice cambia.</li>
          <li>Le obbligazioni EIB sono trattate come sovranazionali white list, con aliquota al
            12,5% sulla plusvalenza.</li>
          <li>L'oro entra nell'esposizione al dollaro solo nella cifra "incluso oro": è prezzato in
            USD ma non è esposizione all'economia americana.</li>
          <li>Un titolo a ridosso del rimborso è ancorato alla pari e non reagisce a nessuno
            scenario.</li>
          <li>Gli scenari storici sono approssimazioni per classe. Non modellano duration, spread
            creditizio né dispersione fra titoli.</li>
          <li>Gli scenari "bolla AI" lavorano titolo per titolo: ogni società va in un canale in
            base a ticker, nome e settore, e lo shock dello strumento è la media pesata dei canali
            che contiene. Ora{" "}
            {pct((p.ai.dalVivo / (p.ai.dalVivo + p.ai.daDefault || 1)) * 100)} dell'azionario è
            classificato dalle composizioni caricate, il resto dai coefficienti di ripiego.</li>
          <li>Il beta ex ante usa il mix settoriale dove disponibile, tarato perché SWDA valga
            1,00; altrove sono ipotesi modificabili.</li>
          <li>TER complessivo: {pct(tot.terPct, 2)} annuo, pari a {eur(tot.terEur)}.</li>
        </ul>
        <p className="fine" style={{ marginTop: 14 }}>
          Strumento di analisi personale, non consulenza. Il calcolo fiscale segue le regole
          generali del regime amministrato italiano e non sostituisce il conteggio del sostituto
          d'imposta.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- Sicurezza -------------------------------- */

function ScSicurezza(p) {
  var [pw1, setPw1] = useState("");
  var [pw2, setPw2] = useState("");
  var [msg, setMsg] = useState(null);
  var [conferma, setConferma] = useState(false);

  function cambia(e) {
    e.preventDefault();
    if (pw1.length < 8) { setMsg({ ok: false, t: "Serve una passphrase di almeno 8 caratteri." }); return; }
    if (pw1 !== pw2) { setMsg({ ok: false, t: "Le due passphrase non coincidono." }); return; }
    p.cambiaPassphrase(pw1).then(function () {
      setPw1(""); setPw2("");
      setMsg({ ok: true, t: "Passphrase cambiata. Le copie di sicurezza vecchie restano leggibili con la passphrase precedente." });
    }).catch(function (e2) {
      setMsg({ ok: false, t: "Non riuscito. " + ((e2 && e2.message) || "") });
    });
  }

  return (
    <div className="wrap">
      <div className="sect">
        <h2>Dove stanno i tuoi dati</h2>
        <p className="lede">
          Le posizioni, lo storico e le composizioni stanno solo in questo browser, su questo
          dispositivo, cifrate con AES-256. La chiave si ricava dalla passphrase e vive in memoria:
          chiusa l'app, serve di nuovo.
        </p>
        <ul className="fine" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Nessun account, nessun server, nessuna statistica.</li>
          <li>L'app non può fare richieste di rete: è il browser a impedirlo, per una regola
            dichiarata nella pagina stessa.</li>
          <li>Il codice è pubblico su GitHub; i dati no, perché non sono nel codice.</li>
          <li>Chi aprisse l'indirizzo senza la tua passphrase troverebbe un'app vuota.</li>
        </ul>
      </div>

      <div className="sect">
        <h3>Blocco automatico</h3>
        <p className="fine">
          Dopo questo tempo di inattività, o quando l'app va in secondo piano abbastanza a lungo,
          serve di nuovo la passphrase.
        </p>
        <div className="btn-row">
          {[1, 5, 15, 60].map(function (m) {
            return (
              <button key={m} className="chip" aria-pressed={p.minutiBlocco === m}
                onClick={function () { p.setMinutiBlocco(m); }}>
                {m === 60 ? "1 ora" : m + " min"}
              </button>
            );
          })}
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={p.bloccaOra}>
          Blocca adesso
        </button>
      </div>

      <div className="sect">
        <h3>Copia di sicurezza</h3>
        <p className="fine">
          Il file esce già cifrato con la tua passphrase: può stare nei File o in iCloud senza
          esporre nulla. Serve anche a spostare i dati su un altro dispositivo — e a non perderli,
          perché Safari può liberare l'archivio dei siti poco usati.
        </p>
        <p className="fine">
          Lo stesso pulsante importa anche un file di dati iniziali in chiaro: viene cifrato
          nell'archivio appena entra. Quel file, in chiaro, conviene cancellarlo subito dopo.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={p.esportaBackup}>Salva una copia cifrata</button>
          <label className="btn">
            Ripristina o importa dati
            {/* Senza accept: su iOS il filtro .json rende il file non
                selezionabile nell'app File, e il selettore sembra "non vederlo". */}
            <input type="file" style={{ display: "none" }}
              onChange={p.importaBackup} />
          </label>
        </div>
        {p.backupNota ? (
          <p className="fine" style={{ marginTop: 10,
            color: p.backupNota.ok ? T.green : T.red }}>{p.backupNota.t}</p>
        ) : null}
      </div>

      <div className="sect">
        <h3>Cambia passphrase</h3>
        <form onSubmit={cambia} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
          <input className="inp" type="password" placeholder="Nuova passphrase" value={pw1}
            autoComplete="new-password" aria-label="Nuova passphrase"
            onChange={function (e) { setPw1(e.target.value); }} />
          <input className="inp" type="password" placeholder="Ripeti" value={pw2}
            autoComplete="new-password" aria-label="Ripeti la nuova passphrase"
            onChange={function (e) { setPw2(e.target.value); }} />
          <button className="btn" type="submit">Cambia</button>
        </form>
        {msg ? (
          <p className="fine" style={{ marginTop: 10, color: msg.ok ? T.green : T.red }}>{msg.t}</p>
        ) : null}
      </div>

      <div className="sect">
        <h3>Cancella tutto</h3>
        <p className="fine">
          Elimina l'archivio cifrato da questo dispositivo. Le copie di sicurezza che hai salvato
          altrove restano valide; senza quelle, i dati non tornano.
        </p>
        {conferma ? (
          <div className="btn-row">
            <button className="btn btn-dim" onClick={p.distruggi}>Sì, cancella tutto</button>
            <button className="btn" onClick={function () { setConferma(false); }}>Annulla</button>
          </div>
        ) : (
          <button className="btn btn-dim" onClick={function () { setConferma(true); }}>
            Cancella l'archivio
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Altro ---------------------------------- */

function ScAltro(p) {
  var voci = [
    ["valute", "Valute e geografia", "Esposizione al dollaro e ripartizione per mercato"],
    ["simulatore", "Simulatore fiscale", "Vendite, imposta e zainetto"],
    ["storico", "Storico", p.nSnap ? p.nSnap + " rilevazioni" : "Nessuna rilevazione"],
    ["dati", "Dati", "Carica l'export, esporta, ipotesi in uso"],
    ["sicurezza", "Sicurezza", "Passphrase, blocco, copie di sicurezza"],
  ];
  return (
    <div className="wrap">
      <div className="sect">
        {voci.map(function (v) {
          return (
            <button className="nav-row" key={v[0]} onClick={function () { p.vai(v[0]); }}>
              <span>
                <span style={{ display: "block" }}>{v[1]}</span>
                <span style={{ display: "block", fontSize: 12.5, color: T.muted }}>{v[2]}</span>
              </span>
              <span className="chev"><Icona nome="chev" /></span>
            </button>
          );
        })}
      </div>
      <div className="sect">
        <p className="tiny">
          San Giorgio · analisi personale, non consulenza. I dati restano su questo dispositivo,
          cifrati.
        </p>
      </div>
    </div>
  );
}
