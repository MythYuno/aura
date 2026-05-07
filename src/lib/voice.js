// Web Speech API wrapper. Italian by default. Offline-capable on browsers that
// support on-device recognition (Chrome desktop, Safari iOS).
// Returns null if the API isn't available.

const Recognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export const isVoiceSupported = () => !!Recognition;

/**
 * Start a one-shot recognition. Resolves with the transcript or rejects with
 * the error event reason. Caller may call .stop() on the returned controller
 * to abort early.
 */
export const startVoiceCapture = ({ lang = 'it-IT', onPartial } = {}) => {
  if (!Recognition) return Promise.reject(new Error('not-supported'));
  const rec = new Recognition();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = !!onPartial;
  rec.maxAlternatives = 1;

  let settled = false;
  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) {
        settled = true;
        resolve(last[0].transcript.trim());
      } else if (onPartial) {
        onPartial(last[0].transcript);
      }
    };
    rec.onerror = (e) => {
      if (settled) return;
      settled = true;
      reject(new Error(e.error || 'unknown'));
    };
    rec.onend = () => {
      if (!settled) {
        settled = true;
        reject(new Error('no-speech'));
      }
    };
  });
  rec.start();
  return { promise, stop: () => { try { rec.stop(); } catch {} } };
};

/**
 * Heuristic parser: pulls amount + free description out of a sentence.
 * "ho speso 12 euro al bar"  → { amount: 12, label: 'al bar' }
 * "15 euro 50 di benzina"    → { amount: 15.50, label: 'di benzina' }
 * "tre caffè"                 → { amount: null, label: 'tre caffè' }
 */
const NUMBER_WORDS = {
  zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6,
  sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12,
  tredici: 13, quattordici: 14, quindici: 15, venti: 20, trenta: 30,
  quaranta: 40, cinquanta: 50,
};

export const parseVoiceCommand = (text) => {
  if (!text) return { amount: null, label: '' };
  let normalized = String(text).toLowerCase().trim();
  // "12 e 50" / "12,50" / "12.50" → 12.50
  normalized = normalized.replace(/(\d+)[,.\s]+(?:e\s+)?(\d{1,2})\b/g, (_, a, b) => {
    return `${a}.${b.length === 1 ? b + '0' : b}`;
  });

  // numeric amount: prefer integers/decimals
  let amount = null;
  const numMatch = normalized.match(/(\d+(?:\.\d{1,2})?)\s*(?:€|euro|eur)?/);
  if (numMatch) amount = parseFloat(numMatch[1]);

  // word-based amount fallback
  if (amount === null) {
    const tokens = normalized.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      if (NUMBER_WORDS[tokens[i]] !== undefined) {
        amount = NUMBER_WORDS[tokens[i]];
        break;
      }
    }
  }

  // strip filler verbs + amount + currency for the label
  let label = normalized
    .replace(/\b(ho speso|spendo|pagato|pago|preso)\b/g, '')
    .replace(/(\d+(?:\.\d{1,2})?)\s*(?:€|euro|eur)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // strip leading "di" / "per"
  label = label.replace(/^(di|per|al|alla|allo|in)\s+/, '');

  return {
    amount: amount && amount > 0 ? amount : null,
    label,
  };
};
