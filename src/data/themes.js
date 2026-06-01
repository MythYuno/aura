/**
 * AURA — tema "Prugna" (v0.16), due modalità: CHIARO e SCURO.
 *
 * Identità scelta guardando il mockup ad alta fedeltà: superficie neutra
 * calda, carte bianche (o carbone) con raggio ampio, e UNA carta di marca
 * PRUGNA che porta il numero del giorno e la barra del ciclo. L'albicocca
 * (--signal) è l'unico colore caldo: riempie la barra sulla carta e segna
 * le notifiche. Niente verde banconota, niente indaco, niente lime.
 *
 * La modalità segue il telefono: vedi useTheme (`auto`).
 */

// Marca — prugna. In scuro è appena più chiara così stacca dal quasi-nero.
const BAND_LIGHT = '#3B2A55';
const BAND_DARK = '#43305F';
const SIGNAL = '#E8925A'; // albicocca: barra del ciclo, pallino avvisi

const base = {
  // Famiglia prugna (--grad resta per compatibilità con vecchi componenti).
  g1: '#2A1D3D',
  g2: '#3B2A55',
  g3: '#7C64A8',
  grad: 'linear-gradient(120deg, var(--g-1) 0%, var(--g-2) 52%, var(--g-3) 100%)',
  signal: SIGNAL,
};

// ── SCURO: quasi-nero neutro, carte carbone, prugna che stacca ────────
const darkTheme = {
  id: 'aura',
  name: 'AURA',
  description: 'Prugna · chiaro o scuro',
  preview: ['#0E0F12', '#43305F', '#E8925A'],
  swatchBg: 'linear-gradient(120deg, #2A1D3D 0%, #43305F 60%, #7C64A8 100%)',
  bg: '#0E0F12',
  bg2: '#181A1F',
  mesh: 'none',
  glass: '#181A1F',
  glass2: '#22242A',
  glassBd: 'rgba(255,255,255,0.08)',
  glassBd2: 'rgba(255,255,255,0.15)',
  fg: 'rgba(242,241,238,0.97)',
  fg2: 'rgba(242,241,238,0.62)',
  fg3: 'rgba(242,241,238,0.42)',
  fg4: 'rgba(242,241,238,0.28)',
  fg5: 'rgba(242,241,238,0.10)',
  band: BAND_DARK,
  band2: '#5E4585',      // traccia della barra sopra la carta prugna
  bandInk: '#FFFFFF',
  bandInk2: 'rgba(255,255,255,0.68)',
  accent: '#9C86CE',
  accentDim: '#7C64A8',
  glow: 'rgba(156,134,206,0.30)',
  accent2: '#BCA9E4',
  accentText: '#B6A2E0',
  accentOnSolid: '#FFFFFF',
  logoFrom: '#BCA9E4',
  logoTo: '#43305F',
  ok: '#3ECF8E',
  info: '#B6A2E0',
  pink: '#F06FA8',
  gold: '#E9A23B',
  blue: '#5AA8F0',
  purple: '#B6A2E0',
  orange: '#E8925A',
  teal: '#3ECF8E',
  warn: '#E9A23B',
  red: '#F0616B',
};

// ── CHIARO: superficie neutra calda, carte bianche, prugna profonda ───
const lightOverrides = {
  bg: '#EEECE8',
  bg2: '#FFFFFF',
  mesh: 'none',
  glass: '#FFFFFF',
  glass2: '#E7E4DF',
  glassBd: 'rgba(20,18,16,0.08)',
  glassBd2: 'rgba(20,18,16,0.16)',
  fg: 'rgba(23,22,26,0.96)',
  fg2: 'rgba(23,22,26,0.58)',
  fg3: 'rgba(23,22,26,0.42)',
  fg4: 'rgba(23,22,26,0.28)',
  fg5: 'rgba(23,22,26,0.09)',
  band: BAND_LIGHT,
  band2: '#57427C',
  bandInk: '#FFFFFF',
  bandInk2: 'rgba(255,255,255,0.70)',
  accent: '#4A3569',
  accentDim: '#2A1D3D',
  glow: 'rgba(59,42,85,0.20)',
  accent2: '#7C64A8',
  accentText: '#43305F',
  accentOnSolid: '#FFFFFF',
  ok: '#0E7F52',
  info: '#43305F',
  pink: '#C43B7C',
  gold: '#B8770F',
  blue: '#1F6FD0',
  purple: '#57427C',
  orange: '#C9601F',
  teal: '#0E7F52',
  warn: '#B8770F',
  red: '#C13A2E',
};

export const themes = { aura: { ...darkTheme, ...base } };

export const themeList = Object.values(themes);

// "fg2" → "fg-2", "glassBd2" → "glass-bd-2", "accentDim" → "accent-dim"
const toCssKey = (k) => k.replace(/(\d)/g, '-$1').replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export const applyTheme = (themeId, mode = 'light') => {
  const theme = themes.aura;
  const root = document.documentElement;
  const isLight = mode !== 'dark';

  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    root.style.setProperty(`--${toCssKey(key)}`, value);
  });

  if (isLight) {
    Object.entries(lightOverrides).forEach(([key, value]) => {
      root.style.setProperty(`--${toCssKey(key)}`, value);
    });
  }

  // FIX storico: toCssKey trasforma glass2 → --glass-2, ma il CSS consuma
  // --glass2 (senza trattino).
  root.style.setProperty('--glass2', isLight ? lightOverrides.glass2 : theme.glass2);

  const activeAccent = isLight ? lightOverrides.accent : theme.accent;
  const activeGlow = isLight ? lightOverrides.glow : theme.glow;
  root.style.setProperty('--accent-glow', activeGlow);
  root.style.setProperty('--accent-10', `color-mix(in srgb, ${activeAccent} 10%, transparent)`);
  root.style.setProperty('--accent-20', `color-mix(in srgb, ${activeAccent} 20%, transparent)`);
  root.style.setProperty('--accent-40', `color-mix(in srgb, ${activeAccent} 40%, transparent)`);

  root.setAttribute('data-theme', 'aura');
  root.setAttribute('data-mode', isLight ? 'light' : 'dark');

  // Colora la chrome del browser/PWA come la superficie dell'app. In index.html
  // ci sono due meta (uno per prefers-color-scheme chiaro, uno per scuro) che
  // servono al PRIMO paint; qui li allineo entrambi alla modalità EFFETTIVA,
  // così una scelta manuale ("sempre scuro" su telefono chiaro) vince comunque.
  try {
    const color = isLight ? lightOverrides.bg : theme.bg;
    document.querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', color));
  } catch {}
};
