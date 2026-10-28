/**
 * La forma dello stato, in un posto solo.
 *
 * `normalize` è la guardia all'ingresso: tutto ciò che arriva da localStorage o
 * da un backup è dato di provenienza ignota, e un campo mancante qui diventa un
 * `undefined` dentro il calcolo del giornaliero. Niente migrazioni dalla v0.8:
 * una version diversa non si converte, si scarta.
 */

import { defaultCats } from '../data/categories.js';

export const STATE_VERSION = 2;

export function emptyState() {
  return {
    version: STATE_VERSION,
    payDay: 16,
    income: 0,
    extras: [],
    fixed: [],
    setAside: [],
    goal: 0,
    movements: [],
    // copia profonda: due chiamate non devono condividere lo stesso array
    categories: defaultCats.map((c) => ({ ...c })),
    onboarded: false,
  };
}

const asInt = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback);
const asArray = (v) => (Array.isArray(v) ? v : []);

export function normalize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  if (raw.version !== STATE_VERSION) return base;
  if (!Array.isArray(raw.movements)) return base;

  const categories = asArray(raw.categories);

  return {
    version: STATE_VERSION,
    payDay: Math.min(31, Math.max(1, asInt(raw.payDay, base.payDay))),
    income: asInt(raw.income, 0),
    extras: asArray(raw.extras),
    fixed: asArray(raw.fixed),
    setAside: asArray(raw.setAside),
    goal: asInt(raw.goal, 0),
    movements: asArray(raw.movements),
    categories: categories.length ? categories : base.categories,
    onboarded: raw.onboarded === true,
  };
}
