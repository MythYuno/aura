/**
 * Confronto fra cicli per categoria: la cura per "non mi dice niente".
 *
 * `deltaPct` è null quando non c'è storia con cui confrontarsi, mai Infinity:
 * una categoria che appare per la prima volta non è cresciuta all'infinito,
 * è nuova, e sullo schermo si scrive "nuova".
 */

import { previousCycle } from './boundaries.js';
import { inCycle } from './day.js';

function sumByCategory(movements, cycle) {
  const totals = new Map();
  for (const m of movements) {
    if (m.tag === 'untracked') continue; // non ha categoria: sta nei totali, non qui
    if (m.catId == null) continue;
    if (m.bound !== 'free') continue;
    if (!inCycle(m.date, cycle)) continue;
    totals.set(m.catId, (totals.get(m.catId) ?? 0) + (m.amountCents ?? 0));
  }
  return totals;
}

export function categoryHistoricalStats(movements, cycle, payDay = 16, nCycles = 3) {
  const current = sumByCategory(movements, cycle);

  const past = [];
  let c = cycle;
  for (let i = 0; i < nCycles; i += 1) {
    c = previousCycle(c, payDay);
    const totals = sumByCategory(movements, c);
    // Un ciclo senza nessun movimento non è un ciclo in cui hai speso zero: è
    // un ciclo in cui l'app non c'era ancora. Contarlo come zero abbasserebbe
    // la media e farebbe sembrare ogni categoria cresciuta del triplo a chi
    // usa AURA da un mese.
    if (totals.size > 0) past.push(totals);
  }

  const ids = new Set(current.keys());
  for (const p of past) for (const id of p.keys()) ids.add(id);

  const out = new Map();
  for (const catId of ids) {
    const cur = current.get(catId) ?? 0;
    const mean = past.length
      ? past.reduce((sum, p) => sum + (p.get(catId) ?? 0), 0) / past.length
      : 0;

    out.set(catId, {
      mean,
      current: cur,
      deltaPct: mean === 0 ? null : Math.round(((cur - mean) / mean) * 100),
      isNew: mean === 0 && cur > 0,
    });
  }
  return out;
}
