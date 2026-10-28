/**
 * Tre passi, poi subito la cifra del giorno.
 *
 * Nessun tour: con tre destinazioni, se serve un tutorial il design ha
 * fallito. L'unica cosa che l'onboarding deve dire e che nessun'altra parte
 * dell'app dirà è dove stanno i dati.
 *
 * Tutti gli aggiornamenti di stato passano dalla forma funzionale: letti dalla
 * chiusura del render, due tocchi ravvicinati su "Aggiungi una voce" ne
 * aggiungerebbero una sola.
 */

import { useState } from 'react';
import { parseAmount } from '../cycle/afford.js';
import { Group, Cell } from '../ui/List.jsx';
import { formatCents } from '../ui/format.js';
import {
  MoneyField,
  DaySelect,
  EntryRows,
  invalidRows,
  toFixedEntries,
  toSetAsideEntries,
} from '../ui/Fields.jsx';

const TITLES = ['Quando ti pagano', 'Cosa esce fisso', 'Quanto metti da parte'];

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [payDay, setPayDay] = useState(16);
  const [incomeRaw, setIncomeRaw] = useState('');
  const [fixed, setFixed] = useState([{ label: '', amountRaw: '', dayOfMonth: 1 }]);
  const [setAside, setSetAside] = useState([]);
  const [goalRaw, setGoalRaw] = useState('');

  const income = parseAmount(incomeRaw);
  const brokenFixed = invalidRows(fixed, 'fixed');
  const brokenSetAside = invalidRows(setAside, 'setAside');
  const goalBroken = goalRaw.trim() !== '' && !parseAmount(goalRaw);

  const blocked =
    (step === 0 && !income) ||
    (step === 1 && (brokenFixed.length > 0 || brokenSetAside.length > 0)) ||
    (step === 2 && goalBroken);

  const finish = () =>
    onDone({
      payDay,
      income: income ?? 0,
      fixed: toFixedEntries(fixed),
      setAside: toSetAsideEntries(setAside),
      goal: parseAmount(goalRaw) ?? 0,
      onboarded: true,
    });

  return (
    <div className="pb-8">
      <header className="px-5 pb-1 pt-6">
        <p
          className="text-[13px] uppercase leading-[18px]"
          style={{ color: 'var(--label-2)', letterSpacing: '0.06em' }}
        >
          Passo {step + 1} di 3
        </p>
        <h1 className="text-[34px] font-bold leading-[41px]" style={{ letterSpacing: '-0.026em' }}>
          {TITLES[step]}
        </h1>
      </header>

      {step === 0 && (
        <Group
          header="STIPENDIO"
          footer="Il ciclo di AURA parte dal giorno in cui ti pagano, non dal primo del mese."
        >
          <Cell
            title="Giorno del mese"
            value={<DaySelect value={payDay} onChange={setPayDay} label="Giorno dello stipendio" />}
          />
          <Cell
            title="Netto in busta"
            value={<MoneyField value={incomeRaw} onChange={setIncomeRaw} label="Stipendio netto" />}
          />
        </Group>
      )}

      {step === 1 && (
        <>
          <Group header="OGNI MESE" footer="Affitto, bollette, abbonamenti: quello che esce da solo.">
            <EntryRows rows={fixed} setRows={setFixed} kind="fixed" />
          </Group>
          <Group
            header="UNA VOLTA L'ANNO"
            footer="Bollo, assicurazione: AURA ne mette da parte una quota a ogni ciclo. La scadenza serve, è su quella che si divide."
          >
            <EntryRows rows={setAside} setRows={setSetAside} kind="setAside" />
          </Group>
        </>
      )}

      {step === 2 && (
        <>
          <Group header="RISPARMIO" footer="Per ciclo. Anche zero: si cambia quando vuoi, dalla schermata Ciclo.">
            <Cell
              title="Da parte ogni ciclo"
              value={<MoneyField value={goalRaw} onChange={setGoalRaw} label="Obiettivo di risparmio" />}
            />
          </Group>

          <Group header="DOVE STANNO I TUOI DATI">
            <div className="ios-cell relative px-4 py-3">
              <p className="text-[15px] leading-5" style={{ color: 'var(--label-2)' }}>
                Tutto resta in questo browser. Nessun account, nessun server, nessuno che li legga —
                nemmeno io. Il rovescio è che{' '}
                <strong style={{ color: 'var(--label)' }}>svuotare i dati del sito li cancella</strong>,
                e per adesso non c'è ancora una schermata da cui esportarli: non cancellare i dati di
                questo sito.
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

      {blocked && (
        <p className="px-9 pt-3 text-[13px] leading-[18px]" style={{ color: 'var(--bad)' }}>
          {step === 0 && "Non riesco a leggere questo importo: scrivilo come 1.800,00 oppure 1800."}
          {step === 1 &&
            'Qualche voce è incompleta: serve un nome, un importo leggibile e, per le annuali, la scadenza. Togli la riga se non ti serve.'}
          {step === 2 && "Non riesco a leggere questo importo."}
        </p>
      )}

      <div className="flex gap-3 px-4 pt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex h-[50px] flex-1 items-center justify-center text-[17px] font-semibold"
            style={{ borderRadius: 13, background: 'rgba(120,120,128,0.18)', color: 'var(--label)' }}
          >
            Indietro
          </button>
        )}
        <button
          type="button"
          disabled={blocked}
          onClick={() => (step === 2 ? finish() : setStep((s) => s + 1))}
          className="flex h-[50px] flex-[2] items-center justify-center text-[17px] font-semibold"
          style={{
            borderRadius: 13,
            background: blocked ? 'rgba(120,120,128,0.18)' : 'var(--accent)',
            color: blocked ? 'var(--label-3)' : 'var(--accent-on)',
            letterSpacing: '-0.022em',
          }}
        >
          {step === 2 ? 'Inizia' : 'Avanti'}
        </button>
      </div>
    </div>
  );
}
