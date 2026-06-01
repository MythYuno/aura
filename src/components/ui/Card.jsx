import { motion } from 'framer-motion';
import { cn } from '../../lib/format.js';

export const Card = ({
  children,
  className = '',
  padding = 'default',
  onClick,
  delay = 0,
  interactive = true,
  tight = false,
  ...props
}) => {
  const paddings = {
    none: '',
    sm: 'p-3',
    default: 'p-5',
    md: 'p-6',
    lg: 'p-7',
    xl: 'p-8',
  };

  const base = cn(
    'glass-card',
    onClick && 'cursor-pointer clickable',
    interactive && 'card-lift',
    tight ? 'rounded-2xl' : '',
    paddings[padding],
    className
  );

  const hoverProps = interactive
    ? { whileHover: { transition: { type: 'spring', stiffness: 400, damping: 28 } } }
    : {};
  const tapProps = onClick ? { whileTap: { scale: 0.985 } } : {};

  return (
    <motion.div
      className={base}
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      {...hoverProps}
      {...tapProps}
      {...props}
    >
      {children}
    </motion.div>
  );
};
