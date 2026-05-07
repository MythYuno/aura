import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcMic, IcX } from '../lib/icons.jsx';
import { startVoiceCapture, parseVoiceCommand } from '../lib/voice.js';
import { haptic } from '../lib/haptic.js';

/**
 * Modal that listens to the mic, transcribes, and parses out amount + label.
 * Resolves with { amount, label } on confirmation.
 */
export const VoiceCapture = ({ open, onClose, onResult }) => {
  const [partial, setPartial] = useState('');
  const [final, setFinal] = useState(null);
  const [error, setError] = useState(null);
  const ctrl = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPartial('');
    setFinal(null);
    setError(null);

    const onPartial = (text) => setPartial(text);
    const result = startVoiceCapture({ lang: 'it-IT', onPartial });
    ctrl.current = result;
    result.promise
      .then((text) => {
        const parsed = parseVoiceCommand(text);
        setFinal({ raw: text, ...parsed });
      })
      .catch((e) => {
        setError(e.message || 'Non ho capito');
      });
    return () => { try { ctrl.current?.stop(); } catch {} };
  }, [open]);

  const confirm = () => {
    if (!final || final.amount == null) return;
    haptic('success');
    onResult({ amount: final.amount, label: final.label });
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="voice-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="voice-modal"
          role="dialog"
          aria-label="Aggiungi con voce"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="voice-card">
            <button className="voice-close" onClick={onClose} aria-label="Chiudi">
              <IcX />
            </button>
            <div className={`voice-mic ${final ? 'done' : ''}`}>
              <IcMic />
            </div>
            <div className="listening">{final ? 'Capito' : error ? 'Riprova' : 'In ascolto…'}</div>
            <p className="heard">
              {error ? (
                <span style={{ color: 'var(--warn)' }}>{error}</span>
              ) : final ? (
                <>"{final.raw}"</>
              ) : partial ? (
                <>"{partial}"</>
              ) : (
                <span style={{ color: 'var(--fg-3)' }}>Prova: "Ho speso 12 euro al bar"</span>
              )}
            </p>
            {final && final.amount != null && (
              <div className="voice-result">
                <strong>€{final.amount.toFixed(2)}</strong>
                {final.label && <> · {final.label}</>}
                <button className="voice-cta" onClick={confirm}>Conferma</button>
              </div>
            )}
            {final && final.amount == null && (
              <div className="voice-result" style={{ color: 'var(--warn)' }}>
                Importo non rilevato. Riprova.
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
