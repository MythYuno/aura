import { useState, useEffect } from 'react';

/**
 * Hook breakpoint reattivo.
 *
 * v0.8.1: aggiunto `orientationchange` listener. Su alcuni iPad/iPhone la
 * rotazione del device fira orientationchange ma il resize ritarda di
 * frazioni di secondo (o non scatta affatto in certi browser PWA),
 * lasciando la tab bar in modalità sbagliata per qualche istante.
 * Ora ricalcoliamo subito alla rotazione.
 */
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
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  return bp;
};
