/**
 * Tre passi, poi subito la cifra del giorno.
 *
 * Nessun tour, nessuna schermata esplicativa: con tre destinazioni, se serve
 * un tutorial il design ha fallito. L'unica cosa che l'onboarding deve dire e
 * che nessun'altra parte dell'app dirà è dove stanno i dati — perché svuotare
 * i dati del sito li cancella, e il backup è l'unica difesa.
 */

import { useState } from 'react';
import { parseAmount } from '../cycle/afford.js';
import { Group, Cell } from '../ui/List.jsx';
import { formatCents } from '../ui/format.js';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const MoneyField = ({ value, onChange, placeholder = '0,00', label }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    inputMode="decimal"
    placeholder={placeholder}
    aria-label={label}
    className="w-24 bg-transparent text-right text-[17px] tabular-nums outline-none"
    style={{ color: 'var(--label)' }}
  />
);

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [payDay, setPayDay] = useState(16);
  const [incomeRaw, setIncomeRaw] = useState('');
  const [fixed, setFixed] = useState([{ label: '', amountRaw: '', dayOfMonth: 1 }]);
  const [setAside, setSetAside] = useState([]);
  const [goalRaw, setGoalRaw] = useState('');

  const income = parseAmount(incomeRaw);

  const patch = (list, set, i, key, value) =>
    set(list.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  const finish = () => {
    onDone({
      payDay,
      income: income ?? 0,
      fixed: fixed
        .filter((f) => f.label.trim() && parseAmount(f.amountRaw))
        .map((f) => ({
          label: f.label.trim(),
          amountCents: parseAmount(f.amountRaw),
          dayOfMonth: Number(f.dayOfMonth),
        })),
      setAside: setAside
        .filter((s) => s.label.trim() && parseAmount(s.amountRaw))
        .map((s) => ({
          label: s.label.trim(),
          amountCents: parseAmount(s.amountRaw),
          dueDate: s.dueDate || undefined,
        })),
      goal: parseAmount(goalRaw) ?? 0,
      onboarded: true,
    });
  };

  return (
    <div className="pb-8">
      <header className="px-5 pb-1 pt-6">
        <p className="text-[13px] uppercase leading-[18px]" style={{ color: 'var(--label-2)', letterSpacing: '0.06em' }}>
          Passo {step + 1} di 3
        </p>
        <h1 className="text-[34px] font-bold leading-[41px]" style={{ letterSpacing: '-0.026em' }}>
          {step === 0 && 'Quando ti pagano'}
          {step === 1 && 'Cosa esce fisso'}
          {step === 2 && 'Quanto metti da parte'}
        </h1>
      </header>

      {step === 0 && (
        <>
          <Group
            header="STIPENDIO"
            footer="Il ciclo di AURA parte dal giorno in cui ti pagano, non dal primo del mese."
          >
            <Cell
              title="Giorno del mese"
              value={
                <select
                  value={payDay}
                  onChange={(e) => setPayDay(Number(e.target.value))}
                  aria-label="Giorno dello stipendio"
                  className="bg-transparent text-right text-[17px] outline-none"
                  style={{ color: 'var(--label)' }}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              }
            />
            <Cell
              title="Netto in busta"
              value={<MoneyField value={incomeRaw} onChange={setIncomeRaw} label="Stipendio netto" />}
            />
          </Group>
          {incomeRaw && !income && (
            <p className="px-9 pt-2 text-[13px]" style={{ color: 'var(--bad)' }}>
              Non riesco a leggere questo importo.
            </p>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <Group header="OGNI MESE" footer="Affitto, bollette, abbonamenti: quello che esce da solo.">
            {fixed.map((f, i) => (
              <div key={i} className="ios-cell relative flex items-center gap-2 px-4 py-[11px]">
                <input
                  value={f.label}
                  onChange={(e) => patch(fixed, setFixed, i, 'label', e.target.value)}
                  placeholder="Affitto"
                  aria-label={`Nome della spesa fissa ${i + 1}`}
                  className="flex-1 bg-transparent text-[17px] outline-none"
                  style={{ color: 'var(--label)' }}
                />
                <select
                  value={f.dayOfMonth}
                  onChange={(e) => patch(fixed, setFixed, i, 'dayOfMonth', e.target.value)}
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
                <MoneyField
                  value={f.amountRaw}
                  onChange={(v) => patch(fixed, setFixed, i, 'amountRaw', v)}
                  label={`Importo della spesa fissa ${i + 1}`}
                />
              </div>
            ))}
            <Cell
              title="Aggiungi una voce"
              onClick={() => setFixed([...fixed, { label: '', amountRaw: '', dayOfMonth: 1 }])}
            />
          </Group>

          <Group
            header="UNA VOLTA L'ANNO"
            footer="Bollo, assicurazione: AURA ne mette da parte una quota a ogni ciclo, così alla scadenza i soldi ci sono."
          >
            {setAside.map((s, i) => (
              <div key={i} className="ios-cell relative flex items-center gap-2 px-4 py-[11px]">
                <input
                  value={s.label}
                  onChange={(e) => patch(setAside, setSetAside, i, 'label', e.target.value)}
                  placeholder="Assicurazione"
                  aria-label={`Nome dell'accantonamento ${i + 1}`}
                  className="flex-1 bg-transparent text-[17px] outline-none"
                  style={{ color: 'var(--label)' }}
                />
                <input
                  type="date"
                  value={s.dueDate ?? ''}
                  onChange={(e) => patch(setAside, setSetAside, i, 'dueDate', e.target.value)}
                  aria-label={`Scadenza dell'accantonamento ${i + 1}`}
                  className="bg-transparent text-[13px] outline-none"
                  style={{ color: 'var(--label-2)' }}
                />
                <MoneyField
                  value={s.amountRaw}
                  onChange={(v) => patch(setAside, setSetAside, i, 'amountRaw', v)}
                  label={`Importo dell'accantonamento ${i + 1}`}
                />
              </div>
            ))}
            <Cell
              title="Aggiungi una voce"
              onClick={() => setSetAside([...setAside, { label: '', amountRaw: '', dueDate: '' }])}
            />
          </Group>
        </>
      )}

      {step === 2 && (
        <>
          <Group header="RISPARMIO" footer="Per ciclo. Anche zero: si cambia quando vuoi.">
            <Cell
              title="Da parte ogni ciclo"
              value={<MoneyField value={goalRaw} onChange={setGoalRaw} label="Obiettivo di risparmio" />}
            />
          </Group>

          <Group header="DOVE STANNO I TUOI DATI">
            <div className="ios-cell relative px-4 py-3">
              <p className="text-[15px] leading-5" style={{ color: 'var(--label-2)' }}>
                Tutto resta in questo browser. Nessun account, nessun server, nessuno che li legga —
                nemmeno io. Il rovescio è che <strong style={{ color: 'var(--label)' }}>svuotare i dati
                del sito li cancella</strong>, e per adesso non c'è ancora una schermata da cui
                esportarli: non cancellare i dati di questo sito.
              </p>
            </div>
          </Group>

          {income && (
            <p className="px-9 pt-3 text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
              Con {formatCents(income)} al mese dal giorno {payDay}, fra un attimo sai quanto puoi
              spendere oggi.
            </p>
          )}
        </>
      )}

      <div className="flex gap-3 px-4 pt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex h-[50px] flex-1 items-center justify-center text-[17px] font-semibold"
            style={{ borderRadius: 13, background: 'rgba(120,120,128,0.18)', color: 'var(--label)' }}
          >
            Indietro
          </button>
        )}
        <button
          type="button"
          disabled={step === 0 && !income}
          onClick={() => (step === 2 ? finish() : setStep(step + 1))}
          className="flex h-[50px] flex-[2] items-center justify-center text-[17px] font-semibold"
          style={{
            borderRadius: 13,
            background: step === 0 && !income ? 'rgba(120,120,128,0.18)' : 'var(--accent)',
            color: step === 0 && !income ? 'var(--label-3)' : 'var(--accent-on)',
            letterSpacing: '-0.022em',
          }}
        >
          {step === 2 ? 'Inizia' : 'Avanti'}
        </button>
      </div>
    </div>
  );
}
