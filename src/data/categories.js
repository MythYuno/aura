/**
 * AURA — Categorie di default.
 * Le icone vere sono mappate per catId in `lib/icons.jsx` (CATEGORY_ICON),
 * SVG custom inline. Qui restano solo label, color e weight.
 */

export const defaultCats = [
  { id: 'food', label: 'Cibo', color: '#FB923C', weight: 30 },
  { id: 'home', label: 'Casa', color: '#22D3EE', weight: 22 },
  { id: 'transport', label: 'Trasporti', color: '#60A5FA', weight: 15 },
  { id: 'health', label: 'Salute', color: '#F472B6', weight: 10 },
  { id: 'fun', label: 'Svago', color: '#FDE047', weight: 10 },
  { id: 'wants', label: 'Shopping', color: '#60A5FA', weight: 8 },
  { id: 'other', label: 'Altro', color: '#64748B', weight: 5 },
];

/**
 * Colori disponibili per l'editor categoria. Testati su entrambe le palette
 * (dark e light) per leggibilità sufficiente.
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
