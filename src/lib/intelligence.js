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
  // Use reduce instead of Math.min(...spread) — spread can blow the call stack on large arrays.
  let oldest = txs[0].ts;
  for (let i = 1; i < txs.length; i++) if (txs[i].ts < oldest) oldest = txs[i].ts;
  const ageMonths = (now - oldest) / monthsMs;

  const timeScore = Math.min(1, ageMonths / 3);
  const countScore = Math.min(1, txs.length / 50);
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
  // v0.8.1: BUGFIX. Prima `const p = prevByCat[cid] || 1` faceva sì che
  // ogni nuova categoria (mai spesa nel mese precedente) riportasse una
  // crescita fittizia di ((r - 1) / 1) * 100% → spike falso. Ora richiediamo
  // almeno €5 di spesa nel mese precedente per confronti significativi.
  const now = Date.now();
  const recent30 = txs.filter((t) => t.ts > now - 30 * 864e5);
  const prev30 = txs.filter((t) => t.ts > now - 60 * 864e5 && t.ts <= now - 30 * 864e5);
  const recentByCat = {}, prevByCat = {};
  recent30.forEach((t) => { recentByCat[t.cat] = (recentByCat[t.cat] || 0) + realCost(t); });
  prev30.forEach((t) => { prevByCat[t.cat] = (prevByCat[t.cat] || 0) + realCost(t); });
  let topGrow = null, topGrowPct = 0;
  Object.keys(recentByCat).forEach((cid) => {
    const r = recentByCat[cid];
    const p = prevByCat[cid] || 0;
    if (p < 5) return; // baseline troppo bassa → confronto non significativo
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

/**
 * Suggest a category for a new expense based on its description.
 * Uses past transactions: if the description matches (token-overlap) past entries,
 * pick the category that won most often. Falls back to null if no signal.
 */
const tokenize = (s) =>
  String(s || '')
    .toLowerCase()
    // v0.8.1: era /[̀-ͯ]/g con caratteri Unicode invisibili (combining marks
    // U+0300-U+036F). Causava problemi su editor/git che mostravano la regex
    // come `//g` vuota e potenziali bug di trasformazione. Sostituito con
    // forma esplicita escaped — stesso comportamento, leggibile.
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);

export const suggestCategory = (label, txs, cats, catRules = []) => {
  const tokens = tokenize(label);
  if (tokens.length === 0) return null;
  const tokenSet = new Set(tokens);

  // 1. User-defined rules win over learned patterns. Match if any rule's
  //    `contains` token (or sub-string) appears in the description.
  if (catRules.length > 0) {
    const lower = String(label || '').toLowerCase();
    for (let i = 0; i < catRules.length; i++) {
      const r = catRules[i];
      if (!r.contains || !r.catId) continue;
      const needle = String(r.contains).toLowerCase();
      if (lower.includes(needle) && cats.some((c) => c.id === r.catId)) {
        return r.catId;
      }
    }
  }

  // 2. Otherwise, fall back to learned token overlap from past txs.
  const scores = {};
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    if (!t.label) continue;
    const tt = tokenize(t.label);
    let overlap = 0;
    for (let j = 0; j < tt.length; j++) if (tokenSet.has(tt[j])) overlap++;
    if (overlap === 0) continue;
    scores[t.cat] = (scores[t.cat] || 0) + overlap;
  }
  const ids = Object.keys(scores);
  if (ids.length > 0) {
    ids.sort((a, b) => scores[b] - scores[a]);
    const winner = ids[0];
    if (cats.some((c) => c.id === winner)) return winner;
  }

  // 3. Fallback: dizionario di negozi/parole comuni → categoria di default.
  //    Funziona anche per un utente NUOVO (nessuna storia, nessuna regola).
  //    Si applica solo se quella categoria di default esiste ancora.
  const lower = String(label || '').toLowerCase();
  for (let i = 0; i < KEYWORD_CAT.length; i++) {
    const [re, catId] = KEYWORD_CAT[i];
    if (re.test(lower) && cats.some((c) => c.id === catId)) return catId;
  }
  return null;
};

// Parole-chiave / negozi comuni → categoria di default (italiano).
// Ordine: la prima regola che matcha vince.
const KEYWORD_CAT = [
  [/(esselunga|coop|conad|lidl|carrefour|eurospin|\bpam\b|despar|penny|supermerc|aliment|macell|panett|fornai|gastronom|\bspesa\b|pizzeri|ristorant|trattori|osteri|mcdonald|burger|kebab|sushi|\bpranzo\b|\bcena\b|caff[eè]|\bbar\b|pasticc|gelat)/, 'food'],
  [/(benzin|carburant|diesel|\bgpl\b|\beni\b|\bq8\b|tamoil|\besso\b|autostrad|telepass|casell|trenitalia|\bitalo\b|\btreno\b|\bbus\b|\bmetro\b|\btram\b|tax[iì]|\buber\b|monopattin|parchegg|revision|\bgomm|meccanic|\bbollo\b)/, 'transport'],
  [/(affitt|mutuo|bollett|\bluce\b|\benel\b|\bgas\b|\bacqua\b|condomin|\btari\b|spazzatur|internet|fibra|\btim\b|vodafone|\bwind\b|iliad|fastweb|\bsky\b)/, 'home'],
  [/(farmaci|medic|dottor|dentist|\bottico\b|occhiali|\bvisita\b|ospedal|analisi|fisioterap|psicolog|\bsalute\b|integrator|tampone|vaccin)/, 'health'],
  [/(netflix|spotify|disney|prime video|\bdazn\b|cinema|teatro|videogioc|\bsteam\b|playstation|\bps5\b|xbox|nintendo|hobby|concert|\bpub\b|birra|aperitiv|discotec|palestra|abbonament)/, 'fun'],
  [/(zalando|\bzara\b|h&m|abbigliam|vestit|scarpe|\bamazon\b|shopping|decathlon|\bikea\b|mediaworld|unieuro|euronics|regal|profum|sephora|cosmet|librer)/, 'wants'],
];

/**
 * Rileva spese ricorrenti basandosi sulla cronologia delle tx.
 *
 * Una "ricorrenza" è un pattern di spese con stesso label (normalizzato),
 * importo simile (variazione < 30%), almeno N occorrenze in M giorni.
 * L'app le mostra in Setup → "Ricorrenze rilevate" così l'utente può
 * trasformarle in regole automatiche o in spese fisse.
 *
 * @returns Array di { label, catId, avgAmount, count, cadence, lastTs }
 */
export const detectRecurring = (txs, { minOccurrences = 3, withinDays = 60 } = {}) => {
  if (!Array.isArray(txs) || txs.length < minOccurrences) return [];
  const now = Date.now();
  const cutoff = now - withinDays * 864e5;
  const recent = txs.filter((t) => t.ts >= cutoff && t.label && t.label.trim());

  // Raggruppa per label normalizzato (lowercase + trim + primi 40 caratteri)
  const groups = {};
  for (let i = 0; i < recent.length; i++) {
    const t = recent[i];
    const key = t.label.toLowerCase().trim().slice(0, 40);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  const patterns = [];
  for (const key in groups) {
    const items = groups[key];
    if (items.length < minOccurrences) continue;

    // Importo medio + coefficient of variation
    const amounts = items.map((t) => realCost(t));
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avg <= 0) continue;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg;
    // Se l'importo è molto variabile (>40%), NON è una ricorrenza affidabile.
    if (cv > 0.4) continue;

    // Cadenza media (giorni tra una tx e l'altra)
    const sortedTs = items.map((t) => t.ts).sort((a, b) => a - b);
    let gapSum = 0;
    for (let i = 1; i < sortedTs.length; i++) gapSum += sortedTs[i] - sortedTs[i - 1];
    const avgGapDays = (gapSum / Math.max(1, sortedTs.length - 1)) / 864e5;
    const cadence = avgGapDays < 2 ? 'giornaliera'
      : avgGapDays < 9 ? 'settimanale'
      : avgGapDays < 18 ? 'quindicinale'
      : avgGapDays < 45 ? 'mensile'
      : 'sporadica';

    // v0.8.1: giorno del mese più frequente (mode), non l'ultimo. Era bug:
    // l'ultimo tx poteva essere il 31 (clampato a 28 nel addSubscription) ma
    // l'utente vede "abbonamento il 28" invece di "il 31". Ora prendiamo il
    // più ricorrente. Per ricorrenze mensili è il giorno tipico di scadenza.
    const dayCounts = {};
    for (const t of items) {
      const d = new Date(t.ts).getDate();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }
    let commonDay = null;
    let maxDayCount = 0;
    for (const d in dayCounts) {
      if (dayCounts[d] > maxDayCount) {
        maxDayCount = dayCounts[d];
        commonDay = parseInt(d);
      }
    }

    // v0.8.1: token significativo per regola auto-categoria. Era bug:
    // RecurringSheet usava il label completo come "contains" → "Esselunga 12.4"
    // non matchava "Esselunga 8.20" (numeri diversi). Ora estraiamo il token
    // più lungo (più caratteristico) e lo proponiamo come needle.
    const labelTokens = items[items.length - 1].label
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((tok) => tok.length >= 4 && !/^\d+$/.test(tok));
    const commonToken = labelTokens.length > 0
      ? labelTokens.sort((a, b) => b.length - a.length)[0]
      : items[items.length - 1].label.toLowerCase().slice(0, 20);

    patterns.push({
      key,
      label: items[items.length - 1].label, // l'ultimo label visto (case originale)
      catId: items[items.length - 1].cat,
      avgAmount: avg,
      count: items.length,
      avgGapDays,
      cadence,
      lastTs: sortedTs[sortedTs.length - 1],
      commonDay,    // v0.8.1: per addSubscription
      commonToken,  // v0.8.1: per addCatRule
    });
  }

  // Ordina per "rilevanza" = count × frequenza decrescente
  return patterns.sort((a, b) => b.count - a.count);
};
