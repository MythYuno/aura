import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Sheet } from '../components/ui/Sheet.jsx';
import { Button } from '../components/ui/Button.jsx';
import { DynIcon } from '../components/ui/DynIcon.jsx';
import { parseNum, $d, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

export const AddExpenseSheet = ({ open, onClose, store }) => {
  const { cats, addTx } = store;
  const [val, setVal] = useState('');
  const [label, setLabel] = useState('');
  const [catId, setCatId] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [creditAmt, setCreditAmt] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open && !catId && cats[0]) setCatId(cats[0].id);
  }, [open, cats, catId]);

  const reset = () => {
    setVal(''); setLabel(''); setCatId(cats[0]?.id || '');
    setIsCredit(false); setCreditAmt(''); setTags('');
  };

  const handleSubmit = () => {
    const a = parseNum(val);
    if (a <= 0 || !catId) return;
    const tagsArr = tags.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
    addTx(a, catId, label, isCredit ? parseNum(creditAmt) : 0, tagsArr);
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
            style={{ color: 'var(--accent)' }}
            type="text" inputMode="decimal" placeholder="0,00"
            value={val} onChange={(e) => setVal(e.target.value)} autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Descrizione</label>
          <input className="inp" placeholder="Pranzo, caffè, benzina..." value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const sel = catId === c.id;
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => { haptic('light'); setCatId(c.id); }}
                  className="px-3.5 py-2.5 rounded-xl border flex items-center gap-2 text-[12px] font-semibold transition-all"
                  style={{
                    background: sel ? `${c.color}20` : 'var(--glass)',
                    borderColor: sel ? `${c.color}40` : 'var(--glass-bd)',
                    color: sel ? c.color : 'var(--fg-3)',
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
              <input className="inp" type="text" inputMode="decimal" placeholder="es. 40" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} />
              {parseNum(val) > 0 && parseNum(creditAmt) > 0 && (
                <div className="flex justify-between mt-3 p-3 rounded-xl" style={{ background: 'rgba(94,234,212,0.06)' }}>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4">Costo reale</div>
                    <div className="tnum text-[16px] font-bold" style={{ color: 'var(--accent)' }}>
                      €{$d(Math.max(0, parseNum(val) - parseNum(creditAmt)))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4">Ti torna</div>
                    <div className="tnum text-[16px] font-bold" style={{ color: 'var(--teal)' }}>
                      €{$d(parseNum(creditAmt))}
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
        <Button variant="primary" size="xl" onClick={handleSubmit} haptic="success" className="w-full">
          Registra Spesa
        </Button>
      </div>
    </Sheet>
  );
};
