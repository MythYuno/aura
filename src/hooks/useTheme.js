import { useEffect, useRef } from 'react';
import { applyTheme } from '../data/themes.js';

const mq = () => (typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null);

/** 'auto' → quello che dice il telefono; 'light'/'dark' → forzato. */
export const resolveMode = (mode) => {
  if (mode === 'light' || mode === 'dark') return mode;
  return mq()?.matches ? 'dark' : 'light';
};

/**
 * Hook tema (chiaro/scuro applicato a runtime).
 *
 * v0.15: la modalità può essere 'auto' — segue l'impostazione di sistema e
 * cambia al volo se l'utente passa a scuro dal telefono (o all'ora del
 * tramonto, se ha il passaggio automatico di iOS).
 *
 * v0.8.1: dopo il primo paint aggiungiamo `theme-anim` su <html> così i cambi
 * successivi sono morbidi. Il primo paint NON deve animare.
 */
export const useTheme = (themeId, mode = 'auto') => {
  const isFirstRunRef = useRef(true);
  useEffect(() => {
    applyTheme(themeId, resolveMode(mode));
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      requestAnimationFrame(() => {
        document.documentElement.classList.add('theme-anim');
      });
    }
    // In 'auto' resto in ascolto del sistema finché la modalità non cambia.
    if (mode === 'light' || mode === 'dark') return undefined;
    const m = mq();
    const onChange = () => applyTheme(themeId, resolveMode('auto'));
    // Safari < 14 non ha addEventListener su MediaQueryList.
    if (m) {
      if (m.addEventListener) m.addEventListener('change', onChange);
      else m.addListener(onChange);
    }
    // Rete di sicurezza: ricontrollo quando l'app torna in primo piano. Serve
    // ai casi in cui l'evento 'change' non arriva — PWA iOS rimasta in secondo
    // piano mentre il telefono passava a scuro, o WebView che non lo emette.
    const onVis = () => { if (document.visibilityState === 'visible') onChange(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (!m) return;
      if (m.removeEventListener) m.removeEventListener('change', onChange);
      else m.removeListener(onChange);
    };
  }, [themeId, mode]);
};
