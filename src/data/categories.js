/**
 * AURA — Categorie di default (v0.15 "Banca").
 * Le icone vere sono mappate per catId in `lib/icons.jsx` (CATEGORY_ICON),
 * SVG custom inline. Qui restano solo label, color e weight.
 *
 * Palette da pastiglia: tinte piene e distinguibili a colpo d'occhio dentro
 * un cerchio da 34px, leggibili sia su bianco sia su carbone. Niente indaco:
 * quello è il colore della marca, non di una categoria.
 */

export const defaultCats = [
  { id: 'food', label: 'Cibo', color: '#E8622A', weight: 30 },          // arancio
  { id: 'home', label: 'Casa', color: '#2E8FE0', weight: 22 },          // blu
  { id: 'transport', label: 'Trasporti', color: '#7A5CF0', weight: 15 },// viola
  { id: 'health', label: 'Salute', color: '#E0417A', weight: 10 },      // rosa
  { id: 'fun', label: 'Svago', color: '#F2A93B', weight: 10 },          // ambra
  { id: 'wants', label: 'Shopping', color: '#12A594', weight: 8 },      // teal
  { id: 'other', label: 'Altro', color: '#8A8A99', weight: 5 },         // grigio
];

/**
 * Colori disponibili per l'editor categoria — la stessa famiglia, in coppie
 * chiaro/scuro. Testati dentro la pastiglia tonda su bianco e su carbone.
 */
export const availableColors = [
  '#E8622A', '#C44A18', // Arancio
  '#F2A93B', '#C9821A', // Ambra
  '#5DA83C', '#3F7D26', // Verde
  '#12A594', '#0B7F72', // Teal
  '#2E8FE0', '#1D6DB8', // Blu
  '#7A5CF0', '#5A3FCB', // Viola
  '#E0417A', '#B62A5C', // Rosa
  '#B3538F', '#8A8A99', // Orchidea · Grigio
];

/**
 * Mappa dei VECCHI colori di default → nuovi, per la migrazione one-shot in
 * useStore. Tocca solo le categorie rimaste sui default storici (chi ha
 * scelto un colore suo non viene toccato). Idempotente: i nuovi colori non
 * compaiono tra i vecchi, quindi rieseguirla non cambia nulla.
 * `old` accumula tutte le generazioni precedenti (v0.11, v0.12).
 */
export const legacyColorMigration = {
  food: { old: ['#FB923C', '#F97316', '#C05621'], next: '#E8622A' },
  home: { old: ['#22D3EE', '#06B6D4', '#2F6D8C'], next: '#2E8FE0' },
  transport: { old: ['#60A5FA', '#A78BFA', '#3B82F6', '#7B5EA7'], next: '#7A5CF0' },
  health: { old: ['#F472B6', '#EC4899', '#C24E6A'], next: '#E0417A' },
  fun: { old: ['#FDE047', '#EAB308', '#D9A441'], next: '#F2A93B' },
  wants: { old: ['#60A5FA', '#C084FC', '#3B82F6', '#B3538F'], next: '#12A594' },
  other: { old: ['#64748B', '#A1A1AA', '#71717A', '#8A8578'], next: '#8A8A99' },
};
