# AURA v4

Tracker finanziario personale. Design premium, privacy totale, zero costi.

## ✨ Novità v4

Redesign completo con nuovo stack:
- **Tailwind CSS** per styling rapido e consistente
- **Framer Motion** per animazioni fluide
- **Recharts** per grafici professionali
- **Radix UI** per accessibilità (Dialog, Popover, Switch)
- **Font Geist** (Vercel) con stylistic sets attivi
- **5 temi** (Aurora/Minimal/Midnight/Sunset/Neon) + dark/light/auto con View Transitions
- **NumberTicker** con spring physics
- **Spotlight cursor** sulle card (desktop)
- **Empty states** illustrati animati
- **Scroll progress** indicator + parallax sugli orb
- **Icone duotone** per categorie
- **AI insights locali** (weekday patterns, category growth, micro-vices)
- **Skeleton screens**
- **Haptic diversificato** (6 pattern)

## 📱 Features

- 💰 Budget giornaliero intelligente basato su stipendio
- 🎨 5 temi visivi + dark/light/auto
- 📱 Responsive (mobile/tablet/desktop con sidebar)
- 🎓 Tutorial interattivo a 6 step con spotlight
- 📊 Grafici premium — burn rate, ring chart categorie, heatmap 12 settimane, confronto 6 mesi
- 🎯 Obiettivi con progress animato
- 🔄 Crediti & Rimborsi
- 💡 Insights settimanali + AI pattern detection locale
- 🔥 Streak giorni senza vizi
- 📅 Abbonamenti e spese fisse con avvisi
- 🔍 Ricerca tag + filtri nello storico
- ↩️ Undo toast per eliminazioni
- 🌓 View Transitions API per dark/light animato
- 📱 PWA installabile + offline (service worker)
- 🔐 Privacy: tutti i dati in locale

## 🚀 Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## 🌐 Deploy

Vedi `DEPLOY.md` per guida GitHub Pages.

## 📁 Struttura

```
aura-v4/
├── public/            manifest.json, icon.svg, sw.js
├── src/
│   ├── components/
│   │   ├── ui/        NumberTicker, Card, Button, Sheet, Confirm, SwipeRow, EmptyState, DynIcon, UndoToast
│   │   ├── charts/    BurnArea, RingChart, Heatmap, MonthsBarChart, Sparkline
│   │   ├── widgets/   BalanceHero, ForecastCard, CategoriesRing, StreakCard, MiscCards, OtherCards
│   │   └── Tutorial
│   ├── data/          themes, categories, widgets
│   ├── hooks/         useStore, useTheme, useBreakpoint, useUndoToast, useScrollProgress, useSpotlightCursor
│   ├── lib/           format, storage, haptic, confetti, csv, intelligence, sw
│   ├── screens/       HomeScreen, PlannerScreen, HistoryScreen, SettingsScreen, Onboarding
│   ├── sheets/        AddExpenseSheet
│   ├── styles/        globals.css
│   ├── App.jsx
│   └── main.jsx
├── .github/workflows/ deploy.yml
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── package.json
```

## 📄 License

MIT
