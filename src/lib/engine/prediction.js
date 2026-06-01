// ─────────────────────────────────────────────────────────────────────────
// PREDICTION ENGINE — il secondo strato del "Financial Copilot".
//
//   Data Engine  →  [ PREDICTION ]  →  Intelligence  →  UI / Copilot
//
// Tutto ciò che è "calcolato/previsto" dai dati grezzi vive qui: funzioni PURE,
// niente React, niente AI, niente side-effect. Consolida i moduli storici
// (analytics + parte di intelligence) in un'unica superficie d'import e aggiunge
// `computeFinance()`: il modello finanziario balance-first in forma pura.
//
// Tappa 0 del piano: estrazione fedele dei calcoli che oggi vivono in useStore,
// SENZA cambiare comportamento (stesse formule, stesse primitive).
// ─────────────────────────────────────────────────────────────────────────

import { round2, realCost } from '../format.js';
import {
  nextIncomeDate,
  prevIncomeDate,
  countIncomeOccurrences,
  sumLockedBetween,
  freeUntilNextIncome,
  monthlyForecast,
  categoryForecast,
  categoryHistoricalStats,
  dailyTimeline,
  pacePosition,
} from '../analytics.js';
import {
  detectRecurring,
  computeLearningConfidence,
  getLearningLevel,
} from '../intelligence.js';

// Re-export delle primitive: chi usa il motore importa SOLO da qui.
export {
  nextIncomeDate,
  prevIncomeDate,
  countIncomeOccurrences,
  sumLockedBetween,
  freeUntilNextIncome,
  monthlyForecast,
  categoryForecast,
  categoryHistoricalStats,
  dailyTimeline,
  pacePosition,
  detectRecurring,
  computeLearningConfidence,
  getLearningLevel,
};

const DAY_MS = 864e5;

// ─── Burn rate / media giornaliera ─────────────────────────────────
const isRecurringTx = (t) => Array.isArray(t.tags) && t.tags.includes('ricorrente');

/**
 * Media giornaliera di spesa VARIABILE sugli ultimi `days` giorni (default 30).
 * Base empirica del burn rate e delle proiezioni di saldo. Robusta:
 *  - ESCLUDE le spese taggate 'ricorrente' (create da "segna come pagato"):
 *    sono già contate nei fissi/abbonamenti → qui sarebbero un doppio conteggio.
 *  - SMUSSA le una-tantum fuori scala: il contributo di ogni spesa è limitato
 *    a 4× la mediana della sua categoria (90g; fallback mediana globale).
 *    Es. il "muratore €160" con mediana €10 conta €40, non €160 → niente
 *    previsioni gonfiate da un singolo evento eccezionale.
 */
export function avgDailySpend(txs = [], days = 30, now = new Date()) {
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  const start = from.getTime() - days * DAY_MS;
  const end = from.getTime() + DAY_MS; // include oggi

  // Mediane di categoria su 90 giorni (solo spese variabili).
  const medStart = from.getTime() - 90 * DAY_MS;
  const byCat = {};
  const all = [];
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    if (t.ts < medStart || t.ts >= end || isRecurringTx(t)) continue;
    const c = realCost(t);
    if (!byCat[t.cat]) byCat[t.cat] = [];
    byCat[t.cat].push(c);
    all.push(c);
  }
  const median = (arr) => { const a = [...arr].sort((x, y) => x - y); return a[(a.length - 1) >> 1]; };
  const med = {};
  for (const k in byCat) if (byCat[k].length >= 3) med[k] = median(byCat[k]);
  const globalMed = all.length >= 3 ? median(all) : null;

  let s = 0;
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    if (t.ts < start || t.ts >= end || isRecurringTx(t)) continue;
    const c = realCost(t);
    const base = med[t.cat] != null ? med[t.cat] : globalMed;
    s += base != null ? Math.min(c, base * 4) : c;
  }
  return round2(s / Math.max(1, days));
}

/** Ultimo giorno del mese corrente (per il "saldo previsto a fine mese"). */
export function endOfMonthDate(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/** Somma delle entrate ricorrenti che cadono in (from, until].
    v0.9.25: usa countIncomeOccurrences → supporta anche le cadenze
    settimanale / ogni 2 settimane / ogni 4 settimane (oltre alla mensile). */
function incomesBetween(incomes = [], from, until) {
  if (!Array.isArray(incomes) || until <= from) return 0;
  let total = 0;
  for (const inc of incomes) {
    if (inc.active === false || !(inc.amount > 0)) continue;
    total += inc.amount * countIncomeOccurrences(inc, from, until);
  }
  return round2(total);
}

/**
 * Saldo BANCARIO previsto a una data futura.
 *   previsto = saldo + entrate future + rate splice future − fissi/abbo futuri − spesa stimata
 * dove "spesa stimata" = media giornaliera × giorni alla data (escluse le ricorrenze,
 * già contate a parte). Stima onesta e leggermente prudente.
 *
 * @param {object} s { currentBalance, txs, fixed, subscriptions, incomes, extraIncomes, recurringPaid }
 * @param {Date}   targetDate data obiettivo
 * @param {number} [avgDaily] media giornaliera precalcolata (per non ricalcolarla)
 */
export function projectedBalance(s = {}, now = new Date(), targetDate, avgDaily) {
  const balance = s.currentBalance || 0;
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  const target = new Date(targetDate); target.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((target - from) / DAY_MS));
  if (days <= 0) return round2(balance);

  const avg = (avgDaily == null) ? avgDailySpend(s.txs || [], 30, now) : avgDaily;
  const projSpend = round2(avg * days);
  const locked = sumLockedBetween({
    fixed: s.fixed || [],
    subscriptions: s.subscriptions || [],
    fromDate: from,
    untilDate: target,
    recurringPaid: s.recurringPaid || {},
  });
  const incomeIn = incomesBetween(s.incomes || [], from, target);
  const spliceIn = round2(
    (s.extraIncomes || [])
      .filter((e) => e.pendingCredit && e.ts > from.getTime() && e.ts <= target.getTime())
      .reduce((a, e) => a + (e.amount || 0), 0)
  );

  return round2(balance + incomeIn + spliceIn - locked - projSpend);
}

/**
 * Saldi previsti a 7g / 30g / fine mese + media giornaliera, in un colpo solo.
 */
export function projectedBalances(s = {}, now = new Date()) {
  const avg = avgDailySpend(s.txs || [], 30, now);
  const d7 = new Date(now); d7.setDate(d7.getDate() + 7);
  const d30 = new Date(now); d30.setDate(d30.getDate() + 30);
  const eom = endOfMonthDate(now);
  return {
    avgDailySpend: avg,
    burnRateMonthly: round2(avg * 30.44),
    in7d: projectedBalance(s, now, d7, avg),
    in30d: projectedBalance(s, now, d30, avg),
    endOfMonth: projectedBalance(s, now, eom, avg),
  };
}

/**
 * computeFinance — modello finanziario "balance-first" calcolato dallo stato grezzo.
 *
 * Riproduce 1:1 i derivati che oggi vivono in useStore (freeUntilNext, dailyQuota,
 * spentToday, …) in forma PURA e testabile. Nessun side-effect. È la fonte unica
 * di verità per la Home e per il Copilot.
 *
 * @param {object} s   stato grezzo:
 *   { currentBalance, cushion, goals, fixed, subscriptions, incomes,
 *     recurringPaid, txs, todayKey, daysInPeriod, dayOfPeriod }
 * @param {Date}   now anchor "oggi" stabile (di norma store.now)
 * @returns modello calcolato (stessi nomi di campo già usati dalle schermate)
 */
export function computeFinance(s = {}, now = new Date()) {
  const txs = s.txs || [];
  const todayKey = s.todayKey ?? (() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime();
  })();

  // Pagate O saltate: in entrambi i casi l'occorrenza del mese non va più
  // scontata dal libero (pagata = saldo già sceso; saltata = non si paga).
  const paidOrSkipped = { ...(s.recurringPaid || {}), ...(s.recurringSkipped || {}) };

  // Salvadanaio: somma earmarked di tutti gli obiettivi (resta nel saldo ma non
  // è spendibile → sottratto dal libero, come il cuscinetto).
  const totalGoalsSaved = round2((s.goals || []).reduce((a, g) => a + (g.saved || 0), 0));

  // Libero fino alla prossima entrata = saldo − cuscinetto − salvadanaio − fissi futuri.
  const bf = freeUntilNextIncome({
    currentBalance: s.currentBalance || 0,
    cushion: s.cushion || 0,
    goalsSaved: totalGoalsSaved,
    fixed: s.fixed || [],
    subscriptions: s.subscriptions || [],
    incomes: s.incomes || [],
    recurringPaid: paidOrSkipped,
    today: now,
  });
  const nextIncomeAt = bf.nextIncomeAt;
  const lockedUntilNext = bf.lockedBefore;
  const freeUntilNext = bf.amount;

  let daysToNextIncome = null;
  if (nextIncomeAt) {
    const diff = nextIncomeAt - now;
    daysToNextIncome = Number.isFinite(diff) ? Math.max(1, Math.round(diff / DAY_MS)) : null;
  }

  // v0.10.1: posizione nel ciclo — "giorno X di Y" (dalla paga scorsa alla prossima).
  // Rende tangibile il modello paga→paga nella home.
  let cycleDaysTotal = null;
  let cycleDayNumber = null;
  if (nextIncomeAt && daysToNextIncome != null) {
    const prevPay = prevIncomeDate(s.incomes || [], now);
    if (prevPay) {
      cycleDaysTotal = Math.max(1, Math.round((nextIncomeAt - prevPay) / DAY_MS));
      cycleDayNumber = Math.min(cycleDaysTotal, Math.max(1, cycleDaysTotal - daysToNextIncome + 1));
    }
  }

  // Quota giornaliera canonica (uguale per Today e Money).
  const spentToday = round2(
    txs
      .filter((t) => t.ts >= todayKey && t.ts < todayKey + DAY_MS)
      .reduce((a, t) => a + realCost(t), 0)
  );
  const daysToIncomeOrPeriod = daysToNextIncome
    || Math.max(1, (s.daysInPeriod || 1) - (s.dayOfPeriod || 1) + 1);
  // SPENDIBILE = libero da obblighi − quanto vuoi accantonare ogni mese (i €300).
  // I risparmi NON sono spendibili → riducono budget giornaliero e "liberi a fine mese".
  const savingsTarget = round2(s.monthlySavingsTarget || 0);
  const spendableUntilNext = round2((freeUntilNext || 0) - savingsTarget);
  const freeAtMorning = round2(spendableUntilNext + spentToday);
  const dailyQuota = round2(freeAtMorning / Math.max(1, daysToIncomeOrPeriod));
  const effectiveDaily = round2(Math.max(0, dailyQuota - spentToday));
  const dailyOverflow = round2(Math.max(0, spentToday - dailyQuota));

  // Proiezioni di saldo (7g / 30g / fine mese) + burn rate.
  const projected = projectedBalances({
    currentBalance: s.currentBalance || 0,
    txs,
    fixed: s.fixed || [],
    subscriptions: s.subscriptions || [],
    incomes: s.incomes || [],
    extraIncomes: s.extraIncomes || [],
    recurringPaid: paidOrSkipped,
  }, now);

  // "Liberi a fine mese" = SPENDIBILE residuo del ciclo (cuscinetto + salvadanaio +
  // accantonamento già esclusi). NON somma la paga futura → non risulta mai "più di
  // quel che hai". Coincide con lo spendibile, quindi (oggi al giorno × giorni) ≈ questo.
  // Cala man mano che spendi (il saldo scende). Può essere negativo (→ rosso).
  const freeAtEndOfCycle = spendableUntilNext;

  // SEMAFORO del ciclo (v0.10): tre stati deterministici e spiegabili.
  //   rosso   = stai intaccando i soldi protetti (spendibile < 0) o sei sotto il cuscinetto
  //   attento = oggi hai esaurito/sforato il budget del giorno
  //   sereno  = tutto in linea
  const balance = s.currentBalance || 0;
  let cycleStatus = 'sereno';
  let cycleStatusReason = 'Sei in linea col tuo ritmo';
  if (spendableUntilNext < 0 || (s.cushion > 0 && balance < s.cushion)) {
    cycleStatus = 'rosso';
    cycleStatusReason = spendableUntilNext < 0
      ? 'Stai intaccando i soldi che volevi proteggere'
      : 'Il saldo è sceso sotto il cuscinetto';
  } else if (dailyOverflow > 0) {
    cycleStatus = 'attento';
    cycleStatusReason = 'Oggi hai superato il budget del giorno';
  }

  return {
    totalGoalsSaved,
    freeUntilNext,
    nextIncomeAt,
    lockedUntilNext,
    daysToNextIncome,
    spentToday,
    freeAtMorning,
    dailyQuota,
    effectiveDaily,
    dailyOverflow,
    // SPENDIBILE (libero dopo aver messo via i risparmi) + quanto si accantona
    spendableUntilNext,
    savingsTargetUsed: savingsTarget,
    freeAtEndOfCycle,
    // Semaforo del ciclo (v0.10)
    cycleStatus,
    cycleStatusReason,
    // Posizione nel ciclo (v0.10.1): "giorno X di Y"
    cycleDayNumber,
    cycleDaysTotal,
    // Tappa 1: previsioni
    avgDailySpend: projected.avgDailySpend,
    burnRateMonthly: projected.burnRateMonthly,
    projected, // { in7d, in30d, endOfMonth, avgDailySpend, burnRateMonthly }
  };
}

/**
 * copilotExtras — contesto extra GIÀ PRONTO per il Copilot (funzione PURA).
 * Il Copilot legge questi numeri, non li ricalcola. Fornisce:
 *   - spentMonth        : speso dall'inizio del mese (mese di calendario)
 *   - byCategory[]      : { id, label, spent } del mese, decrescente
 *   - topCategory       : la categoria più pesante del mese (o null)
 *   - upcoming[]        : prossime uscite ricorrenti (fisse + abbo mensili) da
 *                         oggi a fine mese, non ancora pagate → { label, amount, inDays, day }
 *   - upcomingWeek      : somma uscite entro 7 giorni
 *   - upcomingMonth     : somma uscite fino a fine mese
 *   - restOfMonthDays   : giorni rimanenti nel mese (per le stime "e se…")
 *
 * @param {object} s     stato grezzo (txs, cats, fixed, subscriptions, recurringPaid)
 * @param {Date}   now   anchor "oggi"
 */
export function copilotExtras(s = {}, now = new Date()) {
  const txs = s.txs || [];
  const cats = s.cats || [];
  const y = now.getFullYear();
  const mo = now.getMonth();

  // Spese del mese corrente (totale + per categoria) e degli ultimi 7 giorni.
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const weekStart = startOfToday.getTime() - 6 * DAY_MS;
  const weekEnd = startOfToday.getTime() + DAY_MS; // include oggi
  const byCatMap = {};
  let spentMonth = 0;
  let spentWeek = 0;
  for (const t of txs) {
    const d = new Date(t.ts);
    if (d.getFullYear() === y && d.getMonth() === mo) {
      const c = realCost(t);
      spentMonth += c;
      byCatMap[t.cat] = (byCatMap[t.cat] || 0) + c;
    }
    if (t.ts >= weekStart && t.ts < weekEnd) spentWeek += realCost(t);
  }
  spentMonth = round2(spentMonth);
  spentWeek = round2(spentWeek);
  const byCategory = cats
    .map((c) => ({ id: c.id, label: c.label, spent: round2(byCatMap[c.id] || 0) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);
  const topCategory = byCategory[0] || null;

  // Prossime uscite ricorrenti da oggi a fine mese (non ancora pagate).
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
  const todayD = today0.getDate();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const restOfMonthDays = Math.max(0, daysInMonth - todayD);
  // Pagate O saltate: non compaiono più tra le "prossime uscite" del mese.
  const paid = { ...(s.recurringPaid || {}), ...(s.recurringSkipped || {}) };
  const monthTag = `${y}-${String(mo + 1).padStart(2, '0')}`;
  const upcoming = [];
  [
    ...(s.fixed || []).filter((f) => f.active !== false),
    ...(s.subscriptions || []).filter((x) => x.active !== false && (x.cadence || 'monthly') === 'monthly'),
  ].forEach((it) => {
    const day = Math.min(28, Math.max(1, parseInt(it.deductDay || it.dayOfMonth || 1)));
    if (day < todayD) return;                       // già passata questo mese
    if (paid[`${it.id}_${monthTag}`]) return;       // già segnata pagata
    upcoming.push({ label: it.label, amount: round2(it.amount || 0), inDays: day - todayD, day });
  });
  upcoming.sort((a, b) => a.inDays - b.inDays);
  const upcomingWeek = round2(upcoming.filter((u) => u.inDays <= 7).reduce((a, u) => a + u.amount, 0));
  const upcomingMonth = round2(upcoming.reduce((a, u) => a + u.amount, 0));

  // Affidabilità dati di spesa: con poche spese registrate o poca storia, la media
  // giornaliera (e quindi le previsioni a lungo termine) è inattendibile. Lo segnaliamo.
  const nowMs = now.getTime();
  const txCount30 = txs.filter((t) => t.ts >= nowMs - 30 * DAY_MS && t.ts < nowMs + DAY_MS).length;
  const firstTs = txs.length ? txs.reduce((m, t) => (t.ts < m ? t.ts : m), nowMs) : nowMs;
  const historyDays = Math.round((nowMs - firstTs) / DAY_MS);
  const lowSpendData = txCount30 < 8 || historyDays < 14;

  return {
    spentMonth, spentWeek, byCategory, topCategory, upcoming, upcomingWeek, upcomingMonth, restOfMonthDays,
    txCount30, historyDays, lowSpendData,
  };
}

/**
 * monthlyCashflow — flusso di cassa mensile stimato (funzione PURA).
 *   entrate ricorrenti − (fissi + abbonamenti mensili + annuali/12) − spesa variabile media
 * "net" è quanto, di questo passo, cresce (o cala) il conto ogni mese. Base delle
 * previsioni a lungo termine e dei tempi-obiettivo del Copilot.
 */
export function monthlyCashflow(s = {}, model = {}) {
  // Equivalente mensile per cadenza (settimanale ≈ ×4,35 ecc.).
  const INCOME_MONTHLY_EQ = { weekly: 30.44 / 7, biweekly: 30.44 / 14, fourweekly: 30.44 / 28 };
  const income = round2((s.incomes || [])
    .filter((i) => i.active !== false && i.amount > 0)
    .reduce((a, i) => a + i.amount * (INCOME_MONTHLY_EQ[i.cadence] || 1), 0));
  const fixedM = (s.fixed || []).filter((f) => f.active !== false).reduce((a, f) => a + (f.amount || 0), 0);
  const subsM = (s.subscriptions || [])
    .filter((x) => x.active !== false && (x.cadence || 'monthly') === 'monthly')
    .reduce((a, x) => a + (x.amount || 0), 0);
  const annualM = (s.annualExpenses || []).reduce((a, e) => a + (e.amount || 0) / 12, 0);
  const recurring = round2(fixedM + subsM + annualM);
  const avgSpend = round2(model.burnRateMonthly || (model.avgDailySpend ? model.avgDailySpend * 30.44 : 0));
  const net = round2(income - recurring - avgSpend);
  return { income, recurring, avgSpend, net };
}

/**
 * amortize — rata di un finanziamento (ammortamento "alla francese"), funzione PURA.
 * Tasso 0 (o assente) → rata = capitale / mesi. Altrimenti formula della rata
 * costante. Restituisce anche interessi totali e costo totale (anticipo incluso).
 *
 * @param {object} p { total, downPayment, months, annualRatePct }
 */
export function amortize({ total = 0, downPayment = 0, months = 1, annualRatePct = 0 } = {}) {
  const dp = Math.max(0, downPayment);
  const principal = round2(Math.max(0, total - dp));
  const m = Math.max(1, Math.round(months));
  if (principal <= 0) {
    return { principal: 0, monthly: 0, totalPaid: round2(dp), totalInterest: 0, totalLoan: 0, months: m, downPayment: round2(dp) };
  }
  const withRate = annualRatePct > 0;
  let monthly;
  if (!withRate) {
    monthly = principal / m;
  } else {
    const r = annualRatePct / 100 / 12;
    monthly = principal * r / (1 - Math.pow(1 + r, -m));
  }
  monthly = round2(monthly);
  // A tasso 0 il totale è ESATTAMENTE il capitale (niente €0,2 da arrotondamento rata).
  const totalLoan = withRate ? round2(monthly * m) : principal;
  const totalInterest = withRate ? round2(totalLoan - principal) : 0;
  const totalPaid = round2(totalLoan + dp);
  return { principal, monthly, totalPaid, totalInterest, totalLoan, months: m, downPayment: round2(dp) };
}

/** Mesi per accumulare `target` partendo da `start`, mettendo via `perMonth`/mese. */
export function monthsToTarget(target, start = 0, perMonth = 0) {
  const gap = round2(target - start);
  if (gap <= 0) return 0;
  if (!(perMonth > 0)) return null; // non ci arrivi mai a questo ritmo
  return Math.ceil(gap / perMonth);
}

/**
 * recurringSuggestions — ricorrenze RILEVATE dalle spese, non ancora registrate,
 * pronte da proporre con un tap. Funzione PURA (usa detectRecurring).
 *
 * Tiene solo le cadenze "aggiungibili" (mensile/settimanale), scarta quelle che
 * somigliano a un abbonamento/fisso già presente (match sul token) e quelle che
 * l'utente ha già ignorato (`dismissedRecurring`).
 *
 * @param {object} s   { txs, subscriptions, fixed, dismissedRecurring }
 * @returns suggestion[]  { key, label, amount, day, cadence, cadenceLabel, catId, count }
 */
export function recurringSuggestions(s = {}) {
  const txs = s.txs || [];
  const existing = [...(s.subscriptions || []), ...(s.fixed || [])].map((x) => (x.label || '').toLowerCase());
  const dismissed = s.dismissedRecurring || [];
  const cadenceMap = { mensile: 'monthly', settimanale: 'weekly' };

  const patterns = detectRecurring(txs, { minOccurrences: 3, withinDays: 95 });
  const out = [];
  for (const p of patterns) {
    const cadence = cadenceMap[p.cadence];
    if (!cadence) continue;                         // solo mensile/settimanale
    if (dismissed.includes(p.key)) continue;        // già ignorata
    const token = (p.commonToken || '').toLowerCase();
    if (token && existing.some((l) => l.includes(token))) continue; // già registrata
    out.push({
      key: p.key,
      label: p.label,
      amount: round2(p.avgAmount),
      day: Math.min(28, Math.max(1, p.commonDay || 1)),
      cadence,                  // 'monthly' | 'weekly' (per addSubscription)
      cadenceLabel: p.cadence,  // 'mensile' | 'settimanale' (per il testo)
      catId: p.catId,
      count: p.count,
    });
  }
  return out.slice(0, 3);
}
