# AURA 2 — spec di progetto

> Redesign completo, impianto e grafica. Sostituisce l'app alla v0.8.
> Scritta il 28 ottobre 2026.

## 1. A cosa serve

AURA risponde a tre domande, **in quest'ordine di priorità**:

1. **Quanto posso spendere oggi?** — una cifra, subito, all'apertura.
2. **Posso permettermi questa cosa senza sforare entro fine ciclo?** — una risposta *prima* di spendere, non dopo.
3. **Dove sono finiti i miei soldi?** — la mappa del ciclo, per categoria, confrontata con i cicli precedenti.

L'ordine conta: se una decisione di design serve la terza domanda a scapito della prima, vince la prima.

## 2. Vincoli

- **Solo web app.** Niente Capacitor, niente App Store, niente build nativa. PWA installabile.
- **Nessun server.** Nessun account, nessuna sincronizzazione, nessuna analytics. I dati stanno in `localStorage`.
- **Nessun collegamento bancario.** Verificato: UniCredit è raggiungibile via GoCardless (`UNICREDIT_UNCRITMM`) ma richiederebbe un backend per custodire le chiavi. Escluso.
- **Un solo utente, euro, Italia.** Niente conti condivisi, niente multivaluta.
- **Stack invariato:** React 18, Vite, Tailwind. Icone Phosphor (MIT), peso `fill` dentro i quadratini, `regular` altrove.
- **Nessun dato da migrare.** Si riparte da zero: nessuna compatibilità con lo storage v0.8.

## 3. Il ciclo

Il ciclo **non è il mese solare**. Inizia il giorno dello stipendio (default: **16**) e finisce il giorno prima del successivo.

- Se il giorno non esiste nel mese (il 31 a febbraio), si usa l'ultimo giorno del mese.
- I confini del ciclo seguono il **giorno configurato**, non la data di accredito reale. Se il 16 cade di domenica e lo stipendio arriva il 14 o il 17, il ciclo parte comunque il 16. Altrimenti i confronti fra cicli non sarebbero più confrontabili.
- Tutte le aggregazioni — speso, categorie, confronti, riconciliazione — usano i confini del ciclo, mai quelli del mese.

### Il calcolo

```
Libero    L = stipendio + entrate extra − fisse − accantonamenti − obiettivo
Speso     P = spese libere registrate da inizio ciclo a oggi
Residuo   R = L − P
Giorni    D = da oggi (incluso) alla fine del ciclo
Giornaliero = R / D
```

- **Fisse**: ricorrenti con data dentro il ciclo (affitto, bollette, abbonamenti). Sottratte in blocco a inizio ciclo. Quando escono davvero si marcano come fisse e **non** vengono sottratte una seconda volta da `R`.
- **Accantonamenti**: spese annuali o semestrali (bollo, assicurazione) divise per il numero di cicli che mancano alla scadenza.
- **Obiettivo**: quota di risparmio del ciclo. Può essere 0.
- Ogni movimento registrato è **o libero o vincolato** (fisso / accantonamento / obiettivo), mai entrambi: solo i liberi entrano in `P`. È un campo obbligatorio sul movimento, non una deduzione a posteriori.
- Se `R ≤ 0` il giornaliero è 0 e lo stato è "sfori", con l'importo dello sforamento.

### Lo stato semantico

`ritmo = giornaliero attuale / (L / giorni totali del ciclo)`

| ritmo | stato | colore |
|---|---|---|
| ≥ 0,8 | in pari | verde |
| 0,4 – 0,8 | stringi | ambra |
| < 0,4 oppure R ≤ 0 | sfori | rosso |

Il colore vive **sulla barra**, non sulla cifra: la cifra porta l'accento di marca (grafite). Verde, ambra e rosso restano riservati al responso e non si usano altrove.

### Posso permettermelo?

Dato un importo `X`:

```
R' = R − X
nuovo giornaliero = R' / D
```

| condizione | risposta |
|---|---|
| `X ≤ giornaliero attuale` | **Sì.** Non intacca il ritmo. |
| `R' ≥ 0` | **Sì, ma stringi.** Il giornaliero scende da `R/D` a `R'/D` per i `D` giorni che restano; margine `R'`. |
| `R' < 0` | **No.** Sforeresti di `|R'|` entro il \<data fine ciclo\>. |

Nel terzo caso si propone un taglio: le categorie sopra la propria media storica, con quanto togliere a ciascuna per rientrare.

## 4. Le tre schermate

Tre destinazioni, una tab bar. Il tasto centrale prende il ruolo `prominent` — disponibile per qualunque tab a partire da iOS 27.

### Oggi
1. **Disponibile** — "Puoi spendere oggi", cifra in Title 1 (28 pt), la scadenza del ciclo accanto, la barra con lo stato. Mai un numero gigante: 28 pt, non 46.
2. **Oggi** — le spese registrate oggi.
3. **In arrivo** — le fisse con data futura dentro il ciclo. Già sottratte dal calcolo: stanno lì perché un "puoi spendere 42 €" con l'affitto fra tre giorni è una mezza verità.

### Posso? (tasto prominente)
Un foglio che sale. Tastierino, importo, e **il responso prima della spesa**. In fondo, `Registra`: se la spesa la fai davvero, la stessa schermata che ha risposto la registra.

Questa fusione è una decisione di progetto, non una scorciatoia: simulazione e inserimento sono lo stesso gesto, e l'inserimento in due tap nasce da qui.

### Ciclo
1. **16 ottobre – 15 novembre**, i liberi residui, la barra.
2. **Il conto**: stipendio, fisse, accantonamenti, obiettivo. Ogni riga si apre.
3. **Dove stanno andando**: categorie in ordine di spesa, con la variazione sul ciclo precedente.
4. **Verifica**: la riconciliazione.

## 5. La riconciliazione

L'anti-oblio. A fine ciclo si digita **un solo numero**: il totale delle uscite che dice la banca.

```
scostamento = totale banca − totale registrato nel ciclo
copertura   = totale registrato / totale banca
```

Se lo scostamento è **positivo** si crea una voce non tracciata di quell'importo, taggata, che entra nei totali ma non in nessuna categoria. L'app mostra la **copertura**: *"hai registrato l'87% di quello che è uscito"*.

Se lo scostamento è **negativo** — hai registrato più di quanto la banca dice uscito — non si crea nulla e non si corregge niente d'ufficio: significa un doppio inserimento, un rimborso non registrato, o contante che non passa dal conto. L'app lo dice e offre di aprire i movimenti del ciclo ordinati per importo, che è il modo più rapido per trovare un doppione. La copertura in questo caso si mostra tetto al 100%, mai oltre.

È il numero più importante dell'app. Una mappa incompleta che dichiara la propria incompletezza è utilizzabile; una che finge di essere completa no.

## 6. Linguaggio visivo

- **Superfici di sistema.** Chiaro: fondo `#F2F2F7`, carte `#FFFFFF`, raggio 11. Scuro: fondo `#000000`, carte `#1C1C1E`. È qui che si gioca il "sembra nativa", più che nell'accento.
- **Tipi di sistema** (`-apple-system`): su iPhone è SF Pro. Nessun font importato. Scala iOS: Large Title 34/41, Body 17/22, Subhead 15, Footnote 13.
- **Accento grafite** `#1C1C1E` (chiaro) / `#F2F2F7` (scuro). Nessuna tinta di marca satura, così verde/ambra/rosso restano leggibili come responso.
- **Liquid Glass iOS 27** sulla tab bar: sfocatura, **bordo definito** e niente ombra portata, highlight interno in alto. Il bordo di scorrimento è "duro" con linea inferiore, non il gradiente morbido di iOS 26.
- **Categorie**: glifo Phosphor bianco in quadratino 29 pt a raggio 7, un colore per categoria. I colori di categoria vivono **solo** lì dentro.
- **La modalità segue il telefono.** Non è un'impostazione.
- Rispetta `prefers-reduced-transparency` e `prefers-contrast`: in iOS 27 il vetro si adatta a quei due, e la web app deve fare lo stesso.

## 7. Onboarding

Tre passi, poi subito la schermata Oggi con la cifra:

1. **Quando ti pagano e quanto** — giorno del mese (default 16) e stipendio netto.
2. **Cosa esce fisso** — nome, importo, giorno. Più le annuali da accantonare.
3. **Quanto metti da parte** — per ciclo, anche 0.

Nessun tour, nessuna schermata esplicativa: con tre destinazioni, se serve un tutorial il design ha fallito.

## 8. Cosa muore

| Modulo | Righe | Motivo |
|---|---|---|
| `screens/Assistant.jsx` | 784 | Non risponde a nessuna delle tre domande |
| `engine/copilot.js` | 576 | Chat sui propri soldi |
| `data/changelog.js` | 586 | Changelog in-app per un utente solo |
| `lib/intelligence.js` (parte) | ~300 | `compute503020` è una regola su mese solare; `computeLearningConfidence` misura l'app, non l'utente |
| `lib/insights.js` | 283 | La frase del giorno |
| `engine/intelligence.js` | 222 | Il feed di insight |
| `lib/anomaly.js` | 86 | Rileva anomalie su dati dichiaratamente incompleti |
| `Tour.jsx`, `useTour.js` | ~200 | Vedi onboarding |
| `lib/notifications.js`, `lib/haptic.js` | ~290 | Nessun Capacitor; `navigator.vibrate` su iOS Safari non fa nulla |
| `useSpotlightCursor.js` | — | Effetto cursore su un'app da telefono |
| temi multipli | — | Uno solo, con chiaro e scuro di sistema |

Sopravvivono come **logica**, riscritti puliti e coperti da test: `computeFinance` e `avgDailySpend` (prediction), `evaluateWish` e `suggestTrim` (wish), `planReconciliation` (reconcile), `nextIncomeDate`/`prevIncomeDate`/`groupByMonth`/`categoryHistoricalStats` (analytics), `frequentExpenses`, e da `intelligence` **solo** `suggestCategory` e `detectRecurring`.

Si riscrivono invece di copiarli perché tutti assumono il mese solare, e il ciclo dal 16 invalida quell'assunzione alla radice.

`Goals.jsx` non sopravvive come schermata: l'obiettivo di risparmio è **una riga nel Ciclo**.

## 9. Fuori perimetro

- **Import CSV e collegamento bancario.** Valutati e scartati: il primo contraddice la scelta dell'inserimento manuale, il secondo richiede un backend.
- **Confronto con le medie ISTAT.** La fonte è pronta (comunicato 2025, API SDMX, dati congelabili a build time) ma non entra in questa versione: prima deve funzionare il ciclo. Resta il candidato numero uno per la successiva.
- **Notifiche e promemoria.** L'anti-oblio è la riconciliazione.
- **Conti multipli, contante separato, multivaluta.**

## 10. Criteri di riuscita

1. Apri l'app e in due secondi sai quanto puoi spendere oggi e quanto manca alla fine del ciclo.
2. Registri una spesa in due tap, senza scegliere la categoria a mano nei casi frequenti.
3. Prima di una spesa fuori budget sai se sfori, e di quanto, **prima** di farla.
4. A fine ciclo sai quanto della tua mappa è vera: la copertura è un numero esplicito.
5. Il codice sta sotto le 5.000 righe e nessun file supera le 300.

## 11. Rischi noti

- **L'inserimento manuale resta il punto fragile.** La riconciliazione lo misura, non lo risolve. Se dopo due cicli la copertura resta sotto il 70%, la scelta dell'inserimento va riaperta.
- **Il giornaliero può dare l'illusione del permesso.** "Puoi spendere 42 €" non significa che sia saggio spenderli. La sezione *In arrivo* serve a contenere questo effetto.
- **Senza notifiche nessuno ricorda la riconciliazione.** Va ancorata a un momento che esiste già: il ciclo nuovo che si apre, visibile all'apertura dell'app il giorno dello stipendio.
- **`localStorage` si cancella** svuotando i dati del sito. Il backup JSON resta l'unica difesa e l'onboarding deve dirlo.
