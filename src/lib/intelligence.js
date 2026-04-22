import { realCost } from './format.js';

/**
 * Compute the app's "learning confidence": 0-1 score representing
 * how much data AURA has to make smart decisions.
 * 0 = zero data, 1 = fully confident (3+ months, 50+ transactions).
 */
export const computeLearningConfidence = (txs) => {
  if (!txs.length) return 0;
  const now = Date.now();
  const monthsMs = 30 * 864e5;
  const oldest = Math.min(...txs.map((t) => t.ts));
  const ageMonths = (now - oldest) / monthsMs;

  // Weighted by both time and count
  const timeScore = Math.min(1, ageMonths / 3); // 3 months = full time score
  const countScore = Math.min(1, txs.length / 50); // 50 tx = full count score
  return Math.max(timeScore * 0.6 + countScore * 0.4, 0);
};

/**
 * Learning level labels for UI.
 */
export const getLearningLevel = (confidence) => {
  if (confidence < 0.15) return { level: 0, label: 'Sto imparando', desc: 'Aggiungi spese per qualche settimana' };
  if (confidence < 0.4) return { level: 1, label: 'Primi pattern', desc: 'Inizio a vedere le tue abitudini' };
  if (confidence < 0.7) return { level: 2, label: 'Conosco i tuoi ritmi', desc: 'Suggerimenti affidabili' };
  return { level: 3, label: 'Ti conosco bene', desc: 'Allocazione ottimizzata' };
};

/**
 * Smart allocation — suggests category weights based on real spending history.
 * Returns null if not enough data.
 */
export const computeSmartSuggestions = (txs, cats, months = 3, salary = 0) => {
  if (!txs.length || salary <= 0) return null;
  const now = Date.now();
  const cutoff = now - months * 30 * 864e5;
  const recent = txs.filter((t) => t.ts >= cutoff);
  if (recent.length < 10) return null;

  const byCat = {};
  recent.forEach((t) => { byCat[t.cat] = (byCat[t.cat] || 0) + realCost(t); });
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  // Average monthly spend per category as % of salary
  const sug = {};
  cats.forEach((c) => {
    const monthlyAvg = (byCat[c.id] || 0) / months;
    const pct = salary > 0 ? Math.round((monthlyAvg / salary) * 100) : 0;
    sug[c.id] = Math.max(1, Math.min(60, pct));
  });

  // Normalize to sum=100
  const sum = Object.values(sug).reduce((a, b) => a + b, 0);
  if (sum !== 100 && sum > 0) {
    const factor = 100 / sum;
    Object.keys(sug).forEach((k) => { sug[k] = Math.round(sug[k] * factor); });
    const newSum = Object.values(sug).reduce((a, b) => a + b, 0);
    if (newSum !== 100) {
      const diff = 100 - newSum;
      const maxKey = Object.keys(sug).sort((a, b) => sug[b] - sug[a])[0];
      sug[maxKey] += diff;
    }
  }
  return sug;
};

/**
 * Apply smart suggestions to cats array. Returns new cats with updated weights.
 */
export const applySmartAllocation = (cats, suggestions) => {
  if (!suggestions) return cats;
  return cats.map((c) => ({
    ...c,
    weight: suggestions[c.id] ?? c.weight,
  }));
};

/**
 * 50/30/20 rule allocation based on category types.
 * Needs (food/home/transport/health): 50%
 * Wants (fun/wants/vices): 30%
 * Savings buffer: 20% -> distributed to "other" or proportionally
 */
export const compute503020 = (cats) => {
  const needs = ['food', 'home', 'transport', 'health'];
  const wants = ['fun', 'wants', 'vices'];

  const needsCats = cats.filter((c) => needs.includes(c.id));
  const wantsCats = cats.filter((c) => wants.includes(c.id));
  const otherCats = cats.filter((c) => !needs.includes(c.id) && !wants.includes(c.id));

  const distribute = (list, budget) => {
    if (list.length === 0) return {};
    const perCat = Math.floor(budget / list.length);
    const rem = budget - perCat * list.length;
    const out = {};
    list.forEach((c, i) => {
      out[c.id] = perCat + (i === 0 ? rem : 0);
    });
    return out;
  };

  return {
    ...distribute(needsCats, 50),
    ...distribute(wantsCats, 30),
    ...distribute(otherCats, 20),
  };
};

/**
 * AI-like insights (local pattern detection)
 */
export const computeInsights = (txs, cats) => {
  const insights = [];
  if (txs.length < 5) return insights;

  // Pattern 1: recurring weekday spending
  const byDow = [0, 0, 0, 0, 0, 0, 0].map(() => []);
  txs.forEach((t) => { byDow[new Date(t.ts).getDay()].push(realCost(t)); });
  const dowAvgs = byDow.map((arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const maxDow = dowAvgs.indexOf(Math.max(...dowAvgs));
  const overallAvg = dowAvgs.reduce((a, b) => a + b, 0) / 7;
  if (dowAvgs[maxDow] > overallAvg * 1.5 && overallAvg > 0) {
    const dowNames = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    insights.push({
      id: 'dow-pattern',
      icon: 'Calendar',
      title: `Il ${dowNames[maxDow]} spendi di più`,
      text: `In media €${dowAvgs[maxDow].toFixed(0)} ogni ${dowNames[maxDow]}, contro €${overallAvg.toFixed(0)} negli altri giorni.`,
      color: 'info',
    });
  }

  // Pattern 2: top growing category
  const now = Date.now();
  const recent30 = txs.filter((t) => t.ts > now - 30 * 864e5);
  const prev30 = txs.filter((t) => t.ts > now - 60 * 864e5 && t.ts <= now - 30 * 864e5);
  const recentByCat = {}, prevByCat = {};
  recent30.forEach((t) => { recentByCat[t.cat] = (recentByCat[t.cat] || 0) + realCost(t); });
  prev30.forEach((t) => { prevByCat[t.cat] = (prevByCat[t.cat] || 0) + realCost(t); });
  let topGrow = null, topGrowPct = 0;
  Object.keys(recentByCat).forEach((cid) => {
    const r = recentByCat[cid], p = prevByCat[cid] || 1;
    const pct = ((r - p) / p) * 100;
    if (pct > topGrowPct && r > 30) { topGrowPct = pct; topGrow = cid; }
  });
  if (topGrow && topGrowPct > 30) {
    const cat = cats.find((c) => c.id === topGrow);
    insights.push({
      id: 'cat-growth',
      icon: 'TrendingUp',
      title: `${cat?.label} in crescita`,
      text: `Hai speso il ${Math.round(topGrowPct)}% in più rispetto al mese scorso in ${cat?.label?.toLowerCase()}.`,
      color: 'red',
    });
  }

  // Pattern 3: micro-vizi frequency
  const vices = txs.filter((t) => t.cat === 'vices' && t.ts > now - 30 * 864e5);
  if (vices.length > 10) {
    const total = vices.reduce((a, t) => a + realCost(t), 0);
    insights.push({
      id: 'vices-count',
      icon: 'Coffee',
      title: `${vices.length} micro-spese questo mese`,
      text: `Totale: €${total.toFixed(0)}. Su base annuale sarebbero €${(total * 12).toFixed(0)}.`,
      color: 'orange',
    });
  }

  return insights.slice(0, 3);
};
