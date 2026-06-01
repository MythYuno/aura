// ─────────────────────────────────────────────────────────────────────────
// INTELLIGENCE ENGINE — il terzo strato del "Financial Copilot".
//
//   Data → Prediction → [ INTELLIGENCE ] → UI / Copilot
//
// Trasforma i numeri (Data + Prediction) in INSIGHT comprensibili e PRIORITIZZATI.
// `buildInsightFeed()` è il cuore della home-assistente: una lista ordinata di
// insight { id, kind, priorità, urgenza, tono, icona, testo, azione? }. La UI
// mostra direttamente ciò che conta, l'utente non deve cercarlo.
// Funzioni pure. Nessuna AI, nessun side-effect.
// ─────────────────────────────────────────────────────────────────────────

import { realCost, round2, $n, $d } from '../format.js';
import { findAnomalies } from '../anomaly.js';
import { categoryHistoricalStats } from '../analytics.js';

// Re-export dei generatori storici (compatibilità + superficie unica).
export { dailyInsight } from '../insights.js';
export { findAnomalies, checkAnomaly } from '../anomaly.js';
export { computeInsights, suggestCategory } from '../intelligence.js';

const DAY = 864e5;
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
// Formattazione valuta = STESSI helper dell'app ($n/$d, locale it-IT) → il
// raggruppamento migliaia del feed combacia al carattere con hero e card.
// Importi ESATTI: decimali solo quando ci sono (€13,99 / €600). Niente arrotondamenti silenziosi.
// Negativi come -€1.134 (segno prima del simbolo), non €-1.134.
const fmt = (n) => {
  const r = round2(n);
  const whole = Math.abs(r % 1) < 0.005;
  return `${r < 0 ? '-' : ''}€${whole ? $n(Math.abs(r)) : $d(Math.abs(r))}`;
};
// Importi ARROTONDATI: per le STIME ("circa €X"), dove i centesimi sono rumore.
const eur0 = (n) => `${n < 0 ? '-' : ''}€${$n(Math.abs(n))}`;
const urgencyFor = (p) => (p >= 88 ? 'high' : p >= 58 ? 'med' : 'low');

/**
 * Costruisce il FEED di insight prioritizzato dalla situazione finanziaria.
 *
 * @param {object} ctx
 *   - txs, cats, fixed, subscriptions, goals : dati grezzi (Data Engine)
 *   - cushion                                : cuscinetto impostato
 *   - model                                  : output di computeFinance (Prediction)
 *   - now                                    : anchor "oggi"
 * @returns insight[] ordinati per rilevanza (max 5). Ogni insight:
 *   { id, kind, priority, urgency, tone, icon, text, action? }
 *   tone: 'risk' | 'warn' | 'good' | 'info'
 *   action: { label, target }  (es. target 'balance' | 'ask' | 'goal:<id>' | 'history:<cat>')
 */
export function buildInsightFeed(ctx = {}) {
  const {
    txs = [], cats = [], fixed = [], subscriptions = [], goals = [],
    cushion = 0, savingsTarget = 0, currentBalance = null, model = {}, now = new Date(),
  } = ctx;
  const out = [];
  const push = (o) => { if (o) out.push({ tone: 'info', urgency: urgencyFor(o.priority), ...o }); };

  // 1) RISCHIO CICLO — "liberi fino alla paga" (cuscinetto + risparmi già esclusi).
  // Negativo = di questo passo intacchi cuscinetto/risparmi. Il più importante.
  const free = model.freeAtEndOfCycle;
  const horizon = model.daysToNextIncome ? 'da qui alla paga' : 'a fine periodo';
  if (Number.isFinite(free) && free < -0.005) {
    const deep = free < -savingsTarget; // oltre i soldi che volevi accantonare
    push({
      id: 'eom-neg', kind: 'risk', priority: deep ? 96 : 90, tone: deep ? 'risk' : 'warn', icon: 'warning',
      text: savingsTarget > 0
        ? `Di questo passo, ${horizon} vai sotto di ${eur0(Math.abs(free))}: rischi di intaccare i ${eur0(savingsTarget)} che vuoi conservare.`
        : `Di questo passo, ${horizon} vai sotto di ${eur0(Math.abs(free))}: occhio al cuscinetto e alle prossime spese.`,
      action: { label: 'Cosa posso fare?', target: 'ask' },
    });
  }

  // 1b) SALDO GIÀ SOTTO IL CUSCINETTO (rischio reale, adesso)
  if (Number.isFinite(currentBalance) && cushion > 0 && currentBalance < cushion) {
    push({
      id: 'cushion-now', kind: 'risk', priority: 94, tone: 'risk', icon: 'warning',
      text: `Il saldo (${eur0(currentBalance)}) è sotto il tuo cuscinetto di ${eur0(cushion)}. Vai piano fino alla prossima entrata.`,
    });
  }

  // 2) ANOMALIA RECENTE (ultimi 7 giorni)
  const cutoff = startOfDay(now).getTime() - 7 * DAY;
  const anomalies = findAnomalies(txs).filter((a) => a.ts >= cutoff);
  if (anomalies.length) {
    const a = anomalies.reduce((b, x) => (!b || x._anomaly.multiple > b._anomaly.multiple ? x : b), null);
    const cat = cats.find((c) => c.id === a.cat);
    const mult = a._anomaly.multiple.toFixed(1).replace('.', ',');
    push({
      id: 'anomaly', kind: 'anomaly', priority: 86, tone: 'warn', icon: 'trend-up',
      text: `${a.label || cat?.label || 'Una spesa'}: ${fmt(realCost(a))}, ${mult}× la tua media.`,
    });
  }

  // 3) PROSSIMA USCITA RICORRENTE (entro 5 giorni)
  const todayD = startOfDay(now).getDate();
  let nearest = null;
  [
    ...fixed.filter((f) => f.active !== false),
    ...subscriptions.filter((s) => s.active !== false && (s.cadence || 'monthly') === 'monthly'),
  ].forEach((it) => {
    const day = Math.min(28, Math.max(1, parseInt(it.deductDay || it.dayOfMonth || 1)));
    let diff = day - todayD; if (diff < 0) diff += 30;
    if (diff >= 0 && diff <= 5 && (!nearest || diff < nearest.diff)) nearest = { it, diff };
  });
  if (nearest) {
    const when = nearest.diff === 0 ? 'oggi' : nearest.diff === 1 ? 'domani' : `tra ${nearest.diff} giorni`;
    push({
      id: 'upcoming', kind: 'upcoming', priority: 78, tone: 'info', icon: 'card',
      text: `${when.charAt(0).toUpperCase() + when.slice(1)} ti addebitano ${nearest.it.label}: ${fmt(nearest.it.amount)}.`,
    });
  }

  // 3b) PAGA IN ARRIVO (entro 3 giorni) — promemoria rassicurante
  if (model.daysToNextIncome != null && model.daysToNextIncome <= 3) {
    const d = model.daysToNextIncome;
    const when = d <= 1 ? 'domani' : `tra ${d} giorni`;
    push({
      id: 'income-soon', kind: 'income', priority: 64, tone: 'good', icon: 'sparkle',
      text: `La prossima entrata arriva ${when}. Ricordati di aggiornare il saldo quando la ricevi.`,
      action: { label: 'Aggiorna saldo', target: 'balance' },
    });
  }

  // 4) CATEGORIA SOPRA LA MEDIA (mese corrente vs storico)
  const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const hist = categoryHistoricalStats(txs, mk);
  const curByCat = {};
  txs.forEach((t) => {
    const d = new Date(t.ts);
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      curByCat[t.cat] = (curByCat[t.cat] || 0) + realCost(t);
    }
  });
  let topOver = null;
  cats.forEach((c) => {
    const cur = curByCat[c.id] || 0;
    const mean = hist[c.id]?.mean || 0;
    if (mean >= 20 && cur > mean * 1.2) {
      const pct = Math.round(((cur - mean) / mean) * 100);
      if (!topOver || pct > topOver.pct) topOver = { c, cur, pct };
    }
  });
  if (topOver) {
    push({
      id: 'cat-over', kind: 'category', priority: 66, tone: 'warn', icon: 'trend-up',
      text: `${topOver.c.label}: ${fmt(topOver.cur)} questo mese, +${topOver.pct}% sulla tua media.`,
      action: { label: 'Vedi', target: `history:${topOver.c.id}` },
    });
  }

  // 5) TREND (ultimi 7 giorni vs il "solito") — confronto LIKE-FOR-LIKE.
  // Niente settimana di calendario: di mercoledì confronterebbe 4 giorni con 7
  // e direbbe sempre "hai speso meno". Uso una finestra rolling di 7 giorni e,
  // come riferimento, la media giornaliera dei 28 giorni precedenti riportata a 7.
  const n0 = startOfDay(now).getTime();
  const last7 = txs
    .filter((t) => t.ts >= n0 - 6 * DAY && t.ts < n0 + DAY)
    .reduce((a, t) => a + realCost(t), 0);
  const baseDays = 28;
  const baseSum = txs
    .filter((t) => t.ts >= n0 - (7 + baseDays) * DAY && t.ts < n0 - 6 * DAY)
    .reduce((a, t) => a + realCost(t), 0);
  // Baseline minima: con un riferimento quasi nullo (mese precedente quasi vuoto)
  // la percentuale esplode (es. "1100%"). Sotto i ~20€/settimana la salto, e oltre
  // il 200% uso un testo qualitativo invece di un numero ridicolo.
  if (baseSum > 0) {
    const baseline7 = (baseSum / baseDays) * 7;
    if (baseline7 >= 20) {
      const diff = Math.round(((last7 - baseline7) / baseline7) * 100);
      if (Math.abs(diff) >= 15) {
        const less = diff < 0;
        const a = Math.abs(diff);
        const quant = a > 200 ? `molto ${less ? 'meno' : 'più'} del solito` : `il ${a}% in ${less ? 'meno' : 'più'} del solito`;
        push({
          id: 'week-trend', kind: 'trend', priority: less ? 54 : 60, tone: less ? 'good' : 'warn',
          icon: less ? 'trend-down' : 'trend-up',
          text: `Negli ultimi 7 giorni hai speso ${quant}.`,
        });
      }
    }
  }

  // 6) OBIETTIVO (quanto manca)
  if (goals.length) {
    const g = goals
      .map((x) => ({ ...x, pct: x.target > 0 ? Math.min(100, Math.round(((x.saved || 0) / x.target) * 100)) : 0 }))
      .sort((a, b) => b.pct - a.pct)[0];
    if (g && g.target > 0 && g.pct < 100) {
      const miss = round2(g.target - (g.saved || 0));
      const almost = g.pct >= 80; // ci sei quasi → tono celebrativo, più in alto
      push({
        id: 'goal-gap', kind: 'goal', priority: almost ? 58 : 52, tone: almost ? 'good' : 'info', icon: 'piggy',
        text: almost
          ? `Ci sei quasi! A "${g.label}" manca solo ${fmt(miss)} (sei al ${g.pct}%).`
          : `Per "${g.label}" ti mancano ${fmt(miss)} (sei al ${g.pct}%).`,
        action: { label: 'Metti via', target: `goal:${g.id}` },
      });
    }
  }

  // 6b) CONSERVAZIONE IN LINEA (positivo) — controcanto del rischio fine mese.
  if (savingsTarget > 0 && Number.isFinite(free) && free >= 0) {
    push({
      id: 'save-ontrack', kind: 'good', priority: 46, tone: 'good', icon: 'piggy',
      text: `Stai conservando bene: tieni da parte i ${eur0(savingsTarget)} e ${horizon} ti restano ancora ${eur0(free)} liberi.`,
    });
  }

  // 7) RITMO (informativo, fallback) — solo se c'è del libero da spendere.
  if (model.freeUntilNext > 0 && model.daysToNextIncome) {
    push({
      id: 'pace', kind: 'pace', priority: 36, tone: 'info', icon: 'sparkle',
      text: `Hai ${fmt(model.freeUntilNext)} liberi per ${model.daysToNextIncome} giorni — circa ${eur0(model.dailyQuota)} al giorno.`,
    });
  }

  out.sort((a, b) => b.priority - a.priority);
  if (!out.length) {
    out.push({ id: 'allgood', kind: 'good', priority: 10, urgency: 'low', tone: 'good', icon: 'sparkle', text: 'Tutto sotto controllo. Goditi la giornata.' });
  }
  return out.slice(0, 5);
}
