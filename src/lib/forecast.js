// End-of-month forecasting based on the user's actual pace + historical baseline.
//
// The naive approach is "spent so far × (days_total / days_passed)" — but that
// over-penalises bursty months (one €120 bill blown up to €600 by extrapolation)
// and under-penalises slow starts. We blend the linear extrapolation with the
// user's historical mean for the same calendar period, weighted by how much of
// the month has passed.

import { realCost } from './format.js';
import { categoryHistoricalStats, sumSpend } from './stats.js';

/**
 * Forecast spending for the rest of the current period.
 *
 * @param {object} args
 * @param {Array} args.periodTxs — transactions of the current period
 * @param {Array} args.allTxs    — full history (for baseline)
 * @param {number} args.dayOfPeriod — 1..daysInPeriod
 * @param {number} args.daysInPeriod
 * @param {string} args.currentMonthKey — 'YYYY-MM'
 * @returns {{ projectedSpend, remainingForecast }}
 */
export const monthlyForecast = ({ periodTxs, allTxs, dayOfPeriod, daysInPeriod, currentMonthKey }) => {
  const spentSoFar = sumSpend(periodTxs);
  const daysLeft = Math.max(0, daysInPeriod - dayOfPeriod);

  if (daysInPeriod <= 0) {
    return { projectedSpend: spentSoFar, remainingForecast: 0 };
  }

  // linear extrapolation from current pace
  const linear = spentSoFar * (daysInPeriod / Math.max(1, dayOfPeriod));

  // historical mean: average of past full months' total
  const stats = categoryHistoricalStats(allTxs, currentMonthKey);
  let historicalTotal = 0;
  Object.values(stats).forEach((s) => { historicalTotal += s.mean; });

  // if we have no history, return the linear projection
  if (historicalTotal === 0) {
    return { projectedSpend: linear, remainingForecast: Math.max(0, linear - spentSoFar) };
  }

  // blend weight — more of the month passed → trust linear more
  const w = Math.min(1, dayOfPeriod / daysInPeriod);
  const projected = w * linear + (1 - w) * historicalTotal;
  const remaining = Math.max(0, projected - spentSoFar);

  return {
    projectedSpend: projected,
    remainingForecast: remaining,
    daysLeft,
  };
};

/**
 * Per-category forecast — for the "finirà intorno a €X" line on each area.
 */
export const categoryForecast = ({ periodTxs, allTxs, dayOfPeriod, daysInPeriod, currentMonthKey, catId }) => {
  const catTxs = periodTxs.filter((t) => t.cat === catId);
  const spentSoFar = sumSpend(catTxs);
  if (daysInPeriod <= 0 || dayOfPeriod === 0) {
    return { projected: spentSoFar };
  }
  const linear = spentSoFar * (daysInPeriod / Math.max(1, dayOfPeriod));

  const stats = categoryHistoricalStats(allTxs, currentMonthKey);
  const cat = stats[catId];
  const historical = cat ? cat.mean : 0;

  if (historical === 0) return { projected: linear };

  const w = Math.min(1, dayOfPeriod / daysInPeriod);
  const projected = w * linear + (1 - w) * historical;
  return { projected, mean: historical, deviation: cat ? cat.sd : 0 };
};
