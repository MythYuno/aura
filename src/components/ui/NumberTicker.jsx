import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';

/**
 * NumberTicker - smooth animated counter with spring physics.
 * Uses tabular-nums for no layout shift.
 */
export const NumberTicker = ({
  value = 0,
  decimals = 2,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.2,
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

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={`tnum ${className}`}>{display}</motion.span>;
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
