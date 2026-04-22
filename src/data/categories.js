/**
 * AURA v4 — Categories
 * All icons from lucide-react (professional, consistent strokes).
 * Colors chosen to work on BOTH dark and light themes.
 */

export const defaultCats = [
  { id: 'food', label: 'Cibo', icon: 'UtensilsCrossed', color: '#FB923C', weight: 30 },
  { id: 'transport', label: 'Trasporti', icon: 'Car', color: '#60A5FA', weight: 15 },
  { id: 'home', label: 'Casa', icon: 'Home', color: '#A78BFA', weight: 20 },
  { id: 'health', label: 'Salute', icon: 'HeartPulse', color: '#F472B6', weight: 10 },
  { id: 'fun', label: 'Svago', icon: 'Film', color: '#FDE047', weight: 10 },
  { id: 'wants', label: 'Shopping', icon: 'ShoppingBag', color: '#22D3EE', weight: 8 },
  { id: 'vices', label: 'Vizi', icon: 'Coffee', color: '#C084FC', weight: 4 },
  { id: 'other', label: 'Altro', icon: 'Tag', color: '#A1A1AA', weight: 3 },
];

/**
 * Available colors for category editor.
 * All tested for contrast on both dark and light glass surfaces.
 */
export const availableColors = [
  '#FB923C', '#F97316', // Orange
  '#F472B6', '#EC4899', // Pink
  '#C084FC', '#A78BFA', // Purple
  '#60A5FA', '#3B82F6', // Blue
  '#22D3EE', '#06B6D4', // Cyan
  '#34D399', '#10B981', // Green
  '#BEF264', '#84CC16', // Lime
  '#FDE047', '#EAB308', // Yellow
  '#F87171', '#EF4444', // Red
  '#A1A1AA', '#71717A', // Gray
];

/**
 * All Lucide icon names users can pick from.
 * Curated for expense tracking — food, transport, bills, leisure, health, etc.
 */
export const availableIcons = [
  // Food & drink
  'UtensilsCrossed', 'Pizza', 'Coffee', 'Wine', 'Beer', 'Apple', 'Cookie',
  // Transport
  'Car', 'Bus', 'Train', 'Plane', 'Bike', 'Fuel', 'ParkingCircle',
  // Home & bills
  'Home', 'Building2', 'Lightbulb', 'Flame', 'Droplet', 'Wifi', 'Plug',
  // Shopping
  'ShoppingBag', 'ShoppingCart', 'Gift', 'Shirt', 'Gem',
  // Health & wellness
  'HeartPulse', 'Stethoscope', 'Pill', 'Dumbbell', 'Activity',
  // Leisure
  'Film', 'Music', 'Gamepad2', 'Book', 'Camera', 'Headphones', 'PartyPopper',
  // Tech
  'Smartphone', 'Laptop', 'Cloud', 'Zap',
  // Finance
  'Wallet', 'CreditCard', 'PiggyBank', 'TrendingUp', 'DollarSign',
  // Other
  'Tag', 'Star', 'Heart', 'Sparkles', 'Target', 'Briefcase', 'GraduationCap',
  'Baby', 'Dog', 'Cat', 'Scissors', 'Palette', 'Sun', 'Moon',
];
