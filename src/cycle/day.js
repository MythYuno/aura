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

/** La data in `YYYY-MM-DD` locale: è così che va salvata, mai con toISOString. */
export function toYmd(value) {
  const d = toDay(value);
  if (!d) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
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
    const year = start.getFullYear();
    const month = start.getMonth() + monthOffset;
    // Il giorno si taglia all'ultimo del mese, come fa la banca: chi addebita
    // "il 31" ad aprile addebita il 30. Senza il taglio l'addebito non trovava
    // ne il 31 aprile (non esiste) ne il 31 maggio (fuori ciclo), e la spesa
    // fissa spariva per interi cicli gonfiando il disponibile del giorno.
    const lastOfMonth = new Date(year, month + 1, 0).getDate();
    const d = new Date(year, month, Math.min(dayOfMonth, lastOfMonth));
    if (d >= start && d <= end) return d;
  }
  return null;
}
