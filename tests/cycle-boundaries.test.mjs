import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleFor, daysLeft, cycleLength, previousCycle } from '../src/cycle/boundaries.js';

// Date in ora locale: un Date costruito da stringa ISO è UTC e sposterebbe
// il confine di un giorno nei fusi a est di Greenwich.
const at = (y, m, d) => new Date(y, m - 1, d);
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('ciclo dal 16 al 15', () => {
  const c = cycleFor(at(2026, 10, 28), 16);
  assert.equal(ymd(c.start), '2026-10-16');
  assert.equal(ymd(c.end), '2026-11-15');
});

test('il 3 novembre sta nel ciclo aperto il 16 ottobre', () => {
  const c = cycleFor(at(2026, 11, 3), 16);
  assert.equal(ymd(c.start), '2026-10-16');
  assert.equal(ymd(c.end), '2026-11-15');
});

test('il giorno dello stipendio apre il ciclo nuovo, non chiude il vecchio', () => {
  const c = cycleFor(at(2026, 11, 16), 16);
  assert.equal(ymd(c.start), '2026-11-16');
  assert.equal(ymd(c.end), '2026-12-15');
});

test('payDay 31 a febbraio usa il 28', () => {
  const c = cycleFor(at(2026, 2, 10), 31);
  assert.equal(ymd(c.start), '2026-01-31');
  assert.equal(ymd(c.end), '2026-02-27');
});

test('payDay 31 a febbraio bisestile usa il 29', () => {
  const c = cycleFor(at(2028, 3, 5), 31);
  assert.equal(ymd(c.start), '2028-02-29');
});

test('payDay 30 a febbraio usa l\'ultimo giorno', () => {
  const c = cycleFor(at(2026, 2, 10), 30);
  assert.equal(ymd(c.start), '2026-01-30');
  assert.equal(ymd(c.end), '2026-02-27');
});

test('il ciclo attraversa il capodanno', () => {
  const c = cycleFor(at(2027, 1, 3), 16);
  assert.equal(ymd(c.start), '2026-12-16');
  assert.equal(ymd(c.end), '2027-01-15');
});

test('ultimo giorno del ciclo: daysLeft vale 1, non 0', () => {
  const c = cycleFor(at(2026, 11, 15), 16);
  assert.equal(daysLeft(at(2026, 11, 15), c), 1);
});

test('daysLeft conta il giorno di oggi', () => {
  const c = cycleFor(at(2026, 11, 7), 16);
  assert.equal(daysLeft(at(2026, 11, 7), c), 9);
});

test('daysLeft non scende sotto 1 nemmeno oltre la fine', () => {
  const c = cycleFor(at(2026, 11, 7), 16);
  assert.equal(daysLeft(at(2026, 11, 30), c), 1);
});

test('daysLeft il primo giorno del ciclo copre tutto il ciclo', () => {
  const c = cycleFor(at(2026, 10, 16), 16);
  assert.equal(daysLeft(at(2026, 10, 16), c), cycleLength(c));
});

test('cycleLength del ciclo 16 ottobre - 15 novembre vale 31', () => {
  assert.equal(cycleLength(cycleFor(at(2026, 10, 28), 16)), 31);
});

test('previousCycle del ciclo di ottobre parte il 16 settembre', () => {
  const p = previousCycle(cycleFor(at(2026, 10, 28), 16), 16);
  assert.equal(ymd(p.start), '2026-09-16');
  assert.equal(ymd(p.end), '2026-10-15');
});
