// Daily insight engine — la frase che l'app mostra ogni giorno nella card
// "insight" (Today screen). Una sola frase, generata da fatti veri presi
// dalle transazioni. Cambia ogni giorno (seed deterministico = data del giorno).
//
// Tipi di insight, in ordine di priorità decrescente:
//   1. ANOMALY     — "Ieri hai speso €48 al super, 2× la media"
//   2. UPCOMING    — "Tra 3 giorni cade l'affitto: €650"
//   3. TREND_CAT   — "Questa settimana spendi 22% in meno per cibo"
//   4. STREAK      — "3 giorni di fila senza spese fuori dal piano"
//   5. PACE        — "Sei a metà mese, hai speso il 38% del libero"
//   6. WELCOME     — "Nessuna spesa oggi. Bel ritmo."
//
// L'algoritmo prova a generare tutti gli insight disponibili e ne sceglie
// uno (di solito il più rilevante, ma se più sono validi randomizza
// deterministicamente sul giorno per evitare ripetizioni).

import { realCost } from './format.js';
import { groupByMonth, sumSpend, meanSd, categoryHistoricalStats } from './analytics.js';
import { findAnomalies } from './anomaly.js';

const DAY_MS = 864e5;

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysAgo = (n) => {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
};

/**
 * Deterministic seed da una data — torna 0..N-1 in modo stabile per la stessa giornata.
 */
const dailySeed = (date, modulo) => {
  const k = `${date.getFullYear()}${date.getMonth()}${date.getDate()}`;
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
  return Math.abs(h) % Math.max(1, modulo);
};

const itDayLabel = (date) => {
  const today = startOfDay();
  const diff = Math.round((today - startOfDay(date)) / DAY_MS);
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'ieri';
  if (diff === 2) return 'l\'altro ieri';
  if (diff < 7) return date.toLocaleDateString('it-IT', { weekday: 'long' }).toLowerCase();
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
};

const fmt = (n) => `€${Math.round(n).toLocaleString('it-IT')}`;

// Sceglie deterministicamente una variante di una lista in base al giorno
// (così la frase cambia da un giorno all'altro ma resta stabile in giornata).
const pick = (arr, date = new Date()) => {
  if (!arr || arr.length === 0) return null;
  return arr[dailySeed(date, arr.length)];
};

// ─── Generatori di insight ────────────────────────────────────────

/**
 * Spesa anomala recente — l'ultima transazione marcata "anomalia" negli
 * ultimi 7 giorni. Una sola, la più clamorosa. Usa findAnomalies() che
 * pre-aggrega le stats una sola volta (O(n) totale).
 */
const insightAnomaly = (txs, cats) => {
  const cutoff = daysAgo(7).getTime();
  const all = findAnomalies(txs);
  const recent = all.filter((a) => a.ts >= cutoff);
  if (recent.length === 0) return null;
  // findAnomalies è già ordinato per ts desc; prendiamo quello con multiple più alto
  const best = recent.reduce((b, x) => (!b || x._anomaly.multiple > b._anomaly.multiple) ? x : b, null);
  if (!best) return null;
  const cat = cats.find((c) => c.id === best.cat);
  const when = itDayLabel(new Date(best.ts));
  const mult = best._anomaly.multiple.toFixed(1).replace('.', ',');
  const what = best.label || cat?.label?.toLowerCase() || 'una spesa';
  const W = when.charAt(0).toUpperCase() + when.slice(1);
  const cost = fmt(realCost(best));
  const variants = [
    `${W} ${cost} per ${what}, ${mult}× la tua media.`,
    `${W} hai speso ${cost} per ${what} — ${mult}× il solito.`,
    `${cost} per ${what} ${when}: è ${mult}× quanto fai di solito.`,
  ];
  return {
    kind: 'anomaly',
    priority: 95,
    text: pick(variants),
    color: 'warn',
  };
};

/**
 * Fissi/abbonamenti che cadono entro 3 giorni.
 */
const insightUpcoming = (fixed = [], subscriptions = [], today = new Date()) => {
  const todayDate = startOfDay(today).getDate();
  const items = [
    ...fixed.filter((f) => f.active !== false),
    ...subscriptions.filter((s) => s.active !== false),
  ];
  let nearest = null;
  for (const it of items) {
    const day = Math.min(28, Math.max(1, parseInt(it.deductDay || it.dayOfMonth || 1)));
    let diff = day - todayDate;
    if (diff < 0) diff += 30; // approx, rotola al prossimo mese
    if (diff > 3 || diff < 0) continue;
    if (!nearest || diff < nearest.diff) nearest = { it, diff };
  }
  if (!nearest) return null;
  const when = nearest.diff === 0 ? 'oggi'
    : nearest.diff === 1 ? 'domani'
    : `tra ${nearest.diff} giorni`;
  const W = when.charAt(0).toUpperCase() + when.slice(1);
  const amt = fmt(nearest.it.amount);
  const variants = [
    `${W} cade ${nearest.it.label}: ${amt}.`,
    `${W} è in scadenza ${nearest.it.label} (${amt}).`,
    `Promemoria: ${nearest.it.label} ${when} per ${amt}.`,
  ];
  return {
    kind: 'upcoming',
    priority: 80,
    text: pick(variants),
    color: 'info',
  };
};

/**
 * Trend categoria: confronto questa settimana vs media 4 settimane precedenti.
 * Sceglie la categoria con la deviazione più rilevante.
 */
const insightCategoryTrend = (txs, cats) => {
  const weekStart = startOfDay();
  weekStart.setDate(weekStart.getDate() - 7);
  const thisWeek = {};
  const prevWeeks = {};
  for (const t of txs) {
    if (t.ts >= weekStart.getTime()) {
      thisWeek[t.cat] = (thisWeek[t.cat] || 0) + realCost(t);
    } else if (t.ts >= weekStart.getTime() - 4 * 7 * DAY_MS) {
      prevWeeks[t.cat] = (prevWeeks[t.cat] || 0) + realCost(t);
    }
  }
  let bestCat = null;
  let bestDelta = 0;
  for (const c of cats) {
    const tw = thisWeek[c.id] || 0;
    const pw = (prevWeeks[c.id] || 0) / 4;
    if (pw < 10) continue; // troppo poco storico
    const delta = ((tw - pw) / pw) * 100;
    if (Math.abs(delta) > Math.abs(bestDelta) && Math.abs(delta) >= 20) {
      bestDelta = delta;
      bestCat = c;
    }
  }
  if (!bestCat) return null;
  const sign = bestDelta < 0 ? 'meno' : 'più';
  const pct = Math.round(Math.abs(bestDelta));
  return {
    kind: 'trend',
    priority: 60,
    text: `Questa settimana stai spendendo il ${pct}% in ${sign} per ${bestCat.label.toLowerCase()}.`,
    color: bestDelta < 0 ? 'accent' : 'warn',
  };
};

/**
 * Pace nel mese: se è oltre il 50% del periodo e hai speso una frazione
 * notevolmente diversa, segnalalo.
 */
const insightPace = (totalSpent, freeBudget, dayOfPeriod, daysInPeriod) => {
  if (!freeBudget || dayOfPeriod < 5 || daysInPeriod <= 0) return null;
  const pctDays = dayOfPeriod / daysInPeriod;
  const pctSpent = Math.min(2, totalSpent / freeBudget);
  const diff = pctSpent - pctDays;
  if (Math.abs(diff) < 0.15) return null;
  if (diff < 0) {
    return {
      kind: 'pace',
      priority: 40,
      text: `Sei al ${Math.round(pctDays * 100)}% del mese ma hai usato solo il ${Math.round(pctSpent * 100)}% del libero. Va bene così.`,
      color: 'accent',
    };
  }
  return {
    kind: 'pace',
    priority: 65,
    text: `Sei al ${Math.round(pctDays * 100)}% del mese e hai già usato il ${Math.round(pctSpent * 100)}% del libero.`,
    color: 'warn',
  };
};

/**
 * Insight stagionale — frasi contestuali al mese corrente. Bassa priorità,
 * appare solo quando non c'è materiale più rilevante (anomaly, pace, ecc).
 */
const insightSeasonal = (today = new Date()) => {
  const m = today.getMonth();
  const d = today.getDate();
  // Easter eggs giorni speciali (UX #13) — priorità alta per sostituire altro
  if (m === 0 && d === 1) return { kind: 'easter', priority: 100, text: 'Buon anno. Pronto per il nuovo bilancio?', color: 'accent' };
  if (m === 11 && d === 25) return { kind: 'easter', priority: 100, text: 'Buon Natale. Concediti tutto, ci penso io ai conti.', color: 'accent' };
  if (m === 11 && d === 31) return { kind: 'easter', priority: 100, text: 'Ultimo giorno dell\'anno. Quanto ti sei goduto?', color: 'accent' };
  if (m === 7 && d === 15) return { kind: 'easter', priority: 100, text: 'Ferragosto. Spendi tranquillo — riprendi a settembre.', color: 'accent' };
  // Insight stagionali normali
  const phrases = {
    0: 'Inizio anno: momento buono per rivedere i tuoi fissi e abbonamenti.',
    1: 'Febbraio è corto: distribuisci con attenzione, hai 28 giorni invece di 30.',
    6: 'Luglio: di solito si spende più per ferie e cene fuori. Tienine conto.',
    7: 'Agosto: tradizionalmente il mese più caro dell\'anno. Vai cauto.',
    8: 'Settembre: ritorno alla routine. Aggiorna fissi e abbonamenti se cambiati.',
    11: 'Dicembre tradizionalmente costa di più — regali, cene, viaggi.',
  };
  const text = phrases[m];
  if (!text) return null;
  return { kind: 'seasonal', priority: 25, text, color: 'accent' };
};

/**
 * Fallback se non è successo nulla di rilevante.
 */
const insightWelcome = (txs) => {
  const todayTs = startOfDay().getTime();
  const tomorrowTs = todayTs + DAY_MS;
  const todayTxs = txs.filter((t) => t.ts >= todayTs && t.ts < tomorrowTs);
  if (todayTxs.length === 0) {
    const empty = ['Nessuna spesa oggi. Tutto calmo.', 'Oggi: zero spese.', 'Giornata silenziosa, finora.'];
    return { kind: 'welcome', priority: 10, text: pick(empty), color: 'accent' };
  }
  const n = todayTxs.length;
  const s = fmt(sumSpend(todayTxs));
  const variants = [
    `Oggi ${n} ${n === 1 ? 'spesa' : 'spese'} per ${s}. Continua così.`,
    `Hai registrato ${n} ${n === 1 ? 'voce' : 'voci'} oggi (${s}).`,
    `${n} ${n === 1 ? 'spesa' : 'spese'} oggi, ${s} in tutto.`,
  ];
  return { kind: 'welcome', priority: 10, text: pick(variants), color: 'accent' };
};

// ─── Selezione finale ─────────────────────────────────────────────

/**
 * Genera l'insight del giorno. Prende tutto lo store rilevante, restituisce
 * un singolo oggetto { kind, text, color } o null se davvero non c'è materiale.
 */
export const dailyInsight = ({
  txs = [],
  cats = [],
  fixed = [],
  subscriptions = [],
  totalSpent = 0,
  freeBudget = 0,
  dayOfPeriod = 1,
  daysInPeriod = 30,
  today = new Date(),
}) => {
  const candidates = [
    insightAnomaly(txs, cats),
    insightUpcoming(fixed, subscriptions, today),
    insightCategoryTrend(txs, cats),
    insightPace(totalSpent, freeBudget, dayOfPeriod, daysInPeriod),
    insightSeasonal(today),
    insightWelcome(txs),
  ].filter(Boolean);

  if (candidates.length === 0) return null;

  // Ordina per priorità decrescente
  candidates.sort((a, b) => b.priority - a.priority);

  // Se più candidati hanno priorità simile (entro 20pt dal top), ne sceglie
  // uno a caso ma deterministico sul giorno — così l'utente vede varietà.
  const top = candidates[0].priority;
  const eligible = candidates.filter((c) => top - c.priority <= 20);
  const idx = dailySeed(today, eligible.length);
  return eligible[idx];
};
