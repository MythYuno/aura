/**
 * Ciclo: dal 16 al 15, non dal primo del mese.
 *
 * Qui vive la terza domanda, dove sono finiti i soldi, e l'obiettivo di
 * risparmio è **una riga** — non una schermata da 418 righe come nella v0.8.
 */

import { useMemo, useState } from 'react';
import { computeBudget, setAsideQuota } from '../cycle/budget.js';
import { categoryHistoricalStats } from '../cycle/stats.js';
import { inCycle } from '../cycle/day.js';
import { UNTRACKED_TAG } from '../cycle/reconcile.js';
import { Group, Cell } from '../ui/List.jsx';
import { Money } from '../ui/Money.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { ScrollTitle } from '../ui/ScrollTitle.jsx';
import { Sheet } from '../ui/Sheet.jsx';
import { ReconcileSheet } from './ReconcileSheet.jsx';

const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const BAR_COLOR = { inPari: 'var(--ok)', stringi: 'var(--warn)', sfori: 'var(--bad)' };

const delta = (s) => {
  if (s.isNew) return 'nuova';
  if (s.deltaPct === 0) return 'come il ciclo scorso';
  return `${s.deltaPct > 0 ? '+' : '−'}${Math.abs(s.deltaPct)}% sul ciclo scorso`;
};

export function Cycle({ state, onReconcile, today = new Date() }) {
  const [detail, setDetail] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const budget = useMemo(() => computeBudget({ ...state, today }), [state, today]);
  const stats = useMemo(
    () => categoryHistoricalStats(state.movements, budget.cycle, state.payDay, 3),
    [state.movements, budget.cycle, state.payDay]
  );

  const rows = [...stats.entries()]
    .filter(([, s]) => s.current > 0)
    .sort((a, b) => b[1].current - a[1].current);

  const untracked = state.movements
    .filter((m) => m.tag === UNTRACKED_TAG && inCycle(m.date, budget.cycle))
    .reduce((sum, m) => sum + m.amountCents, 0);

  const fixedTotal = state.fixed.reduce((sum, f) => sum + f.amountCents, 0);
  const setAsideTotal = state.setAside.reduce(
    (sum, s) => sum + setAsideQuota(s, budget.cycle, state.payDay),
    0
  );
  const barWidth = budget.free > 0 ? Math.max(0, Math.min(1, budget.left / budget.free)) : 0;

  return (
    <div className="pb-6">
      <ScrollTitle
        title="Ciclo"
        subtitle={`${fmtDayMonth.format(budget.cycle.start)} – ${fmtDayMonth.format(budget.cycle.end)}`}
      />

      <Group header="LIBERI">
        <div className="ios-cell relative px-4 pb-4 pt-[14px]">
          <div className="text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            Liberi, dopo fisse e obiettivo
          </div>
          <Money cents={budget.left} size="title1" style={{ display: 'block', marginTop: 2 }} />
          <div className="mt-[5px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            su <Money cents={budget.free} size="foot" /> · {budget.daysLeft}{' '}
            {budget.daysLeft === 1 ? 'giorno rimasto' : 'giorni rimasti'}
          </div>
          <div className="mt-[11px] h-1 overflow-hidden rounded-sm" style={{ background: 'var(--label-3)' }}>
            <div className="h-full rounded-sm" style={{ width: `${barWidth * 100}%`, background: BAR_COLOR[budget.state] }} />
          </div>
        </div>
      </Group>

      <Group header="IL CONTO">
        <Cell
          title="Stipendio"
          subtitle={`il ${state.payDay} di ogni mese`}
          value={<Money cents={state.income} />}
        />
        <Cell
          title="Spese fisse"
          subtitle={state.fixed.length ? `${state.fixed.length} voci` : 'nessuna'}
          value={<Money cents={-fixedTotal} />}
          chevron={state.fixed.length > 0}
          onClick={state.fixed.length ? () => setDetail('fixed') : undefined}
        />
        <Cell
          title="Accantonamenti"
          subtitle={state.setAside.length ? 'quota di questo ciclo' : 'nessuno'}
          value={<Money cents={-setAsideTotal} />}
          chevron={state.setAside.length > 0}
          onClick={state.setAside.length ? () => setDetail('setAside') : undefined}
        />
        <Cell title="Obiettivo di risparmio" value={<Money cents={-state.goal} />} />
      </Group>

      <Group header="DOVE STANNO ANDANDO" footer={rows.length ? undefined : 'Niente registrato in questo ciclo.'}>
        {rows.map(([catId, s]) => (
          <Cell
            key={catId}
            icon={<CategoryIcon catId={catId} categories={state.categories} />}
            title={state.categories.find((c) => c.id === catId)?.label ?? catId}
            subtitle={delta(s)}
            value={<Money cents={s.current} />}
          />
        ))}
        {untracked > 0 && (
          <Cell
            title="Non tracciato"
            subtitle="emerso dalla verifica col conto"
            value={<Money cents={untracked} />}
          />
        )}
        {rows.length === 0 && untracked === 0 && <Cell title="Nessuna spesa" />}
      </Group>

      <Group header="VERIFICA" footer="Un solo numero: il totale uscite del conto.">
        <Cell
          title="La banca dice"
          subtitle="tocca per inserire il totale"
          value={untracked > 0 ? 'verificato' : '—'}
          chevron
          onClick={() => setVerifying(true)}
        />
      </Group>

      <Sheet
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail === 'fixed' ? 'Spese fisse' : 'Accantonamenti'}
      >
        <div className="px-4 pb-4 pt-2">
          <div className="overflow-hidden rounded-[11px]" style={{ background: 'var(--card)' }}>
            {(detail === 'fixed' ? state.fixed : state.setAside).map((e, i) => (
              <Cell
                key={`${e.label}-${i}`}
                title={e.label}
                subtitle={
                  detail === 'fixed'
                    ? `il ${e.dayOfMonth} del mese`
                    : e.dueDate
                      ? `scade il ${e.dueDate}`
                      : 'ogni ciclo'
                }
                value={
                  <Money
                    cents={
                      detail === 'fixed'
                        ? e.amountCents
                        : setAsideQuota(e, budget.cycle, state.payDay)
                    }
                  />
                }
              />
            ))}
          </div>
        </div>
      </Sheet>

      <ReconcileSheet
        open={verifying}
        onClose={() => setVerifying(false)}
        state={state}
        cycle={budget.cycle}
        onApply={onReconcile}
      />
    </div>
  );
}
