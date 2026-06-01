/**
 * AURA — tema unico "Ardesia + Blu", due modalità (scuro / chiaro).
 *
 * v0.9.21: nuova identità scelta dall'utente — ardesia (slate) + blu reale.
 * Pulita, neutra, professionale. Il linguaggio a gradiente resta (marchio,
 * accenti, icone) nella famiglia blu: profondo (#1E40AF) → blu (#3B82F6) →
 * azzurro (#60A5FA). Positivo = verde smeraldo (verde = soldi), che sta bene
 * col blu; attenzione = ambra (--warn); rischio = rosso. Fuori dal gradiente.
 *
 * Stop del gradiente (--g-1/--g-2/--g-3/--grad) COSTANTI tra le modalità.
 * Qui solo i token che cambiano tra scuro e chiaro (sfondo, mesh, accent, testo).
 */

const base = {
  // Stop del gradiente blu — profondo → azzurro.
  g1: '#1E40AF',   // blu profondo (royal scuro)
  g2: '#3B82F6',   // blu reale
  g3: '#60A5FA',   // azzurro chiaro
  grad: 'linear-gradient(120deg, var(--g-1) 0%, var(--g-2) 52%, var(--g-3) 100%)',
  glass: 'rgba(255,255,255,0.05)',
  glass2: 'rgba(255,255,255,0.09)',
  glassBd: 'rgba(255,255,255,0.08)',
  glassBd2: 'rgba(255,255,255,0.16)',
  fg: 'rgba(244,246,250,0.96)',
  fg2: 'rgba(244,246,250,0.70)',
  fg3: 'rgba(244,246,250,0.46)',
  fg4: 'rgba(244,246,250,0.26)',
  fg5: 'rgba(244,246,250,0.13)',
  red: '#E5556B',
  warn: '#E8B547',
};

// Override mode chiaro: canvas grigio-azzurro freddo + card bianche.
const lightOverrides = {
  glass: '#FFFFFF',
  glass2: '#EEF2F8',
  glassBd: 'rgba(37,99,235,0.08)',
  glassBd2: 'rgba(37,99,235,0.16)',
  fg: 'rgba(20,26,34,0.96)',
  fg2: 'rgba(20,26,34,0.66)',
  fg3: 'rgba(20,26,34,0.46)',
  fg4: 'rgba(20,26,34,0.30)',
  fg5: 'rgba(20,26,34,0.13)',
  bg: '#F5F7FA',          // grigio chiaro freddo
  bg2: '#FFFFFF',
  mesh: 'radial-gradient(120% 62% at 82% -6%, rgba(37,99,235,0.10) 0%, transparent 55%), radial-gradient(110% 55% at -8% 2%, rgba(96,165,250,0.10) 0%, transparent 52%)',
  accent: '#2563EB',
  accentDim: '#1E40AF',
  glow: 'rgba(37,99,235,0.16)',
  accentText: '#2563EB',
  accentOnSolid: '#FFFFFF',
  ok: '#059669',
  info: '#2563EB',
  blue: '#2563EB',
};

export const themes = {
  aura: {
    id: 'aura',
    name: 'AURA',
    description: 'Ardesia + Blu · scuro o chiaro',
    preview: ['#0E1117', '#1E40AF', '#60A5FA'],
    swatchBg: 'linear-gradient(120deg, #1E40AF 0%, #3B82F6 52%, #60A5FA 100%)',
    // Dark: ardesia profonda (slate) + alone blu in alto.
    bg: '#0E1117',
    bg2: '#161B24',
    mesh: `
      radial-gradient(120% 72% at 80% -8%, rgba(59,130,246,0.22) 0%, transparent 56%),
      radial-gradient(120% 60% at -10% 0%, rgba(96,165,250,0.11) 0%, transparent 52%)
    `,
    accent: '#3B82F6',
    accentDim: '#1E40AF',
    glow: 'rgba(59,130,246,0.45)',
    accent2: '#60A5FA',     // azzurro chiaro per testi/icone su scuro
    accentText: '#60A5FA',
    logoFrom: '#60A5FA',
    logoTo: '#1E40AF',
    ok: '#34D399',          // smeraldo = positivo (verde = soldi)
    info: '#60A5FA',
    pink: '#60A5FA',
    gold: '#E8B547',
    blue: '#60A5FA',
    purple: '#60A5FA',
    orange: '#D1654A',
    teal: '#3B82F6',
    ...base,
  },
};

export const themeList = Object.values(themes);

// "fg2" → "fg-2", "glassBd2" → "glass-bd-2", "accentDim" → "accent-dim"
const toCssKey = (k) => k.replace(/(\d)/g, '-$1').replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export const applyTheme = (themeId, mode = 'dark') => {
  const theme = themes.aura;
  const root = document.documentElement;
  const isLight = mode === 'light';

  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    root.style.setProperty(`--${toCssKey(key)}`, value);
  });

  if (isLight) {
    Object.entries(lightOverrides).forEach(([key, value]) => {
      root.style.setProperty(`--${toCssKey(key)}`, value);
    });
  }

  const activeAccent = isLight ? lightOverrides.accent : theme.accent;
  const activeGlow = isLight ? lightOverrides.glow : theme.glow;
  root.style.setProperty('--accent-glow', activeGlow);
  root.style.setProperty('--accent-10', `color-mix(in srgb, ${activeAccent} 10%, transparent)`);
  root.style.setProperty('--accent-20', `color-mix(in srgb, ${activeAccent} 20%, transparent)`);
  root.style.setProperty('--accent-40', `color-mix(in srgb, ${activeAccent} 40%, transparent)`);

  root.setAttribute('data-theme', 'aura');
  root.setAttribute('data-mode', isLight ? 'light' : 'dark');
};
