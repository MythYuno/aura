import * as LucideIcons from 'lucide-react';
import { Circle } from 'lucide-react';

/**
 * Get a Lucide icon component by name string.
 * Fallback to Circle if not found.
 */
export const getIcon = (name) => {
  return LucideIcons[name] || Circle;
};

export const DynIcon = ({ name, ...props }) => {
  const Ico = getIcon(name);
  return <Ico {...props} />;
};
