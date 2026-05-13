import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcSpark, IcX } from '../lib/icons.jsx';

/**
 * Listens to the global `aura:update` event (dispatched from main.jsx when a
 * new service-worker version is installed) and surfaces a small toast at the
 * bottom of the screen. The user taps "Ricarica" to apply the update; the
 * SW skips waiting and the page reloads.
 */
export const UpdateToast = () => {
  const [apply, setApply] = useState(null);

  useEffect(() => {
    const onUpdate = (e) => setApply(() => e.detail?.apply);
    window.addEventListener('aura:update', onUpdate);
    return () => window.removeEventListener('aura:update', onUpdate);
  }, []);

  return (
    <AnimatePresence>
      {apply && (
        <motion.div
          className="update-toast"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          role="status"
          aria-live="polite"
        >
          <span className="update-toast-ic"><IcSpark /></span>
          <p>Nuova versione disponibile</p>
          <button
            className="update-toast-btn"
            onClick={() => apply()}
            aria-label="Ricarica per applicare l'aggiornamento"
          >
            Ricarica
          </button>
          <button
            className="update-toast-x"
            onClick={() => setApply(null)}
            aria-label="Più tardi"
          >
            <IcX />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
