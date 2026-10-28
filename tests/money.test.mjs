import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCents } from '../src/ui/format.js';

// Lo spazio prima dell'euro è U+00A0 e cambia fra versioni di ICU: si verifica
// la parte numerica, non il separatore del simbolo.
const digits = (s) => s.replace(/ /g, ' ');

test('formatta i centesimi in euro con la virgola decimale', () => {
  assert.match(digits(formatCents(4280)), /^42,80 €$/);
  assert.match(digits(formatCents(140)), /^1,40 €$/);
});

test('raggruppa le migliaia anche a quattro cifre', () => {
  // it-IT in CLDR ha minimumGroupingDigits 2, quindi di default scriverebbe
  // "1800,00". Le banche italiane scrivono 1.800,00 e in una colonna di
  // importi il punto e' quello che permette di leggere a colpo d'occhio.
  assert.match(digits(formatCents(180000)), /^1\.800,00 €$/);
  assert.match(digits(formatCents(999999)), /^9\.999,99 €$/);
  assert.match(digits(formatCents(129990000)), /^1\.299\.900,00 €$/);
});

test('mostra sempre due decimali', () => {
  assert.match(digits(formatCents(100)), /^1,00 €$/);
  assert.match(digits(formatCents(0)), /^0,00 €$/);
});

test('regge gli importi negativi', () => {
  assert.match(digits(formatCents(-94000)), /^-940,00 €$/);
});

test('un valore assente vale zero, non NaN', () => {
  for (const v of [null, undefined]) {
    assert.match(digits(formatCents(v)), /^0,00 €$/);
  }
});
