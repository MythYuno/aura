import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Palette, Moon, Sun, SunMoon, LayoutGrid, Download, Upload, Trash2, HelpCircle, ChevronRight, Check, Plus, X } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import { DynIcon } from '../components/ui/DynIcon.jsx';
import { parseNum, uid, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { exportCSV, parseCSVImport } from '../lib/csv.js';
import { availableIcons, availableColors } from '../data/categories.js';
import { allWidgets } from '../data/widgets.js';
import { themeList } from '../data/themes.js';
import { useAnimatedThemeToggle } from '../hooks/useTheme.js';

export const SettingsScreen = ({ store, onReset, onRestartTutorial }) => {
  const {
    name, setName, salary, setSalary, resetDay, setResetDay,
    currentSavings, setCurrentSavings, cats, setCats, widgets, setWidgets,
    theme, setTheme, themeId, setThemeId, txs, importTxs,
  } = store;

  const [showWSet, setShowWSet] = useState(false);
  const [showCatEdit, setShowCatEdit] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);
  const toggleMode = useAnimatedThemeToggle(setTheme);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSVImport(ev.target.result, cats);
        setImportPreview(parsed);
      } catch (err) {
        alert('Errore nel leggere il CSV');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-[26px] font-light tracking-tight">Impostazioni</h1>
      </motion.div>

      {/* Profile */}
      <Card padding="md" delay={0.05} className="col-span-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-4">Profilo</div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Nome</label>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Stipendio</label>
              <input className="inp" type="text" inputMode="decimal" value={salary}
                     onChange={(e) => setSalary(parseNum(e.target.value))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Reset day</label>
              <input className="inp" type="number" min={1} max={28} value={resetDay}
                     onChange={(e) => setResetDay(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Risparmi sul conto (€)</label>
            <input className="inp" type="text" inputMode="decimal" value={currentSavings}
                   onChange={(e) => setCurrentSavings(parseNum(e.target.value))} />
          </div>
        </div>
      </Card>

      {/* Theme Picker */}
      <Card padding="md" delay={0.1} className="col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={14} className="text-ok" />
          <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4">Tema Visivo</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {themeList.map((t, i) => {
            const isSel = themeId === t.id;
            return (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptic('medium'); setThemeId(t.id); }}
                className={cn(
                  'relative p-3.5 rounded-2xl text-left transition-all border overflow-hidden',
                  isSel ? 'bg-ok/10 border-ok/20' : 'bg-bg-2 border-bd-1 hover:border-bd-2'
                )}
              >
                {isSel && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                       style={{ background: 'var(--ok)' }}>
                    <Check size={10} strokeWidth={3} className="text-black" />
                  </div>
                )}
                <div className="flex gap-1 mb-2.5">
                  {t.preview.map((c, pi) => (
                    <div
                      key={pi}
                      className="rounded-md"
                      style={{
                        width: pi === 0 ? 28 : 20,
                        height: 28,
                        background: c,
                        boxShadow: pi > 0 ? `0 0 8px ${c}55` : 'none',
                      }}
                    />
                  ))}
                </div>
                <div className={cn('text-[13px] font-bold mb-0.5', isSel && 'text-ok')}>{t.name}</div>
                <div className="text-[10px] text-fg-4 leading-tight">{t.description}</div>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Color mode */}
      <Card padding="md" delay={0.15}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-3">Modalità Colore</div>
        <div className="flex gap-1.5">
          {[
            { v: 'dark', l: 'Scuro', Icon: Moon },
            { v: 'light', l: 'Chiaro', Icon: Sun },
            { v: 'auto', l: 'Auto', Icon: SunMoon },
          ].map((t) => {
            const Ico = t.Icon;
            const isSel = theme === t.v;
            return (
              <motion.button
                key={t.v}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { haptic('light'); toggleMode(t.v, e); }}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                  isSel ? 'bg-ok/10 border-ok/20' : 'bg-bg-2 border-bd-1 hover:border-bd-2'
                )}
              >
                <Ico size={16} className={isSel ? 'text-ok' : 'text-fg-3'} />
                <span className={cn('text-[11px] font-semibold', isSel ? 'text-ok' : 'text-fg-3')}>{t.l}</span>
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Tutorial */}
      <Card onClick={onRestartTutorial} padding="md" delay={0.15} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ok/10 border border-ok/20 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={18} className="text-ok" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Rivedi Tutorial</div>
            <div className="text-[11px] text-fg-4">Tour guidato a 6 step</div>
          </div>
          <ChevronRight size={16} className="text-fg-5" />
        </div>
      </Card>

      {/* Categories */}
      <Card padding="md" delay={0.2} className="col-span-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-4">Categorie</div>
        <div className="flex flex-col gap-2">
          {cats.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCatEdit(showCatEdit === cat.id ? null : cat.id)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border"
                  style={{ background: `${cat.color}15`, borderColor: `${cat.color}30` }}
                >
                  <DynIcon name={cat.icon} size={15} color={cat.color} />
                </button>
                <input className="inp flex-1 py-2.5 text-[13px]" value={cat.label}
                       onChange={(e) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, label: e.target.value } : c))} />
                <button onClick={() => { haptic('warning'); setCats((p) => p.filter((c) => c.id !== cat.id)); }}
                        className="p-2 text-red hover:bg-red/10 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
              {showCatEdit === cat.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-4 rounded-xl bg-bg-1 border border-bd-1"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Icona</div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {availableIcons.map((ic) => (
                      <button key={ic} onClick={() => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, icon: ic } : c))}
                              className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all"
                              style={{
                                background: cat.icon === ic ? `${cat.color}20` : 'var(--bg-2)',
                                borderColor: cat.icon === ic ? `${cat.color}40` : 'var(--bd-1)',
                              }}>
                        <DynIcon name={ic} size={15} color={cat.icon === ic ? cat.color : 'var(--fg-4)'} />
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Colore</div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableColors.map((cl) => (
                      <button key={cl} onClick={() => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, color: cl } : c))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{
                                background: cl,
                                opacity: cat.color === cl ? 1 : 0.5,
                                outline: cat.color === cl ? '2px solid var(--fg-1)' : 'none',
                                outlineOffset: 1,
                              }}>
                        {cat.color === cl && <Check size={14} strokeWidth={3} className="text-black" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ))}
          <button onClick={() => { const id = String(uid()); setCats((p) => [...p, { id, label: 'Nuova', icon: 'Tag', color: '#888', weight: 0 }]); setShowCatEdit(id); }}
                  className="w-full py-3 rounded-xl bg-bg-2 border border-dashed border-bd-2 text-fg-3 text-[12px] font-semibold hover:bg-bg-3 hover:border-bd-3 transition-all">
            + Aggiungi Categoria
          </button>
        </div>
      </Card>

      {/* Customize home */}
      <Card onClick={() => setShowWSet(true)} padding="md" delay={0.25} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ok/10 border border-ok/20 flex items-center justify-center flex-shrink-0">
            <LayoutGrid size={18} className="text-ok" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Personalizza Home</div>
            <div className="text-[11px] text-fg-4">Scegli widget da mostrare</div>
          </div>
          <ChevronRight size={16} className="text-fg-5" />
        </div>
      </Card>

      {/* CSV Export */}
      <Card onClick={() => exportCSV(txs, cats)} padding="md" delay={0.25} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(94,234,212,0.1)', borderColor: 'rgba(94,234,212,0.2)' }}>
            <Download size={18} style={{ color: 'var(--teal)' }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Esporta CSV</div>
            <div className="text-[11px] text-fg-4">Scarica tutte le transazioni</div>
          </div>
          <ChevronRight size={16} className="text-fg-5" />
        </div>
      </Card>

      {/* CSV Import */}
      <Card onClick={() => fileInputRef.current?.click()} padding="md" delay={0.3} className="cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(103,232,249,0.1)', border: '1px solid rgba(103,232,249,0.2)' }}>
            <Upload size={18} style={{ color: 'var(--info)' }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Importa CSV</div>
            <div className="text-[11px] text-fg-4">Carica transazioni da file</div>
          </div>
          <ChevronRight size={16} className="text-fg-5" />
        </div>
      </Card>

      {/* Reset */}
      <motion.button
        onClick={() => { haptic('warning'); onReset(); }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="col-span-2 text-left p-5 rounded-2xl flex items-center gap-3 border"
        style={{ background: 'rgba(252,165,165,0.06)', borderColor: 'rgba(252,165,165,0.12)' }}
      >
        <Trash2 size={20} className="text-red" />
        <div>
          <div className="text-sm font-semibold text-red">Reset Dati</div>
          <div className="text-[11px] text-red/50">Cancella tutto e ricomincia</div>
        </div>
      </motion.button>

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

      {/* Widget settings sheet */}
      <Sheet open={showWSet} onClose={() => setShowWSet(false)} title="Personalizza Home">
        <p className="text-[12px] text-fg-4 mb-4">Tocca per attivare/disattivare widget.</p>
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-2">Attivi ({widgets.length})</div>
        <div className="flex flex-col gap-1.5 mb-6">
          {widgets.map((wid) => {
            const w = allWidgets.find((a) => a.id === wid);
            if (!w) return null;
            return (
              <div key={w.id} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-ok/5 border border-ok/10">
                <div className="w-9 h-9 rounded-xl bg-ok/10 flex items-center justify-center">
                  <DynIcon name={w.icon} size={15} color="var(--ok)" />
                </div>
                <div className="flex-1 text-[13px] font-semibold">{w.label}</div>
                <button onClick={() => { haptic('warning'); setWidgets((p) => p.filter((x) => x !== w.id)); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red hover:bg-red/10 transition-colors">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
        {allWidgets.filter((w) => !widgets.includes(w.id)).length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-2">Disponibili</div>
            <div className="flex flex-col gap-1.5">
              {allWidgets.filter((w) => !widgets.includes(w.id)).map((w) => (
                <button key={w.id} onClick={() => { haptic('success'); setWidgets((p) => [...p, w.id]); }}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-bg-2 border border-bd-1 text-left hover:bg-bg-3 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-bg-3 flex items-center justify-center">
                    <DynIcon name={w.icon} size={15} color="var(--fg-3)" />
                  </div>
                  <div className="flex-1 text-[13px] font-semibold text-fg-3">{w.label}</div>
                  <Plus size={16} className="text-ok" />
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>

      {/* Import preview */}
      {importPreview && (
        <Sheet open={true} onClose={() => setImportPreview(null)} title={`Importa ${importPreview.length} transazioni`}>
          <div className="flex flex-col gap-3">
            <div className="max-h-[300px] overflow-auto">
              {importPreview.slice(0, 5).map((t, i) => {
                const cat = cats.find((c) => c.id === t.cat);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{t.label || cat?.label}</div>
                      <div className="text-[10px] text-fg-4">{new Date(t.ts).toLocaleDateString('it-IT')} · {cat?.label}</div>
                    </div>
                    <div className="tnum text-[13px] font-bold">€{t.amount.toFixed(2)}</div>
                  </div>
                );
              })}
              {importPreview.length > 5 && <div className="text-center text-[11px] text-fg-4 py-2">... e altre {importPreview.length - 5}</div>}
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="lg" className="flex-1" onClick={() => setImportPreview(null)}>Annulla</Button>
              <Button variant="primary" size="lg" className="flex-1" onClick={() => { importTxs(importPreview); setImportPreview(null); }}>Importa</Button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
};
