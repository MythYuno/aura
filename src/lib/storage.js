export const STORAGE_KEY = 'aura_v4';
const OLD_KEY = 'aura_v3';

export const load = () => {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Migrate from v3
    if (!raw) {
      const oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw) {
        localStorage.setItem(STORAGE_KEY, oldRaw);
        raw = oldRaw;
      }
    }
    if (!raw) return null;
    const data = JSON.parse(raw);

    // Clean up legacy 'savings' category if present
    if (data.cats && Array.isArray(data.cats)) {
      const hasSavings = data.cats.some((c) => c.id === 'savings');
      if (hasSavings) {
        data.cats = data.cats.filter((c) => c.id !== 'savings');
        const sum = data.cats.reduce((a, c) => a + (c.weight || 0), 0);
        if (sum > 0 && sum !== 100) {
          const factor = 100 / sum;
          data.cats = data.cats.map((c) => ({ ...c, weight: Math.round((c.weight || 0) * factor) }));
          const newSum = data.cats.reduce((a, c) => a + c.weight, 0);
          if (newSum !== 100 && data.cats.length > 0) {
            const diff = 100 - newSum;
            const maxId = data.cats.sort((a, b) => b.weight - a.weight)[0].id;
            data.cats = data.cats.map((c) => c.id === maxId ? { ...c, weight: c.weight + diff } : c);
          }
        }
      }
    }
    if (Array.isArray(data.widgets)) {
      data.widgets = data.widgets.filter((w) => w !== 'savings');
    }
    return data;
  } catch (e) {
    console.warn('Failed to load:', e);
    return null;
  }
};

export const save = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save:', e);
    // Notifica l'app del fallimento — App.jsx mostra un toast all'utente
    // così non perde modifiche senza accorgersene (es. quota localStorage
    // piena su iOS PWA, tipicamente 5-10 MB).
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('aura:storage-error', {
          detail: {
            code: e?.name || 'StorageError',
            message: e?.message || 'Save failed',
            quota: (e?.name === 'QuotaExceededError'),
          },
        }));
      } catch {}
    }
  }
};

export const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_KEY);
    // Cleanup di TUTTE le chiavi 'aura_*' note (e qualunque altra) cosi un
    // reset porta davvero allo stato di prima installazione.
    localStorage.removeItem('aura_changelog_seen_v1');
    localStorage.removeItem('aura_notif_log_v1');
    // Spazza ulteriori chiavi residue con prefix aura_ (es. future feature)
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('aura_')) localStorage.removeItem(k);
    }
  } catch (e) { console.warn('Failed to clear:', e); }
};
