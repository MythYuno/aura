/**
 * Conversione delle date, in un posto solo.
 *
 * Lo stato vive in localStorage, quindi passa da JSON e le date sono stringhe
 * `YYYY-MM-DD`. `new Date('2026-11-07')` le legge come mezzanotte UTC: nei fusi
 * a ovest di Greenwich quella data diventa il 6 novembre, e un movimento salta
 * di giorno — a volte di ciclo. Qui si parsa sempre in locale.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDay(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') return null;

  const m = YMD.exec(value.trim());
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  // new Date(year, month, 0) è l'ultimo giorno di `month` (1-based qui).
  if (day < 1 || day > new Date(year, month, 0).getDate()) return null;

  return new Date(year, month - 1, day);
}

export function inCycle(value, cycle) {
  const d = toDay(value);
  if (!d) return false;
  return d >= toDay(cycle.start) && d <= toDay(cycle.end);
}

/**
 * La data in cui un giorno-del-mese ricorrente cade dentro il ciclo, o null.
 *
 * Non è sempre una: il ciclo 31 gennaio - 27 febbraio non contiene nessun 28,
 * perché il 28 gennaio è prima dell'inizio e il 28 febbraio è il giorno di paga
 * del ciclo dopo.
 */
export function fixedDateIn(dayOfMonth, cycle) {
  const start = toDay(cycle.start);
  const end = toDay(cycle.end);

  for (const monthOffset of [0, 1]) {
    const d = new Date(start.getFullYear(), start.getMonth() + monthOffset, dayOfMonth);
    // new Date(y, m, 31) scivola al mese dopo nei mesi corti: quello non vale.
    if (d.getDate() !== dayOfMonth) continue;
    if (d >= start && d <= end) return d;
  }
  return null;
}
