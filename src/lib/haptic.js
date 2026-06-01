/**
 * Wrapper sull'API Vibration. Senza throttle, tap multipli rapidi (es. +/- in
 * un counter, swipe-rapidi) facevano spammare il motore vibrazione → fastidio
 * fisico e potenzialmente confondente. Throttle 50ms blocca i burst senza
 * compromettere il singolo feedback.
 *
 * Nota iOS: l'API Vibration NON è supportata su Safari iOS (mai sarà). Per
 * Capacitor v0.9+ aggiungeremo @capacitor/haptics che chiama UIImpactFeedback
 * nativo. Per ora su iPhone PWA il modulo è no-op silenzioso.
 */
let _lastHaptic = 0;
const THROTTLE_MS = 50;

export const haptic = (type = 'light') => {
  if (!('vibrate' in navigator)) return;
  const now = Date.now();
  if (now - _lastHaptic < THROTTLE_MS) return;
  _lastHaptic = now;
  const patterns = {
    light: 10,
    medium: 15,
    heavy: 25,
    success: [10, 40, 10],
    warning: [15, 80, 15],
    error: [30, 50, 30],
    milestone: [20, 30, 20, 30, 40],
  };
  try { navigator.vibrate(patterns[type] || 10); } catch (e) {}
};
