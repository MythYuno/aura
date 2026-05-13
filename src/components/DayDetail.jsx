import { motion, AnimatePresence } from 'framer-motion';
import { IcX, IcAlert } from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { realCost, cn, maskedMoney } from '../lib/format.js';
import { checkAnomaly } from '../lib/anomaly.js';

/**
 * Bottom-sheet that opens when the user taps a day on the month bar chart
 * or a heatmap cell. Shows the day's transactions, total, and an anomaly
 * badge when applicable.
 */
export const DayDetail = ({ open, dayTs, allTxs, cats, onClose, onCategoryTap, privacy = false }) => {
  if (!open || dayTs == null) return null;

  const dayStart = new Date(dayTs);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dayTxs = allTxs.filter((t) => t.ts >= dayStart.getTime() && t.ts < dayEnd.getTime());
  const total = dayTxs.reduce((s, t) => s + realCost(t), 0);

  // Per-tx anomaly map + the strongest anomaly of the day
  const anomalyByTx = {};
  let topAnomaly = null;
  for (let i = 0; i < dayTxs.length; i++) {
    const t = dayTxs[i];
    const a = checkAnomaly(t, allTxs);
    if (a.isAnomaly) {
      anomalyByTx[t.id] = a;
      if (!topAnomaly || a.multiple > topAnomaly.multiple) topAnomaly = a;
    }
  }

  const dateLbl = dayStart
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        className="day-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="day-sheet"
          role="dialog"
          aria-label={`Spese di ${dateLbl}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="day-sheet-handle" />
          <div className="day-sheet-head">
            <span className="date">{dateLbl}</span>
            <button className="close" onClick={onClose} aria-label="Chiudi">
              <IcX />
            </button>
          </div>
          <div className="day-sheet-total">
            <div className="v">
              <span className="currency">€</span>{maskedMoney(total, { privacy, decimals: 2 })}
            </div>
            <div className="lb">Speso quel giorno</div>
            {topAnomaly && (
              <div className="anomaly-tag">
                <IcAlert /> {topAnomaly.multiple.toFixed(1)}× la tua media
              </div>
            )}
          </div>

          {dayTxs.length === 0 ? (
            <p className="day-sheet-empty">Nessuna spesa.</p>
          ) : (
            <div>
              {dayTxs.map((t) => {
                const cat = cats.find((c) => c.id === t.cat);
                const Ic = iconForCategory(t.cat);
                return (
                  <div className="day-sheet-tx" key={t.id}>
                    <div
                      className="ic-mono"
                      style={cat ? { color: cat.color } : undefined}
                    >
                      <Ic />
                    </div>
                    <div className="body">
                      <div className="lbl">{t.label || cat?.label || 'Spesa'}</div>
                      <div className="meta">
                        {new Date(t.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{cat?.label || '—'}
                      </div>
                    </div>
                    <div className={cn('amt', anomalyByTx[t.id] && 'warn')}>
                      €{maskedMoney(realCost(t), { privacy, decimals: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {dayTxs.length > 0 && onCategoryTap && (
            <div className="day-sheet-foot">
              <button className="btn" onClick={onClose}>Chiudi</button>
              <button
                className="btn primary"
                onClick={() => onCategoryTap(dayTxs[0].cat)}
              >
                Apri categoria
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
