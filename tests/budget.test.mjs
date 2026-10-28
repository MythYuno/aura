import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBudget, setAsideQuota, stateFor } from '../src/cycle/budget.js';
import { cycleFor } from '../src/cycle/boundaries.js';

// Tutti gli importi sono centesimi interi: in virgola mobile 0,1 + 0,2 non fa
// 0,3 e su un bilancio mensile l'errore si accumula.
const at = (y, m, d) => new Date(y, m - 1, d);
const mv = (date, amountCents, bound = 'free', catId = 'food') => ({ date, amountCents, bound, catId });

const BASE = { income: 180000, extras: [], fixed: [], setAside: [], goal: 0, movements: [], payDay: 16 };

test('libero = stipendio meno fisse, accantonamenti e obiettivo', () => {
  const b = computeBudget({
    ...BASE,
    fixed: [{ amountCents: 94000, dayOfMonth: 1 }],
    setAside: [{ amountCents: 20000 }], // senza scadenza: vale intero ogni ciclo
    today: at(2026, 11, 7),
  });
  assert.equal(b.free, 180000 - 94000 - 20000);
});

test('le entrate extra dentro il ciclo alzano il libero', () => {
  const b = computeBudget({
    ...BASE,
    extras: [{ amountCents: 5000, date: '2026-11-02' }, { amountCents: 9900, date: '2026-12-02' }],
    today: at(2026, 11, 7),
  });
  assert.equal(b.free, 185000); // la seconda è fuori dal ciclo
});

test('speso ignora i movimenti vincolati', () => {
  const b = computeBudget({
    ...BASE,
    movements: [mv('2026-11-05', 5000), mv('2026-11-01', 62000, 'fixed')],
    today: at(2026, 11, 7),
  });
  assert.equal(b.spent, 5000);
});

test('speso ignora i movimenti fuori dal ciclo', () => {
  const b = computeBudget({
    ...BASE,
    movements: [mv('2026-11-05', 5000), mv('2026-10-05', 3000)],
    today: at(2026, 11, 7),
  });
  assert.equal(b.spent, 5000);
});

test('giornaliero = residuo su giorni rimanenti', () => {
  const b = computeBudget({
    ...BASE,
    income: 66000,
    movements: [mv('2026-11-05', 27480)],
    today: at(2026, 11, 7),
  });
  assert.equal(b.free, 66000);
  assert.equal(b.left, 38520);
  assert.equal(b.daysLeft, 9);
  assert.equal(b.perDay, 4280);
});

test('ultimo giorno del ciclo: perDay finito, mai Infinity', () => {
  const b = computeBudget({ ...BASE, income: 10000, today: at(2026, 11, 15) });
  assert.equal(b.daysLeft, 1);
  assert.equal(Number.isFinite(b.perDay), true);
  assert.equal(b.perDay, 10000);
});

test('libero a zero non produce NaN nel ritmo', () => {
  const b = computeBudget({
    ...BASE,
    income: 100000,
    fixed: [{ amountCents: 100000, dayOfMonth: 1 }],
    today: at(2026, 11, 7),
  });
  assert.equal(b.free, 0);
  assert.equal(b.pace, 0);
  assert.equal(b.state, 'sfori');
  assert.equal(Number.isNaN(b.pace), false);
});

test('libero negativo è sfori da subito', () => {
  const b = computeBudget({
    ...BASE,
    income: 100000,
    fixed: [{ amountCents: 120000, dayOfMonth: 1 }],
    today: at(2026, 11, 7),
  });
  assert.equal(b.free, -20000);
  assert.equal(b.state, 'sfori');
  assert.equal(b.perDay, 0);
});

test('residuo negativo è sfori con perDay 0', () => {
  const b = computeBudget({
    ...BASE,
    income: 30000,
    movements: [mv('2026-11-05', 40000)],
    today: at(2026, 11, 7),
  });
  assert.equal(b.left, -10000);
  assert.equal(b.perDay, 0);
  assert.equal(b.state, 'sfori');
});

test('il risultato porta la scomposizione, così nessuno la ricalcola a modo suo', () => {
  // La schermata Ciclo sommava `fixed` per conto proprio, senza filtrare per
  // giorno dentro il ciclo: le righe del conto non tornavano col libero. E la
  // riconciliazione ha bisogno dello stesso numero per non contare due volte
  // le fisse. Una sola verita, calcolata qui.
  const b = computeBudget({
    ...BASE,
    extras: [{ amountCents: 5000, date: '2026-11-02' }],
    fixed: [
      { amountCents: 94000, dayOfMonth: 1 },
      { amountCents: 2000, dayOfMonth: 20 },
    ],
    setAside: [{ amountCents: 24000, dueDate: '2026-11-10' }],
    goal: 10000,
    today: at(2026, 11, 7),
  });
  assert.equal(b.extrasTotal, 5000);
  assert.equal(b.fixedTotal, 96000);
  assert.equal(b.setAsideTotal, 24000);
  assert.equal(b.goal, 10000);
  // il libero è esattamente la somma algebrica della scomposizione
  assert.equal(b.free, 180000 + 5000 - 96000 - 24000 - 10000);
});

test('la scomposizione esclude le fisse il cui giorno non cade nel ciclo', () => {
  // ciclo 31 gennaio - 27 febbraio: il giorno 28 non ci entra mai
  const b = computeBudget({
    ...BASE,
    payDay: 31,
    fixed: [{ amountCents: 50000, dayOfMonth: 28 }],
    today: at(2026, 2, 10),
  });
  assert.equal(b.fixedTotal, 0);
  assert.equal(b.free, 180000);
});

test('soglie di stato', () => {
  assert.equal(stateFor(0.81, 1000), 'inPari');
  assert.equal(stateFor(0.8, 1000), 'inPari'); // inclusiva
  assert.equal(stateFor(0.79, 1000), 'stringi');
  assert.equal(stateFor(0.4, 1000), 'stringi'); // inclusiva
  assert.equal(stateFor(0.39, 1000), 'sfori');
  assert.equal(stateFor(0.95, 0), 'sfori'); // residuo esaurito batte il ritmo
});

test('il ritmo è il giornaliero sul giornaliero nominale', () => {
  // free 62000 su 31 giorni = 2000 nominali al giorno; primo giorno, nulla speso
  const b = computeBudget({ ...BASE, income: 62000, today: at(2026, 10, 16) });
  assert.equal(b.daysLeft, 31);
  assert.equal(b.perDay, 2000);
  assert.equal(b.pace, 1);
  assert.equal(b.state, 'inPari');
});

test('setAsideQuota divide per i cicli che restano alla scadenza', () => {
  const c = cycleFor(at(2026, 11, 7), 16); // 16 ott - 15 nov
  // 10 gennaio cade nel terzo ciclo (16 dic - 15 gen): 120000 / 3 = 40000
  assert.equal(setAsideQuota({ amountCents: 120000, dueDate: '2027-01-10' }, c, 16), 40000);
});

test('setAsideQuota su scadenza dentro il ciclo chiede tutto', () => {
  const c = cycleFor(at(2026, 11, 7), 16);
  assert.equal(setAsideQuota({ amountCents: 50000, dueDate: '2026-11-10' }, c, 16), 50000);
});

test('setAsideQuota su scadenza passata chiede tutto, non divide per zero', () => {
  const c = cycleFor(at(2026, 11, 7), 16);
  const q = setAsideQuota({ amountCents: 50000, dueDate: '2020-01-01' }, c, 16);
  assert.equal(q, 50000);
  assert.equal(Number.isFinite(q), true);
});

test('setAsideQuota senza scadenza chiede la cifra intera ogni ciclo', () => {
  const c = cycleFor(at(2026, 11, 7), 16);
  assert.equal(setAsideQuota({ amountCents: 10000 }, c, 16), 10000);
});
