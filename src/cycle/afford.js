/**
 * "Posso permettermelo?" — la risposta prima della spesa.
 *
 * È l'unico punto d'ingresso degli importi digitati: se un carattere strano
 * passa di qui, finisce nel bilancio. Per questo parseAmount rifiuta invece di
 * indovinare, e restituisce null su tutto ciò che non è un importo valido.
 */

const MAX_CENTS = 100000000; // un milione di euro

export function parseAmount(raw) {
  if (typeof raw !== 'string') return null;

  const s = raw.trim();
  if (!s) return null;
  if (!/^[0-9.,]+$/.test(s)) return null; // via segni, lettere, spazi interni
  if (/[.,]{2}/.test(s)) return null; // ",," e ".." sono battute a vuoto
  const commas = (s.match(/,/g) || []).length;
  if (commas > 1) return null;

  let intPart;
  let decPart = '';

  if (commas === 1) {
    // In italiano la virgola è sempre il decimale.
    const i = s.indexOf(',');
    intPart = s.slice(0, i);
    decPart = s.slice(i + 1);
    if (!/^\d*$/.test(decPart)) return null;
    decPart = decPart.slice(0, 2); // si tronca, non si arrotonda per eccesso
  } else {
    // Senza virgola, un punto solo seguito da una o due cifre è decimale
    // ("12.50"); in tutti gli altri casi i punti sono migliaia ("12.999").
    const dots = (s.match(/\./g) || []).length;
    const i = s.lastIndexOf('.');
    if (dots === 1 && /^\d{1,2}$/.test(s.slice(i + 1))) {
      intPart = s.slice(0, i);
      decPart = s.slice(i + 1);
    } else {
      intPart = s;
    }
  }

  intPart = intPart.replace(/\./g, '');
  if (intPart === '') intPart = '0'; // ",50" vale cinquanta centesimi
  if (!/^\d+$/.test(intPart)) return null;

  const cents = Number(intPart) * 100 + Number((decPart + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) return null;
  return cents;
}

export function evaluateAffordability(amountCents, budget) {
  const { left, daysLeft, perDay } = budget;
  const after = left - amountCents;

  if (after < 0) {
    return { verdict: 'no', newPerDay: 0, margin: 0, overBy: -after };
  }

  const newPerDay = after <= 0 ? 0 : Math.floor(after / daysLeft);
  // Sotto il giornaliero la spesa non intacca il ritmo: è un sì senza riserve.
  const verdict = amountCents <= perDay ? 'si' : 'siMaStringi';
  return { verdict, newPerDay, margin: after, overBy: 0 };
}

/**
 * Dove tagliare per rientrare: le categorie che stanno sopra la propria media
 * storica, dalla più sforata, fermandosi appena i tagli coprono lo sforamento.
 * Una categoria senza storia non si propone — non si taglia su un'abitudine
 * che non sappiamo ancora se esiste.
 */
export function suggestTrim(amountCents, budget, categoryStats) {
  const over = amountCents - budget.left;
  if (over <= 0) return [];

  const above = [...categoryStats.entries()]
    .filter(([, s]) => s.mean > 0 && s.current > s.mean)
    .map(([catId, s]) => ({ catId, excess: Math.round(s.current - s.mean) }))
    .sort((a, b) => b.excess - a.excess);

  const cuts = [];
  let need = over;
  for (const { catId, excess } of above) {
    if (need <= 0) break;
    const cutCents = Math.min(excess, need);
    cuts.push({ catId, cutCents });
    need -= cutCents;
  }
  return cuts;
}
