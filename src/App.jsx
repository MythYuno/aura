import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useFinance } from './hooks/useFinance.js';
import { useTheme } from './hooks/useTheme.js';
import { useBreakpoint } from './hooks/useBreakpoint.js';
import { useUndoToast, ToastContext } from './hooks/useUndoToast.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';

import { Assistant } from './screens/Assistant.jsx';
import { Money } from './screens/Money.jsx';
import { History } from './screens/History.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';

import { Goals } from './components/Goals.jsx';
import { Logo } from './components/ui/Logo.jsx';
import { UndoToast } from './components/ui/UndoToast.jsx';
import { UpdateToast } from './components/UpdateToast.jsx';
import { QuickAddSheet } from './components/QuickAddSheet.jsx';
import { SpliceModal } from './components/SpliceModal.jsx';
import { IcEye, IcEyeOff, IcPlus } from './lib/icons.jsx';
import { Sparkle, ClockCounterClockwise, Wallet, Target } from '@phosphor-icons/react';
import { clearStorage } from './lib/storage.js';
import { haptic } from './lib/haptic.js';
import { cn } from './lib/format.js';
import { notifyUpcomingDeductions } from './lib/notifications.js';

// Tab bar a 5 voci con + centrato (3ª posizione, simmetrico).
// 'add' non è una tab navigabile: tap apre lo sheet QuickAdd.
// Barra come da mockup approvato: Assistente · Storia · ＋ · Gestione · Obiettivi.
// Setup esce dalla barra → ingranaggio nell'header.
const TABS = [
  { id: 'today', label: 'Oggi' },
  { id: 'history', label: 'Storia' },
  { id: 'add', label: 'Aggiungi', isAction: true },
  { id: 'money', label: 'Piano' },
  { id: 'goals', label: 'Obiettivi' },
];

// Solo le tab navigabili (escluso 'add' che apre uno sheet)
const NAV_TABS = TABS.filter((t) => !t.isAction);

// Saluto contestuale all'orario + varietà giornaliera. Le soglie sono
// fisse 5/12/18/23; ogni fascia ha 3 varianti che ruotano in modo
// deterministico sul giorno (così non cambiano in modo random a ogni
// render, ma sì da un giorno all'altro).
const GREET_VARIANTS = {
  night: ['Notte fonda', 'Ancora sveglio', 'Tardi tardi'],
  morning: ['Buongiorno', 'Salve', 'Eccoti'],
  afternoon: ['Buon pomeriggio', 'Eccoti', 'Ehilà'],
  evening: ['Buonasera', 'Sera', 'Eccoti di nuovo'],
  late: ['Buonanotte', 'Sogni d\'oro', 'Buonanotte'],
};
const dayHash = () => {
  const d = new Date();
  const k = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const greeting = (hour) => {
  const h = hour != null ? hour : new Date().getHours();
  let bucket = 'morning';
  if (h < 5) bucket = 'night';
  else if (h < 12) bucket = 'morning';
  else if (h < 18) bucket = 'afternoon';
  else if (h < 23) bucket = 'evening';
  else bucket = 'late';
  const variants = GREET_VARIANTS[bucket];
  return variants[dayHash() % variants.length];
};

// Icone barra (v0.9.13): Phosphor. Attiva = "fill", inattiva = "regular".
// scintilla (Assistente) · storia · portafoglio (Gestione) · bersaglio.
const TabIcon = ({ id, active }) => {
  const props = { size: 23, weight: active ? 'fill' : 'regular' };
  if (id === 'today') return <Sparkle {...props} />;               // Assistente
  if (id === 'history') return <ClockCounterClockwise {...props} />; // Storia
  if (id === 'money') return <Wallet {...props} />;                 // Gestione
  return <Target {...props} />;                                      // Obiettivi
};

export default function App() {
  const store = useFinance();
  const bp = useBreakpoint();
  const scrollRef = useRef(null);
  const { progress } = useScrollProgress(scrollRef);
  const { toast, show, dismiss, undo } = useUndoToast();

  const [tab, setTab] = useState('today');
  const prevTabIdx = useRef(0);
  const [tabDir, setTabDir] = useState(1);
  // QuickAdd sheet aperto dal tasto + centrale della tab bar
  const [quickOpen, setQuickOpen] = useState(false);
  // v0.10.2: prefill dello sheet Aggiungi (dal Copilot: "Aggiungila come spesa")
  const [quickPrefill, setQuickPrefill] = useState(null);
  // Splice modal per entrate grosse (>= €500): chiede se spalmare su più mesi
  const [spliceData, setSpliceData] = useState(null);
  // v0.9: categoria su cui aprire la Storia filtrata (tap da "aree di spesa")
  const [focusCat, setFocusCat] = useState(null);
  // hourTick — cambia ogni ora per far ri-renderizzare il saluto contestuale.
  // Senza questo, 'Buongiorno' resterebbe finchè non c'è un altro re-render.
  const [hourTick, setHourTick] = useState(() => new Date().getHours());
  // idle = utente fermo da 30s (per pulse breathing del tasto +)
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t;
    const reset = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 30000);
    };
    reset();
    const events = ['touchstart', 'mousedown', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  // Auto-blur quando l'app va in background (privacy passiva, UX #19)
  useEffect(() => {
    const onVis = () => {
      document.documentElement.setAttribute(
        'data-app-hidden',
        document.visibilityState === 'hidden' ? 'true' : 'false'
      );
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => {
    // Programma il prossimo cambio all'ora esatta successiva (+5s di sicurezza)
    const now = new Date();
    const next = new Date(now);
    next.setHours(now.getHours() + 1, 0, 5, 0);
    const ms = Math.max(1000, next.getTime() - Date.now());
    const t = setTimeout(() => setHourTick(new Date().getHours()), ms);
    // Inoltre, se l'app torna in foreground dopo che il tab era nascosto,
    // ricalcola subito (es. l'app stava sotto durante il cambio di soglia)
    const onVis = () => {
      if (document.visibilityState === 'visible') setHourTick(new Date().getHours());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis); };
  }, [hourTick]);

  // Un solo tema 'aura', con due modalità (dark / light).
  // store.theme tiene la modalità; themeId è mantenuto per compatibilità ma vale sempre 'aura'.
  useTheme('aura', store.theme);

  // PWA shortcut: /?action=add → apre il QuickAdd. Supporta anche
  //   ?action=add&amount=5.50&label=caffè&cat=food
  //   ?action=add&kind=income&amount=200
  // così che un Shortcut iOS (o un link in un'altra app) possa pre-popolare
  // o registrare direttamente. Se TUTTI i campi richiesti ci sono, registra
  // subito senza aprire lo sheet (max velocità per Siri).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add' && store.booted) {
      // SANITIZATION dei query params (security audit): un URL malevolo
      // tappato per errore non deve poter registrare spese arbitrarie.
      const rawAmount = (params.get('amount') || '').replace(',', '.');
      const amount = parseFloat(rawAmount);
      const MAX_URL_AMOUNT = 10000; // tetto pragmatico: spese da URL > 10k aprono il sheet per conferma
      const rawLabel = (params.get('label') || '').slice(0, 60); // tronca a 60 char
      const label = rawLabel.replace(/[<>]/g, ''); // strip < > base anti-injection
      const rawCat = (params.get('cat') || '').slice(0, 30);
      const cat = /^[a-z0-9_]+$/i.test(rawCat) ? rawCat : ''; // solo id validi
      const kind = params.get('kind') === 'income' ? 'income' : 'spend';
      const silent = params.get('silent') === '1';
      // Pulisce subito i query params dall'URL così il refresh non riapre
      ['action', 'amount', 'label', 'cat', 'kind', 'silent'].forEach((k) => params.delete(k));
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''));
      // Se ho tutti i dati richiesti E l'importo è entro il tetto, registro
      // senza aprire sheet. Altrimenti apro il sheet per conferma umana.
      const validAuto = amount > 0
        && amount <= MAX_URL_AMOUNT
        && (kind === 'income' || (cat && store.cats.find((c) => c.id === cat)));
      if (validAuto) {
        if (kind === 'income') {
          store.addExtraIncome(amount, label || 'Entrata extra');
        } else {
          store.addTx(amount, cat, label);
        }
        if (!silent) {
          show?.(`Registrato: €${amount.toFixed(2)}`, null);
        }
      } else {
        // Apro lo sheet — l'utente conferma o annulla. Caso classico:
        // amount > tetto, cat sconosciuta, kind ambiguo, link incompleto.
        setQuickOpen(true);
      }
    }
  }, [store.booted]);

  // Welcome back: traccia l'ultima apertura per detectare il rientro
  // dopo qualche giorno di assenza (UX #7). Range hard-limit per evitare
  // "Bentornato · Infinity giorni di assenza" se il flag è corrotto/cancellato.
  useEffect(() => {
    if (!store.booted) return;
    try {
      const last = parseInt(localStorage.getItem('aura_last_open_ts') || '0', 10);
      const now = Date.now();
      const daysAway = Number.isFinite(last) && last > 0
        ? Math.floor((now - last) / 864e5)
        : 0;
      // Mostra toast solo se 3-365 giorni (oltre = probabile data corrotta)
      if (daysAway >= 3 && daysAway <= 365) {
        setTimeout(() => {
          show?.(`Bentornato${store.name ? ' ' + store.name : ''} · ${daysAway} giorni di assenza`, null);
        }, 1200);
      }
      localStorage.setItem('aura_last_open_ts', String(now));
    } catch {}
  }, [store.booted]);

  // Storage quota piena / errore save → toast all'utente (audit #5).
  useEffect(() => {
    const onErr = (e) => {
      const isQuota = e.detail?.quota === true;
      show?.(
        isQuota
          ? 'Spazio esaurito · esporta backup dal Setup'
          : 'Errore salvataggio dati',
        null
      );
    };
    window.addEventListener('aura:storage-error', onErr);
    return () => window.removeEventListener('aura:storage-error', onErr);
  }, [show]);

  // Multi-tab data loss prevention (audit #6 — bug 1):
  // se un'altra tab AURA scrive in aura_v4, questa tab ha state stale e al
  // prossimo save sovrascriverebbe con dati vecchi (DATA LOSS).
  // Risolvo: detect storage event da altre tab → notifico con toast +
  // bottone reload. Non auto-merge (conflict resolution complesso, rischioso).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'aura_v4' || !e.newValue) return;
      // Aggiunge una volta sola per sessione (anti-spam)
      if (window.__auraStorageDirtied) return;
      window.__auraStorageDirtied = true;
      show?.('Dati modificati in un\'altra scheda · ricarica per sincronizzare', () => {
        window.location.reload();
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [show]);

  // Notifiche scadenze: una sola volta per apertura, no-op se permesso non dato.
  // Se la modalità privacy è attiva, le notifiche escono in forma 'generica'
  // (no importi, no label specifici) per non leakare sul lockscreen iOS.
  useEffect(() => {
    if (!store.booted) return;
    const t = setTimeout(() => {
      notifyUpcomingDeductions({
        fixed: store.fixed,
        subscriptions: store.subscriptions,
        daysAhead: 3,
        genericText: !!store.privacy,
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [store.booted, store.fixed, store.subscriptions, store.privacy]);

  const switchTab = (id) => {
    // 'add' apre direttamente lo sheet QuickAdd, indipendentemente dalla tab attiva.
    if (id === 'add') {
      haptic('medium');
      setQuickOpen(true);
      return;
    }
    const order = NAV_TABS.map((t) => t.id);
    const next = order.indexOf(id);
    setTabDir(next >= prevTabIdx.current ? 1 : -1);
    prevTabIdx.current = next;
    haptic('light');
    setTab(id);
  };

  // Submit del QuickAdd sheet — delega ai metodi dello store.
  // `ts` (timestamp) opzionale: se la spesa è di un giorno passato (utente
  // ha selezionato Ieri o Altro), passiamo quel valore a addTx.
  const handleQuickSubmit = ({ kind, amount, label, catId, ts }) => {
    if (kind === 'income') {
      store.addExtraIncome(amount, label || 'Entrata extra');
    } else {
      store.addTx(amount, catId, label, 0, [], ts || Date.now());
    }
  };
  const handleLargeIncome = (data) => {
    // Chiude il QuickAdd e apre lo Splice modal per chiedere se spalmare.
    // Se l'utente fa "Annulla" nello Splice, registriamo comunque come
    // extraIncome normale invece di perdere silenziosamente l'entrata
    // (audit #6 bug UX 2.2). Vedi onClose dello SpliceModal sotto.
    setQuickOpen(false);
    setSpliceData(data);
  };

  const onReset = () => {
    clearStorage();
    window.location.reload();
  };

  const onOnboard = (data) => {
    haptic('success');
    store.setName(data.name);
    // Vecchio modello (mantenuto per compatibilità schermate non ancora riscritte)
    store.setSalary(data.salary || 0);
    store.setResetDay(data.day || 1);
    if (data.fixed?.length) store.setFixed(data.fixed);
    if (data.annualExpenses?.length) store.setAnnualExpenses(data.annualExpenses);
    if (data.subscriptions?.length) store.setSubscriptions(data.subscriptions);
    if ((data.initialBalance || 0) > 0) {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
      store.setExtraIncomes((p) => [...p, {
        id,
        amount: data.initialBalance,
        label: 'Saldo iniziale',
        ts: Date.now(),
      }]);
    }
    if (typeof data.buffer === 'number') store.setBuffer(data.buffer);
    // Nuovo modello balance-first
    if (typeof data.currentBalance === 'number') store.setCurrentBalance(data.currentBalance);
    if (Array.isArray(data.incomes)) store.setIncomes(data.incomes);
    if (typeof data.cushion === 'number') store.setCushion(data.cushion);
    if (typeof data.monthlySavingsTarget === 'number' && data.monthlySavingsTarget > 0) {
      store.setMonthlySavingsTarget(data.monthlySavingsTarget);
    }
    store.setBooted(true);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  const toastCtx = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  if (!store.booted) {
    return (
      <ToastContext.Provider value={toastCtx}>
        <Onboarding onDone={onOnboard} />
      </ToastContext.Provider>
    );
  }

  const isDesktop = bp === 'desktop';

  return (
    <ToastContext.Provider value={toastCtx}>
      <div className="fixed inset-0 overflow-hidden">
        <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />

        <main className="flex h-full flex-col relative z-10">
          {/* Header: logo + saluto a sinistra, solo privacy toggle a destra.
              Setup è una tab in fondo, non più ingranaggio in alto.
              padding-top alzato: in PWA usa env(safe-area-inset-top), in browser
              normale almeno 28px per stare sotto la chrome di iOS Safari. */}
          <header
            className="flex items-center justify-between px-5 pb-4 z-10"
            style={{ paddingTop: 'max(28px, calc(env(safe-area-inset-top) + 14px))' }}
          >
            <div className="flex items-center gap-2.5">
              <Logo size="sm" withText={false} />
              {store.name ? (
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                    {greeting(hourTick)}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', marginTop: -1, marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {store.name}
                    {/* Badge BETA inline, dopo il nome, in carattere piccolo
                        così non copre il saluto. */}
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: '.16em',
                      color: 'var(--accent-on-solid)', background: 'var(--accent)',
                      padding: '2px 5px', borderRadius: 4,
                      lineHeight: 1, verticalAlign: 'middle',
                    }}>BETA</span>
                  </p>
                </div>
              ) : (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                  color: 'var(--bg)', background: 'var(--accent)',
                  padding: '2px 6px', borderRadius: 4,
                  marginLeft: 4,
                }}>BETA</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                aria-label={store.privacy ? 'Mostra importi' : 'Nascondi importi'}
                aria-pressed={store.privacy}
                className="glass w-10 h-10 rounded-xl flex items-center justify-center text-fg-2 transition-colors active:scale-95"
              >
                {store.privacy ? <IcEyeOff /> : <IcEye />}
              </button>
              <button
                onClick={() => switchTab('setup')}
                aria-label="Impostazioni"
                aria-current={tab === 'setup' ? 'page' : undefined}
                className="glass w-10 h-10 rounded-xl flex items-center justify-center transition-colors active:scale-95"
                style={{ color: tab === 'setup' ? 'var(--accent)' : 'var(--fg-2)' }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className={cn(
              'flex-1 overflow-y-auto overflow-x-hidden no-scrollbar app-scroll-container',
              isDesktop ? 'px-8 py-4' : 'px-4 pt-2',
            )}
            style={{
              paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
              // v0.8.1 rev3: fix iOS scroll bloccato sulle schermate lunghe (Setup).
              // - minHeight: 0 → flex-1 + overflow-y-auto su iOS Safari/PWA serve
              //   esplicitamente min-height: 0 sul flex child, altrimenti il
              //   container assume implicit min-content e lo scroll non scatta.
              // - WebkitOverflowScrolling: touch → momentum scroll iOS < 13
              //   (e safe anche su 13+).
              // - overscrollBehaviorY: contain → impedisce che il "bounce" della
              //   schermata propaghi al body (era la causa di "scrolla tutta l'app").
              // - touchAction: pan-y → dichiara esplicitamente che questo
              //   container gestisce scroll verticale, blocca interferenze
              //   con touch-action: manipulation degli input.
              minHeight: 0,
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorY: 'contain',
              touchAction: 'pan-y',
            }}
          >
            <div className={isDesktop ? 'max-w-2xl mx-auto' : ''}>
              <AnimatePresence mode="wait" custom={tabDir} initial={false}>
                <motion.div
                  key={tab}
                  custom={tabDir}
                  variants={{
                    // v0.8.1: rimosso filter: blur(...) costoso su GPU mobile.
                    // iPhone XR/SE laggavano il tab swap. Ora solo opacity +
                    // translate-x, GPU-only, smooth ovunque.
                    enter: (d) => ({ opacity: 0, x: d * 24 }),
                    center: { opacity: 1, x: 0 },
                    exit: (d) => ({ opacity: 0, x: d * -18 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tab === 'today' && <Assistant store={store} onGoToMoney={() => switchTab('money')} onOpenCategory={(catId) => { setFocusCat(catId); switchTab('history'); }} onPrefillAdd={(p) => { setQuickPrefill(p); setQuickOpen(true); }} />}
                  {tab === 'money' && <Money store={store} onOpenCategory={(catId) => { setFocusCat(catId); switchTab('history'); }} />}
                  {tab === 'history' && <History store={store} focusCategory={focusCat} onFocusConsumed={() => setFocusCat(null)} />}
                  {tab === 'goals' && <Goals store={store} />}
                  {tab === 'setup' && (
                    <SettingsScreen
                      store={store}
                      onReset={onReset}
                      onClose={() => switchTab('today')}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Tab bar v0.9.5: "isola" flottante arrotondata (+ centrato sporgente) */}
          <nav
            className="fixed bottom-0 left-0 right-0 z-[100] tabbar5"
            aria-label="Navigazione principale"
            style={{
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
              paddingLeft: 12, paddingRight: 12,
              pointerEvents: 'none',
            }}
          >
            <div className="tabbar5-island" data-tut="tabs">
              {TABS.map((t) => {
                if (t.isAction) {
                  // Tasto + centrale rialzato, sempre evidenziato
                  return (
                    <button
                      key={t.id}
                      onClick={() => switchTab(t.id)}
                      aria-label="Aggiungi spesa o entrata"
                      className="flex-1 flex items-center justify-center py-1.5"
                    >
                      <span
                        className="flex items-center justify-center plus"
                        data-idle={idle ? 'true' : 'false'}
                        style={{
                          width: 54, height: 54, borderRadius: 18,
                          transform: 'translateY(-22px)',
                          background: 'var(--grad)',
                          color: '#fff',
                          boxShadow: '0 14px 30px -10px var(--accent-glow)',
                        }}
                      >
                        <IcPlus width="24" height="24" strokeWidth="2.4" />
                      </span>
                    </button>
                  );
                }
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    aria-label={t.label}
                    aria-current={active ? 'page' : undefined}
                    // Niente pillola dietro l'attiva. Attiva = accent leggibile
                    // (menta su scuro, petrolio su chiaro) — non gli stop scuri del gradiente.
                    className="flex-1 flex flex-col items-center gap-1 py-2 px-1 transition-colors"
                    style={{ color: active ? 'var(--accent-text)' : 'var(--fg-4)', minHeight: 48 }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)',
                        transform: active ? 'translateY(-1px) scale(1.08)' : 'none',
                      }}
                    >
                      <TabIcon id={t.id} active={active} />
                    </span>
                    <span
                      style={active
                        ? { fontSize: 10.5, fontWeight: 700, letterSpacing: '.02em', color: 'var(--accent-text)' }
                        : { fontSize: 10.5, fontWeight: 600, letterSpacing: '.02em', opacity: 0.9 }}
                    >{t.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </main>

        {/* QuickAdd sheet — aperto dal tasto + centrale della tab bar */}
        <QuickAddSheet
          open={quickOpen}
          onClose={() => { setQuickOpen(false); setQuickPrefill(null); }}
          prefill={quickPrefill}
          homeCats={store.homeCats}
          cats={store.cats}
          txs={store.txs}
          catRules={store.catRules}
          onSubmit={handleQuickSubmit}
          onLargeIncome={handleLargeIncome}
          effectiveDaily={store.effectiveDaily}
        />

        {/* Splice modal per entrate >= €500 (spalma su N mesi o tieni) */}
        <SpliceModal
          open={!!spliceData}
          amount={spliceData?.amount || 0}
          label={spliceData?.label || ''}
          // Annulla = davvero annulla. L'utente non si aspetta che premere
          // "Annulla" registri comunque. Se voleva l'entrata, doveva
          // confermare con "Tienila tutta" o "Spalmala".
          onClose={() => setSpliceData(null)}
          onConfirm={(result) => {
            if (result.kind === 'splice') {
              store.addSplicedIncome(result.amount, result.label, result.months);
            } else {
              store.addExtraIncome(result.amount, result.label);
            }
            setSpliceData(null);
          }}
        />

        <UndoToast toast={toast} onUndo={undo} onDismiss={dismiss} />
        <UpdateToast />
      </div>
    </ToastContext.Provider>
  );
}
