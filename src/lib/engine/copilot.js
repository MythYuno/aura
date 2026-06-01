// ─────────────────────────────────────────────────────────────────────────
// COPILOT (locale) — il quarto strato del "Financial Copilot".
//
//   Data → Prediction → Intelligence → [ COPILOT ] → risposta in italiano
//
// Interpreta una domanda in linguaggio naturale e risponde con una frase.
// REGOLA D'ORO: il Copilot NON calcola mai da sé. Prende i numeri già pronti
// dai motori (finance/prediction) e li traduce in parole. È 100% LOCALE:
// nessuna AI, nessun cloud, nessuna richiesta di rete. Solo intent-matching
// (parole chiave) + template NLG. Funzioni pure.
// ─────────────────────────────────────────────────────────────────────────

import { $n, $d } from '../format.js';
import { amortize, monthsToTarget } from './prediction.js';

// Importi esatti (decimali solo se servono) e arrotondati (per le stime).
const eur = (n) => {
  const r = Math.round(n * 100) / 100;
  const whole = Math.abs(r % 1) < 0.005;
  return `${r < 0 ? '-' : ''}€${whole ? $n(Math.abs(r)) : $d(Math.abs(r))}`;
};
const eur0 = (n) => `${n < 0 ? '-' : ''}€${$n(Math.abs(n))}`;
const has = (q, re) => re.test(q);

// Unità di tempo che seguono un numero (per non scambiare "5 anni" con un prezzo).
const TIME_AFTER = /^\s*(anni|anno|mesi|mese|mes|giorni|giorno|settiman|volte|volta)/i;

/**
 * Estrae l'IMPORTO dalla domanda. Gestisce:
 *  - moltiplicatori a parole: "25 mila" → 25000, "k" → ×1000, "milioni" → ×1e6
 *  - numeri attaccati a lettere (PS5, iPhone15) → ignorati
 *  - numeri seguiti da unità di tempo (5 anni) → ignorati (sono periodi)
 * Tra i candidati validi sceglie il PIÙ GRANDE (di solito è il prezzo).
 */
// Converte "1.200" / "25,5" / ("k"|"mila"|"milioni") in numero.
function toNum(s, mult) {
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (s.includes('.')) {
    const p = s.split('.');
    if (p[p.length - 1].length === 3) s = s.replace(/\./g, ''); // 1.200 → 1200 (migliaia)
  }
  let n = parseFloat(s);
  const mm = (mult || '').toLowerCase();
  if (mm === 'mila' || mm === 'mille' || mm === 'k') n *= 1000;
  else if (mm === 'milioni' || mm === 'milione') n *= 1e6;
  return n;
}

export function parseAmount(q) {
  const re = /(\d[\d.,]*\d|\d)\s*(mila|mille|milioni|milione|k)?/gi;
  let m;
  let best = null;
  while ((m = re.exec(q)) !== null) {
    const before = m.index > 0 ? q[m.index - 1] : ' ';
    if (/[a-zàèéìòù]/i.test(before)) continue; // incollato a lettere → scarta (PS5)
    const rest = q.slice(re.lastIndex);
    if (!m[2] && TIME_AFTER.test(rest)) continue; // "5 anni" → periodo, non prezzo
    if (!m[2] && /^\s*%/.test(rest)) continue;    // "6%" → tasso, non prezzo
    const n = toNum(m[1], m[2]);
    if (Number.isFinite(n) && n > 0) best = best == null ? n : Math.max(best, n);
  }
  return best;
}

/** Importo seguito da "al mese/ogni mese/mensile" (rata o accantonamento). */
function parseMonthlyAmount(q) {
  const m = q.match(/(\d[\d.,]*\d|\d)\s*(mila|mille|k)?\s*(?:€\s*|euro\s*)?(?:al mese|ogni mese|mensil[ei]|\/\s*mese)/i);
  if (!m) return null;
  const n = toNum(m[1], m[2]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Anticipo/acconto: "anticipo di 5000", "acconto 5 mila". */
function parseDownPayment(q) {
  const m = q.match(/(?:anticipo|acconto|caparra)\s*(?:di\s*|pari a\s*|del valore di\s*)?(\d[\d.,]*\d|\d)\s*(mila|mille|k)?/i);
  if (!m) return 0;
  const n = toNum(m[1], m[2]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Tasso annuo %: "tasso 5%", "al 6", "TAN 5,9", "tasso zero/senza interessi" → 0. null se assente. */
function parseRatePct(q) {
  if (/tasso\s*zero|tasso\s*0(?!\d)|senza interess|interess\w*\s*(a\s*)?zero|tan\s*zero|a interessi zero/i.test(q)) return 0;
  let m = q.match(/(?:tasso|tan|taeg|interess\w*)\s*(?:del\s*|al\s*|d[ei]\s*)?(\d+(?:[.,]\d+)?)\s*%?/i);
  if (m) return parseFloat(m[1].replace(',', '.'));
  m = q.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  return null;
}

/** Periodo in MESI ("5 anni" → 60, "18 mesi" → 18, "un anno" → 12). */
function parsePeriodMonths(q) {
  let months = null;
  const y = q.match(/(\d+)\s*(anni|anno)/i);
  if (y) months = parseInt(y[1], 10) * 12;
  const mo = q.match(/(\d+)\s*(mesi|mese)/i);
  if (mo) months = (months || 0) + parseInt(mo[1], 10);
  if (months == null) {
    if (/\b(un|1)\s*anno\b|all'anno|in un anno/i.test(q)) months = 12;
    else if (/mezz['e ]?anno|sei mesi/i.test(q)) months = 6;
    else if (/due anni/i.test(q)) months = 24;
    else if (/tre anni/i.test(q)) months = 36;
  }
  return months;
}

/** "60" → "5 anni", "18" → "18 mesi". */
const monthsWord = (m) => (m % 12 === 0 ? `${m / 12} ${m / 12 === 1 ? 'anno' : 'anni'}` : `${m} mesi`);

/** Durata leggibile: 30 → "2 anni e 6 mesi", 8 → "8 mesi", 12 → "1 anno". */
const humanMonths = (m) => {
  if (m < 12) return `${m} ${m === 1 ? 'mese' : 'mesi'}`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  const ys = `${y} ${y === 1 ? 'anno' : 'anni'}`;
  return r ? `${ys} e ${r} ${r === 1 ? 'mese' : 'mesi'}` : ys;
};

// ─── Memoria di conversazione: riconosce un "seguito" alla domanda precedente ──
// "e in 3 anni?", "e con anticipo 5000?", "e a tasso zero?", "e tra 2 anni?",
// "e se metto via 500 al mese?", "e per 10000?", "invece 30 mila?"
function isFollowUp(q) {
  const t = q.trim();
  const words = t.split(/\s+/).length;
  return words <= 7 && /^(e |ed |e se |e con |e a |e in |e per |e di |e tra |e fra |invece|ma se |e con un|e nel)/i.test(t);
}

// Costruisce una domanda completa unendo gli slot precedenti coi nuovi valori del seguito.
function synthFollowUp(prev, q) {
  const nMonths = parsePeriodMonths(q);
  const nRate = parseRatePct(q);
  const nDown = parseDownPayment(q);
  const nMonthly = parseMonthlyAmount(q);
  const rawAmt = parseAmount(q);
  const nAmount = (rawAmt != null && rawAmt !== nDown && rawAmt !== nMonthly) ? rawAmt : null;

  if (prev.intent === 'afford') {
    const amount = nAmount != null ? nAmount : prev.amount;
    const months = nMonths != null ? nMonths : prev.months;
    const rate = nRate != null ? nRate : prev.rate;
    const down = nDown || prev.down || 0;
    if (amount == null) return null;
    if (months && months > 1) {
      const rateStr = rate === 0 ? ' a tasso zero' : (rate > 0 ? ` al ${String(rate).replace('.', ',')}%` : '');
      const downStr = down > 0 ? ` con anticipo ${down}` : '';
      return `posso permettermi ${amount} a rate in ${monthsWord(months)}${downStr}${rateStr}`;
    }
    return `posso permettermi ${amount}`;
  }
  if (prev.intent === 'forecast') {
    const months = nMonths != null ? nMonths : prev.months;
    if (!months) return null;
    return `quanto avrò tra ${monthsWord(months)}`;
  }
  if (prev.intent === 'goal') {
    const target = nAmount != null ? nAmount : prev.target;
    const monthly = nMonthly != null ? nMonthly : prev.monthly;
    const months = nMonths != null ? nMonths : prev.months;
    if (target == null) return null;
    if (months && monthly == null) return `quanto devo mettere via al mese per ${target} in ${monthsWord(months)}`;
    if (monthly != null) return `se metto via ${monthly} al mese tra quanto raggiungo ${target}`;
    return `tra quanto raggiungo ${target}`;
  }
  return null;
}

/** La domanda parla di una spesa a rate / spalmata / mensile? */
const isFinancing = (q) => /spalmat|a rate|\brate\b|\brata\b|mensil|al mese|ogni mese|finanz/i.test(q);

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const fmtDate = (ts) => { const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const days = (n) => `${n} ${n === 1 ? 'giorno' : 'giorni'}`;

// Sinonimi per riconoscere le categorie di default anche se l'utente non usa il
// label esatto ("quanto spendo di benzina?" → trasporti).
const CAT_SYN = {
  food: /cib|mangiar|supermercat|ristorant|pranz|\bcena\b|aliment|\bspesa\b/,
  home: /\bcasa\b|affitt|bollett|\bluce\b|\bgas\b|mutuo|condomin/,
  transport: /trasport|benzin|carburant|\bauto\b|macchin|\btreno\b|\bbus\b|\bmetro\b|tax(i|ì)|monopattin|carburante/,
  health: /salut|medic|farmaci|dottor|dentist|\bvisita\b|ospedal/,
  fun: /svag|divertiment|cinema|hobby|\buscit|concert|videogioc|\bgame|serie tv|abbonament.*svago/,
  wants: /shopping|vestit|abbigliam|acquist|scarpe|regal/,
  other: /\baltro\b|\bvarie\b|\bextra\b/,
};

/** Riconosce a quale categoria si riferisce la domanda (id), o null. */
function parseCategory(q, cats = []) {
  // 1) match diretto sul label dell'utente (≥4 lettere, per evitare falsi).
  for (const c of cats) {
    const lab = (c.label || '').toLowerCase().trim();
    if (lab.length >= 4 && q.includes(lab)) return c.id;
  }
  // 2) sinonimi per le categorie di default ancora presenti.
  for (const c of cats) {
    const re = CAT_SYN[c.id];
    if (re && re.test(q)) return c.id;
  }
  return null;
}

/**
 * askCopilot — interpreta la domanda e restituisce { intent, text }.
 *
 * @param {string} question  la domanda dell'utente
 * @param {object} ctx       numeri già calcolati dai motori:
 *   { freeUntilNext, dailyQuota, daysToNextIncome, eom (=projected.endOfMonth),
 *     cushion, savingsTarget, name }
 */
export function askCopilot(question, ctx = {}) {
  const q = (question || '').toLowerCase().trim();
  const {
    freeUntilNext = 0, dailyQuota = 0, daysToNextIncome = null,
    eom = null, cushion = 0, savingsTarget = 0,
    nextIncomeAt = null, spentToday = 0, spentMonth = 0, spentWeek = 0,
    byCategory = [], topCategory = null, upcoming = [],
    upcomingWeek = 0, upcomingMonth = 0, restOfMonthDays = 0,
    avgDailySpend = 0, cats = [],
    currentBalance = null, monthlyNet = null, monthlyIncome = 0,
    monthlyRecurring = 0, monthlyAvgSpend = 0, goals = [], lowSpendData = false,
    cycleStatus = null, cycleStatusReason = '',
  } = ctx;
  // Caveat da appendere quando una stima dipende dalla spesa media e i dati sono pochi.
  const dataCaveat = lowSpendData ? ' (stima provvisoria: ho ancora pochi dati di spesa)' : '';
  // Orizzonte del ciclo: con un'entrata impostata il ciclo finisce ALLA PAGA,
  // senza finisce col periodo. Le frasi devono dire il vero.
  const horiz = daysToNextIncome ? 'da qui alla paga' : 'a fine periodo';
  const eomOk = Number.isFinite(eom);
  const balOk = Number.isFinite(currentBalance);
  const netOk = Number.isFinite(monthlyNet);

  if (!q) {
    return { intent: 'empty', text: 'Chiedimi pure: "posso permettermi 500€?", "quanto avrò tra un anno?" o "tra quanto raggiungo 5000?".' };
  }

  // SEGUITO alla domanda precedente (memoria): "e in 3 anni?", "e con anticipo 5000?"…
  // Solo se è un "ritocco": deve portare un valore nuovo (periodo/importo/tasso/anticipo),
  // così "e quanto ho speso in cibo" NON viene dirottato sulla domanda precedente.
  const looksTweak = parsePeriodMonths(q) != null || parseRatePct(q) != null
    || parseDownPayment(q) > 0 || parseMonthlyAmount(q) != null || parseAmount(q) != null
    || /tasso zero|senza interess/i.test(q);
  if (ctx.prev && ctx.prev.intent && isFollowUp(q) && looksTweak) {
    const synth = synthFollowUp(ctx.prev, q);
    if (synth) { const r = askCopilot(synth, { ...ctx, prev: null }); return { ...r, followUp: true }; }
  }

  // COME STO MESSO? — risposta col semaforo del ciclo (v0.10.1)
  if (has(q, /come (sto|sono|va|vado|siamo)\b|come sto messo|tutto (ok|bene|sotto controllo)|sto andando bene|come mi vedi/)) {
    const tail = `Hai ${eur(freeUntilNext)} spendibili${daysToNextIncome ? ` per ${days(daysToNextIncome)} (≈${eur0(dailyQuota)} al giorno)` : ''}.`;
    if (!cycleStatus) return { intent: 'status', text: tail };
    const lbl = cycleStatus === 'rosso' ? 'Rosso' : cycleStatus === 'attento' ? 'Attento' : 'Sereno';
    const reason = cycleStatusReason ? `${cycleStatusReason.charAt(0).toLowerCase()}${cycleStatusReason.slice(1)}` : 'tutto in linea';
    const extra = cycleStatus === 'rosso' ? ' Se vuoi, chiedimi: "e se taglio 100 al mese?".' : '';
    return { intent: 'status', text: `${lbl}: ${reason}. ${tail}${extra}` };
  }

  // TEMPO-OBIETTIVO: "tra quanto ho 5000?", "quando raggiungo X?",
  // "quanto al mese per X?", "se metto via 300 al mese, tra quanto arrivo a 5000?"
  const etaFraming = has(q, /quando|tra quanto|fra quanto|in quanto tempo|quanto.*(ci vuole|ci metto)|quanto.*al mese.*per|mett.*al mese.*per|per (avere|comprar|arrivare a|metter)/);
  const isPaydayQ = has(q, /\bpag|stipend|\bentrat|\bbusta\b/); // "quando arriva la paga" → non è un obiettivo
  const monthly = parseMonthlyAmount(q);
  const target = parseAmount(q);
  const namedGoal = goals.find((g) => g.label && g.target > 0 && q.includes(g.label.toLowerCase()));
  const savingFraming = has(q, /mett.*(via|da parte)|da parte|accanton|risparmi|obiettiv/);
  const hasTarget = !!namedGoal || (target != null && !(monthly != null && target === monthly));
  if (etaFraming && !isPaydayQ && (hasTarget || savingFraming)) {
    let goalTarget = null; let start = 0; let what = '';
    if (namedGoal) { goalTarget = namedGoal.target; start = namedGoal.saved || 0; what = `"${namedGoal.label}"`; }
    else if (target != null && !(monthly != null && target === monthly)) {
      goalTarget = target;
      start = has(q, /sul conto|in banca|avr[òo]/) && balOk ? currentBalance : 0;
      what = eur0(goalTarget);
    }
    if (goalTarget == null) {
      return { intent: 'goal_eta', text: 'Dimmi la cifra obiettivo (o il nome dell\'obiettivo) e, se vuoi, quanto metti via al mese — es. "se metto via 300 al mese, tra quanto ho 5000?".' };
    }
    // CASO 1: "quanto devo mettere via al mese per X [in N mesi/anni]?"
    if (monthly == null && has(q, /al mese|mensil/) && has(q, /quant|devo|dovrei|serve|ci vuole/)) {
      const period = parsePeriodMonths(q);
      if (!period) return { intent: 'goal_eta', text: `Per ${what} dimmi in quanto tempo (es. "in 2 anni") e ti dico quanto mettere via al mese.` };
      const perMonth = Math.max(0, goalTarget - start) / period;
      return { intent: 'goal_eta', text: `Per arrivare a ${what} in ${monthsWord(period)} servono circa ${eur0(perMonth)} al mese${start > 0 ? ` (parti già da ${eur0(start)})` : ''}.`, slots: { intent: 'goal', target: goalTarget, monthly: null, months: period } };
    }
    // CASO 2: tempo per raggiungere, dato un ritmo (mensile esplicito · obiettivo conservato · netto)
    const rate = monthly != null ? monthly : (savingsTarget > 0 ? savingsTarget : (netOk ? monthlyNet : 0));
    const months = monthsToTarget(goalTarget, start, rate);
    if (months === 0) return { intent: 'goal_eta', text: `Ci sei già: ${what} è raggiunto. 🎉` };
    if (months == null) {
      return { intent: 'goal_eta', text: rate <= 0
        ? 'Di questo passo non avanza nulla da mettere da parte ogni mese. Dimmi quanto vuoi accantonare (es. "300 al mese") o riduci le spese fisse.'
        : 'Dimmi a che ritmo: quanto metti via al mese? (es. "300 al mese")' };
    }
    const usesNet = monthly == null && savingsTarget <= 0;
    const ritmo = monthly != null ? `${eur0(monthly)} al mese`
      : savingsTarget > 0 ? `i ${eur0(savingsTarget)} al mese che vuoi conservare`
      : `il tuo ritmo attuale (~${eur0(rate)} al mese)`;
    return { intent: 'goal_eta', text: `Mettendo via ${ritmo}, raggiungi ${what} in circa ${humanMonths(months)}${start > 0 ? ` (parti da ${eur0(start)})` : ''}.${usesNet ? dataCaveat : ''}`, slots: { intent: 'goal', target: goalTarget, monthly: monthly != null ? monthly : null, months: null } };
  }

  // PREVISIONE A LUNGO TERMINE: "quanto avrò tra 6 mesi / un anno?", "come sarò messo tra 2 anni?"
  const horizon = parsePeriodMonths(q);
  if (horizon && horizon >= 1
      && has(q, /avr[òo]|avrei|ritrover|sul conto|in banca|prevision|come.*(sar[òo]|messo)|risparmi.*(tra|fra)|quanto.*(tra|fra)/)
      && !has(q, /permett|comprar|posso (prend|fare)|a rate|anticipo/)) {
    if (!balOk || !netOk) return { intent: 'forecast', text: 'Per la previsione mi servono saldo ed entrate aggiornati.' };
    const projected = currentBalance + monthlyNet * horizon;
    const segno = monthlyNet >= 0 ? `+${eur0(monthlyNet)}` : `${eur0(monthlyNet)}`;
    const dettaglio = `${segno} al mese: ${eur0(monthlyIncome)} entrate − ${eur0(monthlyRecurring)} fisse − ${eur0(monthlyAvgSpend)} spese`;
    const avviso = monthlyNet < 0 ? ' Occhio: a questo ritmo il conto cala.' : '';
    return {
      intent: 'forecast',
      text: `Di questo passo, tra ${monthsWord(horizon)} dovresti avere circa ${eur0(projected)} sul conto (${dettaglio}).${avviso} È una stima: cambia se cambiano entrate o spese.${dataCaveat}`,
      slots: { intent: 'forecast', months: horizon },
    };
  }

  // SCENARIO "e se…": taglio / risparmio X (al mese · al giorno · una tantum).
  // PRIMA di "afford": "e se spendo 10 in meno" non è una richiesta d'acquisto.
  const isScenario = has(q, /\bse\b/) && has(q, /taglio|tagliass|risparmi|spendess|mettess|metto via|in meno|spend.* meno/);
  if (isScenario) {
    const amt = parseAmount(q);
    if (amt == null) return { intent: 'scenario', text: 'Dimmi una cifra e te lo stimo — ad esempio "e se taglio 100€ al mese?".' };
    if (!eomOk) return { intent: 'scenario', text: 'Aggiorna saldo ed entrate e ti stimo lo scenario.' };
    let saved, label;
    if (has(q, /al giorno|ogni giorno/)) { saved = amt * restOfMonthDays; label = `${eur0(amt)} al giorno`; }
    else if (has(q, /al mese|ogni mese|mensil/)) { saved = amt * (restOfMonthDays / 30.44); label = `${eur0(amt)} al mese`; }
    else { saved = amt; label = eur0(amt); }
    const neweom = eom + saved;
    return { intent: 'scenario', text: `Stima: risparmiando ${label}, ${horiz} ti resterebbero circa ${eur0(neweom)} liberi invece di ${eur0(eom)} (${eur0(saved)} in più).` };
  }

  const amount = parseAmount(q);
  const isAfford = has(q, /permett|posso compr|posso prend|me lo posso|riesco a (compr|prend|spend)|posso fare un/)
    || (amount != null && has(q, /compr|prend|spend|cost|pag|fare/));

  // 1) POSSO PERMETTERMELO?
  if (isAfford) {
    if (amount == null) {
      return {
        intent: 'afford_noamount',
        text: `Dipende da quanto costa. Oggi hai ${eur(freeUntilNext)} disponibili${eomOk ? ` e ${horiz} ti restano ${eur0(eom)} liberi` : ''}. Dimmi la cifra e ti dico subito.`,
      };
    }
    // Spesa a rate / spalmata su un periodo → ammortamento reale (rata, anticipo, interessi).
    const months = parsePeriodMonths(q);
    const rate = parseRatePct(q);
    const wantsFinancing = isFinancing(q) || /\bin\s+\d+\s*(mes|ann)/i.test(q) || rate != null || /anticipo|acconto|finanz|rateizz/i.test(q);
    if (wantsFinancing && months && months > 1) {
      const down = parseDownPayment(q);
      const am = amortize({ total: amount, downPayment: down, months, annualRatePct: rate || 0 });
      return { intent: 'afford_financing', text: financingText(am, { eom, eomOk, rateGiven: rate != null, horiz }), slots: { intent: 'afford', amount, months, rate: rate != null ? rate : null, down } };
    }
    return {
      intent: 'afford',
      text: affordText(amount, { freeUntilNext, eom, eomOk, horiz }),
      slots: { intent: 'afford', amount, months: null, rate: null, down: 0 },
      // v0.10.1: azione rapida — apre l'Aggiungi con l'importo già pronto
      action: { kind: 'add-expense', amount },
    };
  }

  // SPESE PER CATEGORIA: "quanto ho speso in cibo?" / "quanto spendo di benzina?"
  const catId = parseCategory(q, cats);
  if (catId && has(q, /spes|spend|cost/)) {
    const row = byCategory.find((c) => c.id === catId);
    const label = (cats.find((c) => c.id === catId) || {}).label || row?.label || 'quella categoria';
    const spent = row ? row.spent : 0;
    if (spent <= 0) return { intent: 'category', text: `Questo mese non hai ancora speso niente in ${label}.` };
    const share = spentMonth > 0 ? Math.round((spent / spentMonth) * 100) : 0;
    const top = topCategory && topCategory.id === catId ? ' È la tua voce più pesante del mese.' : '';
    return { intent: 'category', text: `Questo mese in ${label} hai speso ${eur(spent)}${share ? ` — circa il ${share}% del totale` : ''}.${top}` };
  }

  // QUANTO HO SPESO (oggi / questa settimana / questo mese)
  if (has(q, /\bspes[oa]\b|\bspese\b|ho spes|hai spes/)) {
    if (has(q, /oggi|stamattin|in giornata/)) {
      return { intent: 'spent', text: spentToday > 0
        ? `Oggi hai speso ${eur(spentToday)}${dailyQuota > 0 ? `, su un budget di ${eur0(dailyQuota)}` : ''}.`
        : 'Oggi non hai ancora segnato nessuna spesa.' };
    }
    if (has(q, /settiman|7 giorni|sette giorni/)) {
      return { intent: 'spent', text: spentWeek > 0
        ? `Negli ultimi 7 giorni hai speso ${eur(spentWeek)} — circa ${eur0(spentWeek / 7)} al giorno.`
        : 'Negli ultimi 7 giorni non hai segnato spese.' };
    }
    return { intent: 'spent', text: spentMonth > 0
      ? `Questo mese hai speso in tutto ${eur(spentMonth)}${topCategory ? `, soprattutto in ${topCategory.label} (${eur(topCategory.spent)})` : ''}. In media ${eur0(avgDailySpend)} al giorno.`
      : 'Questo mese non hai ancora segnato spese.' };
  }

  // 2) QUANTO POSSO SPENDERE OGGI
  if (has(q, /oggi/) && has(q, /spend|posso|budget|permett/)) {
    if (dailyQuota > 0) {
      return { intent: 'daily', text: `Oggi puoi spendere circa ${eur0(dailyQuota)} restando in linea${daysToNextIncome ? ` fino alla prossima entrata (${daysToNextIncome} ${daysToNextIncome === 1 ? 'giorno' : 'giorni'})` : ''}.` };
    }
    return { intent: 'daily', text: `Hai ${eur(freeUntilNext)} disponibili in tutto. Imposta saldo ed entrate per avere un budget giornaliero preciso.` };
  }

  // QUANDO ARRIVA LA PAGA / PROSSIMA ENTRATA — PRIMA di eom: "quando arriva la
  // paga?" è una domanda di data, non di previsione ("arrivo alla paga?" resta a eom).
  if (has(q, /quando.*(pag|stipend|entrat|bonific|accredit)|quant[oi].*(giorni|tempo).*(pag|entrat|stipend)|tra quanto.*(pag|entrat|stipend)|prossim.*(paga|entrata|stipendio)|quando (mi )?pagano/)) {
    if (!daysToNextIncome || !nextIncomeAt) {
      return { intent: 'payday', text: 'Non hai un\'entrata ricorrente impostata. Aggiungila in Gestione e ti dirò quando arriva e quanto manca.' };
    }
    const when = daysToNextIncome === 1 ? 'domani' : `tra ${days(daysToNextIncome)}`;
    return { intent: 'payday', text: `La prossima entrata è prevista ${when}, il ${fmtDate(nextIncomeAt)}. Da qui ad allora hai ${eur(freeUntilNext)} liberi, circa ${eur0(dailyQuota)} al giorno.` };
  }

  // 3) ARRIVO A FINE MESE / ALLA PAGA
  if (has(q, /fine mese|fine del mese|fino a fine|chiud.*mese|arriv.*fine|come (sto |sono )?messo.*mese|arriv.*(alla |all')?paga|fino alla paga|c[ei] la faccio/)) {
    if (!eomOk) return { intent: 'eom', text: 'Non ho ancora abbastanza dati per la previsione. Aggiorna saldo ed entrate.' };
    return { intent: 'eom', text: eomText({ eom, horiz }) };
  }

  // PROSSIME USCITE / ABBONAMENTI: "cosa pago questa settimana?"
  if (has(q, /cosa (pago|devo pagar|mi addebit|esce|mi esce)|prossim.*(uscit|addebit)|abbonament|uscite (di |della |questo |questa )?(settimana|mese)|che (spese|uscite).*(settimana|mese)|spese fisse|cosa scade/)) {
    const week = has(q, /settiman/);
    const list = week ? upcoming.filter((u) => u.inDays <= 7) : upcoming;
    if (!list.length) {
      return { intent: 'upcoming', text: week ? 'Nei prossimi 7 giorni non hai uscite ricorrenti in programma.' : 'Da qui a fine mese non hai altre uscite ricorrenti in programma.' };
    }
    const when = (u) => u.inDays === 0 ? 'oggi' : u.inDays === 1 ? 'domani' : `tra ${days(u.inDays)}`;
    const top = list.slice(0, 3).map((u) => `${u.label} ${eur(u.amount)} (${when(u)})`).join(', ');
    const tot = week ? upcomingWeek : upcomingMonth;
    const more = list.length > 3 ? ` e altre ${list.length - 3}` : '';
    return { intent: 'upcoming', text: `${week ? 'Questa settimana' : 'Da qui a fine mese'} ti addebitano ${eur(tot)}: ${top}${more}.` };
  }

  // 4) RISPARMIO / OBIETTIVO MENSILE
  if (has(q, /risparmi|conserv|metto.*via|da parte|tengo.*parte/)) {
    if (savingsTarget <= 0) return { intent: 'savings', text: 'Non hai ancora scelto quanto conservare al mese. Tocca la pillola sotto il saldo nell\'hero per impostarlo.' };
    if (!eomOk) return { intent: 'savings', text: `Vuoi conservare ${eur0(savingsTarget)} al mese. Aggiorna saldo ed entrate per sapere se sei in linea.` };
    return {
      intent: 'savings',
      text: eom >= -0.005
        ? `Sì, sei in linea: dopo aver messo via i ${eur0(savingsTarget)}, ${horiz} ti restano ancora ${eur0(eom)} liberi.`
        : `Attenzione: di questo passo non riesci a tenere i ${eur0(savingsTarget)} per intero — ${horiz} saresti sotto di ${eur0(Math.abs(eom))}. Servirebbe tagliare un po' le spese.`,
    };
  }

  // 5) QUANTO HO DISPONIBILE
  if (has(q, /disponibil|quanto ho|quanto posso spend|quanto mi resta|quanto rimane|libero|saldo/)) {
    return { intent: 'available', text: `Adesso hai ${eur(freeUntilNext)} disponibili da spendere${daysToNextIncome ? ` nei prossimi ${daysToNextIncome} ${daysToNextIncome === 1 ? 'giorno' : 'giorni'}` : ''} — circa ${eur0(dailyQuota)} al giorno.` };
  }

  // 6) AIUTO / SALUTO
  if (has(q, /ciao|aiut|cosa sai|cosa puoi|come funzioni|chi sei/)) {
    return { intent: 'help', text: 'Faccio i conti per te, qui sul telefono. Posso dirti: quanto puoi spendere; quanto hai speso (anche per categoria); una spesa a rate (con anticipo e tasso); quanto avrai sul conto tra mesi o anni; tra quanto raggiungi un obiettivo o quanto mettere via al mese; quando arriva la paga; cosa paghi a breve. Provami: "posso permettermi una macchina da 25 mila a rate in 5 anni al 6%?".' };
  }

  // FALLBACK
  return { intent: 'fallback', text: 'Non ho afferrato. Prova così: "posso permettermi 25 mila a rate in 5 anni al 6%?", "quanto avrò tra un anno?", "tra quanto raggiungo 5000?", "quanto ho speso in cibo?".' };
}

// ─── NLG: "posso permettermi X?" ───────────────────────────────────
// `eom` = liberi a fine mese (cuscinetto + salvadanaio + accantonamento già esclusi).
// Soglia unica: dopo la spesa resti ≥ 0 (ok) o vai sotto (intacchi i risparmi).
function affordText(amount, { freeUntilNext, eom, eomOk, horiz = 'da qui alla paga' }) {
  const a = eur(amount);
  if (!eomOk) {
    return amount <= freeUntilNext
      ? `Sì: rientra nei ${eur(freeUntilNext)} liberi di adesso.`
      : `È più dei ${eur(freeUntilNext)} liberi di adesso. Aggiorna saldo ed entrate e ti dico l'impatto sul periodo.`;
  }
  const after = eom - amount;
  if (after >= -0.005) {
    const note = amount > freeUntilNext ? ` (è più del libero di adesso, ${eur(freeUntilNext)}, ma rientri col resto del periodo)` : '';
    return `Sì, te lo puoi permettere${note}. Dopo, ${horiz} ti restano ${eur0(after)} liberi.`;
  }
  return `Rischioso: ${a} ti porterebbe sotto di ${eur0(Math.abs(after))} ${horiz}, intaccando cuscinetto o risparmi. Se puoi, rimanda.`;
}

// ─── NLG: spesa a rate / finanziamento (da amortize) ───────────────
// La rata è un impegno fisso mensile: se i "liberi a fine mese" la reggono (≥0) è sostenibile.
function financingText(am, { eom, eomOk, rateGiven, horiz = 'da qui alla paga' }) {
  const parts = [];
  if (am.downPayment > 0) parts.push(`anticipo ${eur0(am.downPayment)}`);
  if (am.totalInterest > 0) parts.push(`interessi ${eur0(am.totalInterest)}`);
  parts.push(`in tutto ${eur0(am.totalPaid)}`);
  let head = `Sono circa ${eur0(am.monthly)} al mese per ${monthsWord(am.months)} (${parts.join(', ')}). `;
  if (!rateGiven) head += 'Stima a tasso 0: dimmi il tasso (es. "tasso 6%") per il calcolo esatto. ';
  if (!eomOk) return head + 'Aggiorna saldo ed entrate e ti dico se la rata è sostenibile.';
  const after = eom - am.monthly;
  if (after < -0.005) return head + `Pesante: la rata ti porterebbe sotto di ${eur0(Math.abs(after))} ${horiz}, intaccando cuscinetto o risparmi.`;
  return head + `Sostenibile: anche con la rata, ${horiz} ti restano ${eur0(after)} liberi.`;
}

// ─── NLG: "arrivo a fine mese / alla paga?" — eom = liberi nel ciclo (risparmi esclusi) ──
function eomText({ eom, horiz = 'da qui alla paga' }) {
  if (eom < -0.005) return `Di questo passo, ${horiz} vai sotto di ${eur0(Math.abs(eom))}: intaccheresti cuscinetto o risparmi. Meglio rallentare le spese.`;
  return `Bene: ${horiz} ti restano circa ${eur0(eom)} liberi, oltre a cuscinetto e risparmi.`;
}
