// ─────────────────────────────────────────────────────────────────────────
// AURA — set di icone PREMIUM, basato su Phosphor Icons (MIT, ~9000 icone).
// Bundle locale (tree-shaken), nessun CDN → offline/privacy-safe.
//
// Due stili coerenti:
//   • UI controls (+, ×, frecce, occhio…)  → weight "bold"     (nitidi)
//   • categorie / feed / money flow         → weight "duotone"  (premium, 2 toni)
//
// Nomi storici `Ic*` mantenuti come alias → i punti di chiamata NON cambiano.
// Default size 1em (l'icona scala col testo). Cache → identità stabile.
// ─────────────────────────────────────────────────────────────────────────

import {
  Plus, Minus, X, Check, CaretRight, CaretLeft, ArrowRight, ArrowUpRight, ArrowDownLeft,
  Eye, EyeSlash, PencilSimple, Microphone, GearSix, Info,
  Sparkle, WarningCircle, Clock, CalendarBlank, TrendUp, TrendDown, Gauge, CreditCard,
  Money, Wallet, ShieldCheck, ArrowsClockwise, Target, PiggyBank, Receipt, Lightning, Drop,
  ForkKnife, House, Car, Heartbeat, Confetti, ShoppingBag, Shapes,
  User, Sun, DownloadSimple, UploadSimple, File, FileArrowDown, Trash, ArrowCounterClockwise, List,
} from '@phosphor-icons/react';

const _line = new Map();
const _duo = new Map();
const wL = (Ph) => { if (!_line.has(Ph)) _line.set(Ph, (p) => <Ph weight="bold" {...p} />); return _line.get(Ph); };
const wD = (Ph) => { if (!_duo.has(Ph)) _duo.set(Ph, (p) => <Ph weight="duotone" {...p} />); return _duo.get(Ph); };

// ─── UI controls (bold) ─────────────────────────────
export const IcPlus = wL(Plus);
export const IcMinus = wL(Minus);
export const IcX = wL(X);
export const IcCheck = wL(Check);
export const IcChevR = wL(CaretRight);
export const IcChevL = wL(CaretLeft);
export const IcArrowR = wL(ArrowRight);
export const IcArrowOut = wL(ArrowUpRight);   // money out ↗
export const IcArrowIn = wL(ArrowDownLeft);   // money in ↙
export const IcEye = wL(Eye);
export const IcEyeOff = wL(EyeSlash);
export const IcEdit = wL(PencilSimple);
export const IcMic = wL(Microphone);
export const IcSettings = wL(GearSix);
export const IcInfo = wL(Info);

// ─── Semantici / feed (duotone) ─────────────────────
export const IcSparkle = wD(Sparkle);
export const IcSpark = wD(Sparkle);
export const IcAlert = wD(WarningCircle);
export const IcClock = wD(Clock);
export const IcCalendar = wD(CalendarBlank);
export const IcTrendUp = wD(TrendUp);
export const IcTrendDown = wD(TrendDown);
export const IcGauge = wD(Gauge);
export const IcCard = wD(CreditCard);

// ─── Categorie (duotone) ────────────────────────────
export const IcFood = wD(ForkKnife);
export const IcTransport = wD(Car);
export const IcHome = wD(House);
export const IcHealth = wD(Heartbeat);
export const IcFun = wD(Confetti);
export const IcShopping = wD(ShoppingBag);
export const IcOther = wD(Shapes);

// ─── Money flow (duotone) ───────────────────────────
export const IcSalary = wD(Money);
export const IcWallet = wD(Wallet);
export const IcShield = wD(ShieldCheck);
export const IcSubscription = wD(ArrowsClockwise);
export const IcGoal = wD(Target);
export const IcPiggy = wD(PiggyBank);
export const IcReceipt = wD(Receipt);
export const IcBolt = wD(Lightning);
export const IcDrop = wD(Drop);
export const IcUser = wD(User);
export const IcSun = wD(Sun);
export const IcDownload = wD(DownloadSimple);
export const IcUpload = wD(UploadSimple);
export const IcFile = wD(File);
export const IcFileDown = wD(FileArrowDown);
export const IcTrash = wD(Trash);
export const IcReset = wD(ArrowCounterClockwise);
export const IcList = wD(List);

// ─── Map: catId → icona (categorie di default) ──────
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

// Match per ETICHETTA: dà un'icona sensata alle categorie personalizzate,
// riusando SOLO le icone già importate (zero peso extra sul bundle).
const LABEL_RULES = [
  [/cib|spes|aliment|ristorant|pizz|panin|caff|colazion|pranzo|cena|sushi/, ForkKnife],
  [/cas|affitt|mutuo|condomin|arred/, House],
  [/auto|benzin|carburant|gasoli|trasport|tren|metro|tram|taxi|pedagg|parchegg|moto|scooter/, Car],
  [/salut|medic|farmac|dottor|dentist|ospedal|palestr|gym|fitness|sport|visita/, Heartbeat],
  [/bollett|luce|elettric|\bgas\b|acqua|utenz|tari|rifiut/, Receipt],
  [/abbonam|netflix|spotify|streaming|disney|prime|youtube|canone/, ArrowsClockwise],
  [/shopping|vestit|abbigliam|scarp|moda|negozi|regal/, ShoppingBag],
  [/svag|cinema|divertim|gioc|hobby|concert|teatro|evento|viagg|vacanz/, Confetti],
  [/risparm|salvadan|fondo|investiment/, PiggyBank],
  [/tass|impost|\bf24\b|\biva\b|tribut|banc/, Wallet],
  [/bellezz|estetic|parrucchier|cosmetic/, Sparkle],
];

/**
 * Componente icona per una categoria.
 * @param {string} catId  id (default → mappa diretta)
 * @param {string} [label] etichetta (categorie personalizzate → match)
 */
export const iconForCategory = (catId, label = '') => {
  if (CATEGORY_ICON[catId]) return CATEGORY_ICON[catId];
  const l = String(label || catId || '').toLowerCase();
  for (const [re, Ico] of LABEL_RULES) if (re.test(l)) return wD(Ico);
  return IcOther;
};
