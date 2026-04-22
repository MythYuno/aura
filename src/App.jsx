import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutList, History, Settings, Plus, Eye, EyeOff, HelpCircle, Palette } from 'lucide-react';

import { useStore } from './hooks/useStore.js';
import { useTheme, useAnimatedThemeToggle } from './hooks/useTheme.js';
import { useBreakpoint } from './hooks/useBreakpoint.js';
import { useUndoToast, ToastContext } from './hooks/useUndoToast.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';
import { useSpotlightCursor } from './hooks/useSpotlightCursor.js';

import { HomeScreen } from './screens/HomeScreen.jsx';
import { PlannerScreen } from './screens/PlannerScreen.jsx';
import { HistoryScreen } from './screens/HistoryScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { AddExpenseSheet } from './sheets/AddExpenseSheet.jsx';
import { Tutorial } from './components/Tutorial.jsx';
import { UndoToast } from './components/ui/UndoToast.jsx';
import { clearStorage } from './lib/storage.js';
import { haptic } from './lib/haptic.js';
import { cn } from './lib/format.js';

const TABS = [
  { id: 'home', label: 'Home', icon: Home, tut: null },
  { id: 'planner', label: 'Planner', icon: LayoutList, tut: 'nav-planner' },
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

  useSpotlightCursor();
  useTheme(store.themeId, store.theme);
  const animatedModeToggle = useAnimatedThemeToggle(store.setTheme);

  // Trigger tutorial after onboarding
  useEffect(() => {
    if (store.booted && !store.tutorialSeen && store.txs.length === 0) {
      const id = setTimeout(() => setShowTutorial(true), 1000);
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

  // Scroll to top on tab change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  const toastCtx = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  if (!store.booted) return <Onboarding onDone={onOnboard} />;

  const isDesktop = bp === 'desktop';

  return (
    <ToastContext.Provider value={toastCtx}>
      <div className="fixed inset-0 overflow-hidden">
        {/* Scroll progress bar */}
        <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />

        {/* Background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            className="absolute rounded-full"
            style={{
              top: '-10%', right: '-10%', width: 400, height: 400,
              background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)',
              filter: 'blur(60px)',
              transform: `translateY(${-progress * 50}px)`,
            }}
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              bottom: '10%', left: '-10%', width: 300, height: 300,
              background: 'radial-gradient(circle, rgba(103,232,249,0.08), transparent 70%)',
              filter: 'blur(50px)',
              transform: `translateY(${progress * 80}px)`,
            }}
            animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="noise" />

        <div className="flex h-full relative z-10">
          {/* Desktop sidebar */}
          {isDesktop && (
            <aside className="w-[260px] flex-shrink-0 flex flex-col p-4 border-r border-bd-1 bg-bg-1/40 backdrop-blur-xl z-10">
              {/* Logo */}
              <div className="flex items-center gap-2.5 mb-6 px-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-semibold text-base"
                  style={{ background: 'linear-gradient(135deg, var(--ok), var(--ok-dim))', boxShadow: '0 0 20px var(--accent-glow)' }}
                >
                  A
                </div>
                <span className="text-sm font-semibold tracking-wider">AURA</span>
              </div>

              {/* New expense primary */}
              <button
                onClick={() => { haptic('medium'); setAddOpen(true); }}
                data-tut="fab"
                className="w-full py-3 px-4 rounded-2xl text-black font-semibold flex items-center justify-center gap-2 mb-5"
                style={{ background: 'linear-gradient(135deg, var(--ok), var(--ok-dim))', boxShadow: '0 8px 24px var(--accent-glow)' }}
              >
                <Plus size={16} strokeWidth={2.5} />
                Nuova spesa
              </button>

              {/* Nav */}
              <nav className="flex flex-col gap-1 flex-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    data-tut={t.tut}
                    onClick={() => { haptic('light'); setTab(t.id); }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                      tab === t.id ? 'bg-ok/10 text-ok border border-ok/20' : 'text-fg-3 hover:bg-bg-2 hover:text-fg-1'
                    )}
                  >
                    <t.icon size={16} strokeWidth={tab === t.id ? 2.2 : 1.8} />
                    <span className="text-[13px] font-semibold">{t.label}</span>
                  </button>
                ))}
              </nav>

              {/* Footer */}
              <div className="flex gap-2 mt-4">
                <button
                  data-tut="privacy"
                  onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                  className="flex-1 py-2 rounded-xl bg-bg-2 border border-bd-1 text-fg-3 hover:text-fg-1 transition-colors flex items-center justify-center gap-1.5"
                >
                  {store.privacy ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span className="text-[10px] font-semibold">{store.privacy ? 'Mostra' : 'Nascondi'}</span>
                </button>
                <button
                  onClick={restartTutorial}
                  className="flex-1 py-2 rounded-xl bg-bg-2 border border-bd-1 text-fg-3 hover:text-fg-1 transition-colors flex items-center justify-center gap-1.5"
                >
                  <HelpCircle size={13} />
                  <span className="text-[10px] font-semibold">Tutorial</span>
                </button>
              </div>
            </aside>
          )}

          {/* Main content area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header */}
            {!isDesktop && (
              <header
                className="flex items-center justify-between px-4 pb-2 pt-3 z-10"
                style={{ paddingTop: 'max(12px, calc(env(safe-area-inset-top) + 8px))' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-semibold text-sm"
                    style={{ background: 'linear-gradient(135deg, var(--ok), var(--ok-dim))' }}
                  >
                    A
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">
                      {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {store.name && <p className="text-sm font-semibold tracking-tight -mt-0.5">Ciao, {store.name}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={restartTutorial}
                    className="w-9 h-9 rounded-xl bg-bg-2 border border-bd-1 flex items-center justify-center text-fg-3 hover:bg-bg-3 transition-colors"
                  >
                    <HelpCircle size={15} />
                  </button>
                  <button
                    data-tut="privacy"
                    onClick={() => { haptic('light'); store.setPrivacy(!store.privacy); }}
                    className="w-9 h-9 rounded-xl bg-bg-2 border border-bd-1 flex items-center justify-center text-fg-3 hover:bg-bg-3 transition-colors"
                  >
                    {store.privacy ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </header>
            )}

            {/* Content scroll area */}
            <div
              ref={scrollRef}
              className={cn(
                'flex-1 overflow-y-auto overflow-x-hidden',
                isDesktop ? 'px-8 py-6' : 'px-4 pb-28',
              )}
              style={!isDesktop ? { paddingBottom: 'calc(95px + env(safe-area-inset-bottom))' } : undefined}
            >
              <div className={isDesktop ? 'max-w-6xl mx-auto' : ''}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {tab === 'home' && <HomeScreen store={store} />}
                    {tab === 'planner' && <PlannerScreen store={store} />}
                    {tab === 'history' && <HistoryScreen store={store} />}
                    {tab === 'settings' && <SettingsScreen store={store} onReset={onReset} onRestartTutorial={restartTutorial} animatedModeToggle={animatedModeToggle} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>

        {/* Mobile tabbar */}
        {!isDesktop && (
          <nav
            className="fixed bottom-0 left-0 right-0 bg-bg-1/80 backdrop-blur-2xl border-t border-bd-1 z-[100]"
            style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center px-2 max-w-[500px] mx-auto">
              {[TABS[0], TABS[1]].map((t) => (
                <button
                  key={t.id}
                  data-tut={t.tut}
                  onClick={() => { haptic('light'); setTab(t.id); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative"
                  style={{ color: tab === t.id ? 'var(--ok)' : 'var(--fg-4)' }}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-0 w-6 h-[2px] rounded-full"
                      style={{ background: 'var(--ok)', boxShadow: '0 0 8px var(--accent-glow)' }}
                    />
                  )}
                  <t.icon size={21} strokeWidth={1.7} />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              ))}
              <div className="flex-[0_0_72px] flex justify-center">
                <motion.button
                  data-tut="fab"
                  onClick={() => { haptic('medium'); setAddOpen(true); }}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 -mt-4 rounded-2xl flex items-center justify-center text-black"
                  style={{
                    background: 'linear-gradient(135deg, var(--ok), var(--ok-dim))',
                    boxShadow: '0 8px 24px var(--accent-glow), 0 0 0 4px var(--bg)',
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
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative"
                  style={{ color: tab === t.id ? 'var(--ok)' : 'var(--fg-4)' }}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-0 w-6 h-[2px] rounded-full"
                      style={{ background: 'var(--ok)', boxShadow: '0 0 8px var(--accent-glow)' }}
                    />
                  )}
                  <t.icon size={21} strokeWidth={1.7} />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Sheets */}
        <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} cats={store.cats} addTx={store.addTx} />

        {/* Tutorial */}
        <AnimatePresence>
          {showTutorial && <Tutorial onDone={finishTutorial} />}
        </AnimatePresence>

        {/* Undo toast */}
        <UndoToast toast={toast} onUndo={undo} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}
