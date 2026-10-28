/**
 * Modifica dell'impianto: stipendio, giorno di paga, obiettivo, fisse,
 * accantonamenti.
 *
 * Senza questa schermata l'onboarding era a senso unico: una volta messo
 * `onboarded: true` non era più raggiungibile, e un aumento di stipendio, un
 * affitto che cambia o un importo battuto male restavano per sempre. La spec
 * chiede che ogni riga del conto si apra, e l'onboarding promette "si cambia
 * quando vuoi": questo è il posto dove si cambia.
 */

import { useState } from 'react';
import { parseAmount } from '../cycle/afford.js';
import { Group, Cell } from '../ui/List.jsx';
import { Sheet } from '../ui/Sheet.jsx';
import {
  MoneyField,
  DaySelect,
  EntryRows,
  centsToRaw,
  invalidRows,
  toFixedEntries,
  toSetAsideEntries,
} from '../ui/Fields.jsx';

export function SetupSheet({ open, onClose, state, onSave }) {
  const [payDay, setPayDay] = useState(state.payDay);
  const [incomeRaw, setIncomeRaw] = useState(centsToRaw(state.income));
  const [goalRaw, setGoalRaw] = useState(centsToRaw(state.goal));
  const [fixed, setFixed] = useState(
    state.fixed.map((f) => ({
      label: f.label,
      amountRaw: centsToRaw(f.amountCents),
      dayOfMonth: f.dayOfMonth,
    }))
  );
  const [setAside, setSetAside] = useState(
    state.setAside.map((s) => ({
      label: s.label,
      amountRaw: centsToRaw(s.amountCents),
      dueDate: s.dueDate ?? '',
    }))
  );

  const income = parseAmount(incomeRaw);
  const brokenFixed = invalidRows(fixed, 'fixed');
  const brokenSetAside = invalidRows(setAside, 'setAside');
  const blocked = !income || brokenFixed.length > 0 || brokenSetAside.length > 0;

  const save = () => {
    onSave({
      payDay,
      income,
      goal: parseAmount(goalRaw) ?? 0,
      fixed: toFixedEntries(fixed),
      setAside: toSetAsideEntries(setAside),
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Il tuo impianto">
      <div className="pb-2">
        <Group header="STIPENDIO">
          <Cell
            title="Giorno del mese"
            value={<DaySelect value={payDay} onChange={setPayDay} label="Giorno dello stipendio" />}
          />
          <Cell
            title="Netto in busta"
            value={<MoneyField value={incomeRaw} onChange={setIncomeRaw} label="Stipendio netto" />}
          />
        </Group>

        <Group header="OGNI MESE">
          <EntryRows rows={fixed} setRows={setFixed} kind="fixed" />
        </Group>

        <Group header="UNA VOLTA L'ANNO" footer="La scadenza serve: è su quella che si divide la quota.">
          <EntryRows rows={setAside} setRows={setSetAside} kind="setAside" />
        </Group>

        <Group header="RISPARMIO">
          <Cell
            title="Da parte ogni ciclo"
            value={<MoneyField value={goalRaw} onChange={setGoalRaw} label="Obiettivo di risparmio" />}
          />
        </Group>

        {blocked && (
          <p className="px-9 pt-3 text-[13px] leading-[18px]" style={{ color: 'var(--bad)' }}>
            {!income
              ? "Non riesco a leggere lo stipendio: scrivilo come 1.800,00 oppure 1800."
              : 'Qualche voce è incompleta: serve un nome, un importo leggibile e, per le annuali, la scadenza.'}
          </p>
        )}

        <button
          type="button"
          disabled={blocked}
          onClick={save}
          className="mx-4 mt-4 flex h-[50px] w-[calc(100%-32px)] items-center justify-center text-[17px] font-semibold"
          style={{
            borderRadius: 13,
            background: blocked ? 'rgba(120,120,128,0.18)' : 'var(--accent)',
            color: blocked ? 'var(--label-3)' : 'var(--accent-on)',
            letterSpacing: '-0.022em',
          }}
        >
          Salva
        </button>
      </div>
    </Sheet>
  );
}
