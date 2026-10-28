import { useState } from 'react';
import { GlassTabBar } from './ui/GlassTabBar.jsx';
import { Today } from './screens/Today.jsx';
import { useStore } from './store/useStore.js';

/**
 * Guscio a tre destinazioni. Ciclo, foglio Posso? e onboarding arrivano ai
 * Task 10-12.
 */

export default function App() {
  const [tab, setTab] = useState('today');
  const { state, storageOk } = useStore();

  return (
    <div className="flex h-full flex-col">
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

      <GlassTabBar active={tab} onChange={setTab} onAsk={() => setTab('today')} />
    </div>
  );
}
