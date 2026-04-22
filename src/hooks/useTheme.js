import { useEffect, useCallback } from 'react';
import { applyTheme } from '../data/themes.js';

export const useTheme = (themeId, mode) => {
  useEffect(() => {
    applyTheme(themeId, mode);

    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme(themeId, 'auto');
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, [themeId, mode]);
};

/**
 * Animated theme toggle via View Transitions API.
 * Radial dissolve from click point. Falls back silently if unsupported.
 */
export const useAnimatedThemeToggle = (setMode) => {
  return useCallback((newMode, event) => {
    if (!document.startViewTransition) {
      setMode(newMode);
      return;
    }
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const transition = document.startViewTransition(() => setMode(newMode));
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0 at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        { duration: 550, easing: 'cubic-bezier(0.16,1,0.3,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }, [setMode]);
};
