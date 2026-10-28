import { useState } from 'react';

/**
 * Guscio. Tre destinazioni e niente altro: le schermate arrivano ai Task 9-12,
 * la tab bar di vetro al Task 8. Qui c'è solo il markup minimo che tiene in
 * piedi la navigazione, così la build resta verde mentre il motore si costruisce.
 */

const TABS = [
  { id: 'today', label: 'Oggi' },
  { id: 'afford', label: 'Posso?', prominent: true },
  { id: 'cycle', label: 'Ciclo' },
];

export default function App() {
  const [tab, setTab] = useState('today');

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <p className="p-5 text-[15px]" style={{ color: 'var(--label-2)' }}>
          {TABS.find((t) => t.id === tab).label}
        </p>
      </main>

      <nav
        className="flex items-start justify-around pb-5 pt-2"
        style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '1px solid var(--glass-border)',
          boxShadow: 'inset 0 1px 0 var(--glass-highlight)',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className="min-w-[72px] px-3 py-2 text-[10px]"
            style={{ color: tab === t.id ? 'var(--accent)' : 'var(--label-3)' }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
