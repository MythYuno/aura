/**
 * Campi condivisi fra onboarding e modifica. Esistono perché le due schermate
 * chiedono le stesse cose: senza, la seconda sarebbe una copia della prima e
 * le due divergerebbero al primo ritocco.
 */

import { parseAmount } from '../cycle/afford.js';
import { Cell } from './List.jsx';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const centsToRaw = (cents) =>
  cents ? String(cents / 100).replace('.', ',') : '';

export function MoneyField({ value, onChange, label, placeholder = '0,00' }) {
  const broken = value.trim() !== '' && !parseAmount(value);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="decimal"
      placeholder={placeholder}
      aria-label={label}
      aria-invalid={broken || undefined}
      className="w-24 bg-transparent text-right text-[17px] tabular-nums outline-none"
      style={{ color: broken ? 'var(--bad)' : 'var(--label)' }}
    />
  );
}

export function DaySelect({ value, onChange, label, prefix = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      className="bg-transparent text-right text-[17px] outline-none"
      style={{ color: 'var(--label)' }}
    >
      {DAYS.map((d) => (
        <option key={d} value={d}>
          {prefix}
          {d}
        </option>
      ))}
    </select>
  );
}

/**
 * Righe modificabili per le fisse mensili o per gli accantonamenti annuali.
 * Gli aggiornamenti passano tutti dalla forma funzionale: letti dalla chiusura
 * del render, due tocchi ravvicinati su "Aggiungi" ne aggiungerebbero uno solo.
 */
export function EntryRows({ rows, setRows, kind }) {
  const annual = kind === 'setAside';

  const patch = (i, key, value) =>
    setRows((list) => list.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  const add = () =>
    setRows((list) => [
      ...list,
      annual
        ? { label: '', amountRaw: '', dueDate: '' }
        : { label: '', amountRaw: '', dayOfMonth: 1 },
    ]);

  const drop = (i) => setRows((list) => list.filter((_, j) => j !== i));

  return (
    <>
      {rows.map((row, i) => (
        <div key={i} className="ios-cell relative flex items-center gap-2 px-4 py-[11px]">
          <input
            value={row.label}
            onChange={(e) => patch(i, 'label', e.target.value)}
            placeholder={annual ? 'Assicurazione' : 'Affitto'}
            aria-label={`Nome ${annual ? "dell'accantonamento" : 'della spesa fissa'} ${i + 1}`}
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
            style={{ color: 'var(--label)' }}
          />

          {annual ? (
            <input
              type="date"
              value={row.dueDate ?? ''}
              onChange={(e) => patch(i, 'dueDate', e.target.value)}
              aria-label={`Scadenza dell'accantonamento ${i + 1}`}
              required
              className="bg-transparent text-[13px] outline-none"
              style={{ color: row.dueDate ? 'var(--label-2)' : 'var(--bad)' }}
            />
          ) : (
            <select
              value={row.dayOfMonth}
              onChange={(e) => patch(i, 'dayOfMonth', Number(e.target.value))}
              aria-label={`Giorno della spesa fissa ${i + 1}`}
              className="bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--label-2)' }}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  il {d}
                </option>
              ))}
            </select>
          )}

          <MoneyField
            value={row.amountRaw}
            onChange={(v) => patch(i, 'amountRaw', v)}
            label={`Importo ${annual ? "dell'accantonamento" : 'della spesa fissa'} ${i + 1}`}
          />

          <button
            type="button"
            onClick={() => drop(i)}
            aria-label={`Togli la voce ${i + 1}`}
            className="px-1 text-[17px]"
            style={{ color: 'var(--label-3)' }}
          >
            ✕
          </button>
        </div>
      ))}
      <Cell title="Aggiungi una voce" onClick={add} />
    </>
  );
}

/** Le voci incomplete e quelle con un importo illeggibile, per poterlo dire. */
export function invalidRows(rows, kind) {
  return rows.filter((r) => {
    const empty = !r.label.trim() && !r.amountRaw.trim();
    if (empty) return false; // una riga vuota appena aggiunta non è un errore
    if (!r.label.trim() || !parseAmount(r.amountRaw)) return true;
    return kind === 'setAside' && !r.dueDate;
  });
}

export function toFixedEntries(rows) {
  return rows
    .filter((r) => r.label.trim() && parseAmount(r.amountRaw))
    .map((r) => ({
      label: r.label.trim(),
      amountCents: parseAmount(r.amountRaw),
      dayOfMonth: Number(r.dayOfMonth),
    }));
}

export function toSetAsideEntries(rows) {
  return rows
    .filter((r) => r.label.trim() && parseAmount(r.amountRaw) && r.dueDate)
    .map((r) => ({
      label: r.label.trim(),
      amountCents: parseAmount(r.amountRaw),
      dueDate: r.dueDate,
    }));
}
