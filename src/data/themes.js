/**
 * AURA — 5 glass themes (dark only).
 * Meshes tuned for mobile performance (fewer, softer gradients).
 */

const base = {
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

// Light-mode token overrides applied on top of any theme.
// Backgrounds and foregrounds invert, accent palette stays vivid.
// Note: opacities pushed up vs dark mode — dark text on light bg needs more
// contrast than light text on dark to stay readable at small sizes.
const lightOverrides = {
  glass: 'rgba(0,0,0,0.04)',
  glass2: 'rgba(0,0,0,0.07)',
  glassBd: 'rgba(0,0,0,0.1)',
  glassBd2: 'rgba(0,0,0,0.18)',
  fg: 'rgba(15,18,24,0.96)',
  fg2: 'rgba(15,18,24,0.78)',
  fg3: 'rgba(15,18,24,0.62)',
  fg4: 'rgba(15,18,24,0.5)',
  fg5: 'rgba(15,18,24,0.28)',
};

const lightBackgrounds = {
  aurora: { bg: '#F4F8F7', mesh: 'radial-gradient(ellipse 65% 45% at 18% 0%, rgba(52,211,153,0.18) 0%, transparent 55%), radial-gradient(ellipse 55% 35% at 82% 30%, rgba(34,211,238,0.14) 0%, transparent 55%), radial-gradient(ellipse 50% 30% at 50% 100%, rgba(167,139,250,0.14) 0%, transparent 55%)' },
  acid:   { bg: '#F6F7F4', mesh: 'radial-gradient(ellipse 70% 45% at 15% 0%, rgba(101,163,13,0.14) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 85% 100%, rgba(190,242,100,0.16) 0%, transparent 55%)' },
  prism:  { bg: '#F5F4FA', mesh: 'radial-gradient(ellipse 70% 45% at 20% 0%, rgba(96,165,250,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168,85,247,0.18) 0%, transparent 55%)' },
  sunset: { bg: '#FAF4F0', mesh: 'radial-gradient(ellipse 70% 45% at 15% 0%, rgba(251,146,60,0.18) 0%, transparent 55%), radial-gradient(ellipse 65% 40% at 85% 100%, rgba(244,114,182,0.16) 0%, transparent 55%)' },
  ocean:  { bg: '#F0F5FA', mesh: 'radial-gradient(ellipse 75% 45% at 20% 0%, rgba(34,211,238,0.18) 0%, transparent 55%), radial-gradient(ellipse 65% 40% at 80% 100%, rgba(129,140,248,0.14) 0%, transparent 55%)' },
  mono:   { bg: '#F5F5F5', mesh: 'radial-gradient(ellipse 70% 40% at 20% 0%, rgba(0,0,0,0.05) 0%, transparent 55%), radial-gradient(ellipse 60% 35% at 80% 100%, rgba(0,0,0,0.03) 0%, transparent 55%)' },
};

export const themes = {
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Verde · ciano · viola',
    preview: ['#34D399', '#22D3EE', '#A78BFA'],
    bg: '#06121A',
    mesh: `
      radial-gradient(ellipse 65% 45% at 18% 0%, rgba(52,211,153,0.22) 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 82% 30%, rgba(34,211,238,0.18) 0%, transparent 55%),
      radial-gradient(ellipse 55% 35% at 50% 100%, rgba(167,139,250,0.18) 0%, transparent 55%)
    `,
    accent: '#34D399',
    accentDim: '#10B981',
    glow: 'rgba(52,211,153,0.35)',
    accent2: '#22D3EE',
    logoFrom: '#34D399',
    logoTo: '#A78BFA',
    ok: '#34D399',
    info: '#22D3EE',
    pink: '#F472B6',
    gold: '#FDE047',
    blue: '#60A5FA',
    purple: '#A78BFA',
    orange: '#FB923C',
    teal: '#5EEAD4',
    ...base,
  },

  acid: {
    id: 'acid',
    name: 'Acid Lime',
    description: 'Grigio + verde acido',
    preview: ['#BEF264', '#27272A', '#52525B'],
    bg: '#0A0A0B',
    mesh: `
      radial-gradient(ellipse 70% 45% at 15% 0%, rgba(190,242,100,0.16) 0%, transparent 55%),
      radial-gradient(ellipse 55% 40% at 85% 100%, rgba(101,163,13,0.1) 0%, transparent 55%)
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
    ...base,
  },

  prism: {
    id: 'prism',
    name: 'Prism',
    description: 'Rosa · viola · ciano',
    preview: ['#F472B6', '#A78BFA', '#60A5FA'],
    bg: '#06061A',
    mesh: `
      radial-gradient(ellipse 70% 45% at 20% 0%, rgba(96,165,250,0.22) 0%, transparent 55%),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168,85,247,0.24) 0%, transparent 55%)
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
    ...base,
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Arancio · rosa · peach',
    preview: ['#FB923C', '#F472B6', '#FCD34D'],
    bg: '#1A0A0A',
    mesh: `
      radial-gradient(ellipse 70% 45% at 15% 0%, rgba(251,146,60,0.24) 0%, transparent 55%),
      radial-gradient(ellipse 65% 40% at 85% 100%, rgba(244,114,182,0.2) 0%, transparent 55%)
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
    ...base,
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cyan · blu · indaco',
    preview: ['#22D3EE', '#60A5FA', '#818CF8'],
    bg: '#02081A',
    mesh: `
      radial-gradient(ellipse 75% 45% at 20% 0%, rgba(34,211,238,0.24) 0%, transparent 55%),
      radial-gradient(ellipse 65% 40% at 80% 100%, rgba(129,140,248,0.18) 0%, transparent 55%)
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
    ...base,
  },

  mono: {
    id: 'mono',
    name: 'Mono',
    description: 'Solo grigi, minimale',
    preview: ['#E7E5E4', '#57534E', '#1C1917'],
    bg: '#0A0A0A',
    mesh: `
      radial-gradient(ellipse 70% 40% at 20% 0%, rgba(255,255,255,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 60% 35% at 80% 100%, rgba(255,255,255,0.04) 0%, transparent 55%)
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
    ...base,
  },
};

export const themeList = Object.values(themes);

// "fg2" → "fg-2", "glassBd2" → "glass-bd-2", "accentDim" → "accent-dim".
// Original code only handled camelCase; digits were left attached, so
// `fg2` was being written to `--fg2` (a var nothing reads) instead of `--fg-2`.
const toCssKey = (k) => k.replace(/(\d)/g, '-$1').replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export const applyTheme = (themeId, mode = 'dark') => {
  const theme = themes[themeId] || themes.aurora;
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
    const lb = lightBackgrounds[theme.id] || lightBackgrounds.aurora;
    root.style.setProperty('--bg', lb.bg);
    root.style.setProperty('--mesh', lb.mesh);
  }

  root.style.setProperty('--accent-glow', theme.glow);
  root.style.setProperty('--accent-10', `color-mix(in srgb, ${theme.accent} 10%, transparent)`);
  root.style.setProperty('--accent-20', `color-mix(in srgb, ${theme.accent} 20%, transparent)`);
  root.style.setProperty('--accent-40', `color-mix(in srgb, ${theme.accent} 40%, transparent)`);

  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-mode', isLight ? 'light' : 'dark');
};
