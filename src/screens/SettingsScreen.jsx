import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Confirm } from '../components/ui/Confirm.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import {
  IcChevR, IcCheck, IcX, IcPlus, IcEdit, IcSpark,
} from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { parseNum, uid, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { exportCSV, parseCSVImport } from '../lib/csv.js';
import { exportBackup, parseBackupFile, applyBackup } from '../lib/backup.js';
import { useToast } from '../hooks/useUndoToast.js';
import { availableColors } from '../data/categories.js';
import { themeList } from '../data/themes.js';

/**
 * Settings — opens as a sheet from the top-left avatar.
 * Sections: profile · theme · mode · home-categories · backup · advanced.
 * "Rivedi tutorial" resets tutorialState so the next screen visits replay.
 */
export const SettingsScreen = ({ store, onReset, onClose }) => {
  const toast = useToast();
  const {
    name, setName, salary, setSalary, resetDay, setResetDay,
    cats, setCats, homeCats, setHomeCats,
    themeId, setThemeId, theme, setTheme, txs, importTxs,
    catRules, removeCatRule,
    resetAllTutorials,
  } = store;

  const [showCatEdit, setShowCatEdit] = useState(null);
  const [showHomePicker, setShowHomePicker] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [backupError, setBackupError] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmCatDelete, setConfirmCatDelete] = useState(null); // { catId, count }
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  const handleCSV = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try { setImportPreview(parseCSVImport(ev.target.result, cats)); }
      catch { toast?.show?.('Errore lettura CSV', null); }
    };
    r.readAsText(f);
    e.target.value = '';
  };
  const handleBackup = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try { setBackupPreview(parseBackupFile(ev.target.result)); setBackupError(null); }
      catch (err) { setBackupError(err.message); setTimeout(() => setBackupError(null), 4000); }
    };
    r.readAsText(f);
    e.target.value = '';
  };
  const confirmRestore = () => {
    if (!backupPreview) return;
    haptic('success');
    applyBackup(backupPreview.data);
    setBackupPreview(null);
    setTimeout(() => window.location.reload(), 100);
  };
  const doExportBackup = () => {
    haptic('medium');
    try { exportBackup(); toast?.show?.('Backup scaricato', null); }
    catch { toast?.show?.('Errore esportazione', null); }
  };

  const replayTutorials = () => {
    haptic('light');
    resetAllTutorials();
    onClose?.();
    toast?.show?.('Tutorial pronto · cambia schermata per vederlo', null);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Profile */}
      <Card padding="md">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-3">Profilo</div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-1.5">Nome</label>
        <input className="inp mb-3" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-1.5">Stipendio</label>
            <input className="inp" type="text" inputMode="decimal" value={salary} onChange={(e) => setSalary(parseNum(e.target.value))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-1.5">Giorno paga</label>
            <input className="inp" type="number" min={1} max={28} value={resetDay} onChange={(e) => setResetDay(parseInt(e.target.value) || 1)} />
          </div>
        </div>
      </Card>

      {/* Mode */}
      <Card padding="md">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-3">Modalità</div>
        <div role="radiogroup" className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-bd)' }}>
          {[{ id: 'dark', label: 'Scuro' }, { id: 'light', label: 'Chiaro' }].map((m) => {
            const sel = theme === m.id;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={sel}
                onClick={() => { haptic('light'); setTheme(m.id); }}
                className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors"
                style={{
                  background: sel ? 'var(--accent-10)' : 'transparent',
                  color: sel ? 'var(--accent)' : 'var(--fg-3)',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Theme */}
      <Card padding="md">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-3">Tema</div>
        <div className="grid grid-cols-2 gap-2">
          {themeList.map((t) => {
            const sel = themeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { haptic('medium'); setThemeId(t.id); }}
                className="relative p-3 rounded-xl text-left transition-all border overflow-hidden"
                style={{
                  background: sel ? 'var(--accent-10)' : 'var(--glass)',
                  borderColor: sel ? 'var(--accent-20)' : 'var(--glass-bd)',
                }}
              >
                {sel && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                    <IcCheck style={{ width: 11, height: 11, color: '#000' }} />
                  </div>
                )}
                {/* Swatch a gradiente + tre dot dei colori dominanti */}
                <div
                  className="rounded-lg mb-2 relative overflow-hidden"
                  style={{
                    height: 36,
                    background: t.swatchBg || `linear-gradient(135deg, ${t.preview[0]}, ${t.preview[1] || t.preview[0]}, ${t.preview[2] || t.preview[0]})`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 4, padding: 6 }}>
                    {t.preview.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: c,
                          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className={cn('text-[12px] font-bold mb-0.5', sel && 'text-accent')}>{t.name}</div>
                <div className="text-[10px] text-fg-4 leading-tight">{t.description}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Quick-cats picker */}
      <Card onClick={() => setShowHomePicker(true)} padding="md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-10)' }}>
            <IcEdit style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Categorie scorciatoia</div>
            <div className="text-[11px] text-fg-4">Scegli quali 4 mostrare nel quick-add</div>
          </div>
          <IcChevR style={{ color: 'var(--fg-5)' }} />
        </div>
      </Card>

      {/* Categories */}
      <Card padding="md">
        <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-3">Categorie</div>
        <div className="flex flex-col gap-1.5">
          {cats.map((c) => {
            const Icon = iconForCategory(c.id);
            const editing = showCatEdit === c.id;
            return (
              <div key={c.id}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCatEdit(editing ? null : c.id)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center border"
                    style={{ background: `${c.color}15`, borderColor: `${c.color}30`, color: c.color }}
                  >
                    <Icon />
                  </button>
                  <input
                    className="inp flex-1 py-2.5 text-[13px]"
                    value={c.label}
                    onChange={(e) => setCats((p) => p.map((x) => x.id === c.id ? { ...x, label: e.target.value } : x))}
                  />
                  <button
                    onClick={() => {
                      haptic('warning');
                      const count = txs.filter((t) => t.cat === c.id).length;
                      if (count > 0) {
                        setConfirmCatDelete({ catId: c.id, label: c.label, count });
                      } else {
                        setCats((p) => p.filter((x) => x.id !== c.id));
                      }
                    }}
                    aria-label="Rimuovi categoria"
                    className="p-2 text-red"
                  >
                    <IcX />
                  </button>
                </div>
                {editing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 rounded-xl"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-bd)' }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-4 mb-2">Colore</div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableColors.map((cl) => (
                        <button
                          key={cl}
                          onClick={() => setCats((p) => p.map((x) => x.id === c.id ? { ...x, color: cl } : x))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{
                            background: cl,
                            opacity: c.color === cl ? 1 : 0.5,
                            outline: c.color === cl ? '2px solid var(--fg)' : 'none',
                            outlineOffset: 1,
                          }}
                        >
                          {c.color === cl && <IcCheck style={{ width: 12, height: 12, color: '#000' }} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
          <button
            onClick={() => {
              const id = `c_${Date.now()}`;
              setCats((p) => [...p, { id, label: 'Nuova', icon: 'Tag', color: '#888', weight: 5 }]);
              setShowCatEdit(id);
            }}
            className="w-full py-3 rounded-xl mt-1 text-[12px] font-semibold border border-dashed"
            style={{ background: 'var(--glass)', borderColor: 'var(--glass-bd-2)', color: 'var(--fg-3)' }}
          >
            + Aggiungi categoria
          </button>
        </div>
      </Card>

      {/* Categorization rules */}
      {catRules.length > 0 && (
        <Card padding="md">
          <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mb-3">
            Regole categorizzazione
          </div>
          <div className="flex flex-col gap-1.5">
            {catRules.map((r) => {
              const cat = cats.find((c) => c.id === r.catId);
              return (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--glass)', border: '1px solid var(--glass-bd)' }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>se contiene</span>
                  <code style={{ background: 'var(--glass2)', padding: '2px 6px', borderRadius: 4, fontSize: 12, color: 'var(--accent)' }}>{r.contains}</code>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>→</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: cat?.color || 'var(--fg)' }}>{cat?.label || '?'}</span>
                  <button
                    onClick={() => removeCatRule(r.id)}
                    style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                  >
                    <IcX />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Replay tutorial */}
      <Card onClick={replayTutorials} padding="md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-10)' }}>
            <IcSpark style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Rivedi tutorial</div>
            <div className="text-[11px] text-fg-4">Riparti dalla home, ti guido di nuovo</div>
          </div>
          <IcChevR style={{ color: 'var(--fg-5)' }} />
        </div>
      </Card>

      {/* Backup */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mt-2 px-1">Backup</div>
      <Card onClick={doExportBackup} padding="md">
        <div className="text-sm font-semibold">Backup completo (JSON)</div>
        <div className="text-[11px] text-fg-4">Tutto: spese, categorie, profilo</div>
      </Card>
      <Card onClick={() => backupInputRef.current?.click()} padding="md">
        <div className="text-sm font-semibold">Ripristina backup</div>
        <div className="text-[11px] text-fg-4">Sostituisce i dati attuali</div>
      </Card>
      {backupError && <p style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px' }}>{backupError}</p>}

      <div className="text-[10px] font-bold uppercase tracking-widest text-fg-4 mt-2 px-1">CSV</div>
      <Card onClick={() => exportCSV(txs, cats)} padding="md">
        <div className="text-sm font-semibold">Esporta CSV</div>
        <div className="text-[11px] text-fg-4">Solo transazioni</div>
      </Card>
      <Card onClick={() => fileInputRef.current?.click()} padding="md">
        <div className="text-sm font-semibold">Importa CSV</div>
        <div className="text-[11px] text-fg-4">Da file</div>
      </Card>

      {/* Reset */}
      <button
        onClick={() => { haptic('warning'); setConfirmReset(true); }}
        aria-label="Reset di tutti i dati"
        className="text-left p-4 rounded-2xl flex items-center gap-3 border mt-2"
        style={{ background: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.2)' }}
      >
        <div className="text-sm font-semibold text-red">Reset dati</div>
        <div className="text-[11px] text-red/60 ml-auto">Cancella tutto</div>
      </button>

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCSV} className="hidden" />
      <input ref={backupInputRef} type="file" accept=".json,application/json" onChange={handleBackup} className="hidden" />

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onReset}
        title="Cancellare tutti i dati?"
        msg="Verranno persi spese, abbonamenti, obiettivi e impostazioni. Esporta prima un backup se vuoi recuperarli."
        danger
      />

      <Confirm
        open={!!confirmCatDelete}
        onClose={() => setConfirmCatDelete(null)}
        onConfirm={() => {
          if (!confirmCatDelete) return;
          const { catId } = confirmCatDelete;
          // Reassign existing txs to "other" before removing the category
          const otherExists = cats.some((c) => c.id === 'other');
          store.setTxs((p) => p.map((t) => t.cat === catId ? { ...t, cat: otherExists ? 'other' : (cats.find((c) => c.id !== catId)?.id || t.cat) } : t));
          setCats((p) => p.filter((c) => c.id !== catId));
        }}
        title={confirmCatDelete ? `Eliminare "${confirmCatDelete.label}"?` : ''}
        msg={confirmCatDelete
          ? `Hai ${confirmCatDelete.count} ${confirmCatDelete.count === 1 ? 'spesa' : 'spese'} in questa categoria. Verranno spostate in "Altro".`
          : ''}
        danger
      />

      {/* Quick-cats picker sheet */}
      {showHomePicker && (
        <Sheet open={true} onClose={() => setShowHomePicker(false)} title="Categorie scorciatoia">
          <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14 }}>
            Scegli fino a 3 categorie come scorciatoie sulla home. La quarta è sempre "Altro".
          </p>
          <div className="flex flex-col gap-1.5">
            {cats.filter((c) => c.id !== 'other').map((c) => {
              const Icon = iconForCategory(c.id);
              const sel = homeCats.includes(c.id);
              const canAdd = homeCats.length < 3 || sel;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (sel) setHomeCats(homeCats.filter((x) => x !== c.id));
                    else if (canAdd) setHomeCats([...homeCats, c.id]);
                  }}
                  disabled={!canAdd}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                  style={{
                    background: sel ? `${c.color}15` : 'var(--glass)',
                    border: `1px solid ${sel ? c.color + '40' : 'var(--glass-bd)'}`,
                    color: sel ? c.color : 'var(--fg-2)',
                    opacity: canAdd ? 1 : 0.4,
                    cursor: canAdd ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Icon />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.label}</span>
                  {sel && <IcCheck />}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      {/* Backup restore preview */}
      {backupPreview && (
        <Sheet open={true} onClose={() => setBackupPreview(null)} title="Ripristina backup">
          <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>
            Questa operazione <strong style={{ color: 'var(--red)' }}>sovrascriverà tutti i dati attuali</strong>.
          </p>
          <div style={{ marginTop: 14, padding: 12, background: 'var(--glass)', borderRadius: 12, fontSize: 12, color: 'var(--fg-2)' }}>
            <div>Profilo: <strong>{backupPreview.summary.name}</strong></div>
            <div>Transazioni: <strong>{backupPreview.summary.txs}</strong></div>
            <div>Categorie: <strong>{backupPreview.summary.cats}</strong></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button variant="default" size="lg" className="flex-1" onClick={() => setBackupPreview(null)}>Annulla</Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={confirmRestore}>Ripristina</Button>
          </div>
        </Sheet>
      )}

      {/* Import preview */}
      {importPreview && (
        <Sheet open={true} onClose={() => setImportPreview(null)} title={`Importa ${importPreview.length} transazioni`}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="default" size="lg" className="flex-1" onClick={() => setImportPreview(null)}>Annulla</Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={() => { importTxs(importPreview); setImportPreview(null); }}>Importa</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
};
