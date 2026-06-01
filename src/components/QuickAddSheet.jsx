import { useState, useEffect, useMemo } from 'react';
import { Sheet } from './ui/Sheet.jsx';
import {
  IcArrowOut, IcArrowIn, IcAlert, IcSparkle, IcClock,
} from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { parseNum, cn, realCost, $n } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { suggestCategory } from '../lib/intelligence.js';

/**
 * QuickAddSheet — sheet di registrazione spesa/entrata aperto dal tasto +
 * della tab bar. Stessa logica del vecchio QuickAdd ma controllato esternamente
 * (open / onClose passati da App.jsx) e senza il trigger inline.
 *
 * Auto-categoria: se la descrizione fa match con una regola o con il pattern
 * di spese passate, suggerisce automaticamente la categoria.
 */
export const QuickAddSheet = ({
  open, onClose,
  homeCats = [], cats = [], txs = [], catRules = [],
  onSubmit, onLargeIncome,
  effectiveDaily = null, // v0.10: per l'anteprima "budget di oggi dopo questa spesa"
  prefill = null,        // v0.10.2: { amount, label? } dal Copilot ("Aggiungila come spesa")
}) => {
  const [tab, setTab] = useState('spend');
  const [amt, setAmt] = useState('');
  const [label, setLabel] = useState('');
  const [catId, setCatId] = useState('');
  const [touchedCat, setTouchedCat] = useState(false);
  // Data della spesa. 'today' / 'yesterday' / 'custom' (con dateStr in input date)
  const [dateMode, setDateMode] = useState('today');
  const [customDate, setCustomDate] = useState(''); // YYYY-MM-DD

  // Reset alla chiusura dello sheet
  useEffect(() => {
    if (!open) {
      setAmt(''); setLabel(''); setCatId(''); setTouchedCat(false); setTab('spend');
      setDateMode('today'); setCustomDate('');
    }
  }, [open]);

  // v0.10.2: prefill dal Copilot — importo (ed eventuale descrizione) già pronti.
  useEffect(() => {
    if (open && prefill && prefill.amount > 0) {
      setTab('spend');
      setAmt(String(prefill.amount).replace('.', ','));
      if (prefill.label) setLabel(prefill.label);
    }
  }, [open, prefill]);

  // Calcola il timestamp della spesa in base al dateMode scelto
  const txTimestamp = useMemo(() => {
    if (dateMode === 'today') return Date.now();
    const d = new Date();
    d.setHours(12, 0, 0, 0); // mezzogiorno per evitare confusion con timezone
    if (dateMode === 'yesterday') {
      d.setDate(d.getDate() - 1);
      return d.getTime();
    }
    if (dateMode === 'custom' && customDate) {
      const [y, m, day] = customDate.split('-').map(Number);
      if (y && m && day) {
        const cd = new Date(y, m - 1, day, 12, 0, 0, 0);
        return cd.getTime();
      }
    }
    return Date.now();
  }, [dateMode, customDate]);

  // Date odierne formattate per i bottoni quick
  const todayLabel = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '');
  const yesterdayLabel = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '');
  }, []);
  // Max date = oggi (non si possono registrare spese future)
  const maxDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // "Stesso di ieri" suggestion (UX #17): se all'apertura del sheet
  // l'utente NON ha ancora scritto niente, cerco la spesa di ieri in
  // una finestra di ±2h rispetto all'ora attuale. Se ce n'è una sola
  // candidata, la propongo come quick-fill.
  const sameAsYesterday = useMemo(() => {
    if (!open || tab !== 'spend' || amt || label) return null;
    const now = new Date();
    const yStart = new Date(now); yStart.setDate(yStart.getDate() - 1);
    yStart.setHours(now.getHours() - 2, 0, 0, 0);
    const yEnd = new Date(now); yEnd.setDate(yEnd.getDate() - 1);
    yEnd.setHours(now.getHours() + 2, 0, 0, 0);
    const candidates = txs.filter((t) => t.ts >= yStart.getTime() && t.ts <= yEnd.getTime());
    if (candidates.length === 0 || candidates.length > 2) return null;
    // Prendo la prima (la più vicina all'ora attuale)
    const best = candidates[0];
    return { amount: realCost(best), label: best.label || '', catId: best.cat };
  }, [open, tab, amt, label, txs]);
  const applySameAsYesterday = () => {
    if (!sameAsYesterday) return;
    setAmt(String(sameAsYesterday.amount).replace('.', ','));
    setLabel(sameAsYesterday.label);
    setCatId(sameAsYesterday.catId);
    setTouchedCat(true);
    haptic('light');
  };

  // Smart cat suggestion (solo per spese)
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

  const valTrim = amt.trim();
  const amount = parseNum(amt);
  const valLooksValid = valTrim === '' || /^[€\s]*\d+([.,]\d+)?[€\s]*$/.test(valTrim);
  const valError = valTrim !== '' && (!valLooksValid || amount <= 0);
  // Se l'utente ha scelto "Altro" come data ma non ha selezionato nulla,
  // blocca il submit (altrimenti la spesa finirebbe silenziosamente OGGI).
  const dateInvalid = tab === 'spend' && dateMode === 'custom' && !customDate;
  const canSubmit = amount > 0 && (tab === 'income' || !!catId) && !valError && !dateInvalid;

  // Anti-double-submit (audit #6 bug UX 2.4): se l'utente tappa due volte
  // rapidamente, la seconda chiamata viene ignorata.
  const [submitting, setSubmitting] = useState(false);
  const submit = () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (tab === 'income') {
        if (onLargeIncome && amount >= 500) {
          onLargeIncome({ amount, label });
          onClose?.();
          return;
        }
        onSubmit({ kind: 'income', amount, label });
      } else {
        onSubmit({ kind: 'spend', amount, label, catId, ts: txTimestamp });
      }
      onClose?.();
    } finally {
      // Reset dopo un tick così se l'utente riapre rapidamente è ok
      setTimeout(() => setSubmitting(false), 300);
    }
  };

  const title = tab === 'spend' ? 'Nuova spesa' : 'Nuova entrata';

  // Protezione "perdita dati silenziosa" (audit #6 bug 4):
  // se l'utente ha inserito amount o label ma poi swipe-down senza submit,
  // chiediamo conferma invece di chiudere e basta.
  const hasUnsavedData = !!(amt && amt.trim()) || !!(label && label.trim());
  const requestClose = () => {
    if (hasUnsavedData) {
      const ok = window.confirm('Hai dati non salvati. Chiudere comunque?');
      if (!ok) return;
    }
    onClose?.();
  };

  return (
    <Sheet open={open} onClose={requestClose} title={title}>
      {/* Tabs Spesa / Entrata */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--glass2)',
        padding: 3,
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <button
          type="button"
          className={cn('qa-head-tab', tab === 'spend' && 'active')}
          style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }}
          onClick={() => { haptic('light'); setTab('spend'); }}
        >
          <IcArrowOut className="ic" /> Spesa
        </button>
        <button
          type="button"
          className={cn('qa-head-tab', tab === 'income' && 'active')}
          style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }}
          onClick={() => { haptic('light'); setTab('income'); }}
        >
          <IcArrowIn className="ic" /> Entrata
        </button>
      </div>

      {sameAsYesterday && (
        <button
          type="button"
          onClick={applySameAsYesterday}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '10px 12px', marginBottom: 14,
            background: 'var(--accent-10)',
            border: '1px solid var(--accent-20)',
            borderRadius: 12,
            color: 'var(--accent-text, var(--accent))',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <IcClock width="14" height="14" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            Stesso di ieri? <strong>€{sameAsYesterday.amount.toFixed(2).replace('.', ',')}</strong>
            {sameAsYesterday.label && <span style={{ opacity: .7 }}> · {sameAsYesterday.label}</span>}
          </span>
        </button>
      )}

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
      {/* v0.10: anteprima — quanto resta del budget di OGGI dopo questa spesa */}
      {tab === 'spend' && !valError && amount > 0 && Number.isFinite(effectiveDaily) && (
        <p style={{
          fontSize: 12, marginTop: 8, fontWeight: 600,
          color: effectiveDaily - amount >= 0 ? 'var(--fg-3)' : 'var(--warn)',
        }}>
          {effectiveDaily - amount >= 0
            ? <>Budget di oggi dopo: €{$n(Math.round((effectiveDaily - amount) * 100) / 100)}</>
            : <>Va oltre il budget di oggi di €{$n(Math.round((amount - effectiveDaily) * 100) / 100)} — domani si ribilancia</>}
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
          <label className="qa-lbl" style={{ marginTop: 14 }}>Quando</label>
          <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
            <button
              type="button"
              onClick={() => { haptic('light'); setDateMode('today'); }}
              style={dateBtnStyle(dateMode === 'today')}
            >Oggi <span style={{ opacity: .55, marginLeft: 4, fontSize: 10 }}>{todayLabel}</span></button>
            <button
              type="button"
              onClick={() => { haptic('light'); setDateMode('yesterday'); }}
              style={dateBtnStyle(dateMode === 'yesterday')}
            >Ieri <span style={{ opacity: .55, marginLeft: 4, fontSize: 10 }}>{yesterdayLabel}</span></button>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setDateMode('custom');
                if (!customDate) setCustomDate(maxDateStr);
              }}
              style={dateBtnStyle(dateMode === 'custom')}
            >Altro</button>
          </div>
          {dateMode === 'custom' && (
            <input
              type="date"
              className="qa-input"
              value={customDate}
              max={maxDateStr}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{ marginTop: 6 }}
            />
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 14, marginBottom: 8,
          }}>
            <label className="qa-lbl" style={{ marginBottom: 0 }}>Categoria</label>
            {!touchedCat && suggestedCat && label.trim() && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                letterSpacing: '.06em',
              }}>
                <IcSparkle width="11" height="11" /> AUTO
              </span>
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

      <button
        type="button"
        className="qa-cta"
        style={{ marginTop: 18 }}
        onClick={submit}
        disabled={!canSubmit}
      >
        {tab === 'spend' ? 'Registra spesa' : 'Registra entrata'}
      </button>
    </Sheet>
  );
};

// Stile riusato per i 3 chip "Oggi / Ieri / Altro"
const dateBtnStyle = (selected) => ({
  flex: 1,
  padding: '9px 8px',
  borderRadius: 11,
  background: selected ? 'var(--accent-10)' : 'var(--glass)',
  border: `1px solid ${selected ? 'var(--accent-20)' : 'var(--glass-bd)'}`,
  color: selected ? 'var(--accent)' : 'var(--fg-3)',
  fontSize: 12, fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '.02em',
});
