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
    var h = function (e) { setLargo(e.matches); };
    if (mq.addEventListener) mq.addEventListener("change", h);
    else mq.addListener(h);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", h);
      else mq.removeListener(h);
    };
  }, []);
  return largo;
}

function scarica(nome, testo, tipo) {
  var blob = new Blob([testo], { type: tipo || "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/* ------------------------------- icone ------------------------------------ */
/* disegnate qui: nessun file, nessuna libreria, nitide a ogni densità */

function Icona(p) {
  var s = p.size || 23;
  var c = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: p.attiva ? 2.1 : 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  if (p.nome === "sintesi") return (
    <svg {...c}><path d="M3 20h18" /><rect x="4" y="12" width="4" height="5" /><rect x="10" y="7" width="4" height="10" /><rect x="16" y="10" width="4" height="7" /></svg>
  );
  if (p.nome === "titoli") return (
    <svg {...c}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8.5" strokeDasharray="2 3" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" /></svg>
  );
  if (p.nome === "rischio") return (
    <svg {...c}><path d="M3 17L9 11l4 3 7-7" /><path d="M20 11V7h-4" /><circle cx="9" cy="11" r="1.3" /></svg>
  );
  if (p.nome === "stress") return (
    <svg {...c}><path d="M12 3l9 16H3z" /><path d="M12 10v4" /><path d="M12 16.5v.5" /></svg>
  );
  if (p.nome === "altro") return (
    <svg {...c}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></svg>
  );
  if (p.nome === "indietro") return (
    <svg {...c} width="20" height="20"><path d="M14 6l-6 6 6 6" /></svg>
  );
  if (p.nome === "chev") return (
    <svg {...c} width="18" height="18" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
  );
  if (p.nome === "lucchetto") return (
    <svg {...c} width={s} height={s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
  );
  return null;
}

/* ------------------------- mattoni dell'interfaccia ----------------------- */

function Stat(p) {
  return (
    <div>
      <div className="stat-lab">{p.label}</div>
      <div className="stat-val num" style={{ color: p.color || T.ink }}>{p.v}</div>
      {p.sub ? <div className="stat-sub num">{p.sub}</div> : null}
    </div>
  );
}

function Riga(p) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
      gap: 12, padding: "9px 0", borderBottom: "1px solid " + T.ruleSoft, minHeight: 40 }}>
      <span style={{ fontSize: 13.5, color: p.muted ? T.muted : T.ink2 }}>{p.l}</span>
      <span style={{ textAlign: "right" }}>
        <span className="num" style={{ fontSize: p.strong ? 17 : 14.5,
          fontWeight: p.strong ? 600 : 400, color: p.color || T.ink }}>{p.v}</span>
        {p.sub ? <span className="num" style={{ display: "block", fontSize: 11.5, color: p.color || T.muted }}>{p.sub}</span> : null}
      </span>
    </div>
  );
}

/* barra che parte da sinistra */
function Bar(p) {
  return (
    <div className="bar" style={{ height: p.h || 8 }}>
      <i style={{ width: Math.max(0, Math.min(100, p.pct)) + "%", background: p.col || T.cobalt }} />
    </div>
  );
}

/* barra con lo zero al centro, per i contributi che possono essere negativi */
function BarMid(p) {
  var w = (Math.abs(p.v) / (p.max || 1)) * 50;
  return (
    <div className="bar-mid" style={{ height: p.h || 16 }}>
      <span className="zero" />
      <i style={{ background: p.v >= 0 ? T.green : T.red,
        left: p.v >= 0 ? "50%" : (50 - w) + "%", width: w + "%" }} />
    </div>
  );
}

/* ------------- elemento firma: la striscia a due assi, toccabile ---------- */

function Striscia(p) {
  var tot = p.tot, soglia = p.soglia;
  var [apri, setApri] = useState(null);
  var W = 1000, H = 86;
  var x = 0;
  var segs = CLASS_ORDER.filter(function (c) { return tot.byClass[c] > 0; }).map(function (c) {
    var w = (tot.byClass[c] / tot.mkt) * W;
    var s = { c: c, x: x, w: w, pctv: (tot.byClass[c] / tot.mkt) * 100 };
    x += w;
    return s;
  });
  var usdW = (tot.usdNoGoldPct / 100) * W;
  var oroW = ((tot.usdPct - tot.usdNoGoldPct) / 100) * W;
  var sogliaX = (soglia / 100) * W;
  var oltre = tot.usdNoGoldPct > soglia;
  var dett = apri ? segs.filter(function (s) { return s.c === apri; })[0] : null;

  return (
    <div>
      <svg className="strip" viewBox={"0 0 " + W + " " + H} role="img"
        aria-label="Composizione per classe di attivo e ripartizione valutaria">
        <defs>
          <pattern id="tratteggio" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill={T.brass} />
            <line x1="0" y1="0" x2="0" y2="7" stroke={T.brassDark} strokeWidth="3" />
          </pattern>
        </defs>

        {/* classi di attivo */}
        {segs.map(function (s) {
          var att = apri === s.c;
          return (
            <g key={s.c} onClick={function () { setApri(att ? null : s.c); }} style={{ cursor: "pointer" }}>
              <rect x={s.x} y={0} width={Math.max(s.w - 2, 1)} height={34}
                fill={CLASS_COLOR[s.c]} opacity={apri && !att ? 0.42 : 1} />
              {s.w > 150 ? (
                <text x={s.x + 9} y={22} fontSize="15" fill={T.onFill} fontWeight="600"
                  style={{ fontVariantNumeric: "tabular-nums" }}>{pct(s.pctv, 0)}</text>
              ) : null}
            </g>
          );
        })}

        {/* valuta economica — la linea della soglia taglia la banda */}
        <rect x={0} y={44} width={W} height={26} fill={T.barBg} />
        <rect x={0} y={44} width={usdW} height={26} fill={T.brass} />
        <rect x={usdW} y={44} width={oroW} height={26} fill="url(#tratteggio)" />
        <line x1={sogliaX} y1={38} x2={sogliaX} y2={76} stroke={oltre ? T.red : T.ink} strokeWidth="3" />
        <text x={9} y={62} fontSize="14" fill={T.onFill} fontWeight="600"
          style={{ fontVariantNumeric: "tabular-nums" }}>USD {pct(tot.usdNoGoldPct, 0)}</text>
        <text x={W - 9} y={62} fontSize="14" fill={T.ink} textAnchor="end" fontWeight="600"
          style={{ fontVariantNumeric: "tabular-nums" }}>EUR {pct(100 - tot.usdPct, 0)}</text>
        <text x={sogliaX + 7} y={84} fontSize="12" fill={oltre ? T.red : T.muted}
          style={{ fontVariantNumeric: "tabular-nums" }}>soglia {soglia}%</text>
      </svg>

      {dett ? (
        <div className="reveal" style={{ display: "flex", justifyContent: "space-between",
          alignItems: "baseline", gap: 10, padding: "8px 0 2px", fontSize: 13 }}>
          <span style={{ color: T.ink2 }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2,
              background: CLASS_COLOR[dett.c], marginRight: 7 }} />
            {dett.c}
          </span>
          <span className="num" style={{ color: T.ink }}>
            {eur(tot.byClass[dett.c])} · {pct(dett.pctv)}
          </span>
        </div>
      ) : (
        <div className="tiny" style={{ paddingTop: 6 }}>
          Tocca una banda per il valore. La fascia tratteggiata è l'oro, contato a parte: prezzato
          in dollari ma non è un rischio-paese.
        </div>
      )}
    </div>
  );
}

/* --------------- grafico dello storico, disegnato a mano ----------------- */
/* Niente libreria di grafici: due serie su due scale, poche decine di punti.
   Scritto a mano pesa qualche riga e toglie una dipendenza esterna. */

function LineaStorico(p) {
  var dati = p.dati;
  if (dati.length < 2) return null;
  var W = 680, H = 200, mL = 48, mR = 40, mT = 10, mB = 26;
  var vals = dati.map(function (d) { return d.mkt; });
  var usds = dati.map(function (d) { return d.usd; });
  var vMin = Math.min.apply(null, vals), vMax = Math.max.apply(null, vals);
  var pad = (vMax - vMin) * 0.12 || Math.max(vMax * 0.02, 100);
  vMin -= pad; vMax += pad;
  var uMin = Math.min.apply(null, usds), uMax = Math.max.apply(null, usds);
  var uPad = (uMax - uMin) * 0.2 || 2;
  uMin -= uPad; uMax += uPad;

  var px = function (i) { return mL + (dati.length === 1 ? 0 : (i / (dati.length - 1)) * (W - mL - mR)); };
  var pyV = function (v) { return mT + (1 - (v - vMin) / (vMax - vMin || 1)) * (H - mT - mB); };
  var pyU = function (v) { return mT + (1 - (v - uMin) / (uMax - uMin || 1)) * (H - mT - mB); };
  var linea = function (acc, f) {
    return dati.map(function (d, i) { return (i ? "L" : "M") + px(i) + " " + f(acc(d)); }).join(" ");
  };

  return (
    <svg viewBox={"0 0 " + W + " " + H} className="strip" role="img"
      aria-label="Valore del portafoglio ed esposizione al dollaro nel tempo">
      {[0, 0.5, 1].map(function (f) {
        var y = mT + f * (H - mT - mB);
        return <line key={f} x1={mL} y1={y} x2={W - mR} y2={y} stroke={T.ruleSoft} strokeDasharray="2 4" />;
      })}
      <text x={mL - 6} y={pyV(vMax) + 4} fontSize="11" fill={T.muted} textAnchor="end"
        style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(vMax / 1000) + "k"}</text>
      <text x={mL - 6} y={pyV(vMin) + 4} fontSize="11" fill={T.muted} textAnchor="end"
        style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(vMin / 1000) + "k"}</text>
      <text x={W - mR + 6} y={pyU(uMax) + 4} fontSize="11" fill={T.brass}
        style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(uMax) + "%"}</text>
      <text x={W - mR + 6} y={pyU(uMin) + 4} fontSize="11" fill={T.brass}
        style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(uMin) + "%"}</text>

      <path d={linea(function (d) { return d.usd; }, pyU)} fill="none" stroke={T.brass}
        strokeWidth="2" strokeDasharray="5 4" />
      <path d={linea(function (d) { return d.mkt; }, pyV)} fill="none" stroke={T.cobalt} strokeWidth="2.4" />
      {dati.map(function (d, i) {
        return <circle key={d.date} cx={px(i)} cy={pyV(d.mkt)} r="3.4" fill={T.cobalt} />;
      })}
      <text x={mL} y={H - 7} fontSize="11" fill={T.muted}>{dateIt(dati[0].date).slice(0, 5)}</text>
      <text x={W - mR} y={H - 7} fontSize="11" fill={T.muted} textAnchor="end">
        {dateIt(dati[dati.length - 1].date).slice(0, 5)}
      </text>
    </svg>
  );
}

/* nuvola dei periodi: pochi punti, quindi grandi e leggibili */
function Nuvola(p) {
  var punti = p.punti;
  if (!punti.length) return null;
  var W = 320, H = 240, m = 36;
  var lim = Math.max(1, Math.max.apply(null, punti.map(function (q) {
    return Math.max(Math.abs(q.x), Math.abs(q.y));
  }))) * 1.25;
  var px = function (v) { return m + ((v + lim) / (2 * lim)) * (W - m - 10); };
  var py = function (v) { return H - m - ((v + lim) / (2 * lim)) * (H - m - 10); };
  return (
    <svg viewBox={"0 0 " + W + " " + H} className="strip" style={{ maxWidth: 360 }} role="img"
      aria-label="Rendimenti del portafoglio contro quelli del benchmark">
      <line x1={m} y1={py(0)} x2={W - 10} y2={py(0)} stroke={T.rule} />
      <line x1={px(0)} y1={10} x2={px(0)} y2={H - m} stroke={T.rule} />
      <line x1={px(-lim)} y1={py(-lim)} x2={px(lim)} y2={py(lim)} stroke={T.rule} strokeDasharray="3 3" />
      <text x={W - 12} y={py(lim) + 12} fontSize="10" fill={T.muted} textAnchor="end">beta 1</text>
      {p.mostraRetta ? (
        <line x1={px(-lim)} y1={py(p.alpha + p.beta * -lim)} x2={px(lim)} y2={py(p.alpha + p.beta * lim)}
          stroke={T.cobalt} strokeWidth="2.4" />
      ) : null}
      {punti.map(function (q, i) {
        return <circle key={q.data + i} cx={px(q.x)} cy={py(q.y)} r="6" fill={T.brass} opacity="0.85" />;
      })}
      <text x={m} y={H - 10} fontSize="10" fill={T.muted}>−{num(lim, 1)}%</text>
      <text x={W - 10} y={H - 10} fontSize="10" fill={T.muted} textAnchor="end">+{num(lim, 1)}%</text>
    </svg>
  );
}

/* ------------------------------ avvisi ------------------------------------ */

function Avvisi(p) {
  if (!p.alerts.length) return null;
  return (
    <div>
      {p.alerts.map(function (a, i) {
        var col = a.lv === "alto" ? T.red : a.lv === "medio" ? T.brass : T.slate;
        return (
          <div className="alert" key={i}>
            <span className="alert-dot" style={{ background: col }} />
            <div>
              <div className="alert-t">{a.t}</div>
              <div className="alert-d">{a.d}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
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
      if (pw.length < 8) { setErr("Serve una passphrase di almeno 8 caratteri."); return; }
      if (pw !== pw2) { setErr("Le due passphrase non coincidono."); return; }
    } else if (!pw) { return; }
    setLav(true);
    p.onInvia(pw).catch(function (e2) {
      setLav(false);
      setErr(e2 && e2.message === "passphrase"
        ? "Passphrase non valida."
        : "Non riesco ad aprire l'archivio. " + ((e2 && e2.message) || ""));
    });
  }

  return (
    <div className="lock">
      <svg className="lock-mark" width="54" height="54" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="10" width="40" height="11" rx="2" fill={T.cobalt} />
        <rect x="4" y="25" width="40" height="11" rx="2" fill={T.brass} />
        <line x1="31" y1="5" x2="31" y2="43" stroke={T.red} strokeWidth="3.4" strokeLinecap="round" />
      </svg>
      <h1>San Giorgio</h1>
      <p className="lede">
        {nuova
          ? "Scegli una passphrase. Protegge i dati sul dispositivo e non viene salvata da nessuna parte: se la perdi, l'archivio non è recuperabile."
          : "Inserisci la passphrase per aprire l'archivio."}
      </p>
      <form onSubmit={invia}>
        <input className="inp" type="password" value={pw} autoComplete={nuova ? "new-password" : "current-password"}
          onChange={function (e) { setPw(e.target.value); }} placeholder="Passphrase"
          autoFocus aria-label="Passphrase" />
        {nuova ? (
          <input className="inp" type="password" value={pw2} autoComplete="new-password"
            onChange={function (e) { setPw2(e.target.value); }} placeholder="Ripeti la passphrase"
            aria-label="Ripeti la passphrase" />
        ) : null}
        {err ? <div className="err">{err}</div> : null}
        <button className="btn btn-pri" type="submit" disabled={lav}>
          {lav ? "Un momento…" : nuova ? "Crea l'archivio" : "Apri"}
        </button>
      </form>
      {!nuova && p.onRipristina ? (
        <div style={{ marginTop: 18 }}>
          <label className="btn btn-sm" style={{ display: "inline-flex" }}>
            Ripristina da una copia
            {/* niente accept: vedi la nota in ScSicurezza */}
            <input type="file" style={{ display: "none" }}
              onChange={p.onRipristina} />
          </label>
        </div>
      ) : null}
      <p className="tiny" style={{ marginTop: 22 }}>
        {nuova
          ? "Niente account, niente server: l'archivio vive solo in questo browser, su questo dispositivo."
          : "Hai dimenticato la passphrase? Non esiste un recupero. Si può ripartire da zero da Altro → Sicurezza, dopo aver sbloccato, oppure ripristinare una copia."}
      </p>
    </div>
  );
}
