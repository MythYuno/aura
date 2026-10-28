import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, normalize, STATE_VERSION } from '../src/store/schema.js';
import { load, save, exportJSON, importJSON, STORAGE_KEY } from '../src/store/storage.js';

// Lo storage è iniettabile: in Node non esiste localStorage, e un backend
// finto è anche il solo modo di provare una quota esaurita.
const memory = (seed = {}) => {
  const data = { ...seed };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
    _data: data,
  };
};

const throwing = {
  getItem() {
    throw new Error('storage bloccato');
  },
  setItem() {
    throw new Error('storage bloccato');
  },
  removeItem() {
    throw new Error('storage bloccato');
  },
};

const quotaFull = {
  getItem: () => null,
  setItem() {
    const e = new Error('quota');
    e.name = 'QuotaExceededError';
    throw e;
  },
  removeItem: () => {},
};

test('emptyState ha tutti i campi che computeBudget si aspetta', () => {
  const s = emptyState();
  assert.equal(s.version, STATE_VERSION);
  assert.equal(s.payDay, 16);
  assert.equal(s.income, 0);
  assert.deepEqual(s.extras, []);
  assert.deepEqual(s.fixed, []);
  assert.deepEqual(s.setAside, []);
  assert.equal(s.goal, 0);
  assert.deepEqual(s.movements, []);
  assert.equal(s.onboarded, false);
  assert.ok(s.categories.length > 0);
});

test('emptyState non condivide gli array fra due chiamate', () => {
  const a = emptyState();
  a.movements.push({ amountCents: 1 });
  assert.deepEqual(emptyState().movements, []);
});

test('load restituisce lo stato vuoto se lo storage lancia', () => {
  const s = load(throwing);
  assert.deepEqual(s, emptyState());
});

test('load su JSON corrotto restituisce lo stato vuoto', () => {
  const s = load(memory({ [STORAGE_KEY]: '{ questo non e json' }));
  assert.deepEqual(s, emptyState());
});

test('load ignora uno stato con version diversa: nessuna migrazione dalla v0.8', () => {
  const vecchio = JSON.stringify({ version: 1, movements: [{ amountCents: 500 }], income: 999 });
  const s = load(memory({ [STORAGE_KEY]: vecchio }));
  assert.deepEqual(s.movements, []);
  assert.equal(s.income, 0);
});

test('load restituisce lo stato salvato', () => {
  const store = memory();
  const mine = { ...emptyState(), income: 180000, payDay: 16, onboarded: true };
  assert.equal(save(mine, store), true);
  assert.equal(load(store).income, 180000);
  assert.equal(load(store).onboarded, true);
});

test('load completa i campi mancanti di uno stato altrimenti valido', () => {
  // Uno stato v2 scritto da una versione che non conosceva extras non deve
  // far esplodere computeBudget con undefined.
  const parziale = JSON.stringify({ version: STATE_VERSION, movements: [], income: 1000 });
  const s = load(memory({ [STORAGE_KEY]: parziale }));
  assert.deepEqual(s.extras, []);
  assert.deepEqual(s.fixed, []);
  assert.equal(s.payDay, 16);
  assert.equal(s.income, 1000);
});

test('save restituisce false su quota esaurita, senza lanciare', () => {
  assert.equal(save(emptyState(), quotaFull), false);
});

test('save restituisce false se lo storage lancia, senza lanciare', () => {
  assert.equal(save(emptyState(), throwing), false);
});

test('importJSON rifiuta un oggetto senza movements', () => {
  assert.equal(importJSON(JSON.stringify({ version: STATE_VERSION, income: 100 })), null);
});

test('importJSON rifiuta JSON non valido e valori non stringa', () => {
  for (const v of ['', 'niente', '[]', '42', null, undefined, {}]) {
    assert.equal(importJSON(v), null, `doveva rifiutare ${JSON.stringify(v)}`);
  }
});

test('export e import fanno il giro completo', () => {
  const mine = {
    ...emptyState(),
    income: 180000,
    onboarded: true,
    movements: [{ id: 'a1', date: '2026-11-05', amountCents: 5000, catId: 'food', bound: 'free' }],
  };
  const back = importJSON(exportJSON(mine));
  assert.equal(back.income, 180000);
  assert.equal(back.movements.length, 1);
  assert.equal(back.movements[0].amountCents, 5000);
});

test('normalize non altera uno stato già completo', () => {
  const s = emptyState();
  assert.deepEqual(normalize(s), s);
});
