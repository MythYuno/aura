/**
 * Posso permettermelo? — e, se poi spendi, la registrazione.
 *
 * Non sono due funzioni: sono la stessa schermata. Digiti l'importo, AURA
 * risponde *prima* della spesa, e `Registra` chiude il giro. È da questa
 * fusione che nasce l'inserimento in due tap, non da un form più corto.
 */

import { useMemo, useState } from 'react';
import { parseAmount, evaluateAffordability, suggestTrim } from '../cycle/afford.js';
import { computeBudget } from '../cycle/budget.js';
import { categoryHistoricalStats } from '../cycle/stats.js';
import { suggestCategory, frequentExpenses } from '../cycle/suggest.js';
import { Sheet } from '../ui/Sheet.jsx';
import { Numpad } from '../ui/Numpad.jsx';
import { Money, formatCents } from '../ui/Money.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';

const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });

const VERDICT_COLOR = { si: 'var(--ok)', siMaStringi: 'var(--warn)', no: 'var(--bad)' };
const VERDICT_TITLE = { si: 'Sì', siMaStringi: 'Sì, ma stringi', no: 'No' };

export function Afford({ open, onClose, state, onRegister, today = new Date() }) {
  const [raw, setRaw] = useState('');
  const [label, setLabel] = useState('');
  const [catId, setCatId] = useState(null);

  const budget = useMemo(() => computeBudget({ ...state, today }), [state, today]);
  const stats = useMemo(
    () => categoryHistoricalStats(state.movements, budget.cycle, state.payDay, 3),
    [state.movements, budget.cycle, state.payDay]
  );
  const frequent = useMemo(() => frequentExpenses(state.movements, 4), [state.movements]);

  const amountCents = parseAmount(raw);
  const verdict = amountCents ? evaluateAffordability(amountCents, budget) : null;
  const trim = verdict?.verdict === 'no' ? suggestTrim(amountCents, budget, stats) : [];

  const guessed = catId ?? suggestCategory(label, state.movements);

  // La guardia sulla virgola va DENTRO l'aggiornamento funzionale: letta dalla
  // chiusura del render, su due tap ravvicinati vedrebbe un valore vecchio e
  // lascerebbe passare la seconda virgola.
  const press = (k) => {
    setRaw((r) => {
      if (k === 'back') return r.slice(0, -1);
      if (k === ',' && r.includes(',')) return r;
      return r.length < 12 ? r + k : r;
    });
  };

  const fill = (f) => {
    setRaw(String(f.amountCents / 100).replace('.', ','));
    setLabel(f.label);
    setCatId(f.catId);
  };

  const reset = () => {
    setRaw('');
    setLabel('');
    setCatId(null);
  };

  const register = () => {
    onRegister({
      amountCents,
      label: label.trim() || 'Spesa',
      catId: guessed ?? 'other',
      bound: 'free',
    });
    reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Posso permettermelo?"
    >
      <div className="pt-2 text-center">
        <div
          className="tabular-nums text-[44px] font-semibold leading-[50px]"
          style={{ letterSpacing: '-0.03em', color: raw ? 'var(--label)' : 'var(--label-3)' }}
        >
          {amountCents ? formatCents(amountCents) : raw || '0,00 €'}
        </div>
        <input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setCatId(null);
          }}
          placeholder="per cosa?"
          className="mt-1 w-full bg-transparent text-center text-[13px] outline-none"
          style={{ color: 'var(--label-2)' }}
        />
      </div>

      {verdict && (
        <div className="mx-4 mt-[10px] rounded-[11px] px-[15px] py-[13px]" style={{ background: 'var(--card)' }}>
          <div
            className="text-[17px] font-semibold"
            style={{ letterSpacing: '-0.022em', color: VERDICT_COLOR[verdict.verdict] }}
          >
            {VERDICT_TITLE[verdict.verdict]}
          </div>
          <p className="mt-[3px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
            {verdict.verdict === 'si' && 'Non intacca il ritmo del ciclo.'}
            {verdict.verdict === 'siMaStringi' && (
              <>
                Il giornaliero scende da <strong>{formatCents(budget.perDay)}</strong> a{' '}
                <strong>{formatCents(verdict.newPerDay)}</strong> per i {budget.daysLeft} giorni che
                restano al {fmtDayMonth.format(budget.cycle.end)}. Resti dentro, con{' '}
                {formatCents(verdict.margin)} di margine.
              </>
            )}
            {verdict.verdict === 'no' && (
              <>
                Sforeresti di <strong>{formatCents(verdict.overBy)}</strong> entro il{' '}
                {fmtDayMonth.format(budget.cycle.end)}.
              </>
            )}
          </p>

          {trim.length > 0 && (
            <ul className="mt-2 border-t pt-2 text-[13px] leading-[18px]" style={{ borderColor: 'var(--separator)', color: 'var(--label-2)' }}>
              {trim.map((t) => (
                <li key={t.catId}>
                  Taglia {formatCents(t.cutCents)} su{' '}
                  {state.categories.find((c) => c.id === t.catId)?.label ?? t.catId}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {frequent.length > 0 && !raw && (
        <div className="flex flex-wrap gap-[7px] px-4 pt-3">
          {frequent.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => fill(f)}
              className="flex items-center gap-2 rounded-[15px] px-3 py-[6px] text-[13px]"
              style={{ background: 'var(--card)' }}
            >
              <CategoryIcon catId={f.catId} categories={state.categories} size={18} />
              {f.label} · <Money cents={f.amountCents} size="foot" />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-[7px] px-4 pt-3">
        {state.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCatId(c.id)}
            aria-pressed={guessed === c.id}
            className="rounded-[15px] px-3 py-[6px] text-[13px]"
            style={{
              background: guessed === c.id ? 'var(--accent)' : 'rgba(120,120,128,0.14)',
              color: guessed === c.id ? 'var(--accent-on)' : 'var(--label)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Numpad onPress={press} />

      <button
        type="button"
        disabled={!amountCents}
        onClick={register}
        className="mx-4 mt-3 flex h-[50px] w-[calc(100%-32px)] items-center justify-center text-[17px] font-semibold"
        style={{
          borderRadius: 13,
          background: amountCents ? 'var(--accent)' : 'rgba(120,120,128,0.18)',
          color: amountCents ? 'var(--accent-on)' : 'var(--label-3)',
          letterSpacing: '-0.022em',
        }}
      >
        {amountCents ? `Registra ${formatCents(amountCents)}` : 'Registra'}
      </button>
    </Sheet>
  );
}
