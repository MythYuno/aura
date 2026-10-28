/**
 * La verifica: un solo numero, il totale uscite che dice la banca.
 *
 * In cambio la **copertura**, che è il numero più importante dell'app. Una
 * mappa incompleta che dichiara la propria incompletezza si può usare; una che
 * finge di essere completa, no.
 */

import { useMemo, useState } from 'react';
import { parseAmount } from '../cycle/afford.js';
import { reconcile } from '../cycle/reconcile.js';
import { formatCents } from '../ui/format.js';
import { Sheet } from '../ui/Sheet.jsx';

const pct = (n) => `${Math.round(n * 100)}%`;

export function ReconcileSheet({ open, onClose, state, cycle, onApply }) {
  const [raw, setRaw] = useState('');
  const bankCents = parseAmount(raw);

  const result = useMemo(
    () => (bankCents ? reconcile(bankCents, state.movements, cycle) : null),
    [bankCents, state.movements, cycle]
  );

  const close = () => {
    setRaw('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Quanto dice la banca">
      <p className="px-5 pb-3 pt-1 text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
        Il totale delle uscite del ciclo, come lo vedi sul conto. Serve a sapere quanto della tua
        mappa è vera.
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
            <p className="mt-[3px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
              Hai registrato <strong>{formatCents(-result.gap)}</strong> più di quanto la banca dice
              uscito. Non correggo niente: può essere un doppione, un rimborso, o contante che non
              passa dal conto. Il modo più rapido di trovare un doppione è guardare i movimenti del
              ciclo dal più grosso.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!bankCents}
        onClick={() => {
          onApply(bankCents);
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
