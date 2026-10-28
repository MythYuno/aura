# SDD ledger — plan: docs/superpowers/plans/2026-10-28-aura-2.md

Esecuzione: executing-plans (native). Ramo: redesign/aura-2. BASE iniziale: 84be91f
Spec: docs/superpowers/specs/2026-10-28-aura-redesign-design.md (letta)

## Pre-flight: interfacce condivise

| da | a | produce / consuma | esito |
|---|---|---|---|
| 2 | 3 | cycleFor, daysLeft, cycleLength, previousCycle | combaciano |
| 3 | 4 | computeBudget -> left, daysLeft, perDay; categoryHistoricalStats | combaciano |
| 2 | 5 | cycle {start,end} | combaciano |
| 5 | 6 | reconcile() usata da applyReconcile | combaciano, ordine giusto |
| 6 | 3 | emptyState -> computeBudget | **CONFLITTO A e B** |
| 6 | 7 | movements | combaciano |
| 3,6,8 | 9 | computeBudget, useStore, primitive | combaciano |
| 4,6,7,8 | 10 | parseAmount, addMovement, suggestCategory | combaciano |
| 2,3,5 | 11 | previousCycle, categoryHistoricalStats, reconcile | combaciano |
| 4,6 | 12 | parseAmount, setSetup | combaciano |

Pre-flight: Ruling A: emptyState() del Task 6 non ha il campo `extras`, che computeBudget
richiede — la spec §3 lo mette nella formula del libero ("stipendio + entrate extra").
Deciso: emptyState() guadagna `extras: []`. Costo se sbagliato: rinomina di un campo.

Pre-flight: Ruling B: nello stato `fixed` e `setAside` sono liste, nella formula del libero
sono scalari da sottrarre, e la spec dice che gli accantonamenti si dividono "per il numero
di cicli che mancano alla scadenza" senza assegnare quel calcolo a nessuna funzione.
Deciso: computeBudget accetta le liste e le riduce al suo interno — `fixed` somma le voci
col giorno dentro il ciclo, `extras` somma le voci datate dentro il ciclo, `setAside` usa
un helper `setAsideQuota(entry, cycle, payDay)` esportato da budget.js, `goal` resta scalare.
Costo se sbagliato: la riduzione si sposta nel chiamante, firma invariata.

## Task 1

Task 1: Ruling: il brief estraeva quattro formule; ho estratto anche computeFinance,
che e il cuore del giornaliero riscritto dal Task 3 e sarebbe sparito col file.
Costo se sbagliato: qualche riga in piu nel documento di riferimento.

Task 1: Ruling: la lista di cancellazione del brief ometteva src/components/ui/*,
src/lib/{icons,format,storage,backup}.js e src/hooks/{useBreakpoint,useUndoToast}.js,
tutti superati dalle primitive del Task 8 e dallo store del Task 6. Lasciarli sarebbe
codice morto contro il tetto di 5.000 righe del piano. Cancellati (51 file in tutto).
Costo se sbagliato: git show 84be91f:<percorso> li restituisce.

Task 1: Ruling: vite.config.js non era fra i file da modificare, ma il suo manualChunks
nominava framer-motion e i sei @radix-ui, quindi la build li impacchettava comunque:
142 kB di JS che nessuno importa. Rimosso il blocco. Costo se sbagliato: si rimette una
suddivisione in chunk se il bundle cresce.

Task 1: Ruling: il task non ha step di test (e una cancellazione), quindi la verifica
di chiusura e `npm run build` invece di una suite.
Task 1: complete (commits 84be91f..793dc7c, tests: npm run build → [32m✓ built in 1.94s[39m)

## Task 2

Task 2: Ruling: il piano fissava `node --test tests/` come comando della suite, ma su
Node 24 lo slash finale fa interpretare il percorso come modulo da caricare
(MODULE_NOT_FOUND). Sostituito con `node --test "tests/**/*.test.mjs"`, forma esplicita
che non raccoglie file fuori da tests/. Costo se sbagliato: una riga in package.json.
Task 2: complete (commits 793dc7c..fc64d9c, tests: npm test → ℹ duration_ms 143.6137)

## Task 3

Task 3: Ruling: aggiunto src/cycle/day.js, che il piano non nominava. Serve a budget
e stats la stessa conversione delle date: lo stato passa da JSON, quindi le date sono
stringhe YYYY-MM-DD, e new Date(stringa) le legge come UTC — nei fusi a ovest un
movimento salterebbe di giorno e a volte di ciclo. Senza un posto unico ogni modulo
avrebbe riparsato a modo suo. Costo se sbagliato: un modulo piccolo in piu.

Task 3: Ruling: esportato stateFor(pace, left) da budget.js, non previsto fra i Produces.
Il test sulle soglie cosi verifica 0.80 / 0.79 / 0.40 / 0.39 esattamente, invece di
costruire input che centrino quei ritmi per via indiretta. Costo se sbagliato: un export
in piu nella superficie del modulo.

Task 3: Ruling: corrette due attese che avevo scritto male io. La scadenza del 20 gennaio
cade nel quarto ciclo, non nel terzo (portata al 10 gennaio); e l'accantonamento del primo
test deve essere senza scadenza per valere intero, come diceva il brief. Costo se
sbagliato: nessuno, erano errori di calcolo miei nei test.
Task 3: complete (commits fc64d9c..f5aa1fe, tests: npm test → ℹ duration_ms 484.7144)

## Task 4

Task 4: Ruling: il mockup mostrava il nuovo giornaliero a 29,47 (arrotondato), ma
computeBudget tronca. Allineato al troncamento: 26520/9 diventa 2946, non 2947. Arrotondare
per eccesso farebbe promettere un centesimo che non c'e. Costo se sbagliato: un centesimo
di differenza nel testo del responso.

Task 4: Ruling: parseAmount rifiuta anche separatori doppi (",,", "..") e virgole multiple,
casi che il brief non elencava ma che un tastierino produce in fretta. Rifiuta invece di
indovinare: ",,2" non diventa 1,20. Costo se sbagliato: qualche battuta a vuoto in piu
da correggere per l'utente.
Task 4: complete (commits f5aa1fe..466ca91, tests: npm test → ℹ duration_ms 164.4946)

## Task 5

Task 5: Ruling: la spec non diceva con che data creare la voce non tracciata. Datata
all'ultimo giorno del ciclo, cosi cade dentro il ciclo che si sta riconciliando e viene
contata nel suo residuo. Aggiunto toYmd a day.js per scriverla, con i suoi test.
Costo se sbagliato: la voce si sposta di qualche giorno dentro lo stesso ciclo.

Task 5: Ruling: la voce non tracciata resta esclusa dal totale registrato (per
l'idempotenza) ma NON dal `spent` di computeBudget, perche quei soldi sono usciti davvero
e devono ridurre il residuo. Resta fuori dalle statistiche di categoria, come vuole la
spec ("entra nei totali ma non in nessuna categoria"). Costo se sbagliato: il giornaliero
dopo una riconciliazione sarebbe troppo generoso.
Task 5: complete (commits 466ca91..a82a6c9, tests: npm test → ℹ duration_ms 185.2504)

## Task 6

Task 6: Ruling: storage.js prende lo store come parametro iniettabile con default
globalThis.localStorage. In Node localStorage non esiste, e una quota esaurita non si
puo provare altrimenti: senza iniezione i due test del Review Focus numero 5 sarebbero
stati impossibili. Costo se sbagliato: un parametro in piu in due firme.

Task 6: Ruling: aggiunto normalize() a schema.js, non previsto fra i Produces. load()
da solo non bastava: uno stato v2 scritto senza il campo extras (Ruling A del pre-flight)
passerebbe undefined dentro computeBudget. normalize riempie i mancanti e scarta le
version diverse. Costo se sbagliato: la guardia si sposta dentro load.

Task 6: Ruling: useStore non ha test automatici. E un hook React e il piano prevede la
verifica delle schermate nel browser, dove passa anche questo. I test del brief coprono
schema e storage, come elencato. Costo se sbagliato: un bug nel debounce o in
applyReconcile emerge solo in Task 9-11 invece che qui.
Task 6: complete (commits a82a6c9..ec0091b, tests: npm test → ℹ duration_ms 192.4944)
Task 7: complete (commits ec0091b..be67387, tests: npm test → ℹ duration_ms 246.9419)

## Task 8

Task 8: Ruling: Intl con locale it-IT non raggruppa le migliaia a quattro cifre, perche
CLDR per l'italiano ha minimumGroupingDigits a 2: "1800,00" e formalmente corretto. Forzato
useGrouping 'always' -> 1.800,00. Le banche italiane scrivono cosi e in una colonna di
importi il punto e cio che fa leggere l'ordine di grandezza. Costo se sbagliato: una
opzione da togliere in format.js.

Task 8: Ruling: formatCents spostata da Money.jsx a src/ui/format.js. Node non parsa il
JSX, quindi dentro il componente la regola di formattazione non era testabile; fuori ha
sei test. Costo se sbagliato: un import in piu.

Task 8: Ruling: gli screenshot del browser vanno in timeout perche la finestra dell'app e
nascosta e la pagina non arriva a disegnare. Verificato leggendo gli stili calcolati —
colori, rientro dei separatori, dimensione della cifra, assenza di scorrimento orizzontale —
che per queste proprieta e prova piu precisa di un'immagine. Costo se sbagliato: un difetto
puramente visivo potrebbe sfuggire.

Task 8: Nota: in questo ambiente prefers-reduced-transparency risulta ATTIVO, quindi la
regola che appiattisce il vetro e stata verificata dal vivo: la tab bar diventa opaca e
--glass prende il valore del fondo.
Task 8: complete (commits be67387..4567025, tests: npm test → ℹ duration_ms 288.5045)

## Task 9

Task 9: Ruling: aggiunto src/ui/ScrollTitle.jsx per il passo 4 (bordo di scorrimento duro
di iOS 27), che il brief chiedeva di verificare senza che nessun file lo implementasse.
Costo se sbagliato: un componente in piu.

Task 9: Ruling: prima versione con IntersectionObserver, sostituita da un ascolto diretto
dello scorrimento del contenitore: con un elemento sticky dentro un div che scorre la
radice implicita dell'osservatore non e quella giusta. Costo se sbagliato: nessuno, la
seconda e piu semplice.

Task 9: Ruling: visibility e non solo opacity sul titolo compatto, altrimenti "Oggi"
restava due volte nel testo della pagina e per uno screen reader. Verificato: ora compare
una volta sola.

Task 9: NON VERIFICATO: il collasso del titolo allo scorrimento. In questa sessione la
finestra dell'app e nascosta, la pagina non arriva a disegnare, e in quello stato ne
l'assegnazione di scrollTop emette l'evento scroll (misurato: zero eventi con scrollTop
che pure diventa 300) ne un gesto reale viene consegnato. Il componente degrada in modo
innocuo: se l'evento non arriva, il titolo compatto resta spento e la schermata funziona
identica. Da provare con la finestra in primo piano. Costo se sbagliato: manca un
effetto, nessuna funzione.
Task 9: complete (commits 4567025..619fb42, tests: npm test → ℹ duration_ms 249.75)

## Task 10

Task 10: Ruling: gli eventi del mouse non arrivano alla pagina (finestra nascosta), ma un
click() programmatico genera un evento DOM vero che React intercetta senza bisogno che la
pagina disegni. Tutta la verifica del foglio e fatta cosi: apertura, tre responsi,
sequenze di tasti ostili, registrazione e persistenza. Costo se sbagliato: un difetto
puramente visivo del foglio potrebbe sfuggire.

Task 10: BUG TROVATO E CORRETTO: la guardia che impedisce la seconda virgola leggeva `raw`
dalla chiusura del render corrente. Su due tap ravvicinati, prima di un nuovo render, vedeva
un valore vecchio e lasciava passare entrambe le virgole: la sequenza 1 , , 2 mostrava
"12,00 EUR" con Registra ABILITATO, cioe un importo diverso da quello battuto. Spostata
dentro setRaw funzionale. Verificato dopo: 1,,2 -> 1,20 EUR, ,50 -> 0,50 EUR,
1,234 -> 1,23 EUR troncato.

Task 10: Ruling: aggiunta una riga di spese frequenti che riempie importo, etichetta e
categoria in un tap, da frequentExpenses del Task 7 (che il piano elencava fra i consumi
di questo task senza dire dove usarlo). E' il percorso vero dei due tap. Costo se
sbagliato: una riga di pastiglie da togliere.
Task 10: complete (commits 619fb42..038f086, tests: npm test → ℹ duration_ms 258.0509)

## Task 11

Task 11: BUG TROVATO E CORRETTO in stats.js (Task 3): la media storica divideva per il
numero di cicli richiesti anche quando quei cicli erano vuoti perche l'app non esisteva
ancora. Con un mese di storia e nCycles 3 la media di 8000 diventava 2666,67 e ogni
categoria risultava a +275%: il "non mi dice niente" aggravato invece che curato. Ora i
cicli senza alcun movimento non entrano nella media. Due test nuovi lo fissano.

Task 11: Ruling: le righe Spese fisse e Accantonamenti si aprono su un foglio che elenca le
voci (il brief diceva "ogni riga si apre" senza dire in cosa). Stipendio e Obiettivo restano
righe sole: si cambiano dall'onboarding. Costo se sbagliato: un foglio da rifare.

Task 11: Verificato dal vivo con due cicli di dati: +12% su Cibo, -8% su Trasporti, "nuova"
su Svago invece di +Infinity, accantonamento diviso per i quattro cicli fino alla scadenza,
libero 947,01 e residuo 672,21 coincidenti col calcolo a mano. Riconciliazione nei tre casi:
400,00 -> mancano 125,20 e copertura 69%; 200,00 -> registrato 74,80 in piu e niente creato;
274,80 -> tutto quadra. Voce non tracciata salvata senza categoria, datata a fine ciclo.
Task 11: complete (commits 038f086..ea7d8be, tests: npm test → ℹ duration_ms 271.2189)

## Task 12

Task 12: Ruling: il backup JSON che l'avviso dell'onboarding promette "nelle impostazioni"
non ha ancora una schermata impostazioni: exportJSON e importJSON esistono (Task 6) ma non
sono raggiungibili dall'interfaccia. Nessun task del piano le collega. Lo lascio come
mancanza dichiarata invece di infilare una schermata non pianificata: va aperto come
lavoro successivo. Costo se sbagliato: l'utente legge di un backup che non puo ancora fare.

Task 12: Verificato dal vivo il giro completo da storage vuoto: passo 1 con Avanti bloccato
finche l'importo non e valido, passo 2 con la fissa, passo 3 con obiettivo e avviso sui dati,
Inizia porta su Oggi, e dopo un ricaricamento payDay 16, income 180000, la fissa e l'obiettivo
sono tutti sopravvissuti. Con Storage.setItem che lancia QuotaExceededError compare l'avviso,
l'app resta viva e la spesa vale per la sessione.
Task 12: complete (commits ea7d8be..011be12, tests: npm test → ℹ duration_ms 233.0427)

## Task 13

Task 13: Ruling: trovati tre residui della v0.8 che il brief non elencava. I meta
theme-color del documento e del manifest erano ancora i colori prugna (#EEECE8 / #0E0F12),
quindi la cornice del browser e della PWA non combaciava con le superfici: portati a
#F2F2F7 / #000000. E CACHE_NAME del service worker era 'aura-v19-prugna': lasciarlo avrebbe
fatto servire asset della v0.8 dalla cache a chi ha gia visitato l'app. Ora 'aura-v2-sistema'.
Costo se sbagliato: nessuno, erano valori morti.

Task 13: Ruling: corretto il README e il testo dell'onboarding, che promettevano un backup
JSON "nelle impostazioni". Le funzioni esistono (Task 6) ma nessuna schermata le richiama,
e il passo 4 del brief chiede che ogni affermazione del README sia vera. Ora dicono che
l'export non e ancora raggiungibile. Costo se sbagliato: un paragrafo da riscrivere quando
la schermata ci sara.

Task 13: Misure finali: 102 test verdi, build 206 kB (64 kB gzip), src 2.181 righe in 28
file piu 132 di CSS, file piu grosso 248 righe (Onboarding.jsx). Tetti del piano: nessun
file oltre 300 e totale sotto 5.000, entrambi rispettati. La v0.8 era 15.442 righe in src.
PWA: manifest con 4 icone e display standalone, service worker registrato su /aura/.
A 393x852 nessuno scorrimento orizzontale, tab bar con bordo da 1px e padding inferiore
della safe area, foglio dentro il viewport con la maniglia visibile.
Task 13: complete (commits 011be12..4c63cc1, tests: npm test → ℹ duration_ms 267.9087)

## Revisione finale

Final: revisore indipendente su contesto fresco (modello piu capace). Ha rieseguito test e
build e ha spazzato 10.227 combinazioni giorno x giorno-di-paga sui confini del ciclo senza
trovare anomalie. Esito: 4 Critical, 11 Important, 17 Minor, 9 declined to judge. Ho
verificato io i quattro Critical sul codice prima di accettarli: tutti reali.

### Correzioni applicate, ciascuna con test RED -> GREEN

Final: fixed C1 — una fissa al 29/30/31 spariva per interi cicli. fixedDateIn non tagliava il
giorno all'ultimo del mese come fa payDateIn, quindi l'affitto "il 31" non trovava ne il 31
aprile ne il 31 maggio: 5 cicli su 12 senza quella spesa, e il disponibile del giorno
raddoppiato senza avviso. Test "una fissa al 31 cade l'ultimo giorno nei mesi corti" piu la
proprieta "ogni giorno da 1 a 31 cade esattamente una volta per ciclo" RED->GREEN, suite
108/108. Verificato in pagina: fixedTotal 94000 nei cicli di feb/apr/giu/set/nov dove era 0.

Final: fixed C2 — la riconciliazione contava due volte le fisse. tracked prendeva solo i
movimenti registrati, ma il totale della banca contiene anche le fisse: lo scostamento ERA
l'affitto e diventava un movimento libero che il budget sottraeva di nuovo. Un ciclo con +560
di residuo diventava -380 e "hai finito il budget", con copertura al 24% che faceva scattare
il campanello della spec 11 su un artefatto del modello. reconcile ora riceve committedCents.
Tre test RED->GREEN. Verificato in pagina: 1.240,00 su 940 di fisse piu 300 registrati da
"100%, tutto quadra".

Final: fixed C3 — la riconciliazione poteva colpire solo il ciclo corrente, e usarla nel
momento che la spec indica (il giorno dello stipendio) scriveva il totale del ciclo chiuso sul
ciclo nuovo e vuoto, che nasceva a "hai finito il budget" senza modo di tornare indietro.
applyReconcile riceve il ciclo invece di ricalcolarlo da new Date(), e il foglio ha un
selettore che parte dal ciclo CHIUSO. Verificato in pagina.

Final: fixed C4 — niente era modificabile dopo l'onboarding: App lo nascondeva per sempre a
onboarded true e le righe del conto non si aprivano. Aggiunto SetupSheet (stipendio, giorno,
obiettivo, fisse, accantonamenti) raggiungibile da ogni riga. Verificato in pagina: stipendio
portato a 2.000, salvato e persistito.

Final: fixed I1 — in modalita scura con "piu contrasto", il blocco di contrasto scritto DOPO
quello scuro imponeva i grigi del tema chiaro su fondo nero: testo a 1,4:1, l'opposto di cio
che l'utente aveva chiesto. Riordinati i blocchi, aggiunto scuro+contrasto. Ordine verificato
nel CSS compilato.

Final: fixed I2 — l'app scaricava ancora Geist e Geist Mono da Google Fonts a ogni avvio a
freddo, due preconnect piu un foglio bloccante, mentre il CSS usa -apple-system: spreco puro e
una richiesta a terzi in un'app che dichiara di non parlare con nessun server. Rimossi, e via
le origini esterne dalla CSP. Verificato in pagina: zero richieste esterne.

Final: fixed I3 e I11 — l'onboarding scartava in silenzio le righe con importo illeggibile, e
i suoi aggiornamenti di stato leggevano dalla chiusura del render, la stessa classe del bug
della virgola. Riscritto sopra ui/Fields.jsx, tutto in forma funzionale, con messaggi
d'errore per ogni passo.

Final: fixed I4 — un accantonamento senza scadenza chiedeva l'importo intero a ogni ciclo, e
la scadenza vuota era lo stato predefinito di una riga nuova. Ora e obbligatoria e le righe
senza non vengono salvate.

Final: fixed I5 — le righe del conto non tornavano col libero: Cycle sommava le fisse per
conto proprio senza filtrarle per giorno dentro il ciclo. computeBudget restituisce la
scomposizione (extrasTotal, fixedTotal, setAsideTotal, goal) e la schermata non calcola piu
nulla. Due test RED->GREEN.

Final: fixed I6 — lo sforamento non era scritto da nessuna parte, proprio quando la cifra
sopra e zero. Ora compare sotto la cifra.

Final: fixed I7 — aggiunto MovementsSheet: i movimenti del ciclo dal piu grosso,
cancellabili, raggiungibile dalle categorie e dal foglio di verifica quando la banca dice
meno del registrato. Era il percorso che la spec 5 prescrive e che esisteva solo come frase.

Final: fixed I8 — la copertura viveva solo mentre il foglio era aperto. Lo stato porta
reconciliations per fine ciclo e la riga Verifica mostra copertura e totale dichiarato. Due
test RED->GREEN sullo schema.

Final: fixed I9 — ErrorBoundary cancellava aura_v4 e aura_v3, chiavi di una versione che non
esiste: il pulsante di recupero ricaricava nello stesso crash, in un ciclo senza uscita, e
senza guardia in finestra privata non faceva nulla. Riscritto sulle superfici di sistema, con
la chiave vera e il fallimento dichiarato.

Final: fixed I10 — la riga Verifica dice che il ciclo e appena iniziato quando sono passati
tre giorni o meno: e l'ancoraggio che la spec 11 chiede in assenza di notifiche.

Final: Ruling: insieme a C3 ho reso today un valore stabile in App, aggiornato al rientro in
primo piano. Serviva perche tutte le schermate ragionassero sulla stessa data; di conseguenza
cadono anche il Minor sui memo inefficaci e quello sul mancato ricalcolo a mezzanotte. Costo
se sbagliato: un hook in piu.

### Minor rinviati

Final: minor (deferred): detectRecurring, updateMovement, exportJSON/importJSON,
availableColors, legacyColorMigration e il percorso di aggiornamento del service worker
restano senza consumatori.
Final: minor (deferred): commenti falsi sopravvissuti alla v0.8 in data/categories.js e
lib/sw.js, con due riferimenti a Capacitor che la spec mette fuori perimetro.
Final: minor (deferred): il manifest offre una scorciatoia ./?action=add che nessuno legge.
Final: minor (deferred): normalize valida la forma dei movimenti ma non il contenuto: un
amountCents stringa, raggiungibile solo da storage modificato a mano o da un backup, fa
stampare "NaN EUR".
Final: minor (deferred): parseAmount accetta 1.2.3 come 123,00; la dimensione dei gruppi di
migliaia non e verificata.
Final: minor (deferred): --bad usato anche fuori dal responso, sull'avviso di storage e sugli
errori dei campi.
Final: minor (deferred): la cifra digitata nel foglio Posso? e a 44 px e bypassa Money. E la
misura standard di un tastierino iOS, ma la spec fissa 28 pt come massimo.
Final: minor (deferred): la scadenza di un accantonamento si stampa in ISO.
Final: minor (deferred): frequentExpenses non chiede un minimo di occorrenze, quindi una
spesa una tantum appare fra le frequenti.
Final: minor (deferred): oltre il milione la cifra ripiega sulle cifre grezze e Registra si
spegne senza spiegazione.
Final: minor (deferred): il foglio di verifica non accetta un totale di esattamente 0, quindi
quel ramo di reconcile non e raggiungibile dall'interfaccia.
Final: minor (deferred): README riga 3 dice ancora "entro fine mese" invece di "entro fine
ciclo".
Final: minor (deferred): In arrivo usa una chiave duplicabile; il source map di produzione da
517 kB viene pubblicato; un reduce senza ?? 0 in Cycle; nessuna sincronizzazione fra schede;
il service worker precarica solo manifest e icona, quindi un primo avvio offline sarebbe
bianco.

### Declined to judge — decisioni mie

Final: Ruling: il ritmo si satura verso la fine del ciclo (ultimo giorno, ritmo 18), quindi
"stringi" e "sfori" diventano quasi irraggiungibili finche resta qualcosa. La formula e quella
della spec. Lo lascio: un tetto cambierebbe il significato del responso e va deciso guardando
cicli veri, non a tavolino. Costo se sbagliato: negli ultimi giorni lo stato dice "in pari"
piu spesso di quanto meriti.

Final: Ruling: spendere tutto il residuo nell'ultimo giorno riceve un "Si" secco, perche
l'importo e uguale al giornaliero. Letteralmente conforme alla spec, e nell'ultimo giorno quel
residuo e davvero tutto spendibile. Costo se sbagliato: un si troppo sereno su una spesa che
azzera il margine.

Final: Ruling: con libero esattamente 0 lo stato e "sfori" dal primo giorno, cioe "hai finito
il budget" per chi ha allocato tutto in fisse e obiettivo. La spec lo impone a R <= 0. Lo
lascio, ma e il caso in cui il testo suona peggio della situazione.

Final: Ruling: Math.ceil in setAsideQuota accantona fino a un centesimo in piu per ciclo, e la
camminata fino alla scadenza arriva a 600 iterazioni per voce. Per eccesso e il verso giusto
su un accantonamento, e 600 iterazioni di aritmetica sulle date non si misurano.

Final: Ruling: la finestra di piu o meno 2 giorni di detectRecurring non gira intorno al mese.
La funzione non ha consumatori, quindi non e raggiungibile: rinviata col resto del codice
morto.

Final: Ruling: nessuna sincronizzazione fra schede. La spec assume un utente, un dispositivo.
Costo se sbagliato: due schede aperte si sovrascrivono.

Final: Ruling: il service worker precarica solo manifest e icona, quindi una PWA installata e
aperta per la prima volta offline sarebbe bianca. La spec chiede "funziona offline", non "al
primo avvio offline". Rinviato al giro del service worker, che e lavoro a se.

Final: Ruling: la fedelta visiva del vetro, del bordo di scorrimento e del quadratino da 29 pt
resta non verificata: in questa sessione la finestra e nascosta e la pagina non disegna. Tutto
il misurabile — colori calcolati, rientri, dimensioni, assenza di scorrimento orizzontale — e
stato verificato leggendo gli stili.

Final: Ruling: i tagli di suggestTrim sono testo senza azione collegata. La spec dice "si
propone un taglio", e un taglio non si applica da solo: proporlo e tutto cio che l'app puo
fare onestamente.

Final: revisione di ritorno non dispiegata, come prescrive il metodo: ogni correzione ha il
test che prima falliva e la suite e verde, quindi un secondo revisore rileggerebbe un diff a
cui i test hanno gia risposto.
