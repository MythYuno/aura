import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDay, toYmd, inCycle, fixedDateIn } from '../src/cycle/day.js';
import { cycleFor } from '../src/cycle/boundaries.js';

const at = (y, m, d) => new Date(y, m - 1, d);
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('toDay legge YYYY-MM-DD come data locale, non UTC', () => {
  // new Date('2026-11-07') sarebbe mezzanotte UTC: nei fusi negativi
  // diventerebbe il 6 novembre.
  const d = toDay('2026-11-07');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 10);
  assert.equal(d.getDate(), 7);
  assert.equal(d.getHours(), 0);
});

test('toDay azzera l\'ora di un Date', () => {
  assert.equal(ymd(toDay(new Date(2026, 10, 7, 15, 30))), '2026-11-07');
  assert.equal(toDay(new Date(2026, 10, 7, 15, 30)).getHours(), 0);
});

test('toDay restituisce null su valore non valido', () => {
  for (const v of [null, undefined, '', 'ieri', '2026-13-45', {}]) {
    assert.equal(toDay(v), null, `fallito su ${JSON.stringify(v)}`);
  }
});

test('toYmd scrive la data locale, senza slittamenti di fuso', () => {
  assert.equal(toYmd(new Date(2026, 10, 7, 23, 30)), '2026-11-07');
  assert.equal(toYmd('2026-01-05'), '2026-01-05');
  assert.equal(toYmd('mai'), null);
});

test('toDay e toYmd fanno il giro completo', () => {
  assert.equal(toYmd(toDay('2026-02-29')), null); // il 2026 non è bisestile
  assert.equal(toYmd(toDay('2028-02-29')), '2028-02-29');
});

test('inCycle include il primo e l\'ultimo giorno', () => {
  const c = cycleFor(at(2026, 10, 28), 16);
  assert.equal(inCycle('2026-10-16', c), true);
  assert.equal(inCycle('2026-11-15', c), true);
  assert.equal(inCycle('2026-10-15', c), false);
  assert.equal(inCycle('2026-11-16', c), false);
});

test('inCycle è falso per una data non valida', () => {
  assert.equal(inCycle('mai', cycleFor(at(2026, 10, 28), 16)), false);
});

test('fixedDateIn trova il giorno del mese dentro il ciclo', () => {
  const c = cycleFor(at(2026, 10, 28), 16); // 16 ott - 15 nov
  assert.equal(ymd(fixedDateIn(20, c)), '2026-10-20');
  assert.equal(ymd(fixedDateIn(1, c)), '2026-11-01');
  assert.equal(ymd(fixedDateIn(16, c)), '2026-10-16');
});

test('un giorno 28 non cade nel ciclo 31 gennaio - 27 febbraio', () => {
  // payDay 31: gennaio paga il 31, febbraio il 28, quindi il ciclo si chiude
  // il 27 e il giorno 28 non ci entra mai.
  const c = cycleFor(at(2026, 2, 10), 31);
  assert.equal(fixedDateIn(28, c), null);
  assert.equal(ymd(fixedDateIn(5, c)), '2026-02-05');
});
