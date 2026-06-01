// Evaluate whether a wish is affordable given the user's free monthly budget.
//
// Two angles:
//   1. "Quanti mesi servono?"  → time to reach the goal saving X / mese
//   2. "Quanto sforzo è?"      → ratio between the monthly set-aside and the
//                                disposable income (libero al mese)
//
// Verdetto words are deliberately neutral — we want to inform, not shame.

const SAFE_TARGETS_FOR_BUFFER = 0.85; // a wish should not eat the imprevisti
const MAX_PROJECTION_MONTHS = 120;     // 10 years cap

/**
 * @param {object} args
 * @param {number} args.amount        — total amount of the wish (€)
 * @param {number} args.months        — chosen horizon in months (>=1)
 * @param {number} args.freeBudget    — monthly disposable (after fissi/abbon/imprevisti)
 * @param {number} args.avgFreeSpent  — what the user typically actually saves
 *                                       per month based on history (optional)
 * @returns { perMonth, ratio, verdict, label, color, hint, monthsAtHalfFree, monthsAtFullFree }
 */
export const evaluateWish = ({ amount, months, freeBudget, avgFreeSpent = 0 }) => {
  const safeBudget = Math.max(0, freeBudget * SAFE_TARGETS_FOR_BUFFER);
  const m = Math.max(1, Math.round(months || 1));
  const perMonth = amount / m;
  const ratio = safeBudget > 0 ? perMonth / safeBudget : Infinity;

  let verdict, label, color, hint;

  if (!isFinite(ratio) || safeBudget <= 0) {
    verdict = 'impossible';
    label = 'Con questo budget mensile non è sostenibile';
    color = 'danger';
    hint = 'Prova ad allungare i tempi o ridurre il costo del desiderio.';
  } else if (ratio <= 0.15) {
    verdict = 'easy';
    label = 'Fattibile senza sforzo';
    color = 'accent';
    hint = `Metti via €${Math.round(perMonth)} al mese e in ${m} ${m === 1 ? 'mese' : 'mesi'} è tuo.`;
  } else if (ratio <= 0.30) {
    verdict = 'doable';
    label = 'Fattibile con disciplina';
    color = 'accent';
    hint = `Stai usando il ${Math.round(ratio * 100)}% del libero per questo. Realistico, ma ricordatelo.`;
  } else if (ratio <= 0.50) {
    verdict = 'tight';
    label = 'Si può, ma sarà stretto';
    color = 'warn';
    hint = `Quasi metà del tuo libero finisce qui. Se ti viene un imprevisto, slitta.`;
  } else if (ratio <= 0.80) {
    verdict = 'hard';
    label = 'Faticoso';
    color = 'warn';
    hint = `Stai accantonando il ${Math.round(ratio * 100)}% del libero. Probabilmente ti toccherà tagliare altrove.`;
  } else if (ratio <= 1) {
    verdict = 'very_hard';
    label = 'Molto difficile';
    color = 'danger';
    hint = `Quasi tutto il libero del mese va qui. In pratica niente svago, niente extra.`;
  } else {
    verdict = 'impossible';
    label = 'Insostenibile su questo orizzonte';
    color = 'danger';
    hint = `Servono €${Math.round(perMonth)}/mese ma ne hai ~€${Math.round(safeBudget)}. Allunga i tempi.`;
  }

  // Helpful alternative horizons
  const monthsAtFullFree = safeBudget > 0
    ? Math.min(MAX_PROJECTION_MONTHS, Math.ceil(amount / safeBudget))
    : null;
  const monthsAtHalfFree = safeBudget > 0
    ? Math.min(MAX_PROJECTION_MONTHS, Math.ceil(amount / (safeBudget / 2)))
    : null;

  return {
    perMonth,
    ratio,
    verdict,
    label,
    color,
    hint,
    monthsAtHalfFree,
    monthsAtFullFree,
  };
};

/**
 * Quale categoria sarebbe più sensata "tagliare" per fare spazio al desiderio?
 * Restituisce { catId, label, mean, saveProposed } — la categoria con la
 * spesa media più alta tra quelle non essenziali, suggerendo un taglio
 * proporzionale.
 */
export const suggestTrim = ({ amount, months, freeBudget, categoryStats, cats }) => {
  const safeBudget = Math.max(0, freeBudget * SAFE_TARGETS_FOR_BUFFER);
  const perMonth = amount / Math.max(1, months);
  const gap = perMonth - safeBudget;
  if (gap <= 0 || !categoryStats) return null;

  // Pick the category with the largest historical mean (excluding annuali/fixed-like)
  const candidates = cats
    .filter((c) => c.id !== 'other')
    .map((c) => ({ ...c, mean: categoryStats[c.id]?.mean || 0 }))
    .filter((c) => c.mean > 10)
    .sort((a, b) => b.mean - a.mean);

  if (candidates.length === 0) return null;
  const top = candidates[0];
  // Suggest cutting up to the gap, or 25% of that cat's mean (whichever smaller)
  const proposed = Math.min(gap, top.mean * 0.25);
  if (proposed < 5) return null;
  return {
    catId: top.id,
    label: top.label,
    mean: top.mean,
    saveProposed: Math.round(proposed),
  };
};

/**
 * Format a number of months as a human-friendly Italian string.
 * 1 → "1 mese", 13 → "1 anno e 1 mese", 24 → "2 anni"
 */
export const formatMonths = (m) => {
  if (!isFinite(m) || m <= 0) return '—';
  const months = Math.round(m);
  if (months < 12) return `${months} ${months === 1 ? 'mese' : 'mesi'}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const yLbl = `${years} ${years === 1 ? 'anno' : 'anni'}`;
  if (rem === 0) return yLbl;
  return `${yLbl} e ${rem} ${rem === 1 ? 'mese' : 'mesi'}`;
};
