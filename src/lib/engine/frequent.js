// ─────────────────────────────────────────────────────────────────────────
// LE TUE SOLITE — le spese che ripeti, pronte in un tap.
//
// L'attrito è il motivo numero uno per cui si smette di segnare le spese:
// il caffè da 1,20 non vale trenta secondi di digitazione. Qui troviamo le
// combinazioni descrizione+importo che si ripetono, così basta toccarle.
//
// Funzione PURA: nessun side-effect, testabile.
// ─────────────────────────────────────────────────────────────────────────

import { realCost, round2 } from '../format.js';

const DAY = 864e5;

/** Normalizza la descrizione per raggruppare "Caffè", "caffe", "CAFFÈ ". */
const normLabel = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // via accenti (combining marks)
  .replace(/\s+/g, ' ')
  .trim();

/**
 * frequentExpenses — le spese che l'utente ripete più spesso.
 *
 * Raggruppa per DESCRIZIONE (è la parte noiosa da digitare; l'importo di una
 * spesa al supermercato cambia ogni volta) e propone l'ultimo importo pagato,
 * che è più prevedibile di una media. Servono almeno 2 occorrenze: una spesa
 * fatta una volta sola non è un'abitudine.
 *
 * @param {Array}  txs      tutte le transazioni
 * @param {object} opts     { days=60, limit=4, minCount=2, now=Date.now() }
 * @returns {Array<{label:string, amount:number, catId:string, count:number}>}
 *          ordinate per frequenza, poi per data più recente
 */
export function frequentExpenses(txs = [], opts = {}) {
  const { days = 60, limit = 4, minCount = 2, now = Date.now() } = opts;
  const from = now - days * DAY;

  const groups = new Map();
  for (const t of txs) {
    if (!t || t.ts < from) continue;
    const label = String(t.label || '').trim();
    if (!label) continue;                                    // senza nome non è ripetibile
    if (Array.isArray(t.tags) && t.tags.includes('non-tracciato')) continue; // non è una spesa vera
    const cost = realCost(t);
    if (!(cost > 0)) continue;

    const key = normLabel(label);
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      // L'occorrenza più recente detta importo, nome (con le maiuscole giuste)
      // e categoria: se hai cambiato categoria, vale l'ultima scelta.
      if (t.ts > g.lastTs) { g.lastTs = t.ts; g.label = label; g.catId = t.cat; g.lastAmount = cost; }
    } else {
      groups.set(key, { label, catId: t.cat, count: 1, lastAmount: cost, lastTs: t.ts });
    }
  }

  return [...groups.values()]
    .filter((g) => g.count >= minCount)
    .sort((a, b) => (b.count - a.count) || (b.lastTs - a.lastTs))
    .slice(0, limit)
    .map((g) => ({
      label: g.label,
      amount: round2(g.lastAmount),   // l'ultimo importo pagato
      catId: g.catId,
      count: g.count,
    }));
}
