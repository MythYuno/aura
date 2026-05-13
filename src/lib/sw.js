/**
 * Service-worker registration with update detection.
 *
 * The browser checks for sw.js updates on every navigation, but for a PWA
 * left open for hours, that doesn't fire. We poll once on load and every
 * 30 minutes after. When a new SW finishes installing, we surface an
 * "update available" event the UI can show as a toast.
 */
export const registerSW = (onUpdate) => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register('./sw.js');
    } catch {
      return;
    }

    // First-time fallback: if there's already a waiting worker, surface it now
    if (reg.waiting && navigator.serviceWorker.controller) {
      onUpdate?.(() => activate(reg.waiting));
    }

    // Listen for any new install events
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          onUpdate?.(() => activate(sw));
        }
      });
    });

    // Poll every 30 minutes — covers PWAs left open for a long time
    const POLL = 30 * 60 * 1000;
    setInterval(() => { reg.update().catch(() => {}); }, POLL);

    // Also check when the app comes back into focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  });
};

const activate = (sw) => {
  if (!sw) return;
  sw.postMessage({ type: 'SKIP_WAITING' });
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => { window.location.reload(); },
    { once: true }
  );
};
