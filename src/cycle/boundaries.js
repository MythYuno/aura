/**
 * Confini del ciclo.
 *
 * Il ciclo non è il mese solare: parte il giorno dello stipendio e finisce il
 * giorno prima del successivo. I confini seguono il giorno *configurato*, non
 * la data di accredito reale — se il 16 cade di domenica e i soldi arrivano il
 * 14, il ciclo parte comunque il 16, altrimenti due cicli non sarebbero più
 * confrontabili fra loro.
 *
 * Tutto in ora locale a mezzanotte. Mai UTC: un `Date` costruito da stringa ISO
 * è UTC e sposterebbe il confine di un giorno nei fusi a est di Greenwich.
 */

const MS_DAY = 86400000;

// new Date(y, m + 1, 0) è l'ultimo giorno del mese m.
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Il giorno di paga nel mese, tagliato all'ultimo giorno quando non esiste:
// il 31 a febbraio diventa il 28, o il 29 negli anni bisestili.
const payDateIn = (year, month, payDay) =>
  new Date(year, month, Math.min(payDay, daysInMonth(year, month)));

const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function cycleFor(date, payDay) {
  const thisMonth = payDateIn(date.getFullYear(), date.getMonth(), payDay);
  // Prima del giorno di paga si è ancora nel ciclo aperto il mese scorso.
  const start =
    atMidnight(date) < thisMonth
      ? payDateIn(date.getFullYear(), date.getMonth() - 1, payDay)
      : thisMonth;

  const next = payDateIn(start.getFullYear(), start.getMonth() + 1, payDay);
  const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1, 23, 59, 59, 999);

  return { start, end };
}

export function daysLeft(date, cycle) {
  const from = atMidnight(date);
  const to = atMidnight(cycle.end);
  // round e non floor: nei giorni di cambio ora la differenza è 23 o 25 ore.
  // Mai sotto 1, così `residuo / giorni` non produce Infinity sull'ultimo
  // giorno del ciclo né oltre.
  return Math.max(1, Math.round((to - from) / MS_DAY) + 1);
}

export function cycleLength(cycle) {
  return Math.round((atMidnight(cycle.end) - atMidnight(cycle.start)) / MS_DAY) + 1;
}

export function previousCycle(cycle, payDay) {
  const s = cycle.start;
  return cycleFor(new Date(s.getFullYear(), s.getMonth(), s.getDate() - 1), payDay);
}
