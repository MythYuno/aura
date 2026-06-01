import { STORAGE_KEY, save } from './storage.js';

const BACKUP_VERSION = 1;

const REQUIRED_FIELDS = [
  'name', 'salary', 'resetDay', 'cats', 'txs', 'fixed',
  'widgets', 'theme', 'themeId',
];

export const exportBackup = (filename) => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = raw ? JSON.parse(raw) : {};
  const payload = {
    app: 'AURA',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename || `aura-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const looksLikeAuraData = (d) => {
  if (!d || typeof d !== 'object') return false;
  const present = REQUIRED_FIELDS.filter((f) => f in d);
  return present.length >= 4;
};

export const parseBackupFile = (text) => {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('File non valido (JSON corrotto)'); }

  // Tolerate two shapes: a wrapped backup ({ app, data, ... }) or a raw aura state.
  let data = null;
  if (parsed && typeof parsed === 'object') {
    if (parsed.app === 'AURA' && parsed.data) data = parsed.data;
    else if (looksLikeAuraData(parsed)) data = parsed;
  }
  if (!data) throw new Error('Non sembra un backup AURA');

  // v0.8.1: warning per backup di una versione futura sconosciuta. Non
  // blocchiamo l'import (degradazione: l'utente potrebbe avere installato
  // una versione più vecchia su un altro device) ma flagghiamo nel summary.
  const fileVersion = parsed.version || 'legacy';
  const isFutureVersion = typeof fileVersion === 'number' && fileVersion > BACKUP_VERSION;

  return {
    data,
    summary: {
      txs: Array.isArray(data.txs) ? data.txs.length : 0,
      cats: Array.isArray(data.cats) ? data.cats.length : 0,
      fixed: Array.isArray(data.fixed) ? data.fixed.length : 0,
      subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions.length : 0,
      dreams: Array.isArray(data.dreams) ? data.dreams.length : 0,
      name: data.name || '—',
      salary: data.salary || 0,
      version: fileVersion,
      isFutureVersion,
      warning: isFutureVersion
        ? `Backup di una versione più recente (${fileVersion}) della tua AURA (${BACKUP_VERSION}). Alcuni dati potrebbero non essere supportati.`
        : null,
    },
  };
};

/**
 * Deep-sanitize per backup importato. Difesa in profondità contro:
 *  - prototype pollution (`__proto__`, `constructor`, `prototype` as keys)
 *  - XSS via label/description/note salvate con <script> o <img onerror>
 *  - stringhe troppo lunghe (DoS via 10MB di label)
 * React già escape automaticamente nel rendering, ma se in futuro qualche
 * componente dovesse fare `innerHTML` siamo coperti comunque.
 */
const SAFE_STR_LEN = 200;
const sanitizeStr = (s) => typeof s === 'string'
  ? s.replace(/[<>]/g, '').slice(0, SAFE_STR_LEN)
  : s;
const sanitizeItemArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    // JSON parse/stringify rimuove __proto__ e altri property pericolosi
    const cleaned = JSON.parse(JSON.stringify(item));
    // Sanitize i campi testuali noti
    for (const k of ['label', 'description', 'note', 'name']) {
      if (cleaned[k] != null) cleaned[k] = sanitizeStr(cleaned[k]);
    }
    return cleaned;
  });
};

export const applyBackup = (data) => {
  // Step 1: deep-clone per strippare __proto__ e prototype pollution
  let cleaned;
  try {
    cleaned = JSON.parse(JSON.stringify(data || {}));
  } catch {
    cleaned = {};
  }
  // Step 2: sanitize arrays con testo utente
  for (const key of ['txs', 'cats', 'fixed', 'subscriptions', 'annualExpenses',
                     'incomes', 'wishes', 'extraIncomes', 'accounts', 'goals']) {
    if (cleaned[key]) cleaned[key] = sanitizeItemArray(cleaned[key]);
  }
  if (typeof cleaned.name === 'string') cleaned.name = sanitizeStr(cleaned.name);
  // Step 3: reset transient flags (tutorial, privacy) per fresh first-run
  cleaned.tutorialState = {};
  cleaned.tutorialSeen = false;
  // Migration v0.7 → v0.8: i backup vecchi non hanno currentBalance/incomes/cushion.
  // Li deriviamo dal modello legacy (salary/resetDay/buffer) cosi il nuovo
  // calcolo balance-first funziona subito dopo il restore.
  if (cleaned.currentBalance == null && (cleaned.salary || 0) > 0) {
    cleaned.currentBalance = cleaned.salary;
  }
  if (!Array.isArray(cleaned.incomes) || cleaned.incomes.length === 0) {
    if ((cleaned.salary || 0) > 0) {
      cleaned.incomes = [{
        id: 'inc_salary_legacy',
        label: 'Stipendio',
        amount: cleaned.salary,
        dayOfMonth: Math.min(28, Math.max(1, parseInt(cleaned.resetDay) || 1)),
        kind: 'salary',
        active: true,
      }];
    } else {
      cleaned.incomes = [];
    }
  }
  if (cleaned.cushion == null) {
    cleaned.cushion = Math.round(((cleaned.salary || 0) * (cleaned.buffer ?? 10)) / 100);
  }
  // v0.8.1: usa save() invece di setItem diretto cosi se quota piena l'utente
  // vede il toast 'aura:storage-error' (App.jsx ascolta l'evento).
  save(cleaned);
};
