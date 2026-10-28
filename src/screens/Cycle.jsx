/**
 * Ciclo: dal 16 al 15, non dal primo del mese.
 *
 * Qui vive la terza domanda, dove sono finiti i soldi. Nessun numero viene
 * ricalcolato in questo file: la scomposizione arriva da `computeBudget`,
 * altrimenti le righe del conto non tornerebbero col libero — ed è esattamente
 * quello che succedeva quando le fisse venivano sommate qui senza filtrarle
 * per giorno dentro il ciclo.
 */

import { useMemo, useState } from 'react';
import { computeBudget, setAsideQuota } from '../cycle/budget.js';
import { cycleLength } from '../cycle/boundaries.js';
import { categoryHistoricalStats } from '../cycle/stats.js';
import { inCycle, toYmd } from '../cycle/day.js';
import { UNTRACKED_TAG } from '../cycle/reconcile.js';
import { Group, Cell } from '../ui/List.jsx';
import { Money } from '../ui/Money.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { ScrollTitle } from '../ui/ScrollTitle.jsx';
import { ReconcileSheet } from './ReconcileSheet.jsx';
import { SetupSheet } from './SetupSheet.jsx';
import { MovementsSheet } from './MovementsSheet.jsx';

const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const BAR_COLOR = { inPari: 'var(--ok)', stringi: 'var(--warn)', sfori: 'var(--bad)' };
const pct = (n) => `${Math.round(n * 100)}%`;

const delta = (s) => {
  if (s.isNew) return 'nuova';
  if (s.deltaPct === 0) return 'come il ciclo scorso';
  return `${s.deltaPct > 0 ? '+' : '−'}${Math.abs(s.deltaPct)}% sul ciclo scorso`;
};

export function Cycle({ state, today, onReconcile, onSaveSetup, onRemoveMovement }) {
  const [editing, setEditing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [listing, setListing] = useState(null); // { cycle, catId }

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
    .reduce((sum, m) => sum + (m.amountCents ?? 0), 0);

  const barWidth = budget.free > 0 ? Math.max(0, Math.min(1, budget.left / budget.free)) : 0;
  const elapsed = cycleLength(budget.cycle) - budget.daysLeft + 1;
  const verified = state.reconciliations?.[toYmd(budget.cycle.end)];

  return (
    <div className="pb-6">
      <ScrollTitle
        title="Ciclo"
        subtitle={`${fmtDayMonth.format(budget.cycle.start)} – ${fmtDayMonth.format(budget.cycle.end)}`}
      />

      <Group header="LIBERI">
        <div className="ios-cell relative px-4 pb-4 pt-[14px]">
          <div className="text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            {budget.left > 0 ? 'Liberi, dopo fisse e obiettivo' : 'Sforamento del ciclo'}
          </div>
          <Money
            cents={budget.left > 0 ? budget.left : -budget.left}
            size="title1"
            style={{ display: 'block', marginTop: 2 }}
          />
          <div className="mt-[5px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            su <Money cents={budget.free} size="foot" /> · {budget.daysLeft}{' '}
            {budget.daysLeft === 1 ? 'giorno rimasto' : 'giorni rimasti'}
          </div>
          <div className="mt-[11px] h-1 overflow-hidden rounded-sm" style={{ background: 'var(--label-3)' }}>
            <div className="h-full rounded-sm" style={{ width: `${barWidth * 100}%`, background: BAR_COLOR[budget.state] }} />
          </div>
        </div>
      </Group>

      <Group header="IL CONTO" footer="Tocca una riga per cambiare l'impianto.">
        <Cell
          title="Stipendio"
          subtitle={`il ${state.payDay} di ogni mese`}
          value={<Money cents={state.income} />}
          chevron
          onClick={() => setEditing(true)}
        />
        <Cell
          title="Spese fisse"
          subtitle={state.fixed.length ? `${state.fixed.length} voci in questo ciclo` : 'nessuna'}
          value={<Money cents={-budget.fixedTotal} />}
          chevron
          onClick={() => setEditing(true)}
        />
        <Cell
          title="Accantonamenti"
          subtitle={state.setAside.length ? 'quota di questo ciclo' : 'nessuno'}
          value={<Money cents={-budget.setAsideTotal} />}
          chevron
          onClick={() => setEditing(true)}
        />
        <Cell
          title="Obiettivo di risparmio"
          value={<Money cents={-budget.goal} />}
          chevron
          onClick={() => setEditing(true)}
        />
      </Group>

      <Group header="DOVE STANNO ANDANDO" footer={rows.length ? undefined : 'Niente registrato in questo ciclo.'}>
        {rows.map(([catId, s]) => (
          <Cell
            key={catId}
            icon={<CategoryIcon catId={catId} categories={state.categories} />}
            title={state.categories.find((c) => c.id === catId)?.label ?? catId}
            subtitle={delta(s)}
            value={<Money cents={s.current} />}
            chevron
            onClick={() => setListing({ cycle: budget.cycle, catId })}
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

      <Group
        header="VERIFICA"
        footer={
          elapsed <= 3
            ? 'Il ciclo è appena iniziato: è il momento di verificare quello che si è chiuso.'
            : 'Un solo numero: il totale uscite del conto.'
        }
      >
        <Cell
          title="La banca dice"
          subtitle={verified ? `copertura ${pct(verified.coverage)}` : 'tocca per inserire il totale'}
          value={verified ? <Money cents={verified.bankTotalCents} /> : '—'}
          chevron
          onClick={() => setVerifying(true)}
        />
        <Cell
          title="Tutti i movimenti del ciclo"
          subtitle="dal più grosso"
          chevron
          onClick={() => setListing({ cycle: budget.cycle, catId: null })}
        />
      </Group>

      <SetupSheet open={editing} onClose={() => setEditing(false)} state={state} onSave={onSaveSetup} />

      <ReconcileSheet
        open={verifying}
        onClose={() => setVerifying(false)}
        state={state}
        today={today}
        onApply={onReconcile}
        onOpenMovements={(cycle) => {
          setVerifying(false);
          setListing({ cycle, catId: null });
        }}
      />

      <MovementsSheet
        open={listing !== null}
        onClose={() => setListing(null)}
        state={state}
        cycle={listing?.cycle ?? budget.cycle}
        catId={listing?.catId ?? null}
        onRemove={onRemoveMovement}
      />
    </div>
  );
}
