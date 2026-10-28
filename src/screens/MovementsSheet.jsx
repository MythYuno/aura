/**
 * I movimenti del ciclo, dal più grosso, cancellabili.
 *
 * La spec lo chiede in un punto preciso: quando la banca dice meno di quanto
 * hai registrato, "offre di aprire i movimenti del ciclo ordinati per importo,
 * che è il modo più rapido per trovare un doppione". Senza una lista e senza
 * un modo di cancellare, quel consiglio era solo una frase.
 */

import { inCycle } from '../cycle/day.js';
import { Cell } from '../ui/List.jsx';
import { Money } from '../ui/Money.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { Sheet } from '../ui/Sheet.jsx';

const fmtDay = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });

export function MovementsSheet({ open, onClose, state, cycle, catId = null, onRemove }) {
  const rows = state.movements
    .filter((m) => inCycle(m.date, cycle))
    .filter((m) => (catId ? m.catId === catId : true))
    .sort((a, b) => b.amountCents - a.amountCents);

  const title = catId
    ? (state.categories.find((c) => c.id === catId)?.label ?? 'Categoria')
    : 'Movimenti del ciclo';

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="px-5 pb-2 pt-1 text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
        Dal più grosso: è così che si trova un doppione in fretta.
      </p>

      <div className="px-4 pb-4">
        <div className="ios-group overflow-hidden" style={{ background: 'var(--card)', borderRadius: 'var(--radius-group)' }}>
          {rows.length === 0 && <Cell title="Nessun movimento in questo ciclo" />}
          {rows.map((m) => (
            <Cell
              key={m.id}
              icon={<CategoryIcon catId={m.catId} categories={state.categories} />}
              title={m.label || 'Spesa'}
              subtitle={`${fmtDay.format(new Date(`${m.date}T00:00:00`))}${m.tag === 'untracked' ? ' · dalla verifica' : ''}`}
              value={
                <span className="flex items-center gap-3">
                  <Money cents={m.amountCents} />
                  <button
                    type="button"
                    onClick={() => onRemove(m.id)}
                    aria-label={`Cancella ${m.label || 'spesa'} da ${m.amountCents / 100} euro`}
                    className="text-[15px]"
                    style={{ color: 'var(--bad)' }}
                  >
                    ✕
                  </button>
                </span>
              }
            />
          ))}
        </div>
      </div>
    </Sheet>
  );
}
