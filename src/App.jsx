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

export default function App() {
  const store = useStore();
  const bp = useBreakpoint();
  const scrollRef = useRef(null);
  const { progress } = useScrollProgress(scrollRef);
  const { toast, show, dismiss, undo } = useUndoToast();

  const [tab, setTab] = useState('home');
  const [addOpen, setAddOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useTheme(store.themeId);

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
    setTab('home');
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
                className="w-full py-3.5 px-4 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 mb-5 text-sm"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                  boxShadow: '0 10px 30px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                <Plus size={17} strokeWidth={2.4} />
                Nuova spesa
              </button>

              <nav className="flex flex-col gap-1 flex-1">
                {TABS.map((t) => (
                  <motion.button
                    key={t.id}
                    data-tut={t.tut}
                    onClick={() => { haptic('light'); setTab(t.id); }}
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
                    <t.icon size={16} strokeWidth={tab === t.id ? 2.2 : 1.8} />
                    <span className="font-semibold">{t.label}</span>
                  </motion.button>
                ))}
              </nav>

              <div className="flex gap-2 mt-4">
                <button
                  data-tut="privacy"
                  onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                  className="glass flex-1 py-2 rounded-xl text-fg-3 hover:text-fg transition-colors flex items-center justify-center gap-1.5 text-[10px] font-semibold"
                >
                  {store.privacy ? <EyeOff size={13} /> : <Eye size={13} />}
                  {store.privacy ? 'Mostra' : 'Nascondi'}
                </button>
                <button
                  onClick={restartTutorial}
                  className="glass flex-1 py-2 rounded-xl text-fg-3 hover:text-fg transition-colors flex items-center justify-center gap-1.5 text-[10px] font-semibold"
                >
                  <HelpCircle size={13} />
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
                className="flex items-center justify-between px-5 pb-3 pt-4 z-10"
                style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 10px))' }}
              >
                <div className="flex items-center gap-2">
                  <Logo size="sm" withText={false} />
                  {store.name && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-3">Benvenuto</p>
                      <p className="text-sm font-semibold tracking-tight -mt-0.5">Ciao {store.name}</p>
                    </div>
                  )}
                </div>
                <button
                  data-tut="privacy"
                  onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                  className="glass w-10 h-10 rounded-xl flex items-center justify-center text-fg-2 transition-colors"
                >
                  {store.privacy ? <EyeOff size={16} /> : <Eye size={16} />}
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
            className="fixed bottom-0 left-0 right-0 glass-2 border-t z-[100]"
            style={{
              borderColor: 'var(--glass-bd)',
              paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex items-center px-2 max-w-[500px] mx-auto">
              {[TABS[0], TABS[1]].map((t) => (
                <button
                  key={t.id}
                  data-tut={t.tut}
                  onClick={() => { haptic('light'); setTab(t.id); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative transition-colors"
                  style={{ color: tab === t.id ? 'var(--accent)' : 'var(--fg-4)' }}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-0 w-6 h-[2px] rounded-full"
                      style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
                    />
                  )}
                  <t.icon size={21} strokeWidth={tab === t.id ? 2.1 : 1.7} />
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
                  className="w-14 h-14 -mt-4 rounded-2xl flex items-center justify-center text-black fab-float"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                    boxShadow: '0 10px 32px var(--accent-glow), 0 0 0 4px var(--bg), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Plus size={24} strokeWidth={2.5} />
                </motion.button>
              </div>

              {[TABS[2], TABS[3]].map((t) => (
                <button
                  key={t.id}
                  data-tut={t.tut}
                  onClick={() => { haptic('light'); setTab(t.id); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative transition-colors"
                  style={{ color: tab === t.id ? 'var(--accent)' : 'var(--fg-4)' }}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-0 w-6 h-[2px] rounded-full"
                      style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }}
                    />
                  )}
                  <t.icon size={21} strokeWidth={tab === t.id ? 2.1 : 1.7} />
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
