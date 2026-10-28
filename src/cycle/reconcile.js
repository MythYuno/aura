/**
 * Riconciliazione col saldo: l'anti-oblio.
 *
 * A fine ciclo si digita un solo numero, il totale uscite che dice la banca.
 * Da quello nasce la **copertura**, che è il numero più importante dell'app:
 * una mappa incompleta che dichiara la propria incompletezza si può usare,
 * una che finge di essere completa no.
 */

import { inCycle, toYmd } from './day.js';

export const UNTRACKED_TAG = 'untracked';
export const UNTRACKED_LABEL = 'Non tracciato';

export function reconcile(bankTotalCents, movements, cycle) {
  // Le voci non tracciate di una riconciliazione precedente restano fuori dal
  // conto: altrimenti riconciliare due volte lo stesso ciclo raddoppierebbe
  // il buco invece di confermarlo.
  const tracked = movements.reduce(
    (sum, m) =>
      m.tag !== UNTRACKED_TAG && inCycle(m.date, cycle) ? sum + (m.amountCents ?? 0) : sum,
    0
  );

  const gap = bankTotalCents - tracked;

  // Con la banca a zero non c'è nulla da coprire: la copertura è piena, non
  // una divisione per zero. E non supera mai 1, nemmeno quando hai registrato
  // più di quanto è uscito.
  const coverage = bankTotalCents > 0 ? Math.min(1, tracked / bankTotalCents) : 1;

  // Scostamento negativo: doppione, rimborso, o contante che non passa dal
  // conto. Non si corregge niente d'ufficio, lo si dice e basta.
  const untracked =
    gap > 0
      ? {
          amountCents: gap,
          label: UNTRACKED_LABEL,
          bound: 'free',
          catId: null,
          tag: UNTRACKED_TAG,
          date: toYmd(cycle.end),
        }
      : null;

  return { gap, coverage, untracked };
}
