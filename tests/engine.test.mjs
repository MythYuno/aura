// ─────────────────────────────────────────────────────────────────────────
// AURA — test del motore finanziario. Eseguili con `npm run test`.
//
// È un'app di SOLDI: questi test proteggono la cascata del calcolo, il
// semaforo, le cadenze di paga, l'ammortamento e il Copilot. Se un refactor
// li rompe, meglio saperlo qui che sul telefono dell'utente.
// Zero dipendenze: solo Node + i moduli puri di src/lib.
// ─────────────────────────────────────────────────────────────────────────
import {
  computeFinance, monthlyCashflow, amortize, monthsToTarget, avgDailySpend,
} from '../src/lib/engine/prediction.js';
import { nextIncomeDate, prevIncomeDate, countIncomeOccurrences, sumLockedBetween } from '../src/lib/analytics.js';
import { askCopilot, parseAmount } from '../src/lib/engine/copilot.js';
import { buildInsightFeed } from '../src/lib/engine/intelligence.js';
import { suggestCategory } from '../src/lib/intelligence.js';
import { planReconciliation } from '../src/lib/engine/reconcile.js';
import { frequentExpenses } from '../src/lib/engine/frequent.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${extra}`); }
};
const D = 864e5;

// ─── 1) CASCATA DEL CALCOLO ─────────────────────────────────────────
console.log('=== cascata del calcolo ===');
const now = new Date(2026, 5, 9, 12); // 9 giu, paga il 16 → 7 giorni
const base = {
  currentBalance: 833, cushion: 0, monthlySavingsTarget: 300,
  goals: [{ id: 'g', saved: 300, target: 1000 }],
  incomes: [{ id: 'i', amount: 1700, dayOfMonth: 16, active: true, kind: 'salary' }],
  fixed: [],
  subscriptions: [{ id: 'n', label: 'Netflix', amount: 20, dayOfMonth: 9, cadence: 'monthly', active: true }],
  extraIncomes: [], recurringPaid: {},
  txs: [{ id: 't', ts: new Date(2026, 5, 9, 8).getTime(), cat: 'food', amount: 2, type: 'expense' }],
  todayKey: new Date(2026, 5, 9).getTime(), daysInPeriod: 30, dayOfPeriod: 9,
};
const f = computeFinance(base, now);
ok('spendibile = libero − risparmio mese', f.spendableUntilNext === Math.round((f.freeUntilNext - 300) * 100) / 100, `${f.spendableUntilNext}`);
ok('"liberi a fine ciclo" ≡ spendibile (coerenza schermate)', f.freeAtEndOfCycle === f.spendableUntilNext);
ok('mai più di quel che hai', f.freeAtEndOfCycle <= base.currentBalance);
const ricostruito = f.dailyQuota * f.daysToNextIncome;
ok('quota × giorni ≈ spendibile + speso oggi', Math.abs(ricostruito - (f.spendableUntilNext + f.spentToday)) < 1.5, `${ricostruito}`);
const f0 = computeFinance({ ...base, monthlySavingsTarget: 0 }, now);
ok('senza risparmio: spendibile = libero', f0.spendableUntilNext === f0.freeUntilNext);
ok('posizione nel ciclo presente (giorno X di Y)', f.cycleDayNumber >= 1 && f.cycleDaysTotal >= f.cycleDayNumber, `${f.cycleDayNumber}/${f.cycleDaysTotal}`);

// ─── 2) SEMAFORO ────────────────────────────────────────────────────
console.log('\n=== semaforo ===');
const sano = {
  currentBalance: 1000, cushion: 0, monthlySavingsTarget: 0, goals: [],
  incomes: [{ id: 'i', amount: 1700, dayOfMonth: 16, active: true }],
  fixed: [{ id: 'rent', label: 'Affitto', amount: 500, deductDay: 12, active: true }],
  subscriptions: [], extraIncomes: [], recurringPaid: {}, txs: [],
  todayKey: new Date(2026, 5, 9).getTime(), daysInPeriod: 30, dayOfPeriod: 9,
};
ok('sereno quando in linea', computeFinance(sano, now).cycleStatus === 'sereno');
const sforato = { ...sano, txs: [{ id: 's', ts: new Date(2026, 5, 9, 9).getTime(), cat: 'food', amount: 200, type: 'expense' }] };
ok('attento quando oggi sfori', computeFinance(sforato, now).cycleStatus === 'attento');
ok('rosso quando intacchi i protetti', computeFinance({ ...sano, monthlySavingsTarget: 5000 }, now).cycleStatus === 'rosso');
ok('rosso sotto il cuscinetto', computeFinance({ ...sano, currentBalance: 100, cushion: 300, fixed: [] }, now).cycleStatus === 'rosso');

// ─── 3) SALTA RICORRENZA ────────────────────────────────────────────
console.log('\n=== salta ricorrenza ===');
const conSalto = computeFinance({ ...sano, recurringSkipped: { 'rent_2026-06': 1 } }, now);
ok('senza salto: affitto scontato', computeFinance(sano, now).freeUntilNext === 500);
ok('con salto: affitto non scontato', conSalto.freeUntilNext === 1000, `${conSalto.freeUntilNext}`);

// ─── 4) CADENZE DI PAGA ─────────────────────────────────────────────
console.log('\n=== cadenze di paga ===');
const mens = { amount: 1700, dayOfMonth: 16, active: true };
ok('mensile: prossima il 16/6', nextIncomeDate([mens], new Date(2026, 5, 9)).getDate() === 16);
const sett = { amount: 400, cadence: 'weekly', anchorTs: new Date(2026, 5, 5).getTime(), active: true };
ok('settimanale: prossima ven 12/6', nextIncomeDate([sett], new Date(2026, 5, 9)).getDate() === 12);
ok('settimanale: precedente ven 5/6', prevIncomeDate([sett], new Date(2026, 5, 9)).getDate() === 5);
ok('settimanale: 4-5 occorrenze in 30g', [4, 5].includes(countIncomeOccurrences(sett, new Date(2026, 5, 9), new Date(2026, 6, 9))));
const quind = { amount: 800, cadence: 'biweekly', anchorTs: new Date(2026, 5, 5).getTime(), active: true };
ok('quindicinale: 2 occorrenze in 28g', countIncomeOccurrences(quind, new Date(2026, 5, 9), new Date(2026, 5, 37)) === 2);
const cfW = monthlyCashflow({ incomes: [sett], fixed: [], subscriptions: [], annualExpenses: [] }, { burnRateMonthly: 0 });
ok('cashflow: 400/settimana ≈ €1739/mese', Math.abs(cfW.income - 400 * (30.44 / 7)) < 0.5, `${cfW.income}`);

// ─── 5) AMMORTAMENTO E OBIETTIVI ────────────────────────────────────
console.log('\n=== ammortamento e obiettivi ===');
const a1 = amortize({ total: 25000, downPayment: 5000, months: 60, annualRatePct: 6 });
ok('rata 25k/5k/60m/6% ≈ 386,66', Math.abs(a1.monthly - 386.66) < 0.5, `${a1.monthly}`);
ok('interessi ≈ 3199,6', Math.abs(a1.totalInterest - 3199.6) < 2, `${a1.totalInterest}`);
const a0 = amortize({ total: 25000, months: 60, annualRatePct: 0 });
ok('tasso 0: interessi esattamente 0', a0.totalInterest === 0);
ok('5000 a 300/mese → 17 mesi', monthsToTarget(5000, 0, 300) === 17);
ok('già raggiunto → 0 mesi', monthsToTarget(1000, 1200, 300) === 0);
ok('ritmo 0 → mai (null)', monthsToTarget(5000, 0, 0) === null);

// ─── 6) BURN RATE ROBUSTO ───────────────────────────────────────────
console.log('\n=== burn rate robusto ===');
const t0 = new Date(2026, 5, 9, 10);
const mk = (dAgo, amount, cat = 'food', tags = []) => ({ id: `x${dAgo}-${amount}`, ts: t0.getTime() - dAgo * D, cat, amount, type: 'expense', tags });
const txsA = []; for (let i = 1; i <= 12; i++) txsA.push(mk(i * 2, 10));
txsA.push(mk(5, 160, 'other'));
ok('outlier smussato (cap 4×mediana)', Math.abs(avgDailySpend(txsA, 30, now) - (120 + 40) / 30) < 0.05);
ok('tag ricorrente escluso', avgDailySpend([...txsA, mk(3, 500, 'home', ['ricorrente'])], 30, now) === avgDailySpend(txsA, 30, now));

// ─── 7) COPILOT ─────────────────────────────────────────────────────
console.log('\n=== copilot ===');
const ctx = {
  freeUntilNext: 320, dailyQuota: 52, daysToNextIncome: 10, nextIncomeAt: Date.now() + 10 * D,
  eom: 800, cushion: 200, savingsTarget: 300, spentToday: 18, spentMonth: 870, spentWeek: 210,
  avgDailySpend: 29, byCategory: [{ id: 'food', label: 'Cibo', spent: 300 }],
  topCategory: { id: 'food', label: 'Cibo', spent: 300 },
  upcoming: [{ label: 'Affitto', amount: 500, inDays: 3 }], upcomingWeek: 500, upcomingMonth: 500,
  restOfMonthDays: 18, cats: [{ id: 'food', label: 'Cibo' }],
  currentBalance: 2000, monthlyNet: 300, monthlyIncome: 1800, monthlyRecurring: 700, monthlyAvgSpend: 800,
  goals: [{ label: 'Vacanza', target: 1000, saved: 450 }],
  cycleStatus: 'sereno', cycleStatusReason: 'Sei in linea col tuo ritmo',
};
ok('parse "25 mila" → 25000', parseAmount('25 mila') === 25000);
ok('afford cash', askCopilot('posso permettermi 100€?', ctx).intent === 'afford');
ok('afford con azione "aggiungi spesa"', askCopilot('posso permettermi 100€?', ctx).action?.kind === 'add-expense');
const fin = askCopilot('posso permettermi 25 mila a rate in 5 anni al 6%?', ctx);
ok('rate: ammortamento reale (€483/mese)', /48[23]/.test(fin.text), fin.text);
const fc = askCopilot('quanto avrò tra un anno?', ctx);
ok('previsione 12 mesi: 2000+300×12=5600', /5\.?600/.test(fc.text), fc.text);
let mem = fin.slots;
const seguito = askCopilot('e in 3 anni?', { ...ctx, prev: mem });
ok('memoria: "e in 3 anni?" → rata 3 anni', seguito.followUp === true && /3 anni/.test(seguito.text), seguito.text);
ok('tempo-obiettivo: 5000 → 1 anno e 5 mesi', /1 anno e 5/.test(askCopilot('tra quanto raggiungo 5000?', ctx).text));
ok('"come sto messo?" → semaforo', /[Ss]ereno/.test(askCopilot('come sto messo?', ctx).text));
ok('payday: risponde con la data', askCopilot('quando arriva la paga?', ctx).intent === 'payday');

// ─── 8) FEED E CATEGORIA AUTOMATICA ─────────────────────────────────
console.log('\n=== feed e categoria automatica ===');
const feed = buildInsightFeed({ txs: [], cats: [], goals: [], cushion: 0, savingsTarget: 300, model: { freeAtEndOfCycle: -42, daysToNextIncome: 7, freeUntilNext: 100, dailyQuota: 10 }, now });
ok('rischio: parla "alla paga", non "fine mese"', /paga/.test(feed.find((i) => i.id === 'eom-neg')?.text || ''));
const cats = [{ id: 'food', label: 'Cibo' }, { id: 'fun', label: 'Svago' }, { id: 'transport', label: 'Trasporti' }];
ok('Esselunga → Cibo', suggestCategory('Esselunga', [], cats) === 'food');
ok('Netflix → Svago', suggestCategory('Netflix', [], cats) === 'fun');
ok('la storia utente vince sul dizionario', suggestCategory('Netflix', [{ label: 'Netflix', cat: 'transport', ts: Date.now() }], cats) === 'transport');

// ─── 9) RICONCILIAZIONE COL CONTO (v0.14) ───────────────────────────
// Il momento più delicato: qui si decide se creare un movimento di soldi.
console.log('\n=== riconciliazione col conto ===');
const rNone = planReconciliation(1000, 1000);
ok('saldi uguali → nessun movimento', rNone.kind === 'none' && rNone.amount === 0);
ok('scarto sotto il centesimo → nessun movimento', planReconciliation(1000, 1000.004).kind === 'none');
const rLess = planReconciliation(1000, 953);
ok('in banca meno → spesa non tracciata di 47', rLess.kind === 'expense' && rLess.amount === 47, JSON.stringify(rLess));
ok('delta negativo quando mancano soldi', rLess.delta === -47);
const rMore = planReconciliation(1000, 1120.5);
ok('in banca di più → entrata non tracciata di 120,50', rMore.kind === 'income' && rMore.amount === 120.5, JSON.stringify(rMore));
ok('centesimi rispettati (0,01)', planReconciliation(10, 9.99).amount === 0.01, JSON.stringify(planReconciliation(10, 9.99)));
ok('niente drift float (0,1+0,2)', planReconciliation(0.3, 0.1 + 0.2).kind === 'none');
ok('saldo negativo gestito', planReconciliation(-50, -120).kind === 'expense' && planReconciliation(-50, -120).amount === 70);
ok('input non valido → nessun movimento', planReconciliation(1000, NaN).kind === 'none');
ok('input testo → nessun movimento', planReconciliation(undefined, 500).kind === 'none');
// Invariante che protegge da soldi spariti/duplicati: applicare il piano
// al saldo dell'app deve dare ESATTAMENTE il saldo della banca.
const casi = [[1000, 953], [1000, 1120.5], [10, 9.99], [-50, -120], [0, 250]];
const invarianteOk = casi.every(([c, t]) => {
  const p = planReconciliation(c, t);
  const applicato = p.kind === 'expense' ? c - p.amount : p.kind === 'income' ? c + p.amount : c;
  return Math.abs(applicato - t) < 0.005;
});
ok('applicando il piano il saldo torna ESATTO (5 casi)', invarianteOk);

// ─── 10) LE TUE SOLITE — spese ripetute in un tap (v0.14.1) ─────────
console.log('\n=== le tue solite ===');
const nowF = Date.now();
const tf = (id, dAgo, label, amount, cat, tags = []) =>
  ({ id, ts: nowF - dAgo * D, label, amount, cat, type: 'expense', tags });
const solite = frequentExpenses([
  tf('1', 1, 'Caffè', 1.3, 'food'),
  tf('2', 4, 'caffe', 1.2, 'food'),
  tf('3', 9, 'CAFFÈ ', 1.2, 'food'),
  tf('4', 2, 'Esselunga', 34, 'food'),
  tf('5', 11, 'Esselunga', 41, 'food'),
  tf('6', 3, 'Scarpe', 89, 'wants'),                    // una volta sola → fuori
  tf('7', 120, 'Vecchia', 10, 'food'),                  // troppo vecchia
  tf('8', 121, 'Vecchia', 10, 'food'),
  tf('9', 1, 'Non tracciato', 47, 'other', ['non-tracciato']), // mai un preset
  tf('10', 2, 'Non tracciato', 12, 'other', ['non-tracciato']),
], { now: nowF });
ok('raggruppa nonostante accenti e maiuscole', solite.some((s) => /caff/i.test(s.label) && s.count === 3), JSON.stringify(solite));
ok('propone l\'ULTIMO importo pagato (1,30)', solite.find((s) => /caff/i.test(s.label))?.amount === 1.3);
ok('tiene la spesa variabile (Esselunga, ultimo 34)', solite.find((s) => /esselunga/i.test(s.label))?.amount === 34);
ok('scarta chi è successo una volta sola', !solite.some((s) => /scarpe/i.test(s.label)));
ok('scarta le spese fuori finestra (120 giorni)', !solite.some((s) => /vecchia/i.test(s.label)));
ok('non propone mai "Non tracciato"', !solite.some((s) => /non tracciato/i.test(s.label)));
ok('ordina per frequenza (Caffè primo)', /caff/i.test(solite[0]?.label || ''), JSON.stringify(solite));
ok('rispetta il limite', frequentExpenses([
  tf('a', 1, 'A', 1, 'food'), tf('b', 2, 'A', 1, 'food'),
  tf('c', 1, 'B', 1, 'food'), tf('d', 2, 'B', 1, 'food'),
  tf('e', 1, 'C', 1, 'food'), tf('f', 2, 'C', 1, 'food'),
], { now: nowF, limit: 2 }).length === 2);
ok('lista vuota → nessun preset', frequentExpenses([], { now: nowF }).length === 0);
ok('spese senza descrizione ignorate', frequentExpenses([
  tf('x', 1, '', 5, 'food'), tf('y', 2, '  ', 5, 'food'),
], { now: nowF }).length === 0);

// ─────────────────────────────────────────────────────────────
// v0.17 — pagamenti che si ripetono: una lista sola, con cadenza.
// Il bug storico: le spese annuali stavano in un elenco separato che
// sumLockedBetween non guardava, quindi i soldi del bollo non venivano
// MAI messi da parte. Questi test bloccano il ritorno del bug.
// ─────────────────────────────────────────────────────────────
{
  const from = new Date(2026, 7, 10);   // 10 agosto
  const until = new Date(2026, 7, 27);  // 27 agosto → finestra di 17 giorni

  const soloAnnuale = sumLockedBetween({
    subscriptions: [{ id: 'a1', label: 'Assicurazione', amount: 600, cadence: 'annual', day: 1 }],
    fromDate: from, untilDate: until,
  });
  // 600/anno = 50/mese, prorata su 17 giorni: 50 × 17/30.44 ≈ 27,92
  ok('una spesa annuale accantona davvero (≈27,92 su 17 giorni)',
    Math.abs(soloAnnuale - 27.92) < 0.05, String(soloAnnuale));
  ok('una spesa annuale NON è più ignorata', soloAnnuale > 0);

  const mensile = sumLockedBetween({
    subscriptions: [{ id: 'm1', label: 'Netflix', amount: 12.99, cadence: 'monthly', day: 14 }],
    fromDate: from, untilDate: until,
  });
  ok('una mensile dentro la finestra conta per intero', mensile === 12.99, String(mensile));

  const mensileFuori = sumLockedBetween({
    subscriptions: [{ id: 'm2', label: 'Affitto', amount: 520, cadence: 'monthly', day: 5 }],
    fromDate: from, untilDate: until,
  });
  ok('una mensile già passata non conta', mensileFuori === 0, String(mensileFuori));

  const sospesa = sumLockedBetween({
    subscriptions: [{ id: 'a2', label: 'Bollo', amount: 300, cadence: 'annual', day: 1, active: false }],
    fromDate: from, untilDate: until,
  });
  ok('una voce sospesa non impegna nulla', sospesa === 0, String(sospesa));

  const settimanale = sumLockedBetween({
    subscriptions: [{ id: 'w1', label: 'Mensa', amount: 25, cadence: 'weekly', day: 1 }],
    fromDate: from, untilDate: until,
  });
  // 25/settimana ≈ 108,33/mese, prorata su 17 giorni ≈ 60,5
  ok('una settimanale è spalmata sulla finestra', Math.abs(settimanale - 60.5) < 1, String(settimanale));

  // La somma della lista unica = somma delle singole voci: nessun doppio conteggio
  const insieme = sumLockedBetween({
    subscriptions: [
      { id: 'a1', label: 'Assicurazione', amount: 600, cadence: 'annual', day: 1 },
      { id: 'm1', label: 'Netflix', amount: 12.99, cadence: 'monthly', day: 14 },
    ],
    fromDate: from, untilDate: until,
  });
  ok('lista unica: nessun doppio conteggio',
    Math.abs(insieme - (soloAnnuale + mensile)) < 0.02, `${insieme} vs ${soloAnnuale + mensile}`);
}

console.log(`\n──────────\n${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
