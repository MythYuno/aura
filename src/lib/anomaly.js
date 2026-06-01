// Detect transactions that fall well outside the user's pattern.
// "Anomaly" here is intentionally narrow: only flag clearly outsized expenses,
// don't be a worrier. A transaction is an anomaly if either:
//   1. It's >= 3x the user's median for that category
//   2. Its z-score within the category is > 2.5 (and >= 2 sigma above mean)
// Falls back gracefully when there's not enough data (< 5 same-cat txs).

import { realCost } from './format.js';
import { meanSd } from './analytics.js';

const median = (sortedArr) => {
  const n = sortedArr.length;
  if (n === 0) return 0;
  if (n % 2) return sortedArr[(n - 1) / 2];
  return (sortedArr[n / 2 - 1] + sortedArr[n / 2]) / 2;
};

/**
 * For a single new tx, determine if it's an anomaly given the user's history.
 * Returns { isAnomaly, multiple, zscore } — multiple = how many times the median.
 */
export const checkAnomaly = (newTx, allTxs) => {
  const cat = newTx.cat;
  const sameCat = [];
  for (let i = 0; i < allTxs.length; i++) {
    const t = allTxs[i];
    if (t.cat !== cat || t.id === newTx.id) continue;
    sameCat.push(realCost(t));
  }
  if (sameCat.length < 5) {
    return { isAnomaly: false, multiple: 1, zscore: 0, n: sameCat.length };
  }
  const sorted = [...sameCat].sort((a, b) => a - b);
  const med = median(sorted);
  const { mean, sd } = meanSd(sameCat);
  const amount = realCost(newTx);
  const multiple = med > 0 ? amount / med : 0;
  const zscore = sd > 0 ? (amount - mean) / sd : 0;
  const isAnomaly =
    (med > 0 && multiple >= 3) ||
    (zscore >= 2.5 && amount >= mean + 2 * sd);
  return { isAnomaly, multiple, zscore, n: sameCat.length, median: med };
};

/**
 * Pre-compute anomalies per l'intero array. Versione ottimizzata: pre-aggrega
 * tutti gli importi per categoria UNA volta (O(n)), poi scorre le tx una sola
 * altra volta usando le stats già calcolate (O(n)). Totale: O(n) invece di O(n²).
 *
 * Utilizzo: History "Da controllare", insights "anomaly recente".
 */
export const findAnomalies = (allTxs) => {
  // Pre-aggrega gli importi per categoria
  const byCat = {};
  for (let i = 0; i < allTxs.length; i++) {
    const t = allTxs[i];
    if (!byCat[t.cat]) byCat[t.cat] = [];
    byCat[t.cat].push(realCost(t));
  }
  // Pre-calcola median/mean/sd per ogni categoria con almeno 5 campioni
  const catStats = {};
  for (const cat in byCat) {
    const samples = byCat[cat];
    if (samples.length < 5) continue;
    const sorted = [...samples].sort((a, b) => a - b);
    const med = median(sorted);
    const { mean, sd, n } = meanSd(samples);
    catStats[cat] = { median: med, mean, sd, n };
  }
  // Flag le anomalie usando le stats pre-calcolate
  const out = [];
  for (let i = 0; i < allTxs.length; i++) {
    const tx = allTxs[i];
    const s = catStats[tx.cat];
    if (!s) continue;
    const amount = realCost(tx);
    const multiple = s.median > 0 ? amount / s.median : 0;
    const zscore = s.sd > 0 ? (amount - s.mean) / s.sd : 0;
    const isAnomaly =
      (s.median > 0 && multiple >= 3) ||
      (zscore >= 2.5 && amount >= s.mean + 2 * s.sd);
    if (isAnomaly) out.push({ ...tx, _anomaly: { isAnomaly, multiple, zscore, n: s.n, median: s.median } });
  }
  out.sort((a, b) => b.ts - a.ts);
  return out;
};
