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
  disabled = false,
  ...props
}) => {
  const variants = {
    default: 'bg-bg-2 hover:bg-bg-3 border border-bd-1 hover:border-bd-2 text-fg-1',
    primary: 'text-black font-semibold shadow-[0_8px_24px_var(--accent-glow)] hover:shadow-[0_12px_32px_var(--accent-glow)] border-none',
    ghost: 'bg-transparent hover:bg-bg-2 text-fg-2 hover:text-fg-1',
    danger: 'bg-red/10 hover:bg-red/15 border border-red/20 text-red',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    default: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3.5 text-sm rounded-2xl',
    xl: 'px-6 py-4 text-sm rounded-2xl',
  };

  const primaryStyle = variant === 'primary' ? {
    background: 'linear-gradient(135deg, var(--ok), var(--ok-dim))',
  } : {};

  return (
    <motion.button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      onClick={(e) => {
        if (!disabled) {
          doHaptic(haptic);
          onClick?.(e);
        }
      }}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      style={primaryStyle}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
};
