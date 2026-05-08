import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcPlus, IcEdit, IcArrowOut, IcArrowIn, IcAlert, IcSpark, IcX } from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { parseNum, $d, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { suggestCategory } from '../lib/intelligence.js';

/**
 * Inline quick-add. Two tabs (Spesa / Entrata extra). Opens a sheet to fill in
 * details. The "+" button on the home is just a visual affordance — tap
 * anywhere on the input to start.
 *
 * onSubmit({ kind: 'spend' | 'income', amount, label, catId })
 * onLargeIncome(amount) → caller may choose to open a SpliceModal first.
 */
export const QuickAdd = ({
  homeCats = [],
  cats = [],
  txs = [],
  catRules = [],
  onSubmit,
  onLargeIncome,
  onEditCats,
  onWhy,
}) => {
  const [tab, setTab] = useState('spend');
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [label, setLabel] = useState('');
  const [catId, setCatId] = useState('');
  const [touchedCat, setTouchedCat] = useState(false);

  // Smart cat suggestion (only for spese)
  const suggestedCat = useMemo(() => {
    if (tab !== 'spend' || !label) return null;
    return suggestCategory(label, txs, cats, catRules);
  }, [tab, label, txs, cats, catRules]);

  useEffect(() => {
    if (open && tab === 'spend' && !touchedCat && suggestedCat) {
      setCatId(suggestedCat);
    }
  }, [open, tab, touchedCat, suggestedCat]);
  useEffect(() => {
    if (open && tab === 'spend' && !catId) {
      setCatId(homeCats[0] || cats[0]?.id || '');
    }
  }, [open, tab, catId, homeCats, cats]);

  const reset = () => {
    setAmt('');
    setLabel('');
    setCatId('');
    setTouchedCat(false);
  };
  const close = () => { reset(); setOpen(false); };

  const valTrim = amt.trim();
  const amount = parseNum(amt);
  const valLooksValid = valTrim === '' || /^[€\s]*\d+([.,]\d+)?[€\s]*$/.test(valTrim);
  const valError = valTrim !== '' && (!valLooksValid || amount <= 0);
  const canSubmit = amount > 0 && (tab === 'income' || !!catId) && !valError;

  const submit = () => {
    if (!canSubmit) return;
    if (tab === 'income') {
      // Caller decides if it's "large enough" to splice
      if (onLargeIncome && amount >= 500) {
        onLargeIncome({ amount, label });
        close();
        return;
      }
      onSubmit({ kind: 'income', amount, label });
    } else {
      onSubmit({ kind: 'spend', amount, label, catId });
    }
    close();
  };

  // Top 4 categories to surface as quick chips
  const chipCats = useMemo(() => {
    const wanted = (homeCats.length ? homeCats : cats.slice(0, 4).map((c) => c.id))
      .map((id) => cats.find((c) => c.id === id))
      .filter(Boolean);
    return wanted.slice(0, 4);
  }, [homeCats, cats]);

  return (
    <>
      <div className="quick-block" data-tut="quick">
        <div className="quick-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'spend'}
            className={cn('quick-tab', tab === 'spend' && 'active')}
            onClick={() => { haptic('light'); setTab('spend'); }}
          >
            <IcArrowOut className="ic" /> Spesa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'income'}
            className={cn('quick-tab', tab === 'income' && 'active', tab === 'income' && 'income')}
            onClick={() => { haptic('light'); setTab('income'); }}
          >
            <IcArrowIn className="ic" /> Entrata extra
          </button>
        </div>

        <button
          type="button"
          className="quick-bar"
          onClick={() => { haptic('light'); setOpen(true); }}
          aria-label={tab === 'spend' ? 'Registra spesa' : 'Registra entrata extra'}
        >
          <span className="plus" aria-hidden="true">
            <IcPlus />
          </span>
          <span className="input-fake">
            Registra <span className="accent">{tab === 'spend' ? 'spesa' : 'entrata'}</span>
            <span style={{ color: 'var(--fg-4)' }}> · tap qui</span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="qa-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              className="qa-sheet"
              role="dialog"
              aria-label={tab === 'spend' ? 'Nuova spesa' : 'Nuova entrata'}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="qa-handle" />
              <div className="qa-head">
                <div className="qa-head-tabs">
                  <button
                    type="button"
                    className={cn('qa-head-tab', tab === 'spend' && 'active')}
                    onClick={() => setTab('spend')}
                  >
                    <IcArrowOut className="ic" /> Spesa
                  </button>
                  <button
                    type="button"
                    className={cn('qa-head-tab', tab === 'income' && 'active')}
                    onClick={() => setTab('income')}
                  >
                    <IcArrowIn className="ic" /> Entrata
                  </button>
                </div>
                <button type="button" className="qa-close" onClick={close} aria-label="Chiudi">
                  <IcX />
                </button>
              </div>

              <div className="qa-body">
                <label className="qa-lbl">Importo</label>
                <input
                  className="qa-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  autoFocus
                />
                {valError && (
                  <p className="qa-err">
                    <IcAlert /> Importo non valido (es. 12,50)
                  </p>
                )}

                <label className="qa-lbl" style={{ marginTop: 12 }}>
                  {tab === 'spend' ? 'Descrizione' : 'Descrizione (opzionale)'}
                </label>
                <input
                  className="qa-input"
                  type="text"
                  placeholder={tab === 'spend' ? 'Pranzo, caffè, benzina…' : 'Bonus, regalo, 13ma…'}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />

                {tab === 'spend' && (
                  <>
                    <div className="qa-cat-head">
                      <label className="qa-lbl">Categoria</label>
                      {!touchedCat && suggestedCat && label.trim() && (
                        <>
                          <span className="qa-auto">
                            <IcSpark /> AUTO
                          </span>
                          {onWhy && (
                            <button
                              type="button"
                              className="qa-why"
                              onClick={(e) => { e.preventDefault(); onWhy({ label, catId: suggestedCat }); }}
                            >
                              perché?
                            </button>
                          )}
                        </>
                      )}
                      {onEditCats && (
                        <button type="button" className="qa-edit" onClick={onEditCats}>
                          <IcEdit /> modifica
                        </button>
                      )}
                    </div>
                    <div className="qa-cats" role="radiogroup">
                      {cats.map((c) => {
                        const Icon = iconForCategory(c.id);
                        const sel = catId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={sel}
                            className={cn('qa-cat', sel && 'active')}
                            onClick={() => { haptic('light'); setTouchedCat(true); setCatId(c.id); }}
                            style={sel ? {
                              background: `${c.color}1F`,
                              borderColor: `${c.color}40`,
                              color: c.color,
                            } : undefined}
                          >
                            <Icon />
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                className="qa-cta"
                onClick={submit}
                disabled={!canSubmit}
              >
                {tab === 'spend' ? 'Registra spesa' : 'Registra entrata'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
