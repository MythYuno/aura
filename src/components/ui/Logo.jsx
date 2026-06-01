import { motion } from 'framer-motion';
import { cn } from '../../lib/format.js';

/**
 * AURA — marchio v0.10 "AURA 2.0".
 *
 * Come l'icona dell'app: tessera ardesia scura, scintilla grande in gradiente
 * blu (1E40AF→60A5FA) + scintilla piccola smeraldo (il "sereno" del semaforo).
 * La tessera è volutamente scura anche in light mode: è il marchio, non la UI.
 */
export const Logo = ({ size = 'md', withText = true, className = '' }) => {
  const dims = {
    sm: { box: 30, radius: 9 },
    md: { box: 36, radius: 11 },
    lg: { box: 48, radius: 15 },
  }[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 260 }}
        className="flex items-center justify-center"
        style={{
          width: dims.box,
          height: dims.box,
          borderRadius: dims.radius,
          background: '#0E1117',
          boxShadow: '0 8px 20px -8px var(--accent-glow, rgba(59,130,246,0.6)), inset 0 0 0 1px rgba(96,165,250,0.18)',
          position: 'relative',
          flex: 'none',
        }}
      >
        <svg
          width={Math.round(dims.box * 0.72)}
          height={Math.round(dims.box * 0.72)}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="aura-mark-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="55%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </linearGradient>
          </defs>
          <path fill="url(#aura-mark-g)" d="M10.5 6 C11.8 11.7 11.8 11.7 17.5 13 C11.8 14.3 11.8 14.3 10.5 20 C9.2 14.3 9.2 14.3 3.5 13 C9.2 11.7 9.2 11.7 10.5 6 Z" />
          <path fill="#34D399" d="M18.2 3.9 C18.7 6 18.7 6 20.8 6.5 C18.7 7 18.7 7 18.2 9.1 C17.7 7 17.7 7 15.6 6.5 C17.7 6 17.7 6 18.2 3.9 Z" />
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
