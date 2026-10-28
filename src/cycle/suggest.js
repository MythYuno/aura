/**
 * Categoria indovinata, spese frequenti, ricorrenti riconosciute.
 *
 * È questo che rende vera la registrazione in due tap: importo, conferma.
 *
 * Il confronto è per etichetta normalizzata, senza nessuna distanza fra
 * stringhe. Un match esatto che a volte non risponde è meglio di uno
 * approssimato che sbaglia categoria: l'utente correggerebbe a mano e il
 * secondo tap sarebbe perso comunque, con in più la diffidenza verso il
 * suggerimento successivo.
 */

import { toDay } from './day.js';
import { UNTRACKED_TAG } from './reconcile.js';

const MIN_OCCURRENCES = 3;
const DAY_TOLERANCE = 2;
const AMOUNT_TOLERANCE = 0.05;

const key = (label) => (typeof label === 'string' ? label.trim().toLowerCase() : '');
const timeOf = (m) => toDay(m.date)?.getTime() ?? 0;

function groupByLabel(movements) {
  const groups = new Map();
  for (const m of movements) {
    if (m.tag === UNTRACKED_TAG) continue; // non è una spesa che hai fatto tu
    const k = key(m.label);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  }
  for (const list of groups.values()) list.sort((a, b) => timeOf(a) - timeOf(b));
  return groups;
}

export function suggestCategory(label, movements) {
  const k = key(label);
  if (!k) return null;

  const seen = (groupByLabel(movements).get(k) ?? []).filter((m) => m.catId != null);
  if (!seen.length) return null;

  const counts = new Map();
  for (const m of seen) {
    const c = counts.get(m.catId) ?? { n: 0, last: 0 };
    counts.set(m.catId, { n: c.n + 1, last: Math.max(c.last, timeOf(m)) });
  }

  let best = null;
  for (const [catId, c] of counts) {
    if (!best || c.n > best.n || (c.n === best.n && c.last > best.last)) {
      best = { catId, ...c };
    }
  }
  return best.catId;
}

export function frequentExpenses(movements, limit = 6) {
  const rows = [];
  for (const list of groupByLabel(movements).values()) {
    const last = list[list.length - 1];
    rows.push({
      label: last.label,
      catId: last.catId ?? null,
      // l'importo dell'ultima volta, non una media: è quello che ti aspetti
      amountCents: last.amountCents ?? 0,
      count: list.length,
      lastAt: timeOf(last),
    });
  }

  rows.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
  return rows.slice(0, limit).map(({ lastAt, ...row }) => row);
}

const median = (nums) => {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/**
 * Una ricorrente è un'etichetta vista almeno tre volte, sempre intorno allo
 * stesso giorno del mese (±2) e con lo stesso importo (±5%). Due occorrenze
 * sono una coincidenza, non un abbonamento.
 */
export function detectRecurring(movements) {
  const found = [];

  for (const list of groupByLabel(movements).values()) {
    if (list.length < MIN_OCCURRENCES) continue;

    const days = list.map((m) => toDay(m.date)?.getDate()).filter((d) => d != null);
    if (days.length !== list.length) continue;

    const amounts = list.map((m) => m.amountCents ?? 0);
    const dayOfMonth = median(days);
    const amountCents = median(amounts);
    if (amountCents <= 0) continue;

    const sameDay = days.every((d) => Math.abs(d - dayOfMonth) <= DAY_TOLERANCE);
    const sameAmount = amounts.every(
      (a) => Math.abs(a - amountCents) <= amountCents * AMOUNT_TOLERANCE
    );
    if (!sameDay || !sameAmount) continue;

    found.push({
      label: list[list.length - 1].label,
      amountCents,
      dayOfMonth,
      occurrences: list.length,
    });
  }

  return found;
}
