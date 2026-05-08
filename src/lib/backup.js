import { STORAGE_KEY } from './storage.js';

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
      version: parsed.version || 'legacy',
    },
  };
};

export const applyBackup = (data) => {
  // Reset transient flags (tutorial seen, privacy) so the imported profile
  // gets a fresh first-run experience. Persistent prefs (themeId/theme) are
  // preserved as-is.
  const cleaned = {
    ...data,
    tutorialState: {},
    tutorialSeen: false,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
};
