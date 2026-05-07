// Statistical helpers used across the app.
// Pure functions, no React, no side effects.

import { realCost } from './format.js';

/**
 * Group transactions by month (YYYY-MM key).
 * Returns { '2026-04': [tx, tx, ...], ... }
 */
export const groupByMonth = (txs) => {
  const out = {};
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    const d = new Date(t.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!out[key]) out[key] = [];
    out[key].push(t);
  }
  return out;
};

/**
 * Sum spending of a transaction list.
 */
export const sumSpend = (txs) => {
  let s = 0;
  for (let i = 0; i < txs.length; i++) s += realCost(txs[i]);
  return s;
};

/**
 * Mean and standard deviation of a numeric array. Returns { mean, sd, n }.
 */
export const meanSd = (values) => {
  const n = values.length;
  if (n === 0) return { mean: 0, sd: 0, n: 0 };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  const mean = sum / n;
  if (n === 1) return { mean, sd: 0, n };
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    acc += d * d;
  }
  const sd = Math.sqrt(acc / (n - 1));
  return { mean, sd, n };
};

/**
 * Per-category historical mean across past months (excluding the current one).
 * Returns { catId: { mean, sd, n, months } } where n = number of months with data.
 */
export const categoryHistoricalStats = (txs, currentMonthKey) => {
  const byMonth = groupByMonth(txs);
  // accumulate per-category monthly totals
  const perCatMonthly = {};
  Object.keys(byMonth).forEach((k) => {
    if (k === currentMonthKey) return;
    const monthTotals = {};
    byMonth[k].forEach((t) => {
      monthTotals[t.cat] = (monthTotals[t.cat] || 0) + realCost(t);
    });
    Object.keys(monthTotals).forEach((c) => {
      if (!perCatMonthly[c]) perCatMonthly[c] = [];
      perCatMonthly[c].push(monthTotals[c]);
    });
  });
  const out = {};
  Object.keys(perCatMonthly).forEach((c) => {
    const arr = perCatMonthly[c];
    const { mean, sd, n } = meanSd(arr);
    out[c] = { mean, sd, n, months: arr };
  });
  return out;
};

/**
 * Daily spend timeline for a month — array of length daysInMonth where index = day - 1.
 * Each entry = €spent that calendar day.
 */
export const dailyTimeline = (txs, monthStart, monthEnd) => {
  const days = Math.round((monthEnd - monthStart) / 864e5);
  const out = new Array(days).fill(0);
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    if (t.ts < monthStart.getTime() || t.ts >= monthEnd.getTime()) continue;
    const dayIdx = Math.floor((t.ts - monthStart.getTime()) / 864e5);
    if (dayIdx >= 0 && dayIdx < days) out[dayIdx] += realCost(t);
  }
  return out;
};

/**
 * Pace marker: where the user "should" be at this point in the month if they
 * spent linearly across all days. Returns 0..1.
 */
export const pacePosition = (dayOfPeriod, daysInPeriod) => {
  if (daysInPeriod <= 0) return 0;
  return Math.max(0, Math.min(1, dayOfPeriod / daysInPeriod));
};
