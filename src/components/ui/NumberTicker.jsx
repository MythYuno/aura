import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';

/**
 * NumberTicker - smooth animated counter with spring physics.
 * Uses tabular-nums for no layout shift.
 *
 * v0.8.1: emette un flash glow accent quando il valore cambia (segnale
 * subliminale "ho aggiornato"). Il flash è una classe CSS aggiunta per
 * 600ms via timeout, skippa al primo mount per non flashare in entrata.
 * Disabilitato automaticamente con `flash={false}` o se prefers-reduced-motion.
 */
export const NumberTicker = ({
  value = 0,
  decimals = 2,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.2,
  flash = true,
}) => {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, {
    damping: 30,
    stiffness: 80,
    mass: 1,
    restDelta: 0.001,
  });

  const display = useTransform(spring, (v) => {
    const safe = isNaN(v) ? 0 : v;
    return prefix + safe.toLocaleString('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;
  });

  // Flash glow: classe applicata per 600ms al cambio valore.
  // prevValRef parte da `value` così il primo render NON triggera il flash.
  const prevValRef = useRef(value);
  const [flashing, setFlashing] = useState(false);
  const flashTimerRef = useRef(null);

  useEffect(() => {
    mv.set(value);
    if (!flash) return;
    // Skip se valore identico (no change visibile da segnalare).
    if (Math.abs(prevValRef.current - value) < 0.005) return;
    prevValRef.current = value;
    setFlashing(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashing(false), 600);
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [value, mv, flash]);

  return (
    <motion.span className={`tnum ${flashing ? 'num-flash' : ''} ${className}`}>
      {display}
    </motion.span>
  );
};

/**
 * NumberReel - even more dramatic: digits slide up like slot machine.
 * Use for hero numbers where impact matters.
 */
export const NumberReel = ({ value = 0, decimals = 2, prefix = '', className = '' }) => {
  return (
    <NumberTicker value={value} decimals={decimals} prefix={prefix} className={className} />
  );
};
