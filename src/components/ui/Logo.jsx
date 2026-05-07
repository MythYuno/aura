import { motion } from 'framer-motion';
import { cn } from '../../lib/format.js';

/**
 * AURA logo mark — geometric "A" with concentric arcs underneath the bar.
 * The arcs read as the "aurora" arch + suggest the flow of money eroding inward.
 * Theme-aware via the existing --logo-from / --logo-to gradient variables, but
 * the SVG also uses an inline gradient that picks up accent / info / purple.
 */
export const Logo = ({ size = 'md', withText = true, className = '' }) => {
  const dims = {
    sm: { box: 28, radius: 8 },
    md: { box: 34, radius: 10 },
    lg: { box: 44, radius: 13 },
  }[size];

  // Unique gradient id per instance to avoid clashes
  const gradId = `aura-grad-${size}`;

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 260 }}
        className="flex items-center justify-center"
        style={{
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          background: '#06121A',
          boxShadow: '0 4px 14px var(--accent-glow, rgba(52,211,153,0.3))',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <svg width={dims.box} height={dims.box} viewBox="0 0 96 96">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent, #34D399)" />
              <stop offset="55%" stopColor="var(--info, #22D3EE)" />
              <stop offset="100%" stopColor="var(--purple, #A78BFA)" />
            </linearGradient>
          </defs>
          {/* Geometric A */}
          <path
            d="M 22 70 L 48 22 L 74 70"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bar of the A */}
          <line
            x1="34" y1="54" x2="62" y2="54"
            stroke={`url(#${gradId})`}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          {/* Concentric arcs underneath — the aurora */}
          <path
            d="M 30 68 Q 48 40, 66 68"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 36 66 Q 48 52, 60 66"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <circle cx="48" cy="68" r="2.5" fill={`url(#${gradId})`} />
        </svg>
      </motion.div>
      {withText && (
        <span className={cn('font-semibold tracking-tight', size === 'lg' ? 'text-lg' : 'text-sm')}>
          AURA
        </span>
      )}
    </div>
  );
};
