import { useState } from 'react';
import { GlassTabBar } from './ui/GlassTabBar.jsx';

/**
 * Guscio a tre destinazioni. Le schermate arrivano ai Task 9-12.
 */

export default function App() {
  const [tab, setTab] = useState('today');

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <p className="p-5 text-[15px]" style={{ color: 'var(--label-2)' }}>
          {tab === 'today' ? 'Oggi' : 'Ciclo'}
        </p>
      </main>
      <GlassTabBar active={tab} onChange={setTab} onAsk={() => setTab('today')} />
    </div>
  );
}
