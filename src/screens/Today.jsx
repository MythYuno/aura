/**
 * Oggi: quanto puoi spendere, cosa hai speso, cosa sta per uscire.
 *
 * La cifra è un Title 1 da 28 pt in grafite, non un hero. Il colore dello
 * stato vive sulla barra: se lo mettessimo sulla cifra, verde, ambra e rosso
 * smetterebbero di essere il responso e diventerebbero decorazione.
 *
 * "In arrivo" non è un extra: un "puoi spendere 42,80" con l'affitto che esce
 * fra tre giorni è una mezza verità, e quelle fisse sono già sottratte dal
 * conto — stanno lì perché tu le veda, non perché contino due volte.
 */

import { useMemo } from 'react';
import { computeBudget } from '../cycle/budget.js';
import { fixedDateIn, toDay, toYmd } from '../cycle/day.js';
import { UNTRACKED_TAG } from '../cycle/reconcile.js';
import { Group, Cell } from '../ui/List.jsx';
import { Money } from '../ui/Money.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { ScrollTitle } from '../ui/ScrollTitle.jsx';

const BAR_COLOR = { inPari: 'var(--ok)', stringi: 'var(--warn)', sfori: 'var(--bad)' };

const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const fmtWeekday = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export function Today({ state, today }) {
  const budget = useMemo(() => computeBudget({ ...state, today }), [state, today]);
  const todayKey = toYmd(today);

  // La voce non tracciata è datata a fine ciclo: nell'ultimo giorno finirebbe
  // sotto "Oggi" come se l'avessi spesa stamattina.
  const spentToday = state.movements.filter(
    (m) => m.date === todayKey && m.tag !== UNTRACKED_TAG
  );

  const upcoming = state.fixed
    .map((f) => ({ ...f, when: fixedDateIn(f.dayOfMonth, budget.cycle) }))
    .filter((f) => f.when && f.when >= toDay(today))
    .sort((a, b) => a.when - b.when);

  const barWidth = budget.free > 0 ? Math.max(0, Math.min(1, budget.left / budget.free)) : 0;
  const over = budget.left < 0;

  return (
    <div className="pb-6">
      <ScrollTitle title="Oggi" subtitle={fmtWeekday.format(today)} />

      <Group header="DISPONIBILE">
        <div className="ios-cell relative px-4 pb-4 pt-[14px]">
          <div className="text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            {budget.state === 'sfori' ? 'Hai finito il budget del ciclo' : 'Puoi spendere oggi'}
          </div>
          <Money cents={budget.perDay} size="title1" style={{ display: 'block', marginTop: 2 }} />
          <div className="mt-[5px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            {budget.daysLeft === 1
              ? `ultimo giorno del ciclo · ${fmtDayMonth.format(budget.cycle.end)}`
              : `restano ${budget.daysLeft} giorni al ${fmtDayMonth.format(budget.cycle.end)}`}
            {budget.left > 0 && (
              <>
                {' · '}
                <Money cents={budget.left} size="foot" /> liberi
              </>
            )}
            {/* Lo sforamento va detto, non sottinteso: la cifra sopra è zero
                proprio quando il numero che serve è di quanto sei sotto. */}
            {over && (
              <>
                {' · sforato di '}
                <strong style={{ color: 'var(--bad)' }}>
                  <Money cents={-budget.left} size="foot" />
                </strong>
              </>
            )}
          </div>
          <div className="mt-[11px] h-1 overflow-hidden rounded-sm" style={{ background: 'var(--label-3)' }}>
            <div
              className="h-full rounded-sm"
              style={{ width: `${barWidth * 100}%`, background: BAR_COLOR[budget.state] }}
            />
          </div>
        </div>
      </Group>

      <Group header="OGGI" footer={spentToday.length ? undefined : 'Niente registrato oggi.'}>
        {spentToday.length ? (
          spentToday.map((m) => (
            <Cell
              key={m.id}
              icon={<CategoryIcon catId={m.catId} categories={state.categories} />}
              title={m.label || 'Spesa'}
              subtitle={m.note}
              value={<Money cents={m.amountCents} />}
            />
          ))
        ) : (
          <Cell title="Nessuna spesa" subtitle="tocca Posso? per registrarne una" />
        )}
      </Group>

      {upcoming.length > 0 && (
        <Group header="IN ARRIVO" footer="Già sottratte dal disponibile: sono qui perché tu le veda.">
          {upcoming.map((f, i) => (
            <Cell
              key={`${f.label}-${f.dayOfMonth}-${i}`}
              title={f.label}
              subtitle={fmtDayMonth.format(f.when)}
              value={<Money cents={f.amountCents} />}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
