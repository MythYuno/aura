# Formule della v0.8 — riferimento per i Task 2-5

Estratte dal Task 1 del piano, prima della cancellazione dei file che le contenevano.
Non sono codice da copiare: assumono tutte il mese solare, e il ciclo dal 16 invalida
quell'assunzione alla radice. Servono a non perdere la logica mentre si riscrive.
Recuperabili anche con `git show 84be91f:<percorso>`.

## `evaluateWish` — da src/lib/wish.js

```js
export const evaluateWish = ({ amount, months, freeBudget, avgFreeSpent = 0 }) => {
  const safeBudget = Math.max(0, freeBudget * SAFE_TARGETS_FOR_BUFFER);
  const m = Math.max(1, Math.round(months || 1));
  const perMonth = amount / m;
  const ratio = safeBudget > 0 ? perMonth / safeBudget : Infinity;

  let verdict, label, color, hint;

  if (!isFinite(ratio) || safeBudget <= 0) {
    verdict = 'impossible';
    label = 'Con questo budget mensile non è sostenibile';
    color = 'danger';
    hint = 'Prova ad allungare i tempi o ridurre il costo del desiderio.';
  } else if (ratio <= 0.15) {
    verdict = 'easy';
    label = 'Fattibile senza sforzo';
    color = 'accent';
    hint = `Metti via €${Math.round(perMonth)} al mese e in ${m} ${m === 1 ? 'mese' : 'mesi'} è tuo.`;
  } else if (ratio <= 0.30) {
    verdict = 'doable';
    label = 'Fattibile con disciplina';
    color = 'accent';
    hint = `Stai usando il ${Math.round(ratio * 100)}% del libero per questo. Realistico, ma ricordatelo.`;
  } else if (ratio <= 0.50) {
    verdict = 'tight';
    label = 'Si può, ma sarà stretto';
    color = 'warn';
    hint = `Quasi metà del tuo libero finisce qui. Se ti viene un imprevisto, slitta.`;
  } else if (ratio <= 0.80) {
    verdict = 'hard';
    label = 'Faticoso';
    color = 'warn';
    hint = `Stai accantonando il ${Math.round(ratio * 100)}% del libero. Probabilmente ti toccherà tagliare altrove.`;
  } else if (ratio <= 1) {
    verdict = 'very_hard';
    label = 'Molto difficile';
    color = 'danger';
    hint = `Quasi tutto il libero del mese va qui. In pratica niente svago, niente extra.`;
  } else {
    verdict = 'impossible';
    label = 'Insostenibile su questo orizzonte';
    color = 'danger';
    hint = `Servono €${Math.round(perMonth)}/mese ma ne hai ~€${Math.round(safeBudget)}. Allunga i tempi.`;
  }

  // Helpful alternative horizons
  const monthsAtFullFree = safeBudget > 0
    ? Math.min(MAX_PROJECTION_MONTHS, Math.ceil(amount / safeBudget))
    : null;
  const monthsAtHalfFree = safeBudget > 0
    ? Math.min(MAX_PROJECTION_MONTHS, Math.ceil(amount / (safeBudget / 2)))
    : null;

  return {
    perMonth,
    ratio,
    verdict,
    label,
    color,
    hint,
    monthsAtHalfFree,
    monthsAtFullFree,
  };
};

/**
 * Quale categoria sarebbe più sensata "tagliare" per fare spazio al desiderio?
 * Restituisce { catId, label, mean, saveProposed } — la categoria con la
 * spesa media più alta tra quelle non essenziali, suggerendo un taglio
 * proporzionale.
 */
```

## `suggestTrim` — da src/lib/wish.js

```js
export const suggestTrim = ({ amount, months, freeBudget, categoryStats, cats }) => {
  const safeBudget = Math.max(0, freeBudget * SAFE_TARGETS_FOR_BUFFER);
  const perMonth = amount / Math.max(1, months);
  const gap = perMonth - safeBudget;
  if (gap <= 0 || !categoryStats) return null;

  // Pick the category with the largest historical mean (excluding annuali/fixed-like)
  const candidates = cats
    .filter((c) => c.id !== 'other')
    .map((c) => ({ ...c, mean: categoryStats[c.id]?.mean || 0 }))
    .filter((c) => c.mean > 10)
    .sort((a, b) => b.mean - a.mean);

  if (candidates.length === 0) return null;
  const top = candidates[0];
  // Suggest cutting up to the gap, or 25% of that cat's mean (whichever smaller)
  const proposed = Math.min(gap, top.mean * 0.25);
  if (proposed < 5) return null;
  return {
    catId: top.id,
    label: top.label,
    mean: top.mean,
    saveProposed: Math.round(proposed),
  };
};

/**
 * Format a number of months as a human-friendly Italian string.
 * 1 → "1 mese", 13 → "1 anno e 1 mese", 24 → "2 anni"
 */
```

## `planReconciliation` — da src/lib/engine/reconcile.js

```js
export function planReconciliation(current, target) {
  const c = Number(current);
  const t = Number(target);
  if (!Number.isFinite(c) || !Number.isFinite(t)) {
    return { delta: 0, kind: 'none', amount: 0 };
  }
  const delta = round2(t - c);
  if (Math.abs(delta) < EPS) return { delta: 0, kind: 'none', amount: 0 };
  return {
    delta,
    kind: delta < 0 ? 'expense' : 'income',
    amount: round2(Math.abs(delta)),
  };
}

/** Etichetta con cui finiscono nello storico i movimenti di riconciliazione. */
```

## `nextIncomeDate` — da src/lib/analytics.js

```js
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
```

## `prevIncomeDate` — da src/lib/analytics.js

```js
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
```

## `computeFinance` — da src/lib/engine/prediction.js

```js
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
```
