# AURA

Un'app per sapere **quanto puoi spendere oggi**, e se puoi permetterti quella cosa senza sforare entro fine mese.

L'idea è che le due domande sono la stessa. Tutte le app che avevo provato chiedevano troppo — registrazione, sincronizzazione su 14 dispositivi, accesso alla banca, notifiche motivazionali, abbonamento "Pro" — e in cambio dicevano quanto avevi speso, cosa che sapevo già. Qui davanti c'è un numero, e accanto una risposta: *sì*, *sì ma stringi*, *no*.

I dati stanno nel browser di chi la usa (`localStorage`), niente backend, niente account, niente analytics. Si installa come app sul telefono (è una PWA), funziona offline, e quando vuoi esporti un backup `.json` e ti porti via tutto.

> **Stato: 2.0 alpha, in ricostruzione.** La v0.8 è stata buttata via e rifatta da zero.
> Il progetto è descritto in [`docs/superpowers/specs/`](docs/superpowers/specs/) e il lavoro
> procede secondo il piano in [`docs/superpowers/plans/`](docs/superpowers/plans/).

---

## Cosa fa

- **Quanto posso spendere oggi** — una cifra, sul ciclo che parte dal giorno dello stipendio, non dal primo del mese
- **Posso permettermelo?** — digiti un importo e sai *prima* di spendere se sfori, e di quanto. Se poi spendi, la stessa schermata registra
- **Il ciclo** — dal 16 al 15: stipendio, spese fisse, accantonamenti per le annuali, obiettivo di risparmio, e dove stanno andando i soldi per categoria
- **Riconciliazione** — a fine ciclo digiti il totale uscite della banca e sai quanto della tua mappa è vera: *"hai registrato l'87% di quello che è uscito"*
- **Backup completo** in JSON

## Cosa **non** fa

- Non si collega alla tua banca
- Non ha account, login, sincronizzazione cloud
- Non manda notifiche, non ti motiva, non ti consiglia di "investire il 20%"
- Non condivide niente con nessuno: il backend non esiste

## Stack

React 18 + Vite, Tailwind, icone [Phosphor](https://phosphoricons.com/). Nessuna libreria di animazione, nessuna libreria di componenti: le primitive replicano le superfici di sistema iOS, e i tipi sono quelli del sistema (`-apple-system`), quindi su iPhone è SF Pro senza scaricare un font.

Il motore è un insieme di funzioni pure in `src/cycle/`, coperte da `node:test`. Lo stato è un hook unico su `localStorage`.

## Far girare

```bash
npm install
npm run dev          # dev server con HMR su :5173
npm test             # node --test sul motore
npm run build        # build di produzione in dist/
npm run preview      # serve la build su :4173
```

## Pubblicarla online

Il workflow `.github/workflows/deploy.yml` deploya su GitHub Pages a ogni push su `main`. URL finale: `https://<tuo-username>.github.io/aura/`.

Da Settings del repo → Pages → Source = **GitHub Actions**.

## Privacy

Tutto sta nel `localStorage` del browser. Nessuna richiesta di rete viene fatta a un server di AURA, perché un server di AURA non esiste. Svuotare i dati del sito cancella tutto: il backup JSON è l'unica difesa.

## Licenza

MIT — vedi [`LICENSE`](LICENSE).
