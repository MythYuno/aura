import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from '../src/cycle/reconcile.js';
import { cycleFor } from '../src/cycle/boundaries.js';

const at = (y, m, d) => new Date(y, m - 1, d);
const CYCLE = cycleFor(at(2026, 10, 28), 16); // 16 ott - 15 nov 2026

const mv = (date, amountCents, extra = {}) => ({
  date,
  amountCents,
  bound: 'free',
  catId: 'food',
  ...extra,
});

// 1.610,00 € registrati dentro il ciclo.
const REGISTERED = [
  mv('2026-10-20', 100000),
  mv('2026-11-02', 61000, { bound: 'fixed', catId: 'home' }),
  mv('2026-12-01', 99900), // fuori dal ciclo: non conta
];

test('scostamento positivo crea la voce non tracciata', () => {
  const r = reconcile(184000, REGISTERED, CYCLE);
  assert.equal(r.gap, 23000);
  assert.equal(r.untracked.amountCents, 23000);
  assert.equal(r.coverage, 161000 / 184000);
});

test('la voce non tracciata non ha categoria ed è marcata', () => {
  const { untracked } = reconcile(184000, REGISTERED, CYCLE);
  assert.equal(untracked.catId, null);
  assert.equal(untracked.tag, 'untracked');
  assert.equal(untracked.bound, 'free');
  assert.equal(typeof untracked.label, 'string');
});

test('la voce non tracciata è datata dentro il ciclo', () => {
  const { untracked } = reconcile(184000, REGISTERED, CYCLE);
  assert.match(untracked.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(untracked.date, '2026-11-15');
});

test('scostamento zero: copertura 1, nessuna voce', () => {
  const r = reconcile(161000, REGISTERED, CYCLE);
  assert.equal(r.gap, 0);
  assert.equal(r.coverage, 1);
  assert.equal(r.untracked, null);
});

test('scostamento negativo non crea nulla e la copertura resta 1', () => {
  // Hai registrato piu di quanto la banca dice uscito: doppione, rimborso, o
  // contante che non passa dal conto. Non si corregge niente d'ufficio.
  const r = reconcile(150000, REGISTERED, CYCLE);
  assert.equal(r.gap, -11000);
  assert.equal(r.untracked, null);
  assert.equal(r.coverage, 1);
});

test('banca a zero non produce divisione per zero', () => {
  const r = reconcile(0, [], CYCLE);
  assert.equal(r.coverage, 1);
  assert.equal(Number.isNaN(r.coverage), false);
  assert.equal(r.untracked, null);
});

test('banca a zero con movimenti registrati: copertura 1, nessuna voce', () => {
  const r = reconcile(0, REGISTERED, CYCLE);
  assert.equal(r.coverage, 1);
  assert.equal(r.untracked, null);
});

test('riconciliare due volte lo stesso ciclo non somma due voci non tracciate', () => {
  const first = reconcile(184000, REGISTERED, CYCLE);
  const withUntracked = [...REGISTERED, first.untracked];
  const second = reconcile(184000, withUntracked, CYCLE);
  assert.equal(second.gap, 23000);
  assert.equal(second.untracked.amountCents, 23000);
  assert.equal(second.coverage, first.coverage);
});

test('la copertura non supera mai 1', () => {
  for (const bank of [0, 1, 150000, 161000, 184000]) {
    const { coverage } = reconcile(bank, REGISTERED, CYCLE);
    assert.ok(coverage <= 1, `copertura ${coverage} con banca ${bank}`);
    assert.ok(coverage >= 0, `copertura ${coverage} con banca ${bank}`);
  }
});
