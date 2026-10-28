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

test('una fissa al 31 cade l\'ultimo giorno nei mesi corti', () => {
  // Una banca che addebita "il 31" ad aprile addebita il 30. Senza il taglio,
  // nel ciclo 16 aprile - 15 maggio l'addebito non trovava ne il 31 aprile
  // (non esiste) ne il 31 maggio (fuori ciclo): la spesa fissa SPARIVA e il
  // disponibile del giorno raddoppiava senza avviso.
  const aprile = cycleFor(at(2026, 4, 20), 16); // 16 apr - 15 mag
  assert.equal(ymd(fixedDateIn(31, aprile)), '2026-04-30');

  const giugno = cycleFor(at(2026, 6, 20), 16); // 16 giu - 15 lug
  assert.equal(ymd(fixedDateIn(31, giugno)), '2026-06-30');

  const febbraio = cycleFor(at(2026, 2, 20), 16); // 16 feb - 15 mar
  assert.equal(ymd(fixedDateIn(31, febbraio)), '2026-02-28');
  assert.equal(ymd(fixedDateIn(30, febbraio)), '2026-02-28');

  const bisestile = cycleFor(at(2028, 2, 20), 16);
  assert.equal(ymd(fixedDateIn(31, bisestile)), '2028-02-29');
});

test('una fissa al 31 nei mesi lunghi resta il 31', () => {
  const ottobre = cycleFor(at(2026, 10, 20), 16); // 16 ott - 15 nov
  assert.equal(ymd(fixedDateIn(31, ottobre)), '2026-10-31');
});

test('ogni giorno del mese da 1 a 31 cade esattamente una volta per ciclo', () => {
  // La proprieta che il taglio deve garantire: nessuna fissa puo sparire.
  for (let m = 1; m <= 12; m += 1) {
    const c = cycleFor(at(2026, m, 20), 16);
    for (let d = 1; d <= 31; d += 1) {
      assert.ok(fixedDateIn(d, c), `giorno ${d} perso nel ciclo di ${m}`);
    }
  }
});

test('un giorno 28 non cade nel ciclo 31 gennaio - 27 febbraio', () => {
  // payDay 31: gennaio paga il 31, febbraio il 28, quindi il ciclo si chiude
  // il 27 e il giorno 28 non ci entra mai.
  const c = cycleFor(at(2026, 2, 10), 31);
  assert.equal(fixedDateIn(28, c), null);
  assert.equal(ymd(fixedDateIn(5, c)), '2026-02-05');
});
