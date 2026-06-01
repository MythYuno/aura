// Browser Notification API wrapper — promemoria per fissi/abbonamenti
// in scadenza nei prossimi 3 giorni. Senza server (l'app è offline-only):
// usiamo solo notifiche locali innescate quando l'utente apre AURA.
//
// Anti-spam: salviamo la data dell'ultima notifica per item, così non
// inviamo lo stesso promemoria 10 volte nello stesso giorno.
//
// L'utente deve dare permesso esplicito. Se non l'ha dato (o l'ha
// negato), il modulo è un no-op silenzioso.

const STORAGE_KEY = 'aura_notif_log_v1';

const isSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window;

/**
 * Stato attuale del permesso. Ritorna:
 *  - 'unsupported' (browser senza API)
 *  - 'default'     (non chiesto)
 *  - 'granted'     (sì)
 *  - 'denied'      (no, e non chiediamo più)
 */
export const notificationStatus = () => {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Chiede il permesso. Da chiamare in risposta a un'azione utente
 * (click su "Attiva promemoria" nelle impostazioni) — i browser non
 * lasciano chiedere all'avvio.
 */
export const requestNotificationPermission = async () => {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return 'denied';
  }
};

const loadLog = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLog = (log) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch {}
};

/**
 * Stringa giorno corrente 'YYYY-MM-DD' — usata come chiave anti-spam.
 */
const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const x = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${x}`;
};

/**
 * Trova fissi/abbonamenti che scadono entro `daysAhead` giorni dalla data
 * passata. Non considera quelli già notificati oggi.
 */
const findUpcoming = ({ fixed = [], subscriptions = [], daysAhead = 3, today = new Date() }) => {
  const log = loadLog();
  const tk = todayKey(today);
  const todayDate = today.getDate();
  const items = [
    ...fixed.filter((f) => f.active !== false).map((f) => ({ ...f, _kind: 'fixed' })),
    ...subscriptions.filter((s) => s.active !== false).map((s) => ({ ...s, _kind: 'sub' })),
  ];
  const out = [];
  for (const it of items) {
    const day = Math.min(28, Math.max(1, parseInt(it.deductDay || it.dayOfMonth || 1)));
    let diff = day - todayDate;
    if (diff < 0) diff += 30;
    if (diff < 0 || diff > daysAhead) continue;
    const itemKey = `${it.id}_${tk}`;
    if (log[itemKey]) continue; // già notificato oggi
    out.push({ ...it, _daysUntil: diff, _key: itemKey });
  }
  return { items: out.sort((a, b) => a._daysUntil - b._daysUntil), log, tk };
};

/**
 * Mostra una sola notifica raggruppata se ci sono >1 scadenze. Idempotente:
 * se chiamata 2× nello stesso giorno, non duplica.
 *
 * Da chiamare nel useEffect di App.jsx all'avvio (silenziosa se permesso non dato).
 */
export const notifyUpcomingDeductions = ({ fixed = [], subscriptions = [], daysAhead = 3, today = new Date(), genericText = false }) => {
  if (!isSupported() || Notification.permission !== 'granted') return null;
  const { items, log } = findUpcoming({ fixed, subscriptions, daysAhead, today });
  if (items.length === 0) return null;

  // Modalità "generica": niente importi nel body della notifica (privacy
  // sul lockscreen — utile se il telefono finisce in mano ad altri).
  // Esempi:
  //   generic=false (default): "Affitto in scadenza · Tra 3 giorni: €650"
  //   generic=true:           "1 pagamento in scadenza · Tra 3 giorni"
  const title = items.length === 1
    ? `${genericText ? 'Pagamento' : items[0].label} in scadenza`
    : `${items.length} pagamenti in scadenza`;

  const body = items.length === 1
    ? `${items[0]._daysUntil === 0 ? 'Oggi' : items[0]._daysUntil === 1 ? 'Domani' : `Tra ${items[0]._daysUntil} giorni`}${genericText ? '' : `: €${items[0].amount}`}`
    : items.slice(0, 3).map((it) => {
        const w = it._daysUntil === 0 ? 'oggi' : it._daysUntil === 1 ? 'domani' : `+${it._daysUntil}gg`;
        return genericText ? `${w}` : `${it.label} ${w} €${it.amount}`;
      }).join(' · ');

  try {
    const n = new Notification(title, {
      body,
      icon: './icon.svg',
      badge: './icon.svg',
      tag: 'aura-upcoming',
      silent: false,
      requireInteraction: false,
    });
    // Mark all as notified today
    items.forEach((it) => { log[it._key] = Date.now(); });
    // Cleanup log: tieni solo le chiavi degli ultimi 14 giorni
    const cutoff = Date.now() - 14 * 864e5;
    Object.keys(log).forEach((k) => { if (log[k] < cutoff) delete log[k]; });
    saveLog(log);
    return n;
  } catch (e) {
    return null;
  }
};

/**
 * Reset del log notifiche — utile dal Setup, se l'utente vuole ricevere
 * di nuovo i promemoria già visti.
 */
export const clearNotificationLog = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};
