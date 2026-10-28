import { useState } from 'react';
import { GlassTabBar } from './ui/GlassTabBar.jsx';
import { Today } from './screens/Today.jsx';
import { Afford } from './screens/Afford.jsx';
import { Cycle } from './screens/Cycle.jsx';
import { useStore } from './store/useStore.js';

/**
 * Guscio a tre destinazioni. L'onboarding arriva al Task 12.
 */

export default function App() {
  const [tab, setTab] = useState('today');
  const [asking, setAsking] = useState(false);
  const { state, storageOk, addMovement, applyReconcile } = useStore();

  return (
    <div className="relative flex h-full flex-col">
      {!storageOk && (
        <p className="px-5 py-2 text-[13px]" style={{ background: 'var(--bad)', color: '#fff' }}>
          Non riesco a salvare su questo browser: i dati valgono solo per questa sessione.
        </p>
      )}

      <main className="flex-1 overflow-y-auto">
        {tab === 'today' ? (
          <Today state={state} />
        ) : (
          <Cycle state={state} onReconcile={applyReconcile} />
        )}
      </main>

      <GlassTabBar active={tab} onChange={setTab} onAsk={() => setAsking(true)} />

      <Afford
        open={asking}
        onClose={() => setAsking(false)}
        state={state}
        onRegister={addMovement}
      />
    </div>
  );
}
