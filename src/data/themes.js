/**
 * AURA v4 — 5 Glass themes
 * Each defines: mesh gradients (dark+light), accent + glow,
 * logo gradient (dark+light), UI chrome (backgrounds/borders/foregrounds).
 */

const baseDark = {
  glass: 'rgba(255,255,255,0.055)',
  glass2: 'rgba(255,255,255,0.09)',
  glassBd: 'rgba(255,255,255,0.1)',
  glassBd2: 'rgba(255,255,255,0.18)',
  fg: 'rgba(255,255,255,0.95)',
  fg2: 'rgba(255,255,255,0.68)',
  fg3: 'rgba(255,255,255,0.42)',
  fg4: 'rgba(255,255,255,0.22)',
  fg5: 'rgba(255,255,255,0.12)',
  red: '#F87171',
  warn: '#FBBF24',
};
const baseLight = {
  glass: 'rgba(255,255,255,0.55)',
  glass2: 'rgba(255,255,255,0.75)',
  glassBd: 'rgba(255,255,255,0.75)',
  glassBd2: 'rgba(10,10,20,0.08)',
  fg: '#0A0A14',
  fg2: 'rgba(10,10,20,0.72)',
  fg3: 'rgba(10,10,20,0.5)',
  fg4: 'rgba(10,10,20,0.28)',
  fg5: 'rgba(10,10,20,0.14)',
  red: '#DC2626',
  warn: '#B45309',
};

const toVars = (obj, prefix = '') => {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    const key = prefix + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    out[`--${key}`] = v;
  });
  return out;
};

export const themes = {
  acid: {
    id: 'acid',
    name: 'Acid Lime',
    description: 'Grigio antracite + verde acido',
    preview: ['#BEF264', '#27272A', '#52525B'],
    dark: {
      bg: '#0A0A0B',
      mesh: `
        radial-gradient(ellipse 70% 45% at 15% 0%, rgba(190,242,100,0.18) 0%, transparent 55%),
        radial-gradient(ellipse 55% 40% at 85% 20%, rgba(163,230,53,0.12) 0%, transparent 55%),
        radial-gradient(ellipse 60% 35% at 50% 100%, rgba(101,163,13,0.08) 0%, transparent 55%)
      `,
      accent: '#BEF264',
      accentDim: '#A3E635',
      glow: 'rgba(190,242,100,0.35)',
      accent2: '#71717A',
      logoFrom: '#BEF264',
      logoTo: '#65A30D',
      ok: '#BEF264',
      info: '#67E8F9',
      pink: '#F0ABFC',
      gold: '#FDE047',
      blue: '#93C5FD',
      purple: '#D8B4FE',
      orange: '#FDBA74',
      teal: '#5EEAD4',
      ...baseDark,
    },
    light: {
      bg: '#F5F5F4',
      mesh: `
        radial-gradient(ellipse 70% 45% at 15% 0%, rgba(190,242,100,0.35) 0%, transparent 55%),
        radial-gradient(ellipse 55% 40% at 85% 20%, rgba(163,230,53,0.22) 0%, transparent 55%),
        radial-gradient(ellipse 60% 35% at 50% 100%, rgba(101,163,13,0.14) 0%, transparent 55%)
      `,
      accent: '#65A30D',
      accentDim: '#4D7C0F',
      glow: 'rgba(101,163,13,0.25)',
      accent2: '#52525B',
      logoFrom: '#84CC16',
      logoTo: '#365314',
      ok: '#65A30D',
      info: '#0891B2',
      pink: '#C026D3',
      gold: '#CA8A04',
      blue: '#2563EB',
      purple: '#9333EA',
      orange: '#EA580C',
      teal: '#0D9488',
      ...baseLight,
    },
  },

  prism: {
    id: 'prism',
    name: 'Prism',
    description: 'Mesh multicolor: rosa · viola · ciano',
    preview: ['#F472B6', '#A78BFA', '#60A5FA'],
    dark: {
      bg: '#06061A',
      mesh: `
        radial-gradient(ellipse 80% 50% at 20% 0%, rgba(96,165,250,0.25) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 80% 20%, rgba(168,85,247,0.3) 0%, transparent 55%),
        radial-gradient(ellipse 70% 40% at 60% 100%, rgba(244,114,182,0.2) 0%, transparent 55%)
      `,
      accent: '#A78BFA',
      accentDim: '#8B5CF6',
      glow: 'rgba(167,139,250,0.4)',
      accent2: '#F472B6',
      logoFrom: '#F472B6',
      logoTo: '#60A5FA',
      ok: '#34D399',
      info: '#60A5FA',
      pink: '#F472B6',
      gold: '#FDE047',
      blue: '#93C5FD',
      purple: '#C4B5FD',
      orange: '#FDBA74',
      teal: '#5EEAD4',
      ...baseDark,
    },
    light: {
      bg: '#FAF5FF',
      mesh: `
        radial-gradient(ellipse 80% 50% at 20% 0%, rgba(96,165,250,0.25) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 80% 20%, rgba(168,85,247,0.3) 0%, transparent 55%),
        radial-gradient(ellipse 70% 40% at 60% 100%, rgba(244,114,182,0.2) 0%, transparent 55%)
      `,
      accent: '#8B5CF6',
      accentDim: '#7C3AED',
      glow: 'rgba(139,92,246,0.25)',
      accent2: '#DB2777',
      logoFrom: '#DB2777',
      logoTo: '#2563EB',
      ok: '#059669',
      info: '#2563EB',
      pink: '#DB2777',
      gold: '#CA8A04',
      blue: '#2563EB',
      purple: '#8B5CF6',
      orange: '#EA580C',
      teal: '#0D9488',
      ...baseLight,
    },
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Caldo: arancio · rosa · peach',
    preview: ['#FB923C', '#F472B6', '#FCD34D'],
    dark: {
      bg: '#1A0A0A',
      mesh: `
        radial-gradient(ellipse 70% 45% at 15% 0%, rgba(251,146,60,0.28) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 85% 25%, rgba(244,114,182,0.25) 0%, transparent 55%),
        radial-gradient(ellipse 65% 40% at 50% 100%, rgba(252,211,77,0.18) 0%, transparent 55%)
      `,
      accent: '#FB923C',
      accentDim: '#F97316',
      glow: 'rgba(251,146,60,0.4)',
      accent2: '#F472B6',
      logoFrom: '#FDE047',
      logoTo: '#F472B6',
      ok: '#FB923C',
      info: '#67E8F9',
      pink: '#F472B6',
      gold: '#FDE047',
      blue: '#93C5FD',
      purple: '#C4B5FD',
      orange: '#FB923C',
      teal: '#5EEAD4',
      ...baseDark,
    },
    light: {
      bg: '#FFF7ED',
      mesh: `
        radial-gradient(ellipse 70% 45% at 15% 0%, rgba(251,146,60,0.32) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 85% 25%, rgba(244,114,182,0.28) 0%, transparent 55%),
        radial-gradient(ellipse 65% 40% at 50% 100%, rgba(252,211,77,0.22) 0%, transparent 55%)
      `,
      accent: '#EA580C',
      accentDim: '#C2410C',
      glow: 'rgba(234,88,12,0.25)',
      accent2: '#DB2777',
      logoFrom: '#EA580C',
      logoTo: '#DB2777',
      ok: '#EA580C',
      info: '#0891B2',
      pink: '#DB2777',
      gold: '#CA8A04',
      blue: '#2563EB',
      purple: '#9333EA',
      orange: '#EA580C',
      teal: '#0D9488',
      ...baseLight,
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Fresco: cyan · blu · indaco',
    preview: ['#22D3EE', '#60A5FA', '#818CF8'],
    dark: {
      bg: '#02081A',
      mesh: `
        radial-gradient(ellipse 75% 45% at 20% 0%, rgba(34,211,238,0.28) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 85% 25%, rgba(96,165,250,0.3) 0%, transparent 55%),
        radial-gradient(ellipse 65% 40% at 50% 100%, rgba(129,140,248,0.2) 0%, transparent 55%)
      `,
      accent: '#22D3EE',
      accentDim: '#06B6D4',
      glow: 'rgba(34,211,238,0.35)',
      accent2: '#60A5FA',
      logoFrom: '#22D3EE',
      logoTo: '#818CF8',
      ok: '#34D399',
      info: '#22D3EE',
      pink: '#F472B6',
      gold: '#FDE047',
      blue: '#60A5FA',
      purple: '#C4B5FD',
      orange: '#FDBA74',
      teal: '#22D3EE',
      ...baseDark,
    },
    light: {
      bg: '#ECFEFF',
      mesh: `
        radial-gradient(ellipse 75% 45% at 20% 0%, rgba(34,211,238,0.32) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 85% 25%, rgba(96,165,250,0.28) 0%, transparent 55%),
        radial-gradient(ellipse 65% 40% at 50% 100%, rgba(129,140,248,0.22) 0%, transparent 55%)
      `,
      accent: '#0891B2',
      accentDim: '#0E7490',
      glow: 'rgba(8,145,178,0.22)',
      accent2: '#2563EB',
      logoFrom: '#0891B2',
      logoTo: '#4F46E5',
      ok: '#059669',
      info: '#0891B2',
      pink: '#DB2777',
      gold: '#CA8A04',
      blue: '#2563EB',
      purple: '#7C3AED',
      orange: '#EA580C',
      teal: '#0891B2',
      ...baseLight,
    },
  },

  mono: {
    id: 'mono',
    name: 'Mono',
    description: 'Minimale: solo grigi + neutro',
    preview: ['#E7E5E4', '#57534E', '#1C1917'],
    dark: {
      bg: '#0A0A0A',
      mesh: `
        radial-gradient(ellipse 70% 40% at 20% 0%, rgba(255,255,255,0.08) 0%, transparent 55%),
        radial-gradient(ellipse 60% 35% at 80% 100%, rgba(255,255,255,0.05) 0%, transparent 55%)
      `,
      accent: '#E7E5E4',
      accentDim: '#D6D3D1',
      glow: 'rgba(231,229,228,0.2)',
      accent2: '#A8A29E',
      logoFrom: '#F5F5F4',
      logoTo: '#78716C',
      ok: '#D6D3D1',
      info: '#A8A29E',
      pink: '#D6D3D1',
      gold: '#E7E5E4',
      blue: '#A8A29E',
      purple: '#D6D3D1',
      orange: '#E7E5E4',
      teal: '#A8A29E',
      ...baseDark,
    },
    light: {
      bg: '#FAFAF9',
      mesh: `
        radial-gradient(ellipse 70% 40% at 20% 0%, rgba(10,10,10,0.04) 0%, transparent 55%),
        radial-gradient(ellipse 60% 35% at 80% 100%, rgba(10,10,10,0.03) 0%, transparent 55%)
      `,
      accent: '#1C1917',
      accentDim: '#292524',
      glow: 'rgba(28,25,23,0.14)',
      accent2: '#57534E',
      logoFrom: '#1C1917',
      logoTo: '#78716C',
      ok: '#1C1917',
      info: '#57534E',
      pink: '#57534E',
      gold: '#44403C',
      blue: '#57534E',
      purple: '#78716C',
      orange: '#44403C',
      teal: '#57534E',
      ...baseLight,
    },
  },
};

export const themeList = Object.values(themes);

/**
 * Apply a theme to the document root.
 * Sets all CSS variables including color + chrome + mesh + logo.
 */
export const applyTheme = (themeId, mode) => {
  const theme = themes[themeId] || themes.acid;
  const root = document.documentElement;
  const actualMode = mode === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  const palette = theme[actualMode] || theme.dark;

  // Apply all palette keys as CSS vars
  Object.entries(palette).forEach(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    root.style.setProperty(`--${cssKey}`, value);
  });

  // Compose glow stops for reuse
  root.style.setProperty('--accent-glow', palette.glow);
  root.style.setProperty('--accent-10', `color-mix(in srgb, ${palette.accent} 10%, transparent)`);
  root.style.setProperty('--accent-20', `color-mix(in srgb, ${palette.accent} 20%, transparent)`);
  root.style.setProperty('--accent-40', `color-mix(in srgb, ${palette.accent} 40%, transparent)`);

  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-mode', actualMode);
};
