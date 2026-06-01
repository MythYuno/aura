import { useState, useEffect, useMemo } from 'react';
import { Sheet } from './ui/Sheet.jsx';
import { Button } from './ui/Button.jsx';
import { IcAlert, IcX } from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { parseNum, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

/**
 * Sheet di modifica per una spesa già registrata.
 * Permette di cambiare importo, descrizione, categoria e data.
 * Sul submit chiama updateTx(id, patch); su Elimina chiama onDelete.
 */
export const EditTxSheet = ({ tx, cats, onClose, onSave, onDelete }) => {
  const open = !!tx;

  const [amt, setAmt] = useState('');
  const [label, setLabel] = useState('');
  const [catId, setCatId] = useState('');
  const [dateStr, setDateStr] = useState(''); // YYYY-MM-DD

  // Inizializza i campi all'apertura
  useEffect(() => {
    if (!tx) return;
    setAmt(String(tx.amount || ''));
    setLabel(tx.label || '');
    setCatId(tx.cat || '');
    const d = new Date(tx.ts || Date.now());
    setDateStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }, [tx?.id]);

  const amount = parseNum(amt);
  const valTrim = amt.trim();
  const valLooksValid = valTrim === '' || /^[€\s]*\d+([.,]\d+)?[€\s]*$/.test(valTrim);
  const valError = valTrim !== '' && (!valLooksValid || amount <= 0);
  // Verifica che la data sia parsabile (formato YYYY-MM-DD valido) E che
  // sia una data REALE (es. 30/02 non lo è — JS la ribilancerebbe a 02/03
  // facendo finire la tx nel giorno sbagliato). Controllo: dopo aver
  // costruito la Date, anno/mese/giorno devono coincidere con l'input.
  const dateValid = (() => {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return false;
    const [y, m, d] = parts;
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
    if (y < 1970 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    // Reject "30 feb", "31 apr" ecc: la Date ribilanciata non coincide.
    const test = new Date(y, m - 1, d);
    return test.getFullYear() === y && test.getMonth() === m - 1 && test.getDate() === d;
  })();
  const canSave = amount > 0 && !!catId && !valError && dateValid;

  const maxDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const save = () => {
    if (!canSave || !tx) return;
    // Costruisce il timestamp preservando l'ora originale della tx.
    // dateValid garantisce che split → parts validi prima di costruire la Date.
    const orig = new Date(tx.ts || Date.now());
    const [y, m, day] = dateStr.split('-').map(Number);
    const newTs = new Date(y, m - 1, day, orig.getHours(), orig.getMinutes(), 0, 0).getTime();
    // Ultima difesa: se per qualche motivo arriva NaN, abortire senza salvare
    if (!Number.isFinite(newTs)) return;
    onSave(tx.id, {
      amount,
      label: label.trim(),
      cat: catId,
      ts: newTs,
    });
    haptic('success');
    onClose?.();
  };

  const remove = () => {
    if (!tx) return;
    onDelete(tx.id);
    onClose?.();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Modifica spesa">
      <label className="qa-lbl">Importo</label>
      <input
        className="qa-amount"
        type="text"
        inputMode="decimal"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
      />
      {valError && (
        <p className="qa-err">
          <IcAlert /> Importo non valido (es. 12,50)
        </p>
      )}

      <label className="qa-lbl" style={{ marginTop: 12 }}>Descrizione</label>
      <input
        className="qa-input"
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="es. Cena fuori"
      />

      <label className="qa-lbl" style={{ marginTop: 12 }}>Data</label>
      <input
        type="date"
        className="qa-input"
        value={dateStr}
        max={maxDateStr}
        onChange={(e) => setDateStr(e.target.value)}
      />

      <label className="qa-lbl" style={{ marginTop: 14 }}>Categoria</label>
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
              onClick={() => { haptic('light'); setCatId(c.id); }}
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

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button
          variant="default"
          size="lg"
          onClick={remove}
          style={{ color: 'var(--red)' }}
        >
          <IcX /> Elimina
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={save}
          disabled={!canSave}
        >
          Salva modifiche
        </Button>
      </div>
    </Sheet>
  );
};
