import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestCategory, frequentExpenses, detectRecurring } from '../src/cycle/suggest.js';

const mv = (date, label, amountCents, catId, extra = {}) => ({
  date,
  label,
  amountCents,
  catId,
  bound: 'free',
  ...extra,
});

const STORICO = [
  mv('2026-09-02', 'Esselunga', 3210, 'food'),
  mv('2026-09-20', 'Esselunga', 2890, 'food'),
  mv('2026-10-04', 'Esselunga', 4100, 'food'),
  mv('2026-10-06', 'Caffè', 140, 'food'),
  mv('2026-10-07', 'Caffè', 140, 'food'),
  mv('2026-10-11', 'Q8', 4500, 'transport'),
];

test('etichetta già vista ritorna la sua categoria', () => {
  assert.equal(suggestCategory('Esselunga', STORICO), 'food');
  assert.equal(suggestCategory('Q8', STORICO), 'transport');
});

test('il confronto ignora maiuscole e spazi ai bordi', () => {
  assert.equal(suggestCategory('  esselunga ', STORICO), 'food');
  assert.equal(suggestCategory('ESSELUNGA', STORICO), 'food');
});

test('etichetta mai vista ritorna null, non la categoria più frequente', () => {
  // Tirare a indovinare insegna all'utente a non fidarsi del suggerimento:
  // meglio non rispondere che rispondere a caso.
  assert.equal(suggestCategory('Notaio', STORICO), null);
  assert.equal(suggestCategory('', STORICO), null);
  assert.equal(suggestCategory(null, STORICO), null);
});

test('a pari numero di occorrenze vince la più recente', () => {
  const ambiguo = [
    mv('2026-09-01', 'Bar', 500, 'food'),
    mv('2026-10-01', 'Bar', 500, 'fun'),
  ];
  assert.equal(suggestCategory('Bar', ambiguo), 'fun');
});

test('suggestCategory ignora i movimenti senza categoria', () => {
  const conBuco = [mv('2026-10-01', 'Bar', 500, null), mv('2026-10-02', 'Bar', 500, 'fun')];
  assert.equal(suggestCategory('Bar', conBuco), 'fun');
});

test('frequentExpenses ordina per occorrenze e poi per recenza', () => {
  const freq = frequentExpenses(STORICO, 3);
  assert.deepEqual(
    freq.map((f) => f.label),
    ['Esselunga', 'Caffè', 'Q8']
  );
  assert.equal(freq[0].count, 3);
  assert.equal(freq[0].catId, 'food');
  // l'importo proposto è quello dell'ultima volta, non una media
  assert.equal(freq[0].amountCents, 4100);
});

test('frequentExpenses rispetta il limite', () => {
  assert.equal(frequentExpenses(STORICO, 2).length, 2);
});

test('frequentExpenses esclude le voci non tracciate', () => {
  const conUntracked = [
    ...STORICO,
    mv('2026-10-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
    mv('2026-10-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
    mv('2026-10-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
    mv('2026-10-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
  ];
  const labels = frequentExpenses(conUntracked, 5).map((f) => f.label);
  assert.equal(labels.includes('Non tracciato'), false);
});

test('detectRecurring riconosce tre occorrenze sullo stesso giorno a più o meno 2', () => {
  const abbonamento = [
    mv('2026-08-05', 'Netflix', 1299, 'fun'),
    mv('2026-09-06', 'Netflix', 1299, 'fun'),
    mv('2026-10-04', 'Netflix', 1349, 'fun'), // +3,8%: dentro il 5%
  ];
  const found = detectRecurring(abbonamento);
  assert.equal(found.length, 1);
  assert.equal(found[0].label, 'Netflix');
  assert.equal(found[0].dayOfMonth, 5);
  assert.equal(found[0].amountCents, 1299);
  assert.equal(found[0].occurrences, 3);
});

test('detectRecurring non segnala con due sole occorrenze', () => {
  const due = [mv('2026-09-05', 'Netflix', 1299, 'fun'), mv('2026-10-05', 'Netflix', 1299, 'fun')];
  assert.deepEqual(detectRecurring(due), []);
});

test('detectRecurring non segnala se i giorni sono sparsi', () => {
  const sparso = [
    mv('2026-08-02', 'Spesa', 3000, 'food'),
    mv('2026-09-17', 'Spesa', 3000, 'food'),
    mv('2026-10-28', 'Spesa', 3000, 'food'),
  ];
  assert.deepEqual(detectRecurring(sparso), []);
});

test('detectRecurring non segnala se gli importi ballano', () => {
  const variabile = [
    mv('2026-08-05', 'Spesa', 3000, 'food'),
    mv('2026-09-05', 'Spesa', 9000, 'food'),
    mv('2026-10-05', 'Spesa', 5000, 'food'),
  ];
  assert.deepEqual(detectRecurring(variabile), []);
});

test('detectRecurring ignora le voci non tracciate', () => {
  const untracked = [
    mv('2026-08-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
    mv('2026-09-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
    mv('2026-10-15', 'Non tracciato', 23000, null, { tag: 'untracked' }),
  ];
  assert.deepEqual(detectRecurring(untracked), []);
});
