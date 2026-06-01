// Analytics — unifica le vecchie stats.js e forecast.js in un solo modulo.
// Funzioni pure, niente React, niente side-effect. Tutto in italiano per
// l'autore (Merico): più facile leggere un anno dopo.
//
// Cosa c'è dentro:
//   • helper statistici  (groupByMonth, sumSpend, meanSd)
//   • storico categorie  (categoryHistoricalStats)
//   • timeline giornaliera (dailyTimeline, pacePosition)
//   • previsione fine periodo (monthlyForecast, categoryForecast)
//
// Il blend tra estrapolazione lineare e media storica resta lo stesso:
// più siamo avanti nel periodo, più ci fidiamo di quello che hai speso
// finora; meno siamo avanti, più pesa lo storico.

import { realCost, monthlyEq, round2 } from './format.js';

// ─── Statistici di base ────────────────────────────────────────────

/**
 * Raggruppa transazioni per mese (chiave 'YYYY-MM').
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
 * Somma spesa di una lista di transazioni.
 */
export const sumSpend = (txs) => {
  let s = 0;
  for (let i = 0; i < txs.length; i++) s += realCost(txs[i]);
  return s;
};

/**
 * Media e deviazione standard di un array numerico.
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

// ─── Storico per categoria ─────────────────────────────────────────

/**
 * Media storica per categoria sui mesi passati (escluso il corrente).
 * Restituisce { catId: { mean, sd, n, months } }.
 */
export const categoryHistoricalStats = (txs, currentMonthKey) => {
  const byMonth = groupByMonth(txs);
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

// ─── Timeline giornaliera ──────────────────────────────────────────

/**
 * Spesa giornaliera per il periodo — array lungo daysInPeriod, indice = giorno - 1.
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
 * Marker "dove dovresti essere" se spendessi linearmente — 0..1.
 */
export const pacePosition = (dayOfPeriod, daysInPeriod) => {
  if (daysInPeriod <= 0) return 0;
  return Math.max(0, Math.min(1, dayOfPeriod / daysInPeriod));
};

// ─── Previsione fine periodo ───────────────────────────────────────

/**
 * Forecast spesa per la fine del periodo corrente.
 *
 * Il blend funziona così:
 *   • all'inizio (dayOfPeriod basso) → ci fidiamo della storia
 *   • a fine periodo (dayOfPeriod ≈ daysInPeriod) → ci fidiamo del lineare
 * In mezzo: media ponderata.
 *
 * @returns {{ projectedSpend, remainingForecast, daysLeft }}
 */
export const monthlyForecast = ({ periodTxs, allTxs, dayOfPeriod, daysInPeriod, currentMonthKey }) => {
  const spentSoFar = sumSpend(periodTxs);
  const daysLeft = Math.max(0, daysInPeriod - dayOfPeriod);

  if (daysInPeriod <= 0) {
    return { projectedSpend: spentSoFar, remainingForecast: 0, daysLeft: 0 };
  }

  const linear = spentSoFar * (daysInPeriod / Math.max(1, dayOfPeriod));

  const stats = categoryHistoricalStats(allTxs, currentMonthKey);
  let historicalTotal = 0;
  Object.values(stats).forEach((s) => { historicalTotal += s.mean; });

  if (historicalTotal === 0) {
    return { projectedSpend: linear, remainingForecast: Math.max(0, linear - spentSoFar), daysLeft };
  }

  const w = Math.min(1, dayOfPeriod / daysInPeriod);
  const projected = w * linear + (1 - w) * historicalTotal;
  return {
    projectedSpend: projected,
    remainingForecast: Math.max(0, projected - spentSoFar),
    daysLeft,
  };
};

/**
 * Forecast per singola categoria — la riga "finirà intorno a €X" su ogni area.
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

// ─── Modello "balance-first" (nuovo, capitolo 2) ──────────────────
//
// Le funzioni qui sotto servono al nuovo flusso "parti quando vuoi" —
// non si appoggiano più al ciclo "stipendio = inizio periodo". Lavorano
// sul saldo reale e sulle entrate future dichiarate.

// ─── Cadenze entrata ────────────────────────────────────────────────
// v0.9.x: le entrate possono essere mensili (giorno del mese, default) oppure
// a intervallo fisso: settimanale (7), bisettimanale (14), ogni 4 settimane (28).
// Le non-mensili usano `anchorTs` = una data di paga nota; le occorrenze sono
// anchor ± k·intervallo. SENZA cadenza/anchor → comportamento mensile di prima
// (così i dati esistenti non cambiano di una virgola).
const INCOME_INTERVAL_DAYS = { weekly: 7, biweekly: 14, fourweekly: 28 };
const clamp28 = (d) => Math.min(28, Math.max(1, parseInt(d) || 1));
const isIntervalIncome = (inc) => INCOME_INTERVAL_DAYS[inc?.cadence] && Number.isFinite(inc?.anchorTs);

// Aritmetica a GIORNI di calendario (non millisecondi): immune all'ora legale.
// Math.round assorbe il ±1h di DST quando si dividono differenze per 864e5.
const diffDays = (aMidnight, bMidnight) => Math.round((bMidnight.getTime() - aMidnight.getTime()) / 864e5);
const anchorMidnight = (inc) => { const a = new Date(inc.anchorTs); a.setHours(0, 0, 0, 0); return a; };
const datePlusDays = (a, n) => new Date(a.getFullYear(), a.getMonth(), a.getDate() + n);

/** Prima occorrenza STRETTAMENTE dopo `from` (Date a mezzanotte), per una singola entrata. */
const nextIncomeOcc = (inc, from) => {
  if (isIntervalIncome(inc)) {
    const stepD = INCOME_INTERVAL_DAYS[inc.cadence];
    const a = anchorMidnight(inc);
    const d = diffDays(a, from);
    let occ = Math.ceil(d / stepD) * stepD;
    if (occ <= d) occ += stepD;
    return datePlusDays(a, occ);
  }
  const day = clamp28(inc.dayOfMonth);
  const tm = new Date(from.getFullYear(), from.getMonth(), day);
  return tm > from ? tm : new Date(from.getFullYear(), from.getMonth() + 1, day);
};

/** Ultima occorrenza <= `from` (Date), per una singola entrata. */
const prevIncomeOcc = (inc, from) => {
  if (isIntervalIncome(inc)) {
    const stepD = INCOME_INTERVAL_DAYS[inc.cadence];
    const a = anchorMidnight(inc);
    const f0 = new Date(from); f0.setHours(0, 0, 0, 0); // normalizza (from può essere 23:59)
    const d = diffDays(a, f0);
    const occ = Math.floor(d / stepD) * stepD;
    return datePlusDays(a, occ);
  }
  const day = clamp28(inc.dayOfMonth);
  const tm = new Date(from.getFullYear(), from.getMonth(), day);
  return tm <= from ? tm : new Date(from.getFullYear(), from.getMonth() - 1, day);
};

/** Numero di occorrenze in (from, until], per una singola entrata. */
export const countIncomeOccurrences = (inc, fromDate, untilDate) => {
  const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
  const until = new Date(untilDate); until.setHours(0, 0, 0, 0);
  if (until <= from) return 0;
  if (isIntervalIncome(inc)) {
    const stepD = INCOME_INTERVAL_DAYS[inc.cadence];
    const a = anchorMidnight(inc);
    const kMin = Math.floor(diffDays(a, from) / stepD) + 1; // prima > from
    const kMax = Math.floor(diffDays(a, until) / stepD);    // ultima <= until
    return Math.max(0, kMax - kMin + 1);
  }
  // mensile: conta le occorrenze del dayOfMonth in (from, until]
  const day = clamp28(inc.dayOfMonth);
  let count = 0, guard = 0;
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= until && guard < 600) {
    const due = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    if (due > from && due <= until) count++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    guard++;
  }
  return count;
};

/**
 * Prossima data di entrata futura (su tutte le entrate attive).
 * Schema entrata: { dayOfMonth, cadence?, anchorTs?, active, kind, amount, label }.
 * @returns Date | null
 */
export const nextIncomeDate = (incomes, fromDate = new Date()) => {
  if (!Array.isArray(incomes) || incomes.length === 0) return null;
  const active = incomes.filter((i) => i.active !== false && i.amount > 0);
  if (active.length === 0) return null;
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  let earliest = null;
  for (const inc of active) {
    const candidate = nextIncomeOcc(inc, from);
    if (!earliest || candidate < earliest) earliest = candidate;
  }
  return earliest;
};

/**
 * v0.8.2: la PIÙ RECENTE data di entrata <= fromDate (la paga appena passata).
 * @returns Date | null
 */
export const prevIncomeDate = (incomes, fromDate = new Date()) => {
  if (!Array.isArray(incomes) || incomes.length === 0) return null;
  const active = incomes.filter((i) => i.active !== false && i.amount > 0);
  if (active.length === 0) return null;
  const from = new Date(fromDate);
  from.setHours(23, 59, 59, 999); // include oggi come "passata"
  let latest = null;
  for (const inc of active) {
    const candidate = prevIncomeOcc(inc, from);
    if (!latest || candidate > latest) latest = candidate;
  }
  return latest;
};

/**
 * Somma fissi + abbonamenti che cadono tra `fromDate` (escluso) e `untilDate`
 * (escluso). I fissi di OGGI sono considerati già pagati e NON vengono sottratti
 * (l'utente vede il loro saldo già aggiornato di conseguenza); quelli che
 * cadono nei giorni futuri prima della prossima entrata sì.
 *
 * v0.8.2: ora considera ANCHE gli abbonamenti non-mensili (prima ignorati).
 *  - mensili (fissi + abbo): conteggio ESATTO delle occorrenze del deductDay
 *    nella finestra (può essere 0, 1 o 2 se la finestra scavalca due mesi).
 *  - non-mensili (settimanali, trimestrali, annuali, ecc.): non avendo una
 *    data-ancora esatta del prossimo addebito, usiamo la quota mensile-
 *    equivalente PRORATA sui giorni della finestra. È la stima onesta e
 *    stabile (niente salti improvvisi), e in media coincide col costo reale.
 */
export const sumLockedBetween = ({ fixed = [], subscriptions = [], fromDate, untilDate, recurringPaid = {} }) => {
  if (!untilDate || untilDate <= fromDate) return 0;
  const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
  const until = new Date(untilDate); until.setHours(0, 0, 0, 0);
  const windowDays = Math.max(0, (until - from) / 864e5);

  // Conteggio esatto delle occorrenze mensili del `day` in (from, until),
  // SALTANDO quelle già segnate come pagate (recurringPaid[`${id}_YYYY-MM`]).
  // v0.9: senza questo skip, segnare un fisso "pagato" lo conterebbe due volte
  // (una nel saldo già scalato, una qui nel locked) → libero sbagliato.
  const monthlyOccurUnpaid = (item, day) => {
    const d = Math.min(28, Math.max(1, parseInt(day) || 1));
    let count = 0, guard = 0;
    let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor < until && guard < 600) {
      const due = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      if (due > from && due < until) {
        const key = `${item.id}_${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
        if (!recurringPaid[key]) count++; // salta se già pagata quel mese
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      guard++;
    }
    return count;
  };

  let total = 0;
  // Fissi: sempre mensili → conteggio esatto (al netto dei pagati)
  for (const f of fixed) {
    if (f.active === false) continue;
    total += monthlyOccurUnpaid(f, f.deductDay || f.dayOfMonth) * (f.amount || 0);
  }
  // Abbonamenti: mensili esatti (al netto dei pagati), altri prorati
  for (const s of subscriptions) {
    if (s.active === false) continue;
    const cadence = s.cadence || 'monthly';
    if (cadence === 'monthly') {
      total += monthlyOccurUnpaid(s, s.deductDay || s.dayOfMonth) * (s.amount || 0);
    } else {
      total += monthlyEq(s.amount || 0, cadence) * (windowDays / 30.44);
    }
  }
  return round2(total);
};

/**
 * Quanti euro sono "liberi" da spendere tra oggi e la prossima entrata.
 * Formula: saldo - cuscinetto - fissi futuri.
 */
export const freeUntilNextIncome = ({ currentBalance = 0, cushion = 0, goalsSaved = 0, fixed = [], subscriptions = [], incomes = [], recurringPaid = {}, today = new Date() }) => {
  // v0.9: goalsSaved = soldi messi nel salvadanaio. Sono "earmarked": restano
  // nel conto (currentBalance non cambia) ma NON sono spendibili → li sottraggo
  // dal libero come il cuscinetto. Così la riconciliazione col saldo bancario
  // resta corretta (currentBalance = quello che vedi in banca).
  const reserved = round2((cushion || 0) + (goalsSaved || 0));
  const next = nextIncomeDate(incomes, today);
  if (!next) {
    // Senza entrate previste, "libero" = saldo - cuscinetto - salvadanaio
    return { amount: round2(Math.max(0, currentBalance - reserved)), nextIncomeAt: null, lockedBefore: 0 };
  }
  const locked = sumLockedBetween({ fixed, subscriptions, fromDate: today, untilDate: next, recurringPaid });
  const amount = round2(Math.max(0, currentBalance - reserved - locked));
  return { amount, nextIncomeAt: next, lockedBefore: round2(locked) };
};
