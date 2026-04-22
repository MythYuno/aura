import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DynIcon } from './DynIcon.jsx';
import { haptic } from '../../lib/haptic.js';

/**
 * Swipe row — actions hidden by default, reveal only during drag.
 * Uses Framer Motion drag constraint instead of manual pointer math.
 */
export const SwipeRow = ({ children, actions = [], id, activeId, setActiveId, threshold = 60 }) => {
  const isActive = activeId === id;
  const [dragX, setDragX] = useState(0);
  const constraintRef = useRef(null);
  const maxSwipe = Math.max(1, actions.length) * 72;

  useEffect(() => {
    if (!isActive) setDragX(0);
  }, [isActive]);

  // Close on tap outside
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      if (constraintRef.current && !constraintRef.current.contains(e.target)) {
        setDragX(0);
        setActiveId(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [isActive, setActiveId]);

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    if (offset < -threshold) {
      setDragX(-maxSwipe);
      setActiveId(id);
      haptic('light');
    } else {
      setDragX(0);
      setActiveId(null);
    }
  };

  const swipeRatio = Math.min(1, Math.abs(dragX) / maxSwipe);

  return (
    <div
      ref={constraintRef}
      className="relative rounded-2xl mb-1.5"
      style={{ overflow: swipeRatio > 0.02 ? 'visible' : 'hidden' }}
    >
      {/* Actions tray — appears only when swiping */}
      <AnimatePresence>
        {swipeRatio > 0.02 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: swipeRatio }}
            exit={{ opacity: 0 }}
            className="absolute top-0 right-0 bottom-0 flex items-center gap-1.5 pr-1.5 z-[1] pointer-events-none"
          >
            {actions.map((a, i) => (
              <motion.button
                key={i}
                initial={{ scale: 0.6, x: 20 }}
                animate={{ scale: swipeRatio > 0.6 ? 1 : 0.85, x: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300, delay: i * 0.04 }}
                onClick={() => {
                  haptic('medium');
                  a.onClick();
                  setDragX(0);
                  setActiveId(null);
                }}
                className="h-[calc(100%-10px)] my-[5px] min-w-[68px] rounded-2xl flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold pointer-events-auto"
                style={{
                  background: a.bg || 'var(--red)',
                  boxShadow: `0 6px 24px ${a.bg || 'var(--red)'}40`,
                }}
              >
                {a.icon && <DynIcon name={a.icon} size={17} />}
                {a.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draggable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -maxSwipe, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDrag={(_, info) => setDragX(info.offset.x + (isActive ? -maxSwipe : 0))}
        onDragEnd={handleDragEnd}
        animate={{ x: dragX }}
        transition={{ type: 'spring', damping: 32, stiffness: 400 }}
        className="glass rounded-2xl relative z-[2] cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
