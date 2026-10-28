/**
 * Il calcolo del ciclo: quanto puoi spendere oggi.
 *
 *   libero  L = stipendio + entrate extra − fisse − accantonamenti − obiettivo
 *   speso   P = movimenti liberi registrati da inizio ciclo
 *   residuo R = L − P
 *   giornaliero = R / giorni che restano
 *
 * Tutti gli importi sono centesimi interi. In virgola mobile 0,1 + 0,2 non fa
 * 0,3, e su un bilancio mensile quell'errore si accumula fino a essere visibile.
 */

import { cycleFor, daysLeft as daysLeftIn, cycleLength } from './boundaries.js';
import { toDay, inCycle, fixedDateIn } from './day.js';

const PACE_OK = 0.8;
const PACE_TIGHT = 0.4;

export function stateFor(pace, left) {
  // Il residuo esaurito batte il ritmo: se non resta nulla, non sei "in pari"
  // per quanto virtuoso sia stato l'andamento fino a ieri.
  if (left <= 0) return 'sfori';
  if (pace < PACE_TIGHT) return 'sfori';
  if (pace < PACE_OK) return 'stringi';
  return 'inPari';
}

/**
 * Quota di questo ciclo per una spesa non mensile (bollo, assicurazione):
 * l'importo diviso i cicli che restano fino alla scadenza, scadenza inclusa.
 * Senza scadenza vale intero ogni ciclo.
 */
export function setAsideQuota(entry, cycle, payDay) {
  const total = entry.amountCents ?? 0;
  const due = toDay(entry.dueDate);
  if (!due) return total;

  let cycles = 1;
  let c = cycle;
  // Scadenza già passata o dentro questo ciclo: si chiede tutto, e il ciclo
  // non si divide per zero.
  while (due > toDay(c.end) && cycles < 600) {
    const after = new Date(c.end.getFullYear(), c.end.getMonth(), c.end.getDate() + 1);
    c = cycleFor(after, payDay);
    cycles += 1;
  }
  return Math.ceil(total / cycles);
}

export function computeBudget({
  income = 0,
  extras = [],
  fixed = [],
  setAside = [],
  goal = 0,
  movements = [],
  today = new Date(),
  payDay = 16,
} = {}) {
  const cycle = cycleFor(today, payDay);
  const remaining = daysLeftIn(today, cycle);

  const extrasTotal = extras.reduce(
    (sum, e) => (inCycle(e.date, cycle) ? sum + (e.amountCents ?? 0) : sum),
    0
  );
  const fixedTotal = fixed.reduce(
    (sum, f) => (fixedDateIn(f.dayOfMonth, cycle) ? sum + (f.amountCents ?? 0) : sum),
    0
  );
  const setAsideTotal = setAside.reduce((sum, s) => sum + setAsideQuota(s, cycle, payDay), 0);

  const free = income + extrasTotal - fixedTotal - setAsideTotal - goal;

  // Solo i movimenti liberi: le fisse e gli accantonamenti sono già sottratti
  // in blocco sopra, contarli di nuovo li sottrarrebbe due volte.
  const spent = movements.reduce(
    (sum, m) => (m.bound === 'free' && inCycle(m.date, cycle) ? sum + (m.amountCents ?? 0) : sum),
    0
  );

  const left = free - spent;
  const perDay = left <= 0 ? 0 : Math.floor(left / remaining);

  const nominal = free > 0 ? free / cycleLength(cycle) : 0;
  const pace = nominal > 0 && left > 0 ? perDay / nominal : 0;

  return {
    cycle,
    // La scomposizione viaggia nel risultato: la schermata Ciclo deve mostrare
    // righe che tornano col libero, e la riconciliazione ha bisogno dello
    // stesso `fixedTotal` per non contare due volte le fisse. Ricalcolarla nei
    // componenti significa due moduli che divergono.
    extrasTotal,
    fixedTotal,
    setAsideTotal,
    goal,
    free,
    spent,
    left,
    daysLeft: remaining,
    perDay,
    pace,
    state: stateFor(pace, left),
  };
}
