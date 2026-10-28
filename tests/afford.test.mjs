import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, evaluateAffordability, suggestTrim } from '../src/cycle/afford.js';

// Il budget di riferimento: 385,20 € residui, 9 giorni, 42,80 € al giorno.
const BUDGET = { left: 38520, daysLeft: 9, perDay: 4280 };

test('parseAmount accetta la virgola e il punto come decimale', () => {
  assert.equal(parseAmount('12,50'), 1250);
  assert.equal(parseAmount('12.50'), 1250);
});

test('parseAmount legge il punto come separatore di migliaia', () => {
  assert.equal(parseAmount('1.200,00'), 120000);
  assert.equal(parseAmount('1.200'), 120000);
  assert.equal(parseAmount('12.999'), 1299900);
});

test('parseAmount accetta i centesimi senza intero', () => {
  assert.equal(parseAmount(',50'), 50);
});

test('parseAmount tronca oltre due decimali senza arrotondare per eccesso', () => {
  assert.equal(parseAmount('12,999'), 1299);
  assert.equal(parseAmount('0,999'), 99);
});

test('parseAmount rifiuta negativi, vuoto, lettere e lo zero', () => {
  for (const s of ['-5', '', '   ', 'abc', '12abc', '0', '0,00', ',']) {
    assert.equal(parseAmount(s), null, `doveva rifiutare ${JSON.stringify(s)}`);
  }
});

test('parseAmount rifiuta separatori doppi e virgole multiple', () => {
  for (const s of ['1,,2', '1..2', '1,2,3']) {
    assert.equal(parseAmount(s), null, `doveva rifiutare ${JSON.stringify(s)}`);
  }
});

test('parseAmount rifiuta oltre un milione di euro e non va in overflow', () => {
  assert.equal(parseAmount('99999999999'), null);
  assert.equal(parseAmount('1000000,01'), null);
  assert.equal(parseAmount('999999,99'), 99999999);
});

test('parseAmount rifiuta un valore non stringa', () => {
  for (const v of [null, undefined, 12, {}]) assert.equal(parseAmount(v), null);
});

test('sotto il giornaliero è un sì secco', () => {
  const r = evaluateAffordability(2000, BUDGET);
  assert.equal(r.verdict, 'si');
  assert.equal(r.overBy, 0);
  assert.equal(r.margin, 36520);
});

test('sopra il giornaliero ma dentro il residuo è si-ma-stringi', () => {
  const r = evaluateAffordability(12000, BUDGET);
  assert.equal(r.verdict, 'siMaStringi');
  assert.equal(r.margin, 26520);
  // 26520 / 9 = 2946,67: si tronca, non si arrotonda per eccesso, altrimenti
  // il giornaliero promette piu di quanto c'e.
  assert.equal(r.newPerDay, 2946);
});

test('oltre il residuo è no, con lo sforamento', () => {
  const r = evaluateAffordability(50000, BUDGET);
  assert.equal(r.verdict, 'no');
  assert.equal(r.overBy, 11480);
  assert.equal(r.newPerDay, 0);
});

test('importo pari esatto al residuo è si-ma-stringi con margine 0', () => {
  const r = evaluateAffordability(38520, BUDGET);
  assert.equal(r.verdict, 'siMaStringi');
  assert.equal(r.margin, 0);
  assert.equal(r.newPerDay, 0);
});

test('con residuo gia negativo qualunque importo è no', () => {
  const r = evaluateAffordability(1000, { left: -5000, daysLeft: 9, perDay: 0 });
  assert.equal(r.verdict, 'no');
  assert.equal(r.overBy, 6000);
});

const STATS = new Map([
  ['fun', { mean: 4000, current: 9000, deltaPct: 125, isNew: false }], // +5000
  ['food', { mean: 15000, current: 17000, deltaPct: 13, isNew: false }], // +2000
  ['home', { mean: 62000, current: 62000, deltaPct: 0, isNew: false }], // in media
  ['transport', { mean: 8000, current: 3000, deltaPct: -62, isNew: false }], // sotto
  ['new', { mean: 0, current: 7000, deltaPct: null, isNew: true }], // niente storia
]);

test('suggestTrim propone solo le categorie sopra la media, dalla piu sforata', () => {
  const cuts = suggestTrim(44520, BUDGET, STATS); // sfora di 6000
  assert.deepEqual(
    cuts.map((c) => c.catId),
    ['fun', 'food']
  );
  assert.equal(cuts[0].cutCents, 5000);
  assert.equal(cuts[1].cutCents, 1000); // quanto basta a coprire i 6000
});

test('suggestTrim si fermerebbe alla prima categoria se bastasse', () => {
  const cuts = suggestTrim(40520, BUDGET, STATS); // sfora di 2000
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].catId, 'fun');
  assert.equal(cuts[0].cutCents, 2000);
});

test('suggestTrim restituisce lista vuota se l\'importo sta nel residuo', () => {
  assert.deepEqual(suggestTrim(1000, BUDGET, STATS), []);
});

test('suggestTrim restituisce lista vuota se nessuna categoria è sopra media', () => {
  const flat = new Map([['home', { mean: 62000, current: 60000, deltaPct: -3, isNew: false }]]);
  assert.deepEqual(suggestTrim(50000, BUDGET, flat), []);
});
