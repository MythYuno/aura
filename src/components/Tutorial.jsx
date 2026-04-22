import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button.jsx';

const steps = [
  { target: 'hero', title: 'Il tuo budget giornaliero', text: 'Questa è la cifra che puoi spendere oggi per restare in budget. Si aggiorna automaticamente.' },
  { target: 'fab', title: 'Aggiungi spesa', text: 'Tocca il pulsante centrale per registrare una nuova spesa in pochi secondi.' },
  { target: 'nav-planner', title: 'Pianificazione', text: 'Imposta stipendio, spese fisse, obiettivi e buffer di sicurezza.' },
  { target: 'nav-history', title: 'Storico', text: 'Consulta tutte le transazioni, cerca per tag, confronta mesi.' },
  { target: 'nav-settings', title: 'Personalizza', text: 'Cambia tema, categorie, widget della home, esporta dati.' },
  { target: 'privacy', title: 'Privacy totale', text: 'Tocca qui per nascondere gli importi con un blur. I tuoi dati non lasciano mai il dispositivo.' },
];

export const Tutorial = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const current = steps[step];

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(`[data-tut="${current.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } else {
        setRect(null);
      }
    };
    update();
    const id = setTimeout(update, 200);
    window.addEventListener('resize', update);
    return () => { clearTimeout(id); window.removeEventListener('resize', update); };
  }, [current.target]);

  const next = () => {
    if (step === steps.length - 1) onDone();
    else setStep(step + 1);
  };

  const prev = () => step > 0 && setStep(step - 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] pointer-events-auto"
    >
      {/* Spotlight SVG */}
      <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
        <defs>
          <mask id="spotMask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <motion.rect
                initial={false}
                animate={{ x: rect.left - 8, y: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#spotMask)" />
        {rect && (
          <motion.rect
            initial={false}
            animate={{ x: rect.left - 8, y: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            rx="16"
            fill="none"
            stroke="var(--ok)"
            strokeWidth="2"
            strokeDasharray="6 4"
            style={{ filter: 'drop-shadow(0 0 12px var(--accent-glow))' }}
          />
        )}
      </svg>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 -translate-x-1/2 max-w-sm w-[calc(100%-32px)] bg-bg-1 border border-bd-2 rounded-3xl p-5 shadow-2xl backdrop-blur-xl"
          style={{
            bottom: 'calc(110px + env(safe-area-inset-bottom))',
          }}
        >
          {/* Progress */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === step ? 24 : 14,
                    background: i <= step ? 'var(--ok)' : 'var(--fg-5)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={onDone}
              className="w-8 h-8 rounded-lg hover:bg-bg-2 flex items-center justify-center text-fg-4 hover:text-fg-1 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <h3 className="text-lg font-semibold mb-1.5 tracking-tight">{current.title}</h3>
          <p className="text-sm text-fg-3 leading-relaxed mb-4">{current.text}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-fg-4 font-semibold">
              {step + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="default" size="default" onClick={prev}>← Indietro</Button>
              )}
              <Button variant="primary" size="default" onClick={next} icon={step === steps.length - 1 ? null : <ArrowRight size={14} />}>
                {step === steps.length - 1 ? 'Fatto!' : 'Avanti'}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
