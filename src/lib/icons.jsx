// Custom SVG icon set. Inline, small, currentColor-based.
// All icons are 24×24 viewBox, stroke-width 1.6, stroke-linecap round.

const defaults = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Ic = (props) => <svg {...defaults} {...props}>{props.children}</svg>;

// ─── UI ─────────────────────────────────────────────
export const IcPlus = (p) => (
  <Ic {...p}><path d="M12 5v14M5 12h14" /></Ic>
);
export const IcMinus = (p) => (
  <Ic {...p}><path d="M5 12h14" /></Ic>
);
export const IcX = (p) => (
  <Ic {...p}><path d="M18 6L6 18M6 6l12 12" /></Ic>
);
export const IcCheck = (p) => (
  <Ic {...p}><path d="M5 12l5 5L20 7" /></Ic>
);
export const IcChevR = (p) => (
  <Ic {...p}><path d="M9 6l6 6-6 6" /></Ic>
);
export const IcChevL = (p) => (
  <Ic {...p}><path d="M15 6l-6 6 6 6" /></Ic>
);
export const IcArrowOut = (p) => (
  // ↗ — money out
  <Ic {...p}><path d="M7 17L17 7M9 7h8v8" /></Ic>
);
export const IcArrowIn = (p) => (
  // ↙ — money in
  <Ic {...p}><path d="M17 7L7 17M15 17H7v-8" /></Ic>
);
export const IcEye = (p) => (
  <Ic {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Ic>
);
export const IcEyeOff = (p) => (
  <Ic {...p}><path d="M2 2l20 20M10.6 10.6a2 2 0 002.8 2.8M16.7 16.7a10.5 10.5 0 01-4.7 1.3c-6.5 0-10-7-10-7a18 18 0 014.3-5M9 5.1A10.5 10.5 0 0112 5c6.5 0 10 7 10 7a18 18 0 01-2.6 3.6" /></Ic>
);
export const IcEdit = (p) => (
  <Ic {...p}><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z" /></Ic>
);
export const IcMic = (p) => (
  <Ic {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" /></Ic>
);
export const IcSparkle = (p) => (
  <Ic {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></Ic>
);
export const IcSettings = (p) => (
  <Ic {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></Ic>
);
export const IcInfo = (p) => (
  <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v.01M11 12h1v4h1" /></Ic>
);
export const IcAlert = (p) => (
  <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16v.01" /></Ic>
);
export const IcClock = (p) => (
  <Ic {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ic>
);
export const IcCalendar = (p) => (
  <Ic {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Ic>
);
export const IcSpark = (p) => (
  // sparkles for AUTO badge
  <Ic {...p}><path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15l-1.7-4M5 16l1 2.4L8 19l-2 1-1 2-1-2-2-1 2-1z" /></Ic>
);
export const IcTrendUp = (p) => (
  <Ic {...p}><polyline points="3 17 9 11 13 15 21 7" /></Ic>
);

// ─── Categorie ──────────────────────────────────────
// Stile pulito, monocromatici, currentColor. Non li rendo "carini" — sono indicatori.
export const IcFood = (p) => (
  <Ic {...p}><path d="M3 2v8a2 2 0 002 2h0a2 2 0 002-2V2M5 12v10M14 2v20M14 8h3a2 2 0 002-2V2" /></Ic>
);
export const IcTransport = (p) => (
  <Ic {...p}><path d="M5 17h14M6 17v-3a2 2 0 012-2h8a2 2 0 012 2v3M5 9l1.5-4h11L19 9M5 9h14M9 17v2M15 17v2M8 13h.01M16 13h.01" /></Ic>
);
export const IcHome = (p) => (
  <Ic {...p}><path d="M3 12L12 3l9 9M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" /></Ic>
);
export const IcHealth = (p) => (
  <Ic {...p}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Ic>
);
export const IcFun = (p) => (
  <Ic {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 9h4M3 14h4M17 9h4M17 14h4" /></Ic>
);
export const IcShopping = (p) => (
  <Ic {...p}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></Ic>
);
export const IcOther = (p) => (
  <Ic {...p}><path d="M20 12h.01M12 12h.01M4 12h.01" /></Ic>
);

// ─── Money flow ─────────────────────────────────────
export const IcSalary = (p) => (
  <Ic {...p}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Ic>
);
export const IcShield = (p) => (
  <Ic {...p}><path d="M12 22s8-4 8-12V4l-8-3-8 3v6c0 8 8 12 8 12z" /></Ic>
);
export const IcSubscription = (p) => (
  <Ic {...p}><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" /></Ic>
);
export const IcGoal = (p) => (
  <Ic {...p}><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" /></Ic>
);
export const IcBolt = (p) => (
  <Ic {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></Ic>
);
export const IcDrop = (p) => (
  <Ic {...p}><path d="M12 3l5 7a5 5 0 11-10 0z" /></Ic>
);

// ─── Map: catId → icon component
export const CATEGORY_ICON = {
  food: IcFood,
  transport: IcTransport,
  home: IcHome,
  health: IcHealth,
  fun: IcFun,
  wants: IcShopping,
  shopping: IcShopping,
  other: IcOther,
};
export const iconForCategory = (catId) => CATEGORY_ICON[catId] || IcOther;
