# Pubblicare AURA su GitHub Pages

Guida passo-passo per caricare AURA su GitHub e renderla raggiungibile via web.
Il workflow `.github/workflows/deploy.yml` è già configurato: ti basta fare il push su `main` e il sito viene buildato e deployato in automatico.

URL finale: `https://<tuo-username>.github.io/aura/`

---

## 1. Cosa serve

- Un account [GitHub](https://github.com) (gratis).
- [Git per Windows](https://git-scm.com/download/win) installato. Verifica con:
  ```bash
  git --version
  ```
- Questa cartella `aura-main` sul tuo disco (ce l'hai).

---

## 2. Creare il repository su GitHub

1. Vai su [github.com/new](https://github.com/new).
2. **Repository name**: scrivi esattamente `aura` (minuscolo). Questo nome deve combaciare col `BASE_PATH` configurato nel workflow.
3. **Public** (necessario per GitHub Pages gratis sui piani free).
4. **NON** spuntare "Add a README", "Add .gitignore", "Choose a license" — il repo deve partire vuoto.
5. Click **Create repository**.

GitHub ti mostrerà istruzioni: ignora le sezioni "create a new repository" e segui solo la sezione "...or push an existing repository from the command line", che adattiamo qui sotto.

---

## 3. Push del codice locale

Apri Git Bash (o PowerShell) **dentro la cartella `aura-main`** e copia/incolla questi comandi uno alla volta. Sostituisci `TUO-USERNAME` col tuo username GitHub.

```bash
cd "C:/Users/smeri/Desktop/aura-main"

# Init repo locale
git init
git branch -M main

# Configura identità (solo la prima volta su questa macchina)
git config user.name "Il Tuo Nome"
git config user.email "tuamail@example.com"

# Primo commit
git add .
git commit -m "Initial commit"

# Collega a GitHub e pusha
git remote add origin https://github.com/TUO-USERNAME/aura.git
git push -u origin main
```

Se è la prima volta che ti autentichi, GitHub apre una finestra del browser per il login. Accetta. Il push deve completare con un messaggio tipo `* [new branch]      main -> main`.

---

## 4. Attivare GitHub Pages

1. Vai sul repo: `https://github.com/TUO-USERNAME/aura`.
2. Tab **Settings** (in alto a destra).
3. Menu laterale sinistro: **Pages**.
4. Sezione **Build and deployment** → **Source**: seleziona **GitHub Actions**.
5. Salva.

Non serve scegliere branch: il workflow gestisce tutto.

---

## 5. Verificare il deploy

1. Tab **Actions** del repo.
2. Vedi il run "Deploy AURA to GitHub Pages" partito automaticamente al push.
3. Aspetta 1-2 minuti (icona verde ✓).
4. Apri `https://TUO-USERNAME.github.io/aura/` — l'app è online.

Se il run è rosso ✗, clicca per vedere i log. Errori più comuni:
- **Permissions**: torna in Settings → Actions → General → "Workflow permissions" e seleziona **Read and write permissions**.
- **Pages source**: ricontrolla che sia su "GitHub Actions" e non su "Deploy from a branch".

---

## 6. Aggiornamenti successivi

Ogni volta che modifichi il codice e vuoi pubblicare:

```bash
git add .
git commit -m "Descrizione modifica"
git push
```

Il workflow ribuilda e ridepoloya da solo.

---

## 7. Personalizzazioni opzionali

### Cambiare il nome del repo (es. `mio-budget`)

Se non vuoi chiamare il repo `aura`, modifica anche il `BASE_PATH`:

1. In `.github/workflows/deploy.yml`, riga 36, cambia:
   ```yaml
   BASE_PATH: /mio-budget/
   ```
2. Commit e push.

L'URL diventerà `https://TUO-USERNAME.github.io/mio-budget/`.

### Dominio personalizzato

Se hai un dominio (es. `aura.miosito.it`):

1. Settings → Pages → **Custom domain**: inserisci il dominio.
2. Sul DNS del tuo provider, aggiungi un record `CNAME` che punta a `TUO-USERNAME.github.io`.
3. GitHub crea automaticamente un file `CNAME` nel repo.
4. Aspetta la propagazione DNS (qualche minuto fino a un'ora).

### Repo privato

GitHub Pages su repo privati richiede un piano **Pro** (a pagamento). Sui piani gratuiti il repo deve essere pubblico — ma l'app non contiene tuoi dati personali, sono tutti salvati nel browser di chi la usa, quindi non c'è rischio privacy.

---

## 8. Come funziona (in breve)

- L'app è una PWA statica (HTML + JS + CSS, niente backend).
- I dati di chi la usa stanno nel suo `localStorage`, mai sul tuo server.
- Il workflow `deploy.yml` su ogni push:
  1. installa le dipendenze (`npm ci`)
  2. fa la build (`npm run build` con `BASE_PATH=/aura/`)
  3. carica la cartella `dist/` su GitHub Pages
- Ogni utente che apre l'URL scarica i file statici e l'app funziona offline-first grazie al service worker (`public/sw.js`).

---

## 9. Risoluzione problemi

| Problema | Soluzione |
|---|---|
| `git push` chiede password e fallisce | Su GitHub: Settings → Developer settings → Personal access tokens → genera token "classic" con scope `repo`, usalo come password. Oppure installa [GitHub CLI](https://cli.github.com/) e fai `gh auth login`. |
| Pagina bianca dopo il deploy | Verifica che `BASE_PATH` nel workflow combaci col nome del repo (entrambi con slash iniziali e finali, es. `/aura/`). |
| 404 sui sotto-percorsi | Normale per le SPA su Pages. AURA non usa routing nelle URL, quindi non si verifica. |
| Service worker mostra contenuti vecchi | Hard refresh col tasto destro su "Ricarica" → "Svuota cache e ricarica". |

---

Pronto. Una volta fatto il primo deploy, i successivi sono `git push` e basta.
