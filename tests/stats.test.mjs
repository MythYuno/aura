import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categoryHistoricalStats } from '../src/cycle/stats.js';
import { cycleFor } from '../src/cycle/boundaries.js';

const at = (y, m, d) => new Date(y, m - 1, d);
const mv = (date, amountCents, catId, extra = {}) => ({
  date,
  amountCents,
  catId,
  bound: 'free',
  ...extra,
});

// Ciclo corrente: 16 ott - 15 nov 2026. Precedenti: 16 set - 15 ott, 16 ago - 15 set.
const CYCLE = cycleFor(at(2026, 10, 28), 16);

test('media storica per categoria sui cicli precedenti', () => {
  const stats = categoryHistoricalStats(
    [
      mv('2026-10-20', 10000, 'food'), // corrente
      mv('2026-09-20', 8000, 'food'), // ciclo -1
      mv('2026-08-20', 12000, 'food'), // ciclo -2
    ],
    CYCLE,
    16,
    2
  );
  const food = stats.get('food');
  assert.equal(food.current, 10000);
  assert.equal(food.mean, 10000); // (8000 + 12000) / 2
  assert.equal(food.deltaPct, 0);
  assert.equal(food.isNew, false);
});

test('la media esclude le voci non tracciate', () => {
  const stats = categoryHistoricalStats(
    [
      mv('2026-09-20', 8000, 'food'),
      mv('2026-09-21', 50000, null, { tag: 'untracked' }),
      mv('2026-10-20', 10000, 'food'),
    ],
    CYCLE,
    16,
    1
  );
  assert.equal(stats.has(null), false);
  assert.equal(stats.get('food').mean, 8000);
});

test('categoria nuova: isNew true e deltaPct null, mai Infinity', () => {
  const stats = categoryHistoricalStats(
    [mv('2026-10-20', 7000, 'fun')], // niente nei cicli precedenti
    CYCLE,
    16,
    2
  );
  const fun = stats.get('fun');
  assert.equal(fun.isNew, true);
  assert.equal(fun.deltaPct, null);
  assert.equal(fun.current, 7000);
  assert.equal(fun.mean, 0);
});

test('categoria scomparsa: current 0 e deltaPct -100', () => {
  const stats = categoryHistoricalStats(
    [mv('2026-09-20', 6000, 'transport')], // solo nel ciclo precedente
    CYCLE,
    16,
    1
  );
  const t = stats.get('transport');
  assert.equal(t.current, 0);
  assert.equal(t.mean, 6000);
  assert.equal(t.deltaPct, -100);
  assert.equal(t.isNew, false);
});

test('crescita del 25 per cento', () => {
  const stats = categoryHistoricalStats(
    [mv('2026-10-20', 12500, 'home'), mv('2026-09-20', 10000, 'home')],
    CYCLE,
    16,
    1
  );
  assert.equal(stats.get('home').deltaPct, 25);
});

test('la media ignora i cicli in cui non c\'è storia, non li conta come zero', () => {
  // Chi usa l'app da un mese ha un solo ciclo precedente. Dividere per tre
  // cicli, due dei quali vuoti perche l'app non esisteva ancora, farebbe
  // sembrare ogni categoria cresciuta del 275%.
  const stats = categoryHistoricalStats(
    [mv('2026-10-20', 10000, 'food'), mv('2026-09-20', 8000, 'food')],
    CYCLE,
    16,
    3
  );
  const food = stats.get('food');
  assert.equal(food.mean, 8000);
  assert.equal(food.deltaPct, 25);
});

test('con due cicli di storia su tre richiesti la media è sui due', () => {
  const stats = categoryHistoricalStats(
    [
      mv('2026-10-20', 10000, 'food'),
      mv('2026-09-20', 8000, 'food'),
      mv('2026-08-20', 12000, 'food'),
    ],
    CYCLE,
    16,
    3
  );
  assert.equal(stats.get('food').mean, 10000); // (8000 + 12000) / 2
});

test('i movimenti vincolati non entrano nelle statistiche di categoria', () => {
  const stats = categoryHistoricalStats(
    [mv('2026-10-20', 62000, 'home', { bound: 'fixed' }), mv('2026-10-21', 3000, 'home')],
    CYCLE,
    16,
    1
  );
  assert.equal(stats.get('home').current, 3000);
});
