import { useState } from 'react';
import { GlassTabBar } from './ui/GlassTabBar.jsx';
import { Today } from './screens/Today.jsx';
import { Afford } from './screens/Afford.jsx';
import { Cycle } from './screens/Cycle.jsx';
import { Onboarding } from './screens/Onboarding.jsx';
import { useStore } from './store/useStore.js';

export default function App() {
  const [tab, setTab] = useState('today');
  const [asking, setAsking] = useState(false);
  const { state, storageOk, addMovement, applyReconcile, setSetup } = useStore();

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
          <Today state={state} />
        ) : (
          <Cycle state={state} onReconcile={applyReconcile} />
        )}
      </main>

      <GlassTabBar active={tab} onChange={setTab} onAsk={() => setAsking(true)} />

      <Afford open={asking} onClose={() => setAsking(false)} state={state} onRegister={addMovement} />
    </div>
  );
}
