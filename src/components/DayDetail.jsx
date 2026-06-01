import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcX, IcAlert, IcEdit } from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { realCost, cn, maskedMoney } from '../lib/format.js';
import { checkAnomaly } from '../lib/anomaly.js';
import { EditTxSheet } from './EditTxSheet.jsx';
import { haptic } from '../lib/haptic.js';
import { useToast } from '../hooks/useUndoToast.js';

/**
 * Bottom-sheet that opens when the user taps a day on the month bar chart
 * or a heatmap cell. Shows the day's transactions, total, and an anomaly
 * badge when applicable.
 *
 * v0.8.1: BUGFIX. Prima `if (!open || dayTs == null) return null` PRIMA
 * di AnimatePresence faceva smontare il componente brutalmente — exit
 * animation non veniva mai eseguita. Ora la condizione è dentro
 * AnimatePresence così sheet scivola giù correttamente.
 * Inoltre `checkAnomaly` ora dentro useMemo per evitare ricalcolo a ogni render.
 */
export const DayDetail = ({ open, dayTs, allTxs, cats, onClose, onCategoryTap, privacy = false, onUpdateTx, onDeleteTx }) => {
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const isVisible = open && dayTs != null;

  // Wrapper attorno a onDeleteTx: invece di cancellare e basta, chiama il
  // delete con callback per mostrare il toast 'Annulla'. La store.deleteTx
  // accetta gia onUndo(restoreFn) come secondo argomento.
  const deleteWithUndo = (id) => {
    if (typeof onDeleteTx !== 'function') return;
    onDeleteTx(id, (restore) => {
      toast?.show?.('Spesa eliminata', restore);
    });
  };

  // Memoizzo i calcoli pesanti per non rifarli ad ogni render (es. quando
  // il sheet animato cambia stato, framer triggera N render — il loop
  // checkAnomaly per ogni tx diventava O(n*tx_giorno) inutilmente).
  const memo = useMemo(() => {
    if (!isVisible) return null;
    const dayStart = new Date(dayTs);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayTxs = allTxs.filter((t) => t.ts >= dayStart.getTime() && t.ts < dayEnd.getTime());
    const total = dayTxs.reduce((s, t) => s + realCost(t), 0);

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
    return { dayTxs, total, anomalyByTx, topAnomaly, dateLbl };
  }, [isVisible, dayTs, allTxs]);

  return (
    <>
      <AnimatePresence>
        {isVisible && memo && (
          <motion.div
            key="day-overlay"
            className="day-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <motion.div
              className="day-sheet"
              role="dialog"
              aria-label={`Spese di ${memo.dateLbl}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%', transition: { type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
              transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="day-sheet-handle" />
              <div className="day-sheet-head">
                <span className="date">{memo.dateLbl}</span>
                <button className="close" onClick={onClose} aria-label="Chiudi">
                  <IcX />
                </button>
              </div>
              <div className="day-sheet-total"
                   aria-label={privacy ? 'Importo totale nascosto per privacy' : `Totale speso: €${memo.total.toFixed(2)}`}
              >
                <div className="v" aria-hidden={privacy ? 'true' : undefined}>
                  <span className="currency">€</span>{maskedMoney(memo.total, { privacy, decimals: 2 })}
                </div>
                <div className="lb">Speso quel giorno</div>
                {memo.topAnomaly && (
                  <div className="anomaly-tag">
                    <IcAlert /> {memo.topAnomaly.multiple.toFixed(1)}× la tua media
                  </div>
                )}
              </div>

              {memo.dayTxs.length === 0 ? (
                <p className="day-sheet-empty">Nessuna spesa.</p>
              ) : (
                <div className="day-sheet-list">
                  {memo.dayTxs.map((t) => {
                    const cat = cats.find((c) => c.id === t.cat);
                    const Ic = iconForCategory(t.cat);
                    const canEdit = typeof onUpdateTx === 'function' && typeof onDeleteTx === 'function';
                    return (
                      <button
                        type="button"
                        className="day-sheet-tx"
                        key={t.id}
                        onClick={canEdit ? () => { haptic('light'); setEditing(t); } : undefined}
                        disabled={!canEdit}
                        style={{
                          width: '100%', textAlign: 'left',
                          background: 'transparent', border: 'none',
                          cursor: canEdit ? 'pointer' : 'default',
                          padding: '10px 0',
                        }}
                        aria-label={canEdit ? `Modifica: ${t.label || cat?.label || 'spesa'}` : undefined}
                      >
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
                            {canEdit && <span style={{ marginLeft: 6, color: 'var(--fg-4)', fontSize: 10 }}>· tap per modificare</span>}
                          </div>
                        </div>
                        <div className={cn('amt', memo.anomalyByTx[t.id] && 'warn')}>
                          €{maskedMoney(realCost(t), { privacy, decimals: 2 })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {memo.dayTxs.length > 0 && onCategoryTap && (
                <div className="day-sheet-foot">
                  <button className="btn" onClick={onClose}>Chiudi</button>
                  <button
                    className="btn primary"
                    onClick={() => onCategoryTap(memo.dayTxs[0].cat)}
                  >
                    Apri categoria
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet di modifica spesa (controllato qui dentro per non duplicarsi
          su Today/History — entrambi usano DayDetail). Fuori da AnimatePresence
          parent così la sua animazione di exit funziona anche se il parent si chiude. */}
      <EditTxSheet
        tx={editing}
        cats={cats}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => onUpdateTx?.(id, patch)}
        onDelete={deleteWithUndo}
      />
    </>
  );
};
