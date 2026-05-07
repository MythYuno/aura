// Detect transactions that fall well outside the user's pattern.
// "Anomaly" here is intentionally narrow: only flag clearly outsized expenses,
// don't be a worrier. A transaction is an anomaly if either:
//   1. It's >= 3x the user's median for that category
//   2. Its z-score within the category is > 2.5 (and >= 2 sigma above mean)
// Falls back gracefully when there's not enough data (< 5 same-cat txs).

import { realCost } from './format.js';
import { meanSd } from './stats.js';

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
 * Pre-compute anomalies for an entire transaction list. Useful for the
 * "Da controllare" section in History. Returns the txs flagged with their
 * stats, in reverse-chronological order.
 */
export const findAnomalies = (allTxs) => {
  const out = [];
  for (let i = 0; i < allTxs.length; i++) {
    const r = checkAnomaly(allTxs[i], allTxs);
    if (r.isAnomaly) out.push({ ...allTxs[i], _anomaly: r });
  }
  out.sort((a, b) => b.ts - a.ts);
  return out;
};
