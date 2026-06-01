/**
 * Changelog di AURA — usato dall'UpdateModal per mostrare cosa è cambiato.
 *
 * La prima voce dell'array è la versione corrente. Quando una nuova versione
 * viene installata via service worker, il popup mostra le voci dell'ultimo
 * release rispetto a quanto l'utente ha già visto.
 *
 * `seenKey` in localStorage tiene traccia dell'ultima versione di cui
 * l'utente ha cliccato "OK", così non mostriamo lo stesso popup due volte.
 *
 * Versionamento: AURA è in beta. Numerazione 0.x finché non ha raggiunto
 * la stabilità sufficiente per uscire ufficialmente come 1.0.
 */
export const CURRENT_VERSION = '0.10.1';
export const IS_BETA = true;

export const CHANGELOG = [
  {
    version: '0.10.1',
    date: '2026-06-10',
    title: 'Copilot con le mani + Piano che guarda avanti',
    items: [
      'Il Copilot ora agisce: dopo "posso permettermi 120€?" un tap su "Aggiungila come spesa" apre l\'Aggiungi con l\'importo già pronto',
      'Suggerimenti contestuali: dopo una risposta su rate o previsioni le chip diventano "E in 3 anni?", "E con anticipo 5000?"…',
      'Chiedi al Copilot "come sto messo?" e ti risponde col semaforo, spiegato',
      'Nel Piano: la linea del saldo lungo il ciclo — "se continui così: ≈€X alla vigilia della paga"',
      'Nella home vedi a che punto del ciclo sei: "Giorno X di Y" con la barra di avanzamento',
      'Telefono nuovo o reinstallo? Ora puoi ripristinare il backup direttamente dal primo avvio',
      'Sistemato: "quando arriva la paga?" rispondeva con la previsione invece che con la data',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-06-10',
    title: 'AURA 2.0',
    items: [
      'Home "Oggi" rifatta: una sola cifra — quanto puoi spendere ancora oggi — col semaforo Sereno / Attento / Rosso, sempre spiegato',
      'Massimo 3 consigli al giorno: pochi e rilevanti',
      '"Gestione" diventa "Piano": in alto la timeline del ciclo (oggi → paga) coi movimenti come punti — tocca per i dettagli',
      'Quando aggiungi una spesa vedi subito "budget di oggi dopo": se sfori, te lo dice senza drammi (domani si ribilancia)',
      'Primo avvio nuovo: 3 passi invece di 8 (saldo → paga → soldi da proteggere). Fissi e abbonamenti li rilevo da solo',
      'Icona nuova: scintilla blu su ardesia con la stellina smeralda del "sereno"',
    ],
  },
  {
    version: '0.9.25',
    date: '2026-06-10',
    title: 'Rework: conti più onesti, app più capace',
    items: [
      'L\'app ora dice "fino alla paga" dove prima diceva "a fine mese" — i conti già contavano fino allo stipendio, ora anche le parole',
      'Previsioni più solide: una spesa eccezionale non gonfia più la media; le ricorrenti segnate "pagate" non vengono contate due volte',
      'Categoria automatica: scrivi "Esselunga", "Netflix" o "benzina" e la categoria si sceglie da sola — e impara dalle tue abitudini',
      'Stipendio settimanale, ogni 2 o ogni 4 settimane: ora puoi impostarlo (con la data dell\'ultima paga), e tutte le previsioni lo seguono',
      '"Salta questo mese" su fissi e abbonamenti: lo togli dal conteggio senza cancellarlo (es. palestra sospesa)',
      'Controllo saldo: ogni 2+ settimane ti propongo di confrontare il saldo con la banca e riallinearlo con un tap',
    ],
  },
  {
    version: '0.9.24',
    date: '2026-06-09',
    title: 'Spese del giorno: scroll sistemato',
    items: [
      'Quando apri le spese di un giorno con tante voci ora scorri fino in fondo (scroll affidabile anche su iPhone)',
    ],
  },
  {
    version: '0.9.23',
    date: '2026-06-09',
    title: 'Conti coerenti + nuova icona',
    items: [
      'Calcoli rifatti e coerenti tra Assistente e Gestione: lo "spendibile" toglie ovunque cuscinetto e i soldi che metti da parte (es. €300)',
      'Via i numeri gonfiati a fine mese: niente più stime di spesa ballerine, ora "al giorno × giorni" torna con i liberi',
      'Icona nuova: la scintilla dell\'Assistente, in app e sulla home del telefono',
      'Copilot con memoria: dopo una domanda puoi dire "e in 3 anni?", "e con anticipo 5000?", "e tra 2 anni?"',
      'Avviso "stima provvisoria" quando ho ancora pochi dati di spesa per le previsioni',
    ],
  },
  {
    version: '0.9.22',
    date: '2026-06-08',
    title: 'Fine mese onesto + fix',
    items: [
      '"A fine mese" rifatto: ora mostra quanto ti resta DI SPENDIBILE prima della prossima paga — niente più cifre gonfiate dallo stipendio che deve ancora arrivare',
      'Dal fine mese sono esclusi cuscinetto, salvadanaio e i soldi che decidi di accantonare (es. €300): vedi solo ciò che è davvero libero',
      'Il Copilot usa lo stesso numero: "posso permettermelo?", "arrivo a fine mese?" e gli scenari sono ora coerenti',
      'Le spese del giorno ora scorrono: le vedi tutte anche quando sono tante',
      'Icona nuova e professionale (grafico in crescita), in app e sulla home',
    ],
  },
  {
    version: '0.9.21',
    date: '2026-06-08',
    title: 'Nuovo look + Copilot che ragiona',
    items: [
      'Nuova identità: ardesia + blu reale (più pulita e professionale), icona inclusa',
      'Copilot molto più sveglio: capisce le spese a rate con anticipo e tasso ("25 mila in 5 anni al 6%" → rata, interessi, sostenibilità)',
      'Previsioni a lungo termine: "quanto avrò tra un anno?" — stima il conto mese per mese',
      'Tempi-obiettivo: "tra quanto raggiungo 5000?" e "quanto devo mettere via al mese per X?"',
      'Tutto sempre 100% sul telefono, conti esatti: nessun dato esce mai da qui',
    ],
  },
  {
    version: '0.9.20',
    date: '2026-06-06',
    title: 'Petrolio più profondo',
    items: [
      'Tema più scuro e curato: fondo nero-petrolio coeso, gradiente più profondo e "gioiello", alone teal soffuso',
      'Tolto un caso in cui il feed mostrava percentuali assurde ("+1100%") quando il periodo di confronto aveva pochissime spese',
    ],
  },
  {
    version: '0.9.19',
    date: '2026-06-06',
    title: 'Si accorge delle cose da sola',
    items: [
      'Rileva da sola le spese che paghi sempre uguali (palestra, abbonamenti…) e te le propone con un tap, in home',
      'La home ti dice di più: avviso se il saldo scende sotto il cuscinetto, quando arriva la paga, quando un obiettivo è quasi fatto e quando stai conservando bene',
      'Primo avvio rifatto: alla fine ti propone quanto mettere da parte ogni mese (€300 di default)',
    ],
  },
  {
    version: '0.9.18',
    date: '2026-06-06',
    title: 'Copilot più sveglio',
    items: [
      'Ora puoi chiedergli quanto hai speso (oggi, questa settimana, questo mese) e anche per singola categoria: "quanto ho speso in cibo?"',
      'Sa dirti quando arriva la prossima paga e cosa paghi a breve: "cosa pago questa settimana?"',
      'Risponde agli scenari "e se…": "e se taglio 5€ al giorno?" ti stima come cambia il fine mese',
      'Sempre 100% sul telefono: nessun dato esce mai da qui',
    ],
  },
  {
    version: '0.9.17',
    date: '2026-06-06',
    title: 'Petrolio più profondo',
    items: [
      'Gradiente più scuro e profondo (petrolio → teal), niente più menta accesa',
      'Icone e barra in basso ricalibrate per restare ben leggibili sul tono più scuro',
    ],
  },
  {
    version: '0.9.16',
    date: '2026-06-05',
    title: 'Torna il petrolio',
    items: [
      'Via il viola: l\'app torna alla sua identità petrolio/teal, con una sfumatura verso la menta',
      'Corretto l\'alone dell\'hero che "usciva" dai bordi arrotondati',
    ],
  },
  {
    version: '0.9.15',
    date: '2026-06-05',
    title: 'Hero più chiaro',
    items: [
      'L\'hero ora dice due cose nette: quanto puoi spendere OGGI e quanti soldi avrai sul conto a fine mese (risparmi inclusi)',
      'Via "Disponibile oggi", che era ambiguo',
      'Tocca "Speso oggi" per vedere le spese della giornata',
    ],
  },
  {
    version: '0.9.14',
    date: '2026-06-04',
    title: 'Coerenza in tutta l\'app',
    items: [
      'Storia, Obiettivi e Impostazioni ora hanno lo stesso stile di Gestione e Assistente: card con ombre morbide, niente più zone piatte o monocrome',
      'Icone unificate: anche Impostazioni e Storia usano lo stesso set duotone (basta icone outline diverse tra loro)',
      'Tolto il simbolo ≈ accanto a "Al giorno" e "Fine mese"',
    ],
  },
  {
    version: '0.9.13',
    date: '2026-06-04',
    title: 'Icone premium (duotone)',
    items: [
      'Icone nuove in stile duotone, più curate e moderne in tutta l\'app',
      'La barra "Assistente" ha un\'icona a scintilla (non più la casa, che non c\'entrava)',
      'Tolte le iconcine inutili accanto a "Al giorno" e "Fine mese" nell\'hero',
    ],
  },
  {
    version: '0.9.12',
    date: '2026-06-04',
    title: 'Icone premium',
    items: [
      'Nuovo set di icone più curato e coerente in tutta l\'app: categorie, barra di navigazione e assistente',
      'Le categorie personalizzate ricevono un\'icona sensata in automatico dal nome (es. "Palestra", "Viaggi")',
    ],
  },
  {
    version: '0.9.11',
    date: '2026-06-04',
    title: 'Look unificato + icona',
    items: [
      'Tutte le schermate ora seguono lo stesso stile dell\'Assistente: card chiare con ombre morbide, niente più blocchi a colore pieno',
      'Copilot: capisce gli importi a parole ("25 mila") e le spese a rate ("spalmata su 5 anni")',
      'Nuova icona dell\'app (marchio neurale) anche come PNG per la home di iOS',
    ],
  },
  {
    version: '0.9.10',
    date: '2026-06-04',
    title: 'Arriva il Copilot',
    items: [
      'Tocca "Chiedimi qualcosa" e fammi domande sul budget: "Posso permettermi 400€?", "Quanto posso spendere oggi?", "Arrivo a fine mese?"',
      'Rispondo con i tuoi numeri reali — tutto sul telefono, nessun cloud',
      'Capisco se una spesa intacca il cuscinetto o i risparmi che vuoi conservare',
    ],
  },
  {
    version: '0.9.9',
    date: '2026-06-04',
    title: 'La home diventa Assistente',
    items: [
      'Nuova home "Assistente": ti dice quanto puoi spendere oggi, quanto al giorno e con quanto chiudi il mese',
      'Imposta quanto vuoi conservare ogni mese: l\'assistente ti avvisa se rischi di intaccarlo',
      'Feed "Per te oggi": anomalie, prossime uscite, trend e obiettivi in ordine di importanza',
      'Nuova identità a gradiente (blu → viola → rosa) e marchio neurale',
      'Tema chiaro più coeso: niente più tessere "staccate"',
    ],
  },
  {
    version: '0.9.8',
    date: '2026-06-02',
    title: 'Home più viva',
    items: [
      'Saluto personale e pillola di stato (in linea / sopra) sull\'hero',
      'Riga "a colpo d\'occhio": prossima scadenza, top obiettivo, avanzo previsto',
      'Striscia "giorni di fila nel budget" con traguardi, quando sei in regola',
      'Sul grafico settimanale ora c\'è la linea del budget: i giorni sopra sono in ambra',
      'Piccola onda decorativa in fondo all\'hero',
    ],
  },
  {
    version: '0.9.7',
    date: '2026-06-01',
    title: 'Home compatta e correzioni',
    items: [
      'Home tutta in una schermata: hero più compatto, via l\'anello',
      'Risolto: gli obiettivi eliminati ora restano eliminati (non ricompaiono al riavvio)',
      'Storia: rimossa la griglia "Ultimo anno" — resta il nastro dei 12 mesi',
      'Barra di navigazione più bassa, con icone nuove',
    ],
  },
  {
    version: '0.9.6',
    date: '2026-06-01',
    title: 'Ritocco estetico',
    items: [
      'Le barre di "Dove vanno i soldi" ora hanno il colore della loro categoria',
      'Il budget di oggi è dentro un anello che si riempie man mano che spendi',
      'Più profondità: un alone soffuso dietro le card principali',
      'Più respiro tra i blocchi nella schermata Soldi',
    ],
  },
  {
    version: '0.9.5',
    date: '2026-05-28',
    title: 'Barra di navigazione nuova',
    items: [
      'La barra in basso ora è un\'isola flottante arrotondata, più bella ed elegante',
      'Il tasto + risalta come pulsante centrale che "galleggia" sopra la barra',
      'La voce attiva ha un indicatore morbido e l\'icona fa un piccolo balzo',
    ],
  },
  {
    version: '0.9.4',
    date: '2026-05-28',
    title: 'Correzioni',
    items: [
      'Abbonamenti annuali/semestrali: ora scegli anche il mese di rinnovo',
      'Risolto: il pulsante "Aggiungi" non si leggeva più nel tema scuro',
      'La versione mostrata in Impostazioni si aggiorna da sola',
    ],
  },
  {
    version: '0.9.3',
    date: '2026-05-28',
    title: 'Rifiniture e sicurezza',
    items: [
      'Puoi modificare un obiettivo già creato (nome, importo, scadenza)',
      'Promemoria backup: se non salvi i dati da un po\', AURA te lo ricorda (non c\'è il cloud, è importante)',
      'Conti & tasche: ora onesti — il Principale segue il saldo dell\'app, gli altri sono tasche tue. Il totale è il patrimonio',
      'In modalità privacy anche le barre delle categorie sono nascoste',
      'Pulizia interna: rimossi vecchi dati inutilizzati, backup più leggeri',
    ],
  },
  {
    version: '0.9.2',
    date: '2026-05-28',
    title: 'Correzioni',
    items: [
      'Risolto: la tastiera non copre più il campo importo quando registri una spesa',
      'Obiettivi: puoi scegliere una data precisa di scadenza (non solo i preset)',
      'Obiettivi: i consigli ora hanno senso anche per traguardi piccoli',
      'I messaggi di conferma in fondo non vengono più tagliati',
    ],
  },
  {
    version: '0.9.1',
    date: '2026-05-28',
    title: 'Obiettivi, ora intelligenti',
    items: [
      'Desideri e Salvadanaio uniti in un solo posto: "I tuoi obiettivi"',
      'Imposti il traguardo e l\'app ti dice subito se è fattibile e come impostarlo',
      'Con una scadenza: verdetto (sostenibile/teso) + quanto mettere via al mese',
      'Senza scadenza: ti dice in quanto tempo lo raggiungi al tuo ritmo',
      'Se è troppo tirato, ti suggerisce dove tagliare',
      'I desideri esistenti diventano obiettivi automaticamente',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-05-28',
    title: 'Quattro novità grosse',
    items: [
      'Dove vanno i soldi: in Soldi vedi la spesa per categoria col confronto sulla tua media storica',
      'Salvadanaio: metti via soldi davvero verso un obiettivo e guarda crescere la barra di progresso',
      'Segna come pagato: un tap su un fisso/abbonamento in scadenza lo registra come spesa (niente doppio conteggio)',
      'Filtri in Storia: filtra per categoria e per importo, non solo per testo',
      'Tap su una categoria in "dove vanno i soldi" apre la Storia già filtrata',
    ],
  },
  {
    version: '0.8.4',
    date: '2026-05-28',
    title: 'App più snella',
    items: [
      'Setup iniziale: niente più voci a €0 o importi non validi per sbaglio',
      'Rimosso codice e stili inutilizzati: app più leggera da scaricare e più veloce',
      'Transizioni dell\'onboarding più fluide',
    ],
  },
  {
    version: '0.8.3',
    date: '2026-05-28',
    title: 'Numeri coerenti ovunque',
    items: [
      '"Al giorno" mostra lo stesso identico budget su Oggi e su Soldi (prima differivano)',
      'Conti separati possono andare in rosso (es. carta di credito) e si vedono in rosso',
      'Abbonamenti non mensili (annuali, trimestrali…) ora pesano correttamente sul "libero fino alla paga"',
      'Il budget del giorno resta giusto anche se tieni l\'app aperta dopo mezzanotte',
      'Tutti gli arrotondamenti dei calcoli rifiniti al centesimo',
    ],
  },
  {
    version: '0.8.2',
    date: '2026-05-28',
    title: 'Saldo onesto e promemoria paga',
    items: [
      'Promemoria intelligente: quando arriva lo stipendio, AURA ti ricorda di aggiornare il saldo (così i conti restano precisi)',
      'Aggiornamento saldo in due tap dalla home o dalla schermata Soldi',
      'Saldo in rosso: se vai in overdraft ora lo vedi davvero (−€X) invece di fermarsi a zero',
      'I conti si conservano sempre: quando rientri o entra denaro, il rosso viene assorbito correttamente',
    ],
  },
  {
    version: '0.8.1',
    date: '2026-05-28',
    title: 'Conti più precisi, abbonamenti più facili',
    items: [
      'Numeri esatti al centesimo: niente più drift di 0,01€ accumulato nei mesi',
      'Spese fatte a mezzanotte non finiscono più nel giorno sbagliato (heatmap, streak)',
      'Abbonamenti: cadenza settimanale, mensile, trimestrale, semestrale, annuale',
      'Preset rapidi: Netflix · Spotify · Prime · Apple One · iCloud+ · Assicurazione · Bollo · IMU',
      'Giorno addebito con griglia 1-28 al tap (niente più tastierino numerico)',
      'Mese di scadenza con griglia a 12 chip per le spese annuali',
      'Preview impatto live: vedi quanto ti pesa un abbonamento mentre lo aggiungi',
      'Rimborsi/crediti: il calcolo del saldo ora tiene conto se l\'hai già ricevuto',
      'Splice entrate: rate future davvero accreditate al saldo quando arrivano',
      'Categoria "Altro": ora visibile quando la selezioni',
      'Input importo/descrizione: non zoomano più al focus su iPhone',
      'Setup: scroll fluido sulle schermate lunghe',
      'App più leggera: rimosse animazioni pesanti, tutto scorre meglio',
      'Sicurezza: protezioni più robuste su backup, import CSV, dati multi-tab',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-05-20',
    title: 'Nuova AURA',
    items: [
      'Rebrand visivo: palette petrolio unica, due modalità (scuro e chiaro)',
      'Tab bar con 5 voci e tasto + centrale per registrare velocemente',
      'Onboarding "parti quando vuoi": chiede il saldo reale, non il giorno paga',
      'Nuove schermate: hero card grande, pulse settimanale Lun→Dom, daily insight',
      'Modifica e cancella una spesa già registrata · registra spese di giorni passati',
      'Notifiche opzionali per fissi e abbonamenti in scadenza',
      'Bundle più leggero: rimossi recharts, lucide-react e altre dipendenze morte',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-04-12',
    title: 'Tre schermate, modello descrittivo',
    items: [
      '3 schermate: Oggi, Soldi, Storia',
      'Smart-cat impara da te le categorie',
      'Sezione Desideri per valutare obiettivi (auto, casa, viaggio)',
      'Forecast fine mese + anomalie inline',
    ],
  },
];
