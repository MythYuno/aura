import { realCost } from './format.js';

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
  const sug = {};
  cats.forEach((c) => {
    const monthlyAvg = (byCat[c.id] || 0) / months;
    const pct = salary > 0 ? Math.round((monthlyAvg / salary) * 100) : 0;
    sug[c.id] = Math.max(1, Math.min(60, pct));
  });
  const sum = Object.values(sug).reduce((a, b) => a + b, 0);
  if (sum !== 100 && sum > 0) {
    const factor = 100 / sum;
    Object.keys(sug).forEach((k) => (sug[k] = Math.round(sug[k] * factor)));
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
      text: `In media €${dowAvgs[maxDow].toFixed(0)} ogni ${dowNames[maxDow]}, contro una media di €${overallAvg.toFixed(0)} negli altri giorni.`,
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
