import { useState } from 'react';
import { GlassTabBar } from './ui/GlassTabBar.jsx';
import { Today } from './screens/Today.jsx';
import { Afford } from './screens/Afford.jsx';
import { useStore } from './store/useStore.js';

/**
 * Guscio a tre destinazioni. Ciclo e onboarding arrivano ai Task 11-12.
 */

export default function App() {
  const [tab, setTab] = useState('today');
  const [asking, setAsking] = useState(false);
  const { state, storageOk, addMovement } = useStore();

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
          <p className="p-5 text-[15px]" style={{ color: 'var(--label-2)' }}>
            Ciclo
          </p>
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
