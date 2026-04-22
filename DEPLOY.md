# Deploy AURA v4 su GitHub Pages

## Nuovo repo (o reset completo)

Dato che v4 è una riscrittura completa, è consigliato partire da zero.

### 1) Prepara il repo locale

```bash
cd aura-app
git init
git branch -M main
git remote add origin https://github.com/MythYuno/aura.git
```

### 2) Primo commit

```bash
git add .
git commit -m "v4: complete redesign (Tailwind, Framer Motion, Recharts, Geist)"
```

### 3) Push forzato (sovrascrive v3 online)

```bash
git push -u origin main --force
```

Ti chiederà credenziali:
- Username: `MythYuno`
- Password: il tuo Personal Access Token (non la password dell'account)

## 4) Abilita GitHub Pages

1. Vai su `https://github.com/MythYuno/aura/settings/pages`
2. In **Source** seleziona **GitHub Actions**
3. Attendi che il workflow finisca (tab **Actions**, 2-3 minuti)
4. Il sito sarà live su `https://mythyuno.github.io/aura/`

## Aggiornamenti futuri

```bash
git add .
git commit -m "descrizione cambi"
git push
```

Il deploy è automatico.

## Troubleshooting

**404 sugli asset**: verifica che `vite.config.js` abbia `base: '/aura/'` di default, e che il workflow passi `BASE_PATH=/aura/` al build.

**Build fallisce**: controlla tab Actions su GitHub per leggere l'errore.

**Cache browser**: dopo deploy fai hard refresh con `Ctrl+Shift+R`.
