import { useState, useEffect } from 'react';

export const useBreakpoint = () => {
  const get = () => {
    if (typeof window === 'undefined') return 'mobile';
    const w = window.innerWidth;
    if (w >= 1024) return 'desktop';
    if (w >= 640) return 'tablet';
    return 'mobile';
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const handler = () => setBp(get());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return bp;
};
