import { useEffect, useCallback } from 'react';
import { themes } from '../data/themes.js';

export const useTheme = (themeId, mode) => {
  useEffect(() => {
    const theme = themes[themeId] || themes.aurora;
    const root = document.documentElement;

    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.setAttribute('data-theme', theme.id);

    const applyMode = (m) => {
      if (m === 'auto') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-mode', isDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-mode', m);
      }
    };

    applyMode(mode);

    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyMode('auto');
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, [themeId, mode]);
};

/**
 * Animated theme toggle using View Transitions API.
 * Falls back to instant toggle on unsupported browsers.
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
        {
          duration: 500,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  }, [setMode]);
};
