import { motion } from 'framer-motion';

export const EmptyState = ({ title, description, action, illustration = 'default' }) => {
  const illustrations = {
    default: (
      <svg viewBox="0 0 120 120" className="w-24 h-24">
        <circle cx="60" cy="60" r="50" fill="var(--bg-2)" />
        <circle cx="60" cy="60" r="36" fill="var(--bg-3)" />
        <circle cx="60" cy="60" r="22" fill="var(--accent)" opacity="0.2" />
      </svg>
    ),
    empty: (
      <svg viewBox="0 0 120 120" className="w-24 h-24">
        <defs>
          <linearGradient id="es1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="45" fill="url(#es1)" />
        <g transform="translate(60 60)">
          <motion.rect
            x="-16" y="-16" width="32" height="32" rx="8"
            fill="none" stroke="var(--accent)" strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          <motion.circle
            cx="0" cy="0" r="5" fill="var(--accent)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
          />
        </g>
      </svg>
    ),
    noData: (
      <svg viewBox="0 0 120 120" className="w-24 h-24">
        <g opacity="0.5">
          <motion.rect
            x="20" y="80" width="15" height="20" rx="3" fill="var(--fg-5)"
            animate={{ height: [20, 30, 20] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.rect
            x="40" y="70" width="15" height="30" rx="3" fill="var(--fg-4)"
            animate={{ height: [30, 45, 30] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.rect
            x="60" y="65" width="15" height="35" rx="3" fill="var(--accent)"
            animate={{ height: [35, 55, 35] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
          />
          <motion.rect
            x="80" y="60" width="15" height="40" rx="3" fill="var(--fg-5)"
            animate={{ height: [40, 50, 40] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
          />
        </g>
      </svg>
    ),
  };

  return (
    <motion.div
      className="flex flex-col items-center text-center py-16 px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-6">{illustrations[illustration] || illustrations.default}</div>
      <h3 className="text-lg font-semibold text-fg mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-fg-3 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
};
