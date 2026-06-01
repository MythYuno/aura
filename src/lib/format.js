export const $n = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('it-IT');
};

export const $d = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0,00';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const moneyText = (n, decimals = 0) => {
  return decimals === 0 ? $n(n) : $d(n);
};

export const maskedMoney = (n, { privacy = false, decimals = 0 } = {}) => {
  if (privacy) return '***';
  return moneyText(n, decimals);
};

/**
 * round2: arrotonda a 2 decimali in modo sicuro contro errori binari IEEE 754.
 *
 * Esempio del bug evitato:
 *   0.1 + 0.2 === 0.30000000000000004  (non 0.3)
 *   12.005 (visualizzato) potrebbe essere 12.004999999...
 *
 * Tecnica: `+(value).toFixed(2)` arrotonda a 2 decimali (banker's rounding),
 * poi `+` riconverte a Number. Coerente con il formato monetario euro/centesimi.
 *
 * IMPORTANTE: questo SI APPLICA ad ogni somma/sottrazione sul currentBalance,
 * perché AURA è un'app finanziaria e accumulare errori binari su mesi di
 * operazioni può portare a 0,01€ di drift visibili all'utente.
 */
export const round2 = (n) => {
  if (!Number.isFinite(n)) return 0;
  // Evita -0 → 0
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r === 0 ? 0 : r;
};

/**
 * dayKeyLocal: numero intero che identifica univocamente un giorno NELL'ORA
 * LOCALE dell'utente.
 *
 * v0.8.1: BUGFIX. Prima `Math.floor(ts / 864e5)` veniva usato in 4 punti
 * (streak, heatmap, pulse, year-review) ma è day-index UTC. Per chi sta in
 * Italia (UTC+1/+2):
 *   - tx fatta alle 00:30 ITA del 2 gennaio (=23:30 UTC del 1 gennaio)
 *   - dKey UTC = day del 1 gen (sbagliato!)
 *   - dovrebbe essere day del 2 gen (è il giorno dell'utente)
 * Risultato: heatmap, streak e statistiche raggruppavano spese del giorno
 * sbagliato per le tx fatte tra mezzanotte e l'01/02:00 locali.
 *
 * Algoritmo: setHours(0,0,0,0) sposta a mezzanotte LOCALE, poi /864e5 dà
 * il day-index relativo a quella mezzanotte. Coerente con come UI mostra
 * le date all'utente.
 */
export const dayKeyLocal = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return Math.round(d.getTime() / 864e5);
};

export const parseNum = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : round2(v);
  if (!v) return 0;
  // Parser robusto: gestisce sia formato italiano "1.250,50" sia inglese
  // "1,250.50" sia malformato "1.250.50" (assume migliaia + decimale finale).
  //
  // Regola: l'ULTIMO separatore (, o .) determina:
  //   - se è seguito da 1-2 cifre → è il separatore decimale
  //   - se è seguito da 3+ cifre o nulla → tutti i separatori sono migliaia
  //
  // Test:
  //   "1.250,50" → 1250.5      "1,250.50" → 1250.5     "1.250.50" → 1250.5
  //   "1.000"    → 1000        "12,5"     → 12.5       "0,99"     → 0.99
  const stripped = String(v).replace(/[€\s]/g, '');
  const lastSep = Math.max(stripped.lastIndexOf(','), stripped.lastIndexOf('.'));
  if (lastSep === -1) {
    const n = parseFloat(stripped);
    return isNaN(n) ? 0 : n;
  }
  const afterSep = stripped.length - lastSep - 1;
  let normalized;
  if (afterSep === 1 || afterSep === 2) {
    // L'ultimo separatore è decimale; gli altri (qualsiasi) sono migliaia
    const intPart = stripped.slice(0, lastSep).replace(/[.,]/g, '');
    const decPart = stripped.slice(lastSep + 1);
    normalized = `${intPart}.${decPart}`;
  } else {
    // Tutti i separatori sono migliaia (es. "1.000" o "1,234,567")
    normalized = stripped.replace(/[.,]/g, '');
  }
  const n = parseFloat(normalized);
  if (isNaN(n)) return 0;
  // Cap di sicurezza contro scientific notation (es. "1e10") e import
  // assurdi: la spesa massima sensata e' €999.999.999 (1 miliardo).
  // Sopra: rifiuto silenzioso → 0. Sotto zero (input negativi): rifiuto.
  if (!Number.isFinite(n) || Math.abs(n) > 999999999) return 0;
  // v0.8.1: arrotonda a 2 decimali per evitare drift floating-point.
  // L'utente non scrive mai più di 2 decimali per gli euro; valori tipo
  // 12.3456 (es. da CSV malformato o splice diviso) vengono troncati.
  return round2(n);
};

/**
 * UID generator collision-free.
 *
 * v0.8.1: prima era `Date.now() + Math.floor(Math.random() * 1e6)` che poteva
 * collidere se due chiamate nello stesso ms generavano lo stesso random
 * (1/1M chance per ms — basso ma possibile sotto stress test, es. importi
 * CSV multipli). Risultato: React key warnings, possibili tx duplicate.
 *
 * Strategia ora: monotonic counter resettato ad ogni cambio di ms.
 * Garantisce 1000 ID univoci per millisecondo. Range numero:
 *   Date.now() ≈ 1.74e12 × 1000 = 1.74e15 < Number.MAX_SAFE_INTEGER (9e15) ✓
 */
let _uidLastTime = 0;
let _uidCounter = 0;
export const uid = () => {
  const now = Date.now();
  if (now === _uidLastTime) {
    _uidCounter = (_uidCounter + 1) % 1000;
  } else {
    _uidLastTime = now;
    _uidCounter = 0;
  }
  return now * 1000 + _uidCounter;
};

/**
 * Costo reale di una transazione.
 *
 * v0.8.1: BUGFIX CRITICO. Prima detraeva SEMPRE il credit, anche se non
 * ancora ricevuto. Risultato: totalSpent / CSV / weeklyInsight / streak
 * mostravano cifre fittizie più basse del vero costo finché il rimborso
 * non arrivava — incoerente con currentBalance (che era scalato del totale).
 *
 * Logica corretta:
 *  - credit > 0 e NON ricevuto → costo reale = amount (hai pagato tutto)
 *  - credit > 0 e ricevuto     → costo reale = amount - credit (netto)
 *  - credit = 0                → costo reale = amount
 */
export const realCost = (t) => {
  const amount = t?.amount || 0;
  const credit = t?.credit || 0;
  // v0.8.1: round2 sui ritorni per evitare drift quando il valore viene
  // sommato/sottratto da currentBalance. Es: credit=0.30000000000004
  // ritornato senza round avrebbe propagato l'errore binario.
  if (credit > 0 && !t?.creditReceived) return round2(Math.max(0, amount));
  return round2(Math.max(0, amount - credit));
};

export const cn = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Cadenze di ricorrenza per abbonamenti/rate.
 *
 * v0.8.1: prima TUTTI gli abbonamenti erano mensili (assumption hardcoded).
 * Bug UX: chi ha un'antivirus annuale, un'assicurazione semestrale o un
 * abbonamento trimestrale (es. Audible) non poteva rappresentarlo
 * correttamente. Doveva o saltarlo o registrarlo "mensilmente" sbagliando
 * tutti i calcoli mensili e annuali.
 *
 * CADENCE_MONTHS = numero di mesi tra un addebito e il successivo.
 *   weekly = ~0.23 (1 / 4.33 settimane per mese)
 *   monthly = 1, bimonthly = 2, quarterly = 3, ecc.
 */
export const CADENCE_MONTHS = {
  weekly: 12 / 52,    // 0.2307... = mesi per settimana
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export const CADENCE_LABEL = {
  weekly: 'settimanale',
  monthly: 'mensile',
  bimonthly: 'bimestrale',
  quarterly: 'trimestrale',
  semiannual: 'semestrale',
  annual: 'annuale',
};

export const CADENCE_LIST = ['weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'];

/**
 * Costo MENSILE equivalente di un abbonamento.
 * Es: €60 trimestrale → €20/mese. €120 annuale → €10/mese.
 */
export const monthlyEq = (amount, cadence = 'monthly') => {
  const m = CADENCE_MONTHS[cadence] || 1;
  if (m <= 0) return 0;
  return round2((amount || 0) / m);
};
