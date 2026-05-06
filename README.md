# AURA

Una piccola app per tenere traccia delle spese personali. Apri la pagina, vedi quanto puoi spendere oggi, registri una spesa, hai finito.

Ho fatto AURA perché tutte le app che avevo provato finivano per chiedere troppo: registrazione, sincronizzazione su 14 dispositivi, accesso alla banca, notifiche motivazionali, abbonamento "Pro". Volevo solo un numero davanti: *oggi questo*. Il resto può aspettare.

I dati stanno nel browser di chi la usa — `localStorage`, niente backend, niente account, niente analytics. Si installa come app sul telefono (è una PWA), funziona offline, e quando vuoi puoi esportare un backup `.json` e portarti via tutto.

---

## Cosa fa

- **Budget giornaliero** che si ricalcola da solo dopo ogni spesa, con barra di consumo del mese e tre stati (in rotta / sopra il ritmo / superato).
- **Smart category**: dopo qualche spesa registrata, mentre digiti la descrizione AURA prova a indovinare la categoria in base ai tuoi pattern. Si vede col badge `✦ AUTO`.
- **Pianifica**: stipendio, spese fisse mensili e annuali, abbonamenti che puoi sospendere/riattivare, obiettivi di risparmio con quote mensili e ETA, buffer di sicurezza.
- **Storico** con ricerca testuale, filtri per categoria, raggruppamento per giorno (Oggi/Ieri/data), confronto mese-su-mese.
- **Sei temi**: Aurora (default), Acid Lime, Prism, Sunset, Ocean, Mono. Ognuno con la sua palette dark e light.
- **Backup** completo in JSON o solo transazioni in CSV. Ripristino con anteprima dei dati prima di sovrascrivere.
- **Tutorial** a 7 step la prima volta, riapribile dalle impostazioni.

## Cosa **non** fa

- Non si collega alla tua banca.
- Non ha account, login, sincronizzazione cloud.
- Non manda notifiche, non ti motiva, non ti consiglia di "investire il 20%".
- Non condivide niente con nessuno. Letteralmente: il backend non esiste.

## Stack

React 18 + Vite, Tailwind, Framer Motion, Radix per i dialog, Recharts per i grafici, Lucide per le icone. La logica di stato è un singolo hook `useStore` con `useState` + `localStorage` (debounced). Il service worker è custom, due file in tutto. Niente Redux, niente RxJS, niente database client-side fancy. Volutamente piccolo.

## Far girare

```bash
npm install
npm run dev          # dev server con HMR su :5173
npm run build        # build di produzione in dist/
npm run preview      # serve la build su :4173
```

Tested su Node 20.

## Pubblicarla online

`.github/workflows/deploy.yml` deploya automaticamente su GitHub Pages a ogni push su `main`. Guida passo-passo in [`DEPLOY.md`](DEPLOY.md). Un cheat-sheet ancora più rapido (i 5 comandi che usi davvero) in [`PUSH.md`](PUSH.md).

## Privacy

Tutto sta nel `localStorage` del browser di chi apre l'app. Nessuna richiesta di rete viene fatta a un server di AURA, perché un server di AURA non esiste. Le uniche fetch all'avvio sono i font Geist da Google Fonts (volendo si possono ospitare in self-hosting, ma per ora ho preferito lasciare CDN).

Se sviluppi una variante e vuoi togliere anche quello, basta importare i font come asset e cambiare due righe in `index.html`.

## Crediti

Disegnata e scritta principalmente in pause caffè. Font [Geist](https://vercel.com/font) di Vercel. Grafici con [Recharts](https://recharts.org/). Component primitives con [Radix UI](https://www.radix-ui.com/).

## Licenza

MIT — vedi [`LICENSE`](LICENSE) se ce l'hai aggiunto, altrimenti considera il codice libero di essere copiato, biforcato, smontato e rimesso insieme.
