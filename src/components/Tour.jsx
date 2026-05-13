import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcChevR, IcChevL, IcSpark } from '../lib/icons.jsx';
import { haptic } from '../lib/haptic.js';

// Tour scripts per screen. Each step targets a `data-tut` attribute.
const TOURS = {
  today: [
    { target: 'hero', title: 'Il numero del giorno', text: 'Quanto puoi spendere oggi senza sforare il mese. Si ricalcola dopo ogni spesa.' },
    { target: 'sub', title: "A colpo d'occhio", text: 'Ti restano X € per i prossimi giorni. Se aggiungi una spesa cala, se aggiungi un\'entrata sale.' },
    { target: 'chart', title: "L'andamento del mese", text: 'Ogni barra è un giorno. Quelle ambra/rosse sono spese fuori dal solito. Tap su una barra per vedere il dettaglio.' },
    { target: 'forecast', title: 'Previsione fine mese', text: 'Quanto spenderai e cosa ti resterà se mantieni questo ritmo. È una stima, non un giudizio.' },
    { target: 'quick', title: 'Registra in 2 tap', text: 'Spesa o entrata extra: scegli la tab. Tap sulla barra per inserire l\'importo.' },
    { target: 'tabs', title: 'Tre stanze', text: 'Oggi è qui. Soldi è dove vivono fissi, abbonamenti, obiettivi. Storia è il passato.' },
    { target: 'settings', title: 'Tutto il resto', text: "Tema, modalità chiaro/scuro, backup, categorie: tutto sotto l'icona ingranaggio." },
  ],
  money: [
    { target: 'free', title: 'Ti restano da spendere', text: "Lo stipendio meno tutto quello che è già 'promesso' ad altri (fissi, abbonamenti, obiettivi, imprevisti)." },
    { target: 'salary', title: 'Stipendio del mese', text: 'Atteso intorno al giorno paga. Se ricevi una cifra diversa, tap qui per rettificare — solo per questo mese.' },
    { target: 'annual', title: 'Spese annuali', text: "Assicurazione, bollo, tasse. AURA mette da parte 1/12 ogni mese: quando arriva la scadenza i soldi sono già pronti." },
    { target: 'extra', title: 'Entrate extra previste', text: 'Tredicesime, bonus, regali pianificati. Compaiono qui prima che arrivino.' },
    { target: 'areas', title: 'Aree di spesa', text: 'Niente budget rigidi. Vedi solo quanto spendi vs la TUA media storica. AURA impara da te.' },
  ],
  history: [
    { target: 'year', title: 'Gli ultimi 12 mesi', text: 'Quale mese hai speso di più, quale di meno. Tap su una barra per aprirlo.' },
    { target: 'anomalies', title: 'Da controllare', text: 'Spese molto fuori dal tuo pattern abituale. Bolletta del trimestre? Acquisto importante?' },
    { target: 'days', title: 'Giorno per giorno', text: 'Tutte le spese del mese, raggruppate per data. Tap per vedere il dettaglio.' },
  ],
};

const PADDING = 12; // viewport margin for tooltip
const MIN_SPOTLIGHT = 24;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const toSpotlightRect = (r) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = clamp(r.left - 6, PADDING, vw - PADDING - MIN_SPOTLIGHT);
  const y = clamp(r.top - 6, PADDING, vh - PADDING - MIN_SPOTLIGHT);
  const maxW = Math.max(MIN_SPOTLIGHT, vw - PADDING - x);
  const maxH = Math.max(MIN_SPOTLIGHT, vh - PADDING - y);
  const w = clamp(r.width + 12, MIN_SPOTLIGHT, maxW);
  const h = clamp(r.height + 12, MIN_SPOTLIGHT, maxH);
  return { x, y, w, h };
};

// Try repeatedly to find target; if not found within deadline, skip step.
const useTargetRect = (target, key, deadlineMs = 1500) => {
  const [rect, setRect] = useState(null);
  const [missed, setMissed] = useState(false);
  const didScrollRef = useRef(false);
  useEffect(() => {
    setRect(null);
    setMissed(false);
    didScrollRef.current = false;
    if (!target) return;
    const start = performance.now();
    let stop = false;
    let raf;
    const find = () => {
      if (stop) return;
      const el = document.querySelector(`[data-tut="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        // Don't return zero-size rects (element not laid out yet)
        if (r.width === 0 && r.height === 0) {
          raf = requestAnimationFrame(find);
          return;
        }

        // Keep target inside viewport before highlighting (important for
        // long, scrollable screens where targets can start off-screen).
        const isOut =
          r.top < PADDING ||
          r.bottom > window.innerHeight - PADDING ||
          r.left < PADDING ||
          r.right > window.innerWidth - PADDING;
        if (isOut && !didScrollRef.current) {
          didScrollRef.current = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          raf = requestAnimationFrame(find);
          return;
        }
        setRect(toSpotlightRect(r));
        return;
      }
      if (performance.now() - start > deadlineMs) {
        setMissed(true);
        return;
      }
      raf = requestAnimationFrame(find);
    };
    raf = requestAnimationFrame(find);
    const onScroll = () => {
      const el = document.querySelector(`[data-tut="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          setRect(toSpotlightRect(r));
        }
      }
    };
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [target, key, deadlineMs]);
  return { rect, missed };
};

export const Tour = ({ tourId, open, onClose }) => {
  const [step, setStep] = useState(0);
  const steps = TOURS[tourId] || [];
  const cur = steps[step];
  const { rect, missed } = useTargetRect(cur?.target, step);

  useEffect(() => { if (open) setStep(0); }, [open, tourId]);

  // If a target is missed (element doesn't exist or never lays out),
  // don't block the user — auto-advance to the next step.
  useEffect(() => {
    if (!open || !missed) return;
    const t = setTimeout(() => {
      if (step < steps.length - 1) setStep((s) => s + 1);
      else onClose?.('done');
    }, 200);
    return () => clearTimeout(t);
  }, [missed, open, step, steps.length, onClose]);

  if (!open || !cur) return null;

  const next = () => {
    haptic('light');
    if (step < steps.length - 1) setStep((s) => s + 1);
    else onClose?.('done');
  };
  const prev = () => { haptic('light'); if (step > 0) setStep((s) => s - 1); };
  const skip = () => { haptic('light'); onClose?.('skip'); };

  // Compute tooltip placement clamped to viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const tooltipMaxW = Math.min(360, vw - PADDING * 2);
  const tooltipMaxH = Math.max(170, vh - PADDING * 2);

  let tooltipStyle;
  if (!rect) {
    // Centered fallback while we look for target
    tooltipStyle = {
      top: '50%',
      left: PADDING,
      right: PADDING,
      maxWidth: tooltipMaxW,
      maxHeight: tooltipMaxH,
      marginInline: 'auto',
      transform: 'translateY(-50%)',
    };
  } else {
    const estimatedH = Math.min(260, tooltipMaxH);
    const spaceAbove = rect.y - PADDING;
    const spaceBelow = vh - (rect.y + rect.h) - PADDING;
    const placeAbove =
      (spaceAbove >= estimatedH && spaceAbove >= spaceBelow) ||
      (spaceBelow < estimatedH && spaceAbove > spaceBelow);
    const preferredTop = placeAbove
      ? rect.y - estimatedH - 14
      : rect.y + rect.h + 14;
    const clampedTop = clamp(preferredTop, PADDING, vh - PADDING - estimatedH);
    tooltipStyle = {
      top: clampedTop,
      left: PADDING,
      right: PADDING,
      maxWidth: tooltipMaxW,
      maxHeight: tooltipMaxH,
      marginInline: 'auto',
    };
  }

  return (
    <AnimatePresence>
      <motion.div
        className="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={skip}
      >
        {rect ? (
          <motion.div
            className="tour-spotlight"
            initial={false}
            animate={{
              x: rect.x,
              y: rect.y,
              width: rect.w,
              height: rect.h,
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
          />
        ) : (
          <div className="tour-dim" />
        )}

        <motion.div
          className="tour-tooltip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={tooltipStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="head">
            <span className="step-pill">{step + 1} / {steps.length}</span>
            <button className="skip" onClick={skip}>salta</button>
          </div>
          <h4>{cur.title}</h4>
          <p>{cur.text}</p>
          <div className="footer">
            <div className="dots">
              {steps.map((_, i) => (
                <span key={i} className={`dot ${i === step ? 'active' : ''}`} />
              ))}
            </div>
            {step > 0 && (
              <button className="nav-btn prev" onClick={prev} aria-label="Indietro">
                <IcChevL />
              </button>
            )}
            <button className="nav-btn next" onClick={next}>
              {step === steps.length - 1 ? (
                <>Fatto <IcSpark style={{ marginLeft: 4 }} /></>
              ) : (
                <>Avanti <IcChevR style={{ marginLeft: 4 }} /></>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
