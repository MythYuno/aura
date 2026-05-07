import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

/**
 * "Spalmare o tenere?" — appears when the user adds a large extra income.
 * The split horizon defaults to "rest of the year" (12 - currentMonth + 1) but
 * the user can adjust it.
 */
export const SpliceModal = ({ open, amount, label, onConfirm, onClose }) => {
  const now = new Date();
  const remainingMonthsOfYear = 12 - now.getMonth();
  const [choice, setChoice] = useState('splice'); // 'splice' | 'keep'
  const [months, setMonths] = useState(Math.max(2, remainingMonthsOfYear));

  if (!open) return null;

  const perMonth = months > 0 ? amount / months : amount;

  const confirm = () => {
    haptic('success');
    onConfirm({
      kind: choice,
      amount,
      label,
      months: choice === 'splice' ? months : 1,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="splice-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="splice-card-wrap"
          role="dialog"
          aria-label="Distribuzione entrata"
          initial={{ scale: 0.92, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="splice-card">
            <div className="lbl">Entrata registrata</div>
            <div className="num"><span className="currency">€</span>{Math.round(amount).toLocaleString('it-IT')}</div>
            {label && <p className="splice-sub">{label}</p>}
            <p className="help">È una somma importante. Vuoi spalmarla sul resto dell'anno o tenerla questo mese?</p>

            <div className="splice-options">
              <button
                type="button"
                className={cn('splice-opt', choice === 'splice' && 'selected')}
                onClick={() => setChoice('splice')}
              >
                <div className="ot">Spalmala su {months} mesi</div>
                <div className="od">+<strong>€{Math.round(perMonth)}/mese</strong> al budget. Ti dura più a lungo.</div>
                {choice === 'splice' && (
                  <div className="splice-months">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMonths(Math.max(2, months - 1)); }}
                      aria-label="Meno mesi"
                    >−</button>
                    <span>{months} mesi</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMonths(Math.min(24, months + 1)); }}
                      aria-label="Più mesi"
                    >+</button>
                  </div>
                )}
              </button>
              <button
                type="button"
                className={cn('splice-opt', choice === 'keep' && 'selected')}
                onClick={() => setChoice('keep')}
              >
                <div className="ot">Tienila in questo mese</div>
                <div className="od">Aumenta il budget di questo mese di <strong>€{Math.round(amount)}</strong>. Per spese pazze o extra.</div>
              </button>
            </div>

            <div className="splice-foot">
              <button type="button" className="splice-cancel" onClick={onClose}>Annulla</button>
              <button type="button" className="splice-cta" onClick={confirm}>Conferma</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
