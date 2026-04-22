import { motion } from 'framer-motion';
import { cn } from '../../lib/format.js';

/**
 * AURA logo mark — dynamic gradient that changes per theme.
 * Uses CSS var --logo-from and --logo-to, set by applyTheme.
 * Size presets: sm (24px), md (30px), lg (40px).
 */
export const Logo = ({ size = 'md', withText = true, className = '' }) => {
  const dims = {
    sm: { box: 24, radius: 7, fontSize: 12 },
    md: { box: 30, radius: 9, fontSize: 14 },
    lg: { box: 40, radius: 12, fontSize: 18 },
  }[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 260 }}
        className="logo-gradient rounded-xl flex items-center justify-center text-white font-bold"
        style={{
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          fontSize: dims.fontSize,
          letterSpacing: '-0.02em',
        }}
      >
        A
      </motion.div>
      {withText && (
        <span className={cn('font-semibold tracking-tight', size === 'lg' ? 'text-lg' : 'text-sm')}>
          AURA
        </span>
      )}
    </div>
  );
};
