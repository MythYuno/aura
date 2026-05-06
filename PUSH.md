# PUSH veloce

Cheat-sheet dei comandi per pubblicare le modifiche su GitHub. La guida completa con tutto il setup è in [`DEPLOY.md`](DEPLOY.md) — questa è la versione "ho fretta".

> Pre-requisito una tantum: aver già creato il repo `aura` su GitHub e aver fatto il **primo** push (vedi `DEPLOY.md` sezione 2-3).

---

## La prima volta su questo computer

Apri Git Bash dentro `aura-main`:

```bash
cd "C:/Users/smeri/Desktop/aura-main"

git init
git branch -M main
git config user.name  "Il Tuo Nome"
git config user.email "tuamail@example.com"
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TUO-USERNAME/aura.git
git push -u origin main
```

Poi su GitHub: Settings → Pages → Source = **GitHub Actions**. Aspetta 1-2 min e l'app è online su `https://TUO-USERNAME.github.io/aura/`.

---

## Ogni volta che modifichi qualcosa

```bash
git add .
git commit -m "Descrizione modifica"
git push
```

Tutto qua. Il workflow `deploy.yml` rifa la build e ridepoloya da solo. Aspetta 1-2 minuti e sei online con la nuova versione.

---

## Comandi utili sparsi

```bash
git status              # cosa è cambiato
git diff                # cosa esattamente è cambiato (riga per riga)
git log --oneline -10   # ultimi 10 commit
git pull                # tira giù modifiche fatte da altre macchine

# Annullare l'ultimo commit (ma tenere le modifiche locali)
git reset --soft HEAD~1

# Annullare modifiche locali a UN file (attenzione: irreversibile)
git checkout -- nomefile.js

# Vedere lo stato del deploy in tempo reale
# (richiede gh CLI: https://cli.github.com/)
gh run watch
```

---

## Se qualcosa va storto

| Problema | Cosa fare |
|---|---|
| `git push` chiede password e fallisce | Genera un Personal Access Token su GitHub (Settings → Developer settings → Tokens, scope `repo`) e usalo come password. Oppure installa `gh` e fai `gh auth login` una volta. |
| `! [rejected] non-fast-forward` | Qualcun altro (o tu da un'altra macchina) ha pushato dopo l'ultima volta. `git pull --rebase` poi ripeti `git push`. |
| Push fatto ma sito non aggiornato | Controlla la tab **Actions** su GitHub. Se il run è verde ma vedi ancora il vecchio: hard-refresh (`Ctrl+Shift+R`). Service worker fa caching aggressivo. |
| Vuoi annullare un push già fatto | `git revert HEAD && git push` — crea un commit che annulla il precedente. Più sicuro di `git reset --hard` su un repo condiviso. |

---

## Cosa NON committare

Già escluso da `.gitignore`:

- `node_modules/` — dipendenze, si reinstallano con `npm install`
- `dist/` — build, si rigenera con `npm run build` (e GitHub Pages lo fa da solo)
- `.env`, `.env.*` — non ne usiamo, ma se ne aggiungi non finiscono nel repo
- `.DS_Store`, `.vite` — file temporanei

Se per sbaglio committi una di queste cartelle:

```bash
git rm -r --cached node_modules
git commit -m "Remove node_modules from tracking"
git push
```
