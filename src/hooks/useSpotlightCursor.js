import { useEffect } from 'react';

/**
 * Attaches mousemove listener that updates CSS variables --mouse-x/--mouse-y
 * on elements with the .spotlight class. Only active on desktop (hover-capable).
 */
export const useSpotlightCursor = () => {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;

    const handler = (e) => {
      const target = e.target?.closest?.('.spotlight');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      target.style.setProperty('--mouse-x', `${x}%`);
      target.style.setProperty('--mouse-y', `${y}%`);
    };

    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);
};
