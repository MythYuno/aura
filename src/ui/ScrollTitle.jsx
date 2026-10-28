/**
 * Il titolo grande che collassa in una barra compatta scorrendo, come fa iOS.
 *
 * In iOS 27 il bordo di scorrimento è "duro": non il gradiente morbido di
 * iOS 26, ma vetro sfocato con una linea sotto.
 *
 * Si ascolta lo scorrimento del contenitore, non un IntersectionObserver: con
 * un elemento `sticky` dentro un contenitore che scorre, la radice implicita
 * dell'osservatore non è quella giusta e il cambio di stato non arriva mai.
 */

import { useEffect, useRef, useState } from 'react';

const COLLAPSE_AT = 44;

function scrollParent(node) {
  let el = node?.parentElement;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
    el = el.parentElement;
  }
  return document.scrollingElement ?? document.documentElement;
}

export function ScrollTitle({ title, subtitle }) {
  const anchor = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const scroller = scrollParent(anchor.current);
    if (!scroller) return undefined;

    const onScroll = () => setStuck(scroller.scrollTop > COLLAPSE_AT);
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div
        className="sticky top-0 z-10 flex h-11 items-center justify-center text-[17px] font-semibold"
        style={{
          letterSpacing: '-0.022em',
          background: stuck ? 'var(--glass)' : 'transparent',
          backdropFilter: stuck ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: stuck ? 'blur(20px)' : 'none',
          borderBottom: `1px solid ${stuck ? 'var(--glass-border)' : 'transparent'}`,
          opacity: stuck ? 1 : 0,
          // visibility e non solo opacity: così il titolo compatto non resta
          // nel testo della pagina (né per uno screen reader) quando è spento.
          visibility: stuck ? 'visible' : 'hidden',
          transition: 'opacity .18s ease-out',
          marginBottom: -44,
          pointerEvents: 'none',
        }}
      >
        {title}
      </div>

      <header ref={anchor} className="px-5 pt-1">
        <h1 className="text-[34px] font-bold leading-[41px]" style={{ letterSpacing: '-0.026em' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] leading-5" style={{ color: 'var(--label-2)' }}>
            {subtitle}
          </p>
        )}
      </header>
    </>
  );
}
