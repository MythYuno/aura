import { useState, useRef, useEffect } from 'react';
import { DynIcon } from './DynIcon.jsx';
import { haptic } from '../../lib/haptic.js';

export const SwipeRow = ({ children, actions = [], id, activeId, setActiveId, threshold = 60 }) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const moving = useRef(false);
  const isActive = activeId === id;

  useEffect(() => {
    if (!isActive) setOffset(0);
  }, [isActive]);

  const onStart = (e) => {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    moving.current = true;
  };
  const onMove = (e) => {
    if (!moving.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - startX.current;
    const maxSwipe = actions.length * 68;
    if (dx < 0) setOffset(Math.max(dx, -maxSwipe));
    else if (isActive && offset < 0) setOffset(Math.min(0, offset + dx));
  };
  const onEnd = () => {
    moving.current = false;
    if (offset < -threshold) {
      setOffset(-actions.length * 68);
      setActiveId(id);
    } else {
      setOffset(0);
      setActiveId(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-1.5">
      <div className="absolute top-0 right-0 bottom-0 flex items-center gap-1 pr-1 z-[1]">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => { haptic('medium'); a.onClick(); setOffset(0); setActiveId(null); }}
            style={{ background: a.bg || 'var(--red)' }}
            className="h-[calc(100%-8px)] my-1 min-w-[64px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-white text-[10px] font-bold"
          >
            {a.icon && <DynIcon name={a.icon} size={16} />}
            {a.label}
          </button>
        ))}
      </div>
      <div
        style={{ transform: `translateX(${offset}px)` }}
        className="transition-transform duration-300 ease-out bg-bg-2 backdrop-blur-2xl border border-bd-1 rounded-2xl relative z-[2]"
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
      >
        {children}
      </div>
    </div>
  );
};
