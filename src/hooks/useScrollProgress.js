import { useState, useEffect } from 'react';

/**
 * Track scroll progress (0-1) of a container element.
 */
export const useScrollProgress = (ref) => {
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const el = ref?.current || window;
    const getScroll = () => {
      if (el === window) {
        const h = document.documentElement;
        const scrolled = window.scrollY;
        const max = h.scrollHeight - h.clientHeight;
        return { scrolled, pct: max > 0 ? scrolled / max : 0 };
      }
      const scrolled = el.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      return { scrolled, pct: max > 0 ? scrolled / max : 0 };
    };

    const handler = () => {
      const { scrolled, pct } = getScroll();
      setProgress(pct);
      setScrollY(scrolled);
    };

    el.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, [ref]);

  return { progress, scrollY };
};
