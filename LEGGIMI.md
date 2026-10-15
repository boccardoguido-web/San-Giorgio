# San Giorgio

Monitoraggio di portafoglio per iPhone e iPad. Funziona come app dalla schermata
Home, anche senza rete. I dati restano sul dispositivo, cifrati.

---

## Pubblicare

Questi file vanno nella radice del repository. Poi su GitHub:
**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.

Dopo un paio di minuti il sito è all'indirizzo
`https://<utente>.github.io/<repo>/`.

Sull'iPhone o sull'iPad: apri l'indirizzo in Safari, tocca Condividi e poi
**Aggiungi alla schermata Home**. Da quel momento si apre a tutto schermo, senza
barra del browser, e funziona anche in aereo.

Vale la pena installarla davvero e non lasciarla come scheda di Safari: alle app
aggiunte alla schermata Home iOS non cancella l'archivio, mentre ai siti visitati
di rado può farlo dopo qualche settimana.

### Ricompilare dopo una modifica

I file `app.js` e `vendor.js` sono generati. Le sorgenti leggibili stanno in
`src/`.

```
npm install
npm run build
```

---

## Dove stanno i dati

Nel browser del dispositivo, in IndexedDB, **cifrati con AES-256-GCM**. La chiave
si ricava dalla passphrase con PBKDF2-SHA256 a 600.000 iterazioni e sale casuale,
e vive solo in memoria: chiusa l'app serve di nuovo la passphrase.

Non esiste un recupero. Se la passphrase si perde, l'archivio non torna.

Cosa questo comporta, in concreto:

- **Il codice è pubblico, i dati no.** In questi file non c'è nessuna posizione,
  nessun importo, nessuna data. Chi aprisse l'indirizzo troverebbe un'app vuota
  che gli chiede di crearsi il proprio archivio.
- **L'app non può uscire in rete.** Non è una promessa, è una regola scritta
  nella pagina e applicata dal browser: `connect-src 'none'` nella Content
  Security Policy di `index.html` blocca `fetch`, `XMLHttpRequest`, WebSocket e
  `sendBeacon`. Anche un errore di programmazione non riuscirebbe a mandare
  fuori niente.
- **Nessuna risorsa esterna.** Nessun font remoto, nessuna libreria da CDN,
  nessuna statistica. Tutto quello che serve è in questa cartella.
- **Nessun account e nessun server.** Non c'è niente da violare altrove, perché
  non c'è un altrove.
- **Chi ha in mano il dispositivo sbloccato non entra comunque**: l'app si
  riblocca da sola dopo qualche minuto di inattività o quando va in secondo
  piano, e senza passphrase l'archivio sul disco è rumore.

Il service worker (`sw.js`) serve solo a far funzionare l'app senza rete: mette
in cache i file di questa cartella e non conosce i dati, che sono cifrati altrove.

### Copie di sicurezza

Da **Altro → Sicurezza** si salva una copia già cifrata con la propria
passphrase. Può stare nei File o in iCloud senza esporre nulla, e serve a due
cose: spostare i dati su un altro dispositivo e non perderli se l'archivio del
browser viene ripulito.

L'export CSV, invece, esce in chiaro: è pensato per aprirlo subito in un foglio
di calcolo, non per conservarlo.

---

## Cosa fa

- **Sintesi** — valore, composizione per classe e per valuta economica, avvisi.
- **Titoli** — look-through: quanto pesa ogni singola società sommando fondi e
  azioni diretti, e quanto si sovrappongono i fondi fra loro.
- **Rischio** — beta calcolato dalla composizione, e alpha quando la serie
  storica sarà abbastanza lunga.
- **Stress** — scenari storici e due scenari "bolla AI" che colpiscono per
  canale di esposizione anziché per settore.
- **Altro** — valute e geografia, simulatore fiscale, storico, caricamento dati,
  sicurezza.

I file da caricare sono l'export **"Portafoglio di sintesi"** di Fineco (.xls) e,
per il look-through, i file di composizione dei gestori (.csv o .xlsx).

---

Strumento di analisi personale, non consulenza. Il calcolo fiscale segue le
regole generali del regime amministrato italiano e non sostituisce il conteggio
del sostituto d'imposta.
