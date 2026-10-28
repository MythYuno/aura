/**
 * Formattazione degli importi, fuori dal componente così è verificabile.
 *
 * `useGrouping: 'always'` non è un vezzo: it-IT in CLDR ha
 * minimumGroupingDigits a 2, quindi di default un numero di quattro cifre
 * resta "1800,00". Le banche italiane scrivono 1.800,00, e in una colonna di
 * importi incolonnati il punto è quello che fa leggere l'ordine di grandezza
 * senza contare le cifre.
 */

const FORMAT = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

export const formatCents = (cents) => FORMAT.format((cents ?? 0) / 100);
