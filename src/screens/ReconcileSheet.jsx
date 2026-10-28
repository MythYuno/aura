/**
 * La verifica: un solo numero, il totale uscite che dice la banca.
 *
 * In cambio la **copertura**, che è il numero più importante dell'app. Una
 * mappa incompleta che dichiara la propria incompletezza si può usare; una che
 * finge di essere completa, no.
 *
 * Due cose qui non sono dettagli. La prima: si scegli *quale* ciclo verificare,
 * perché il momento naturale è il giorno dello stipendio e in quel momento il
 * ciclo da verificare è quello appena chiuso, non quello appena nato. La
 * seconda: le spese fisse del ciclo entrano nel confronto, perché il totale
 * della banca le contiene mentre i movimenti registrati no.
 */

import { useMemo, useState } from 'react';
import { parseAmount } from '../cycle/afford.js';
import { computeBudget } from '../cycle/budget.js';
import { previousCycle } from '../cycle/boundaries.js';
import { reconcile } from '../cycle/reconcile.js';
import { toYmd } from '../cycle/day.js';
import { formatCents } from '../ui/format.js';
import { Sheet } from '../ui/Sheet.jsx';

const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const pct = (n) => `${Math.round(n * 100)}%`;

export function ReconcileSheet({ open, onClose, state, today = new Date(), onApply, onOpenMovements }) {
  const [raw, setRaw] = useState('');
  const [which, setWhich] = useState('closed');

  const current = useMemo(() => computeBudget({ ...state, today }), [state, today]);
  const closed = useMemo(() => {
    const prev = previousCycle(current.cycle, state.payDay);
    return computeBudget({ ...state, today: prev.end });
  }, [current.cycle, state]);

  const target = which === 'closed' ? closed : current;
  const bankCents = parseAmount(raw);

  const result = useMemo(
    () =>
      bankCents
        ? reconcile(bankCents, state.movements, target.cycle, target.fixedTotal)
        : null,
    [bankCents, state.movements, target]
  );

  const already = state.reconciliations?.[toYmd(target.cycle.end)];

  const close = () => {
    setRaw('');
    onClose();
  };

  const option = (key, label, c) => (
    <button
      key={key}
      type="button"
      onClick={() => setWhich(key)}
      aria-pressed={which === key}
      className="flex-1 rounded-[9px] py-[6px] text-[13px]"
      style={{
        background: which === key ? 'var(--card)' : 'transparent',
        color: which === key ? 'var(--label)' : 'var(--label-2)',
        boxShadow: which === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {label}
      <span className="block text-[11px]" style={{ color: 'var(--label-3)' }}>
        {fmtDayMonth.format(c.cycle.start)} – {fmtDayMonth.format(c.cycle.end)}
      </span>
    </button>
  );

  return (
    <Sheet open={open} onClose={close} title="Quanto dice la banca">
      <div className="mx-4 mt-1 flex gap-1 rounded-[11px] p-[3px]" style={{ background: 'rgba(120,120,128,0.14)' }}>
        {option('closed', 'Ciclo chiuso', closed)}
        {option('current', 'Ciclo in corso', current)}
      </div>

      <p className="px-5 pb-3 pt-3 text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
        Il totale delle uscite del ciclo, come lo vedi sul conto. Le spese fisse sono comprese: ci
        penso io a non contarle due volte.
        {already && (
          <>
            {' '}
            L'ultima volta avevi dichiarato {formatCents(already.bankTotalCents)}, copertura{' '}
            {pct(already.coverage)}.
          </>
        )}
      </p>

      <div className="mx-4 rounded-[11px] px-4 py-3" style={{ background: 'var(--card)' }}>
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          aria-label="Totale uscite della banca"
          className="w-full bg-transparent text-center text-[28px] font-semibold tabular-nums outline-none"
          style={{ color: 'var(--label)', letterSpacing: '-0.023em' }}
        />
      </div>

      {result && (
        <div className="mx-4 mt-[10px] rounded-[11px] px-[15px] py-[13px]" style={{ background: 'var(--card)' }}>
          <div className="text-[17px] font-semibold" style={{ letterSpacing: '-0.022em' }}>
            Hai registrato il {pct(result.coverage)} di quello che è uscito
          </div>

          {result.gap > 0 && (
            <p className="mt-[3px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
              Mancano <strong>{formatCents(result.gap)}</strong>. Li segno come spesa non tracciata:
              entrano nei totali del ciclo ma non in nessuna categoria.
            </p>
          )}

          {result.gap === 0 && (
            <p className="mt-[3px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
              Tutto quadra: niente da aggiungere.
            </p>
          )}

          {result.gap < 0 && (
            <>
              <p className="mt-[3px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
                Hai registrato <strong>{formatCents(-result.gap)}</strong> più di quanto la banca dice
                uscito. Non correggo niente: può essere un doppione, un rimborso, o contante che non
                passa dal conto.
              </p>
              <button
                type="button"
                onClick={() => onOpenMovements(target.cycle)}
                className="mt-2 text-[15px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                Apri i movimenti dal più grosso
              </button>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!bankCents}
        onClick={() => {
          onApply(bankCents, target.cycle, target.fixedTotal);
          close();
        }}
        className="mx-4 mb-2 mt-3 flex h-[50px] w-[calc(100%-32px)] items-center justify-center text-[17px] font-semibold"
        style={{
          borderRadius: 13,
          background: bankCents ? 'var(--accent)' : 'rgba(120,120,128,0.18)',
          color: bankCents ? 'var(--accent-on)' : 'var(--label-3)',
          letterSpacing: '-0.022em',
        }}
      >
        {result && result.gap > 0 ? 'Segna il mancante' : 'Conferma'}
      </button>
    </Sheet>
  );
}
