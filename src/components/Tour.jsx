import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcChevR, IcChevL, IcSpark } from '../lib/icons.jsx';
import { haptic } from '../lib/haptic.js';

// Tour scripts per screen. Each step targets a `data-tut` attribute on the page.
const TOURS = {
  today: [
    {
      target: 'hero',
      title: 'Il numero del giorno',
      text: 'Quanto puoi spendere oggi senza sforare il mese. Si ricalcola dopo ogni spesa.',
    },
    {
      target: 'sub',
      title: 'A colpo d\'occhio',
      text: 'Ti restano X € per i prossimi giorni. Se aggiungi una spesa cala, se aggiungi un\'entrata sale.',
    },
    {
      target: 'chart',
      title: 'L\'andamento del mese',
      text: 'Ogni barra è un giorno. Quelle ambra/rosse sono spese fuori dal solito. Tap su una barra per vedere il dettaglio.',
    },
    {
      target: 'forecast',
      title: 'Previsione fine mese',
      text: 'Quanto spenderai e cosa ti resterà se mantieni questo ritmo. È una stima, non un giudizio.',
    },
    {
      target: 'quick',
      title: 'Registra in 2 tap',
      text: 'Spesa o entrata extra: scegli la tab. Long-press sul + per parlare invece di scrivere.',
    },
    {
      target: 'tabs',
      title: 'Tre stanze',
      text: 'Oggi è qui. Soldi è dove vivono fissi, abbonamenti, obiettivi. Storia è il passato.',
    },
    {
      target: 'avatar',
      title: 'Tutto il resto',
      text: 'Tema, modalità chiaro/scuro, backup, categorie: tutto sotto il tuo avatar.',
    },
  ],
  money: [
    { target: 'free', title: 'Ti restano da spendere', text: 'Lo stipendio meno tutto quello che è già "promesso" ad altri (fissi, abbonamenti, obiettivi, imprevisti).' },
    { target: 'salary', title: 'Stipendio del mese', text: 'Atteso intorno al giorno paga. Se ricevi una cifra diversa, tap qui per rettificare — solo per questo mese.' },
    { target: 'annual', title: 'Spese annuali', text: 'Assicurazione, bollo, tasse. AURA mette da parte 1/12 ogni mese: quando arriva la scadenza i soldi sono già pronti.' },
    { target: 'extra', title: 'Entrate extra previste', text: 'Tredicesime, bonus, regali pianificati. Compaiono qui prima che arrivino.' },
    { target: 'areas', title: 'Aree di spesa', text: 'Niente budget rigidi. Vedi solo quanto spendi vs la TUA media storica. AURA impara da te.' },
  ],
  history: [
    { target: 'year', title: 'Gli ultimi 12 mesi', text: 'Quale mese hai speso di più, quale di meno. Tap su una barra per aprirlo.' },
    { target: 'anomalies', title: 'Da controllare', text: 'Spese molto fuori dal tuo pattern abituale. Bolletta del trimestre? Acquisto importante?' },
    { target: 'days', title: 'Giorno per giorno', text: 'Tutte le spese del mese, raggruppate per data. Tap per vedere il dettaglio.' },
  ],
};

const useTargetRect = (target, version) => {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!target) { setRect(null); return; }
    let raf;
    const find = () => {
      const el = document.querySelector(`[data-tut="${target}"]`);
      if (!el) {
        raf = requestAnimationFrame(find);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        x: r.left - 6,
        y: r.top - 6,
        w: r.width + 12,
        h: r.height + 12,
        bottom: r.bottom,
        top: r.top,
      });
    };
    raf = requestAnimationFrame(find);
    const t = setTimeout(find, 120);
    const onResize = () => find();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [target, version]);
  return rect;
};

export const Tour = ({ tourId, open, onClose }) => {
  const [step, setStep] = useState(0);
  const steps = TOURS[tourId] || [];
  const cur = steps[step];
  const rect = useTargetRect(cur?.target, step);

  useEffect(() => { if (open) setStep(0); }, [open, tourId]);

  if (!open || !cur) return null;

  const next = () => {
    haptic('light');
    if (step < steps.length - 1) setStep((s) => s + 1);
    else { onClose?.('done'); }
  };
  const prev = () => { haptic('light'); if (step > 0) setStep((s) => s - 1); };
  const skip = () => { haptic('light'); onClose?.('skip'); };

  // Decide tooltip placement: above the target if target is in the lower half
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const targetCenterY = rect ? rect.y + rect.h / 2 : viewportH / 2;
  const placeAbove = targetCenterY > viewportH * 0.5;

  return (
    <AnimatePresence>
      <motion.div
        className="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={skip}
      >
        {/* dim with a "hole" — implemented via box-shadow trick */}
        {rect ? (
          <motion.div
            className="tour-spotlight"
            initial={false}
            animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
          />
        ) : (
          <div className="tour-dim" />
        )}

        {/* tooltip */}
        <motion.div
          className={`tour-tooltip ${placeAbove ? 'above' : 'below'}`}
          initial={{ opacity: 0, y: placeAbove ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={
            rect
              ? placeAbove
                ? { bottom: viewportH - rect.y + 16, left: 16, right: 16, maxWidth: 360, marginInline: 'auto' }
                : { top: rect.y + rect.h + 16, left: 16, right: 16, maxWidth: 360, marginInline: 'auto' }
              : { top: '50%', left: 16, right: 16, maxWidth: 360, marginInline: 'auto', transform: 'translateY(-50%)' }
          }
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
