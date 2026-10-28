/**
 * Persistenza su localStorage, tollerante ai fallimenti.
 *
 * In finestra privata, con i dati del sito bloccati o con la quota esaurita,
 * ogni accesso può lanciare. L'app deve partire comunque e restare usabile per
 * la sessione: per questo `load` non lancia mai e `save` restituisce un esito
 * invece di propagare l'errore.
 *
 * Lo store è iniettabile: in Node non esiste localStorage, e un backend finto è
 * anche il solo modo di provare una quota piena.
 */

import { emptyState, normalize, STATE_VERSION } from './schema.js';

export const STORAGE_KEY = 'aura.v2';

const defaultStore = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // l'accesso stesso può lanciare: SecurityError
  }
};

export function load(store = defaultStore()) {
  try {
    if (!store) return emptyState();
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function save(state, store = defaultStore()) {
  try {
    if (!store) return false;
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(state) {
  return JSON.stringify({ ...normalize(state), exportedAt: new Date().toISOString() }, null, 2);
}

export function importJSON(text) {
  if (typeof text !== 'string') return null;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.version !== STATE_VERSION) return null;
  if (!Array.isArray(parsed.movements)) return null;

  return normalize(parsed);
}
