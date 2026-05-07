# AURA

Una piccola app per tenere traccia delle spese personali. Apri la pagina, vedi quanto puoi spendere oggi, registri una spesa, hai finito.

L'idea è semplice: tutte le app che avevo provato finivano per chiedere troppo — registrazione, sincronizzazione su 14 dispositivi, accesso alla banca, notifiche motivazionali, abbonamento "Pro". Volevo solo un numero davanti: *oggi questo*. Il resto può aspettare.

I dati stanno nel browser di chi la usa (`localStorage`), niente backend, niente account, niente analytics. Si installa come app sul telefono (è una PWA), funziona offline, e quando vuoi puoi esportare un backup `.json` e portarti via tutto.

---

## Cosa fa

- **Budget giornaliero** che si ricalcola da solo dopo ogni spesa
- **Smart category**: dopo qualche spesa AURA prova a indovinare la categoria mentre digiti
- **Pianifica**: stipendio, spese fisse mensili e annuali (con accantonamento automatico), abbonamenti, obiettivi di risparmio, buffer per imprevisti
- **Storico** con ricerca, filtri categoria, raggruppamento per giorno, confronto mese su mese
- **Sei temi** (Aurora di default), light e dark mode
- **Backup completo** in JSON o solo transazioni in CSV
- **Tutorial** integrato che spiega ogni schermata alla prima visita

## Cosa **non** fa

- Non si collega alla tua banca
- Non ha account, login, sincronizzazione cloud
- Non manda notifiche, non ti motiva, non ti consiglia di "investire il 20%"
- Non condivide niente con nessuno: il backend non esiste

## Stack

React 18 + Vite, Tailwind, Framer Motion, Radix UI, Recharts, Lucide. La logica di stato è un singolo hook con `useState` + `localStorage` (debounced). Service worker custom, due file in tutto. Niente Redux, niente RxJS, niente database client-side fancy.

## Far girare

```bash
npm install
npm run dev          # dev server con HMR su :5173
npm run build        # build di produzione in dist/
npm run preview      # serve la build su :4173
```

Tested su Node 20.

## Pubblicarla online

Il workflow `.github/workflows/deploy.yml` deploya automaticamente su GitHub Pages a ogni push su `main`. URL finale: `https://<tuo-username>.github.io/aura/`.

Da Settings del repo → Pages → Source = **GitHub Actions**.

## Privacy

Tutto sta nel `localStorage` del browser. Le uniche fetch all'avvio sono i font Geist da Google Fonts (volendo si possono ospitare in self-hosting). Nessuna richiesta di rete viene fatta a un server di AURA, perché un server di AURA non esiste.

## Crediti

Font [Geist](https://vercel.com/font) di Vercel. Grafici con [Recharts](https://recharts.org/). Component primitives con [Radix UI](https://www.radix-ui.com/). Icone [Lucide](https://lucide.dev/).

## Licenza

MIT — vedi [`LICENSE`](LICENSE).
