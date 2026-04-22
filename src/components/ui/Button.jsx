import { motion } from 'framer-motion';
import { cn } from '../../lib/format.js';
import { haptic as doHaptic } from '../../lib/haptic.js';

export const Button = ({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  onClick,
  haptic = 'light',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  ...props
}) => {
  const variants = {
    default: 'glass text-fg hover:bg-glass-2',
    primary: 'text-black font-semibold',
    ghost: 'bg-transparent text-fg-2 hover:text-fg hover:bg-glass',
    danger: 'text-red border border-red/30',
    subtle: 'glass-2 text-fg-2 hover:text-fg',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    default: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-5 py-3.5 text-sm rounded-2xl gap-2',
    xl: 'px-6 py-4 text-sm rounded-2xl gap-2.5',
  };

  const primaryStyle = variant === 'primary' ? {
    background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
    boxShadow: '0 8px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
  } : {};
  const dangerStyle = variant === 'danger' ? {
    background: 'color-mix(in srgb, var(--red) 10%, transparent)',
  } : {};

  return (
    <motion.button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      onClick={(e) => { if (!disabled && !loading) { doHaptic(haptic); onClick?.(e); } }}
      disabled={disabled || loading}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={!disabled ? { y: -1 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ ...primaryStyle, ...dangerStyle }}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </motion.button>
  );
};
