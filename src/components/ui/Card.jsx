import { motion } from 'framer-motion';
import { cn } from '../../lib/format.js';

export const Card = ({
  children,
  className = '',
  spotlight = true,
  glass = true,
  padding = 'default',
  onClick,
  as: Component = 'div',
  delay = 0,
  ...props
}) => {
  const paddings = {
    sm: 'p-3',
    default: 'p-5',
    md: 'p-6',
    lg: 'p-7',
    xl: 'p-8',
    none: '',
  };

  const baseClass = cn(
    'relative rounded-2xl border border-bd-1 overflow-hidden',
    'transition-colors duration-300',
    glass && 'bg-bg-2 backdrop-blur-2xl',
    spotlight && 'spotlight hover:border-bd-2',
    paddings[padding],
    onClick && 'cursor-pointer',
    className
  );

  const content = <>{children}</>;

  if (Component === 'motion.div' || delay) {
    return (
      <motion.div
        className={baseClass}
        onClick={onClick}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
        {...props}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <Component className={baseClass} onClick={onClick} {...props}>
      {content}
    </Component>
  );
};
