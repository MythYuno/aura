import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { haptic } from '../lib/haptic.js';

const STEPS = [
  {
    target: 'hero',
    title: 'Budget giornaliero',
    text: 'Quanto puoi spendere oggi. Si ricalcola automaticamente.',
  },
  {
    target: 'fab',
    title: 'Aggiungi spesa',
    text: 'Tocca il + per registrare una spesa. Veloce e offline.',
  },
  {
    target: 'nav-planner',
    title: 'Pianifica',
    text: 'Spese fisse, abbonamenti, distribuzione budget.',
  },
  {
    target: 'nav-history',
    title: 'Storico',
    text: 'Tutte le transazioni. Confronta mese per mese.',
  },
  {
    target: 'nav-settings',
    title: 'Setup',
    text: 'Temi, categorie, widget, export CSV.',
  },
  {
    target: null,
    title: 'Pronto.',
    text: 'I tuoi dati stanno solo sul tuo dispositivo.',
  },
];

export const Tutorial = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const current = STEPS[step];

  useEffect(() => {
    if (!current.target) {
      setTargetRect(null);
      return;
    }
    let raf;
    const findTarget = () => {
      const el = document.querySelector(`[data-tut="${current.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
      }
    };
    raf = requestAnimationFrame(findTarget);
    const t = setTimeout(findTarget, 120);
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget, true);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget, true);
    };
  }, [step, current.target]);

  const goNext = () => {
    haptic('light');
    if (step < STEPS.length - 1) setStep((p) => p + 1);
    else onDone();
  };
  const goPrev = () => { haptic('light'); if (step > 0) setStep((p) => p - 1); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000]"
    >
      {/* Dimmed backdrop with spotlight cutout */}
      <svg width="100%" height="100%" className="absolute inset-0 pointer-events-auto">
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <motion.rect
                initial={false}
                animate={{ x: targetRect.x, y: targetRect.y, width: targetRect.w, height: targetRect.h }}
                transition={{ type: 'spring', damping: 30, stiffness: 240 }}
                rx="16" fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#tut-mask)" onClick={goNext} />
        {targetRect && (
          <motion.rect
            initial={false}
            animate={{ x: targetRect.x, y: targetRect.y, width: targetRect.w, height: targetRect.h }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
            rx="16" fill="none"
            stroke="var(--accent)" strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 12px var(--accent-glow))' }}
          />
        )}
      </svg>

      {/* Tooltip card — always docked at bottom on mobile, centered on desktop */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-1/2 -translate-x-1/2 pointer-events-auto z-[10001]"
        style={{
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          width: 'min(380px, calc(100vw - 24px))',
        }}
      >
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            border: '1px solid var(--accent-20)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px var(--accent-glow)',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-md"
                style={{ background: 'var(--accent-10)', color: 'var(--accent)' }}
              >
                {step + 1} / {STEPS.length}
              </span>
            </div>
            <button
              onClick={onDone}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'var(--glass)', color: 'var(--fg-3)' }}
              aria-label="Salta tutorial"
            >
              <X size={16} />
            </button>
          </div>

          <h3 className="text-lg font-semibold mb-1.5 tracking-tight">{current.title}</h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--fg-2)' }}>
            {current.text}
          </p>

          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{ background: i <= step ? 'var(--accent)' : 'var(--fg-5)' }}
              />
            ))}
          </div>

          {/* Action row — grande bottoni ben tappabili */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={goPrev}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                style={{ background: 'var(--glass)', color: 'var(--fg-2)' }}
              >
                <ChevronLeft size={16} />
                Indietro
              </button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={goNext}
              className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 text-black"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                boxShadow: '0 6px 20px var(--accent-glow)',
              }}
            >
              {step < STEPS.length - 1 ? (
                <>Avanti <ChevronRight size={16} /></>
              ) : (
                <>Fatto <Sparkles size={14} /></>
              )}
            </motion.button>
          </div>

          {/* Skip link */}
          {step < STEPS.length - 1 && (
            <button
              onClick={onDone}
              className="w-full mt-3 py-2 text-[12px] font-medium transition-colors"
              style={{ color: 'var(--fg-3)' }}
            >
              Salta tutorial
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
