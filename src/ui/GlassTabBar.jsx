/**
 * Tab bar di vetro, iOS 27: bordo definito e nessuna ombra portata — in iOS 26
 * il vetro si staccava con un'ombra, adesso con un contorno più scuro e un
 * highlight interno in alto.
 *
 * La destinazione centrale prende il ruolo `prominent`, che a partire da iOS 27
 * qualunque tab può avere e non più solo la ricerca. Non è un "+" generico:
 * si chiama Posso?, perché la domanda *è* l'azione.
 */

import { House, Question, ChartPieSlice } from '@phosphor-icons/react';

const TABS = [
  { id: 'today', label: 'Oggi', Icon: House },
  { id: 'cycle', label: 'Ciclo', Icon: ChartPieSlice },
];

export function GlassTabBar({ active, onChange, onAsk }) {
  return (
    <nav
      className="flex flex-none items-start justify-around pb-5 pt-[9px]"
      style={{
        background: 'var(--glass)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid var(--glass-border)',
        boxShadow: 'inset 0 1px 0 var(--glass-highlight)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
    >
      <TabButton tab={TABS[0]} active={active} onChange={onChange} />

      <button
        type="button"
        onClick={onAsk}
        className="flex w-[92px] flex-none flex-col items-center"
      >
        <span
          className="flex h-10 w-[62px] items-center justify-center text-[15px] font-semibold"
          style={{
            borderRadius: 20,
            background: 'var(--accent)',
            color: 'var(--accent-on)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
            letterSpacing: '-0.01em',
          }}
        >
          <Question size={20} weight="bold" />
        </span>
        <span className="mt-1 text-[10px] font-medium leading-3" style={{ color: 'var(--label)' }}>
          Posso?
        </span>
      </button>

      <TabButton tab={TABS[1]} active={active} onChange={onChange} />
    </nav>
  );
}

function TabButton({ tab, active, onChange }) {
  const on = active === tab.id;
  const { Icon } = tab;
  return (
    <button
      type="button"
      onClick={() => onChange(tab.id)}
      aria-current={on ? 'page' : undefined}
      className="flex min-w-[72px] flex-1 flex-col items-center"
      style={{ color: on ? 'var(--accent)' : 'var(--label-3)' }}
    >
      <Icon size={26} weight={on ? 'fill' : 'regular'} />
      <span className="mt-[3px] text-[10px] leading-3">{tab.label}</span>
    </button>
  );
}
