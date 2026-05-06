import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, AlertCircle, Sparkles } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet.jsx';
import { Button } from '../components/ui/Button.jsx';
import { DynIcon } from '../components/ui/DynIcon.jsx';
import { parseNum, $d, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { suggestCategory } from '../lib/intelligence.js';

export const AddExpenseSheet = ({ open, onClose, store }) => {
  const { cats, addTx, txs } = store;
  const [val, setVal] = useState('');
  const [label, setLabel] = useState('');
  const [catId, setCatId] = useState('');
  const [touchedCat, setTouchedCat] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [creditAmt, setCreditAmt] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open && !catId && cats[0]) setCatId(cats[0].id);
  }, [open, cats, catId]);

  // Smart auto-pick of category from description (only if user hasn't manually picked)
  const suggestedCat = useMemo(
    () => suggestCategory(label, txs, cats),
    [label, txs, cats]
  );
  useEffect(() => {
    if (!open) return;
    if (touchedCat) return;
    if (!suggestedCat) return;
    if (suggestedCat !== catId) setCatId(suggestedCat);
  }, [open, touchedCat, suggestedCat, catId]);

  const reset = () => {
    setVal(''); setLabel(''); setCatId(cats[0]?.id || '');
    setTouchedCat(false);
    setIsCredit(false); setCreditAmt(''); setTags('');
  };

  // Validation: detect "abc" / "10,5,3" garbage so we can warn instead of silent 0
  const valTrim = val.trim();
  const amount = parseNum(val);
  const valLooksValid = valTrim === '' || /^[€\s]*\d+([.,]\d+)?[€\s]*$/.test(valTrim);
  const valError = valTrim !== '' && (!valLooksValid || amount <= 0);
  const creditTrim = creditAmt.trim();
  const creditNum = parseNum(creditAmt);
  const creditError = isCredit && creditTrim !== '' && (creditNum <= 0 || creditNum > amount);
  const canSubmit = amount > 0 && !!catId && !valError && !creditError;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const tagsArr = tags.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
    addTx(amount, catId, label, isCredit ? creditNum : 0, tagsArr);
    reset();
    onClose();
  };

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="Nuova Spesa">
      <div className="flex flex-col gap-4 pb-20">
        {/* Amount */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Importo totale (€)</label>
          <input
            className="inp text-center tnum text-[28px] py-5 font-light"
            style={{
              color: valError ? 'var(--red)' : 'var(--accent)',
              borderColor: valError ? 'rgba(248,113,113,0.5)' : undefined,
            }}
            type="text" inputMode="decimal" placeholder="0,00"
            aria-invalid={valError || undefined}
            aria-describedby={valError ? 'amount-error' : undefined}
            value={val} onChange={(e) => setVal(e.target.value)} autoFocus
          />
          <AnimatePresence>
            {valError && (
              <motion.p
                id="amount-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 mt-2 text-[11px] font-medium"
                style={{ color: 'var(--red)' }}
              >
                <AlertCircle size={12} />
                Inserisci un importo valido (es. 12,50)
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Descrizione</label>
          <input className="inp" placeholder="Pranzo, caffè, benzina..." value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        {/* Category */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4">Categoria</label>
            {!touchedCat && suggestedCat && label.trim() && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-[10px] font-bold tracking-wide"
                style={{ color: 'var(--accent)' }}
              >
                <Sparkles size={11} />
                AUTO
              </motion.span>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoria">
            {cats.map((c) => {
              const sel = catId === c.id;
              const isAuto = sel && !touchedCat && suggestedCat === c.id && label.trim();
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { haptic('light'); setTouchedCat(true); setCatId(c.id); }}
                  role="radio"
                  aria-checked={sel}
                  aria-label={`Categoria ${c.label}`}
                  className="px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-[12px] font-semibold transition-all relative"
                  style={{
                    background: sel ? `${c.color}20` : 'var(--glass)',
                    borderColor: sel ? `${c.color}40` : 'var(--glass-bd)',
                    color: sel ? c.color : 'var(--fg-3)',
                    boxShadow: isAuto ? `0 0 0 2px ${c.color}30` : undefined,
                  }}
                >
                  <DynIcon name={c.icon} size={14} color={sel ? c.color : 'var(--fg-4)'} />
                  {c.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Tag (opzionali)</label>
          <input className="inp" placeholder="#vacanza, #regali_natale..." value={tags} onChange={(e) => setTags(e.target.value)} />
          <p className="text-[10px] text-fg-5 mt-1.5">Separa più tag con spazi o virgole</p>
        </div>

        {/* Credit toggle */}
        <button
          onClick={() => { haptic('light'); setIsCredit((p) => !p); }}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left"
          style={{
            background: isCredit ? 'rgba(94,234,212,0.08)' : 'var(--glass)',
            borderColor: isCredit ? 'rgba(94,234,212,0.2)' : 'var(--glass-bd)',
          }}
        >
          <RotateCcw size={18} style={{ color: isCredit ? 'var(--teal)' : 'var(--fg-4)' }} />
          <div className="flex-1">
            <div className={cn('text-[13px] font-semibold', isCredit ? 'text-teal' : 'text-fg-3')} style={{ color: isCredit ? 'var(--teal)' : undefined }}>
              A credito / Rimborso
            </div>
            <div className="text-[10px] text-fg-4">Parte dell'importo ti verrà restituita</div>
          </div>
          <div className="w-11 h-6 rounded-full p-0.5 transition-all"
               style={{ background: isCredit ? 'var(--teal)' : 'var(--glass2)' }}>
            <motion.div
              animate={{ x: isCredit ? 18 : 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-5 h-5 rounded-full"
              style={{ background: isCredit ? '#000' : 'var(--fg-4)' }}
            />
          </div>
        </button>

        {/* Credit amount */}
        <AnimatePresence>
          {isCredit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl p-4 border overflow-hidden"
              style={{ background: 'rgba(94,234,212,0.05)', borderColor: 'rgba(94,234,212,0.12)' }}
            >
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-2"
                     style={{ color: 'var(--teal)' }}>
                Quanto ti verrà rimborsato? (€)
              </label>
              <input
                className="inp" type="text" inputMode="decimal" placeholder="es. 40"
                value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)}
                aria-invalid={creditError || undefined}
                style={creditError ? { borderColor: 'rgba(248,113,113,0.5)' } : undefined}
              />
              <AnimatePresence>
                {creditError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 mt-2 text-[11px] font-medium"
                    style={{ color: 'var(--red)' }}
                  >
                    <AlertCircle size={12} />
                    {creditNum > amount ? "Il rimborso non può superare l'importo" : 'Inserisci un valore valido'}
                  </motion.p>
                )}
              </AnimatePresence>
              {amount > 0 && creditNum > 0 && !creditError && (
                <div className="flex justify-between mt-3 p-3 rounded-xl" style={{ background: 'rgba(94,234,212,0.06)' }}>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4">Costo reale</div>
                    <div className="tnum text-[16px] font-bold" style={{ color: 'var(--accent)' }}>
                      €{$d(Math.max(0, amount - creditNum))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4">Ti torna</div>
                    <div className="tnum text-[16px] font-bold" style={{ color: 'var(--teal)' }}>
                      €{$d(creditNum)}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky submit */}
      <div
        className="sticky bottom-0 left-0 right-0 -mx-5 px-5 pt-3 pb-3"
        style={{
          background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <Button
          variant="primary" size="xl" onClick={handleSubmit} haptic="success"
          className="w-full" disabled={!canSubmit}
        >
          Registra Spesa
        </Button>
      </div>
    </Sheet>
  );
};
