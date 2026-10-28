import { useEffect, useState } from 'react';
import { GlassTabBar } from './ui/GlassTabBar.jsx';
import { Today } from './screens/Today.jsx';
import { Afford } from './screens/Afford.jsx';
import { Cycle } from './screens/Cycle.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { useStore } from './store/useStore.js';
import { toYmd } from './cycle/day.js';

/**
 * `today` è un valore stabile, non `new Date()` dentro i componenti: così i
 * memo dei calcoli reggono invece di invalidarsi a ogni render, e tutte le
 * schermate ragionano sulla stessa data. Si aggiorna quando la pagina torna
 * in primo piano, altrimenti una PWA ripresa dopo mezzanotte continuerebbe a
 * mostrare la cifra di ieri.
 */
function useToday() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (toYmd(now) !== toYmd(today)) setToday(now);
    };
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, 60000);
    return () => {
      document.removeEventListener('visibilitychange', check);
      clearInterval(timer);
    };
  }, [today]);

  return today;
}

export default function App() {
  const [tab, setTab] = useState('today');
  const [asking, setAsking] = useState(false);
  const today = useToday();
  const { state, storageOk, addMovement, removeMovement, applyReconcile, setSetup } = useStore();

  const warning = !storageOk && (
    <p className="px-5 py-2 text-[13px]" style={{ background: 'var(--bad)', color: '#fff' }}>
      Non riesco a salvare su questo browser: i dati valgono solo per questa sessione.
    </p>
  );

  if (!state.onboarded) {
    return (
      <div className="h-full overflow-y-auto">
        {warning}
        <Onboarding onDone={setSetup} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {warning}

      <main className="flex-1 overflow-y-auto">
        {tab === 'today' ? (
          <Today state={state} today={today} />
        ) : (
          <Cycle
            state={state}
            today={today}
            onReconcile={applyReconcile}
            onSaveSetup={setSetup}
            onRemoveMovement={removeMovement}
          />
        )}
      </main>

      <GlassTabBar active={tab} onChange={setTab} onAsk={() => setAsking(true)} />

      <Afford
        open={asking}
        onClose={() => setAsking(false)}
        state={state}
        today={today}
        onRegister={addMovement}
      />
    </div>
  );
}
