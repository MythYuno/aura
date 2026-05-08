import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useStore } from './hooks/useStore.js';
import { useTheme } from './hooks/useTheme.js';
import { useBreakpoint } from './hooks/useBreakpoint.js';
import { useUndoToast, ToastContext } from './hooks/useUndoToast.js';
import { useScrollProgress } from './hooks/useScrollProgress.js';

import { Today } from './screens/Today.jsx';
import { Money } from './screens/Money.jsx';
import { History } from './screens/History.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';

import { Logo } from './components/ui/Logo.jsx';
import { Sheet } from './components/ui/Sheet.jsx';
import { UndoToast } from './components/ui/UndoToast.jsx';
import { IcEye, IcEyeOff, IcSettings } from './lib/icons.jsx';
import { clearStorage } from './lib/storage.js';
import { haptic } from './lib/haptic.js';
import { cn } from './lib/format.js';

const TABS = [
  { id: 'today', label: 'Oggi' },
  { id: 'money', label: 'Soldi' },
  { id: 'history', label: 'Storia' },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Notte fonda';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
};

const TabIcon = ({ id, active }) => {
  const stroke = active ? 2 : 1.6;
  if (id === 'today') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} />
      </svg>
    );
  }
  if (id === 'money') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 010 20" fill={active ? 'currentColor' : 'none'} />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
};

export default function App() {
  const store = useStore();
  const bp = useBreakpoint();
  const scrollRef = useRef(null);
  const { progress } = useScrollProgress(scrollRef);
  const { toast, show, dismiss, undo } = useUndoToast();

  const [tab, setTab] = useState('today');
  const prevTabIdx = useRef(0);
  const [tabDir, setTabDir] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useTheme(store.themeId, store.theme);

  // PWA shortcut: /?action=add → opens quick-add (we don't auto-open the sheet here,
  // but we can scroll the today screen so the quick-add is in view).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add' && store.booted) {
      setTab('today');
      params.delete('action');
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''));
    }
  }, [store.booted]);

  const switchTab = (id) => {
    const order = TABS.map((t) => t.id);
    const next = order.indexOf(id);
    setTabDir(next >= prevTabIdx.current ? 1 : -1);
    prevTabIdx.current = next;
    haptic('light');
    setTab(id);
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
    if (data.fixed?.length) store.setFixed(data.fixed);
    if (data.annualExpenses?.length) store.setAnnualExpenses(data.annualExpenses);
    if (data.subscriptions?.length) store.setSubscriptions(data.subscriptions);
    if (typeof data.buffer === 'number') store.setBuffer(data.buffer);
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
          {/* Top header — logo a sinistra (decorativo), privacy + settings a destra */}
          <header
            className="flex items-center justify-between px-5 pb-3 pt-4 z-10 sticky-fade"
            style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 10px))' }}
          >
            <div className="flex items-center gap-2.5">
              <Logo size="sm" withText={false} />
              {store.name && (
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
                    {greeting()}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', marginTop: -1, marginBottom: 0 }}>
                    {store.name}
                  </p>
                </div>
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
                onClick={() => { haptic('light'); setSettingsOpen(true); }}
                aria-label="Apri impostazioni"
                data-tut="settings"
                className="glass w-10 h-10 rounded-xl flex items-center justify-center text-fg-2 transition-colors active:scale-95"
              >
                <IcSettings />
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className={cn(
              'flex-1 overflow-y-auto overflow-x-hidden no-scrollbar',
              isDesktop ? 'px-8 py-4' : 'px-4',
            )}
            style={{
              paddingBottom: 'calc(95px + env(safe-area-inset-bottom))',
            }}
          >
            <div className={isDesktop ? 'max-w-2xl mx-auto' : ''}>
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
                  {tab === 'today' && <Today store={store} />}
                  {tab === 'money' && <Money store={store} />}
                  {tab === 'history' && <History store={store} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom tab bar */}
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
            <div className="flex items-center px-2 max-w-[500px] mx-auto" data-tut="tabs">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    aria-label={t.label}
                    aria-current={active ? 'page' : undefined}
                    className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative transition-colors"
                    style={{ color: active ? 'var(--accent)' : 'var(--fg-4)' }}
                  >
                    {active && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-x-2 top-0 bottom-0 -z-10 rounded-2xl"
                        style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-20)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <TabIcon id={t.id} active={active} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </main>

        {/* Settings sheet (avatar tap) */}
        <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Impostazioni">
          <SettingsScreen
            store={store}
            onReset={onReset}
            onClose={() => setSettingsOpen(false)}
          />
        </Sheet>

        <UndoToast toast={toast} onUndo={undo} onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}
