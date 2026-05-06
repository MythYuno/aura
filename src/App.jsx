import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutList, History, Settings, Plus, Eye, EyeOff, HelpCircle } from 'lucide-react';

import { useStore } from './hooks/useStore.js';
import { useTheme } from './hooks/useTheme.js';
import { useBreakpoint } from './hooks/useBreakpoint.js';
import { useUndoToast, ToastContext } from './hooks/useUndoToast.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';

import { HomeScreen } from './screens/HomeScreen.jsx';
import { PlannerScreen } from './screens/PlannerScreen.jsx';
import { HistoryScreen } from './screens/HistoryScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { AddExpenseSheet } from './sheets/AddExpenseSheet.jsx';
import { Tutorial } from './components/Tutorial.jsx';
import { UndoToast } from './components/ui/UndoToast.jsx';
import { Logo } from './components/ui/Logo.jsx';
import { clearStorage } from './lib/storage.js';
import { haptic } from './lib/haptic.js';
import { cn } from './lib/format.js';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, tut: null },
  { id: 'planner', label: 'Pianifica', icon: LayoutList, tut: 'nav-planner' },
  { id: 'history', label: 'Storico', icon: History, tut: 'nav-history' },
  { id: 'settings', label: 'Setup', icon: Settings, tut: 'nav-settings' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Notte fonda';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
};

export default function App() {
  const store = useStore();
  const bp = useBreakpoint();
  const scrollRef = useRef(null);
  const { progress } = useScrollProgress(scrollRef);
  const { toast, show, dismiss, undo } = useUndoToast();

  const [tab, setTab] = useState('home');
  const prevTabIndex = useRef(0);
  const [tabDir, setTabDir] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useTheme(store.themeId, store.theme);

  // Honor PWA shortcut deep-link: /?action=add → opens AddExpenseSheet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add' && store.booted) {
      setAddOpen(true);
      params.delete('action');
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''));
    }
  }, [store.booted]);

  // Compute slide direction (left/right) based on tab order — feels more spatial
  const switchTab = (id) => {
    const order = TABS.map((t) => t.id);
    const next = order.indexOf(id);
    setTabDir(next >= prevTabIndex.current ? 1 : -1);
    prevTabIndex.current = next;
    haptic('light');
    setTab(id);
  };

  useEffect(() => {
    if (store.booted && !store.tutorialSeen && store.txs.length === 0) {
      const id = setTimeout(() => setShowTutorial(true), 900);
      return () => clearTimeout(id);
    }
  }, [store.booted, store.tutorialSeen, store.txs.length]);

  const finishTutorial = () => {
    store.setTutorialSeen(true);
    setShowTutorial(false);
  };

  const restartTutorial = () => {
    switchTab('home');
    setTimeout(() => setShowTutorial(true), 300);
  };

  const onReset = () => {
    clearStorage();
    window.location.reload();
  };

  const onOnboard = (data) => {
    haptic('success');
    store.setName(data.name);
    store.setSalary(data.salary);
    store.setResetDay(data.day);
    store.setCurrentSavings(data.savings || 0);
    store.setBooted(true);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  const toastCtx = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  if (!store.booted) return <Onboarding onDone={onOnboard} />;

  const isDesktop = bp === 'desktop';

  return (
    <ToastContext.Provider value={toastCtx}>
      <div className="fixed inset-0 overflow-hidden">
        <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />

        <div className="flex h-full relative z-10">
          {/* Desktop sidebar */}
          {isDesktop && (
            <motion.aside
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-[260px] flex-shrink-0 flex flex-col p-5 border-r z-10"
              style={{ borderColor: 'var(--glass-bd)' }}
            >
              <div className="mb-6 px-1">
                <Logo size="md" />
              </div>

              <button
                onClick={() => { haptic('medium'); setAddOpen(true); }}
                data-tut="fab"
                aria-label="Aggiungi nuova spesa"
                className="w-full py-3.5 px-4 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 mb-5 text-sm transition-transform active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                  boxShadow: '0 10px 30px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                Nuova spesa
              </button>

              <nav className="flex flex-col gap-1 flex-1" aria-label="Navigazione principale">
                {TABS.map((t) => (
                  <motion.button
                    key={t.id}
                    data-tut={t.tut}
                    onClick={() => switchTab(t.id)}
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    aria-current={tab === t.id ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium',
                      tab === t.id ? 'text-fg' : 'text-fg-3 hover:text-fg'
                    )}
                    style={tab === t.id ? {
                      background: 'var(--accent-10)',
                      border: '1px solid var(--accent-20)',
                      color: 'var(--accent)',
                    } : {}}
                  >
                    <t.icon size={16} strokeWidth={tab === t.id ? 2.2 : 1.8} aria-hidden="true" />
                    <span className="font-semibold">{t.label}</span>
                  </motion.button>
                ))}
              </nav>

              <div className="flex gap-2 mt-4">
                <button
                  data-tut="privacy"
                  onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                  aria-label={store.privacy ? 'Mostra importi' : 'Nascondi importi'}
                  aria-pressed={store.privacy}
                  className="glass flex-1 py-2 rounded-xl text-fg-3 hover:text-fg transition-colors flex items-center justify-center gap-1.5 text-[10px] font-semibold"
                >
                  {store.privacy ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                  {store.privacy ? 'Mostra' : 'Nascondi'}
                </button>
                <button
                  onClick={restartTutorial}
                  aria-label="Apri tutorial"
                  className="glass flex-1 py-2 rounded-xl text-fg-3 hover:text-fg transition-colors flex items-center justify-center gap-1.5 text-[10px] font-semibold"
                >
                  <HelpCircle size={13} aria-hidden="true" />
                  Tutorial
                </button>
              </div>
            </motion.aside>
          )}

          {/* Main content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header */}
            {!isDesktop && (
              <header
                className="flex items-center justify-between px-5 pb-3 pt-4 z-10 sticky-fade"
                style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 10px))' }}
              >
                <div className="flex items-center gap-2.5">
                  <Logo size="sm" withText={false} />
                  {store.name && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-fg-4">{getGreeting()}</p>
                      <p className="text-[15px] font-semibold tracking-tight -mt-0.5 leading-tight">{store.name}</p>
                    </div>
                  )}
                </div>
                <button
                  data-tut="privacy"
                  onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                  aria-label={store.privacy ? 'Mostra importi' : 'Nascondi importi'}
                  aria-pressed={store.privacy}
                  className="glass w-10 h-10 rounded-xl flex items-center justify-center text-fg-2 transition-colors active:scale-95"
                >
                  {store.privacy ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </header>
            )}

            <div
              ref={scrollRef}
              className={cn(
                'flex-1 overflow-y-auto overflow-x-hidden no-scrollbar',
                isDesktop ? 'px-8 py-6' : 'px-4 pb-28',
              )}
              style={!isDesktop ? { paddingBottom: 'calc(95px + env(safe-area-inset-bottom))' } : undefined}
            >
              <div className={isDesktop ? 'max-w-6xl mx-auto' : ''}>
                <AnimatePresence mode="wait" custom={tabDir} initial={false}>
                  <motion.div
                    key={tab}
                    custom={tabDir}
                    variants={{
                      enter: (d) => ({ opacity: 0, x: d * 28, filter: 'blur(6px)' }),
                      center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                      exit: (d) => ({ opacity: 0, x: d * -22, filter: 'blur(4px)' }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {tab === 'home' && <HomeScreen store={store} />}
                    {tab === 'planner' && <PlannerScreen store={store} />}
                    {tab === 'history' && <HistoryScreen store={store} />}
                    {tab === 'settings' && <SettingsScreen store={store} onReset={onReset} onRestartTutorial={restartTutorial} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>

        {/* Mobile tabbar */}
        {!isDesktop && (
          <nav
            className="fixed bottom-0 left-0 right-0 border-t z-[100]"
            aria-label="Navigazione principale"
            style={{
              borderColor: 'var(--glass-bd-2)',
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
              background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          >
            <div className="flex items-center px-2 max-w-[500px] mx-auto">
              {[TABS[0], TABS[1]].map((t) => (
                <button
                  key={t.id}
                  data-tut={t.tut}
                  onClick={() => switchTab(t.id)}
                  aria-label={t.label}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative transition-colors"
                  style={{ color: tab === t.id ? 'var(--accent)' : 'var(--fg-4)' }}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute inset-x-2 top-0 bottom-0 -z-10 rounded-2xl"
                      style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-20)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <t.icon size={21} strokeWidth={tab === t.id ? 2.1 : 1.7} aria-hidden="true" />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              ))}

              <div className="flex-[0_0_72px] flex justify-center">
                <motion.button
                  data-tut="fab"
                  onClick={() => { haptic('medium'); setAddOpen(true); }}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  aria-label="Aggiungi nuova spesa"
                  className="w-14 h-14 -mt-4 rounded-2xl flex items-center justify-center text-black fab-float"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                    boxShadow: '0 10px 32px var(--accent-glow), 0 0 0 4px var(--bg), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Plus size={24} strokeWidth={2.5} aria-hidden="true" />
                </motion.button>
              </div>

              {[TABS[2], TABS[3]].map((t) => (
                <button
                  key={t.id}
                  data-tut={t.tut}
                  onClick={() => switchTab(t.id)}
                  aria-label={t.label}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative transition-colors"
                  style={{ color: tab === t.id ? 'var(--accent)' : 'var(--fg-4)' }}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute inset-x-2 top-0 bottom-0 -z-10 rounded-2xl"
                      style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-20)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <t.icon size={21} strokeWidth={tab === t.id ? 2.1 : 1.7} aria-hidden="true" />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}

        <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} store={store} />
        <AnimatePresence>
          {showTutorial && <Tutorial onDone={finishTutorial} />}
        </AnimatePresence>
        <UndoToast toast={toast} onUndo={undo} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}
