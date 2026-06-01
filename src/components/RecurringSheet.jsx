import { useState } from 'react';
import { Sheet } from './ui/Sheet.jsx';
import { Button } from './ui/Button.jsx';
import { IcPlus, IcX, IcCheck, iconForCategory } from '../lib/icons.jsx';
import { $n, monthlyEq, round2 } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

/**
 * Pagamenti fissi — UNA lista per tutto ciò che si ripete (v0.17).
 *
 * Prima erano tre schermate diverse: "Spese fisse" (sempre mensili),
 * "Abbonamenti" (con cadenza) e "Spese annuali" (una lista che il motore non
 * guardava nemmeno). Per l'utente sono la stessa cosa — un pagamento che
 * torna — e l'unica differenza vera è ogni quanto torna.
 *
 * L'aggiunta parte dalle scorciatoie: un tap su "Netflix" o "Assicurazione"
 * compila nome e cadenza, resta da scrivere solo l'importo.
 */

const CADENCES = [
  { id: 'monthly', label: 'Ogni mese' },
  { id: 'annual', label: 'Ogni anno' },
  { id: 'weekly', label: 'Ogni settimana' },
];

const CADENCE_WORD = {
  monthly: 'ogni mese',
  annual: 'ogni anno',
  weekly: 'ogni settimana',
  bimonthly: 'ogni 2 mesi',
  quarterly: 'ogni 3 mesi',
  semiannual: 'ogni 6 mesi',
};

// Scorciatoie: le cose che quasi tutti pagano. Il preset decide anche la
// cadenza, così l'utente non deve pensarci.
const PRESETS = [
  { label: 'Affitto', cadence: 'monthly' },
  { label: 'Luce e gas', cadence: 'monthly' },
  { label: 'Internet', cadence: 'monthly' },
  { label: 'Telefono', cadence: 'monthly' },
  { label: 'Netflix', cadence: 'monthly' },
  { label: 'Spotify', cadence: 'monthly' },
  { label: 'Palestra', cadence: 'monthly' },
  { label: 'Assicurazione', cadence: 'annual' },
  { label: 'Bollo auto', cadence: 'annual' },
];

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export const RecurringSheet = ({ open, onClose, recurring, addRecurring, updateRecurring, removeRecurring, toggleRecurring }) => {
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');
  const [cadence, setCadence] = useState('monthly');
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);

  const amountNum = parseFloat(String(amt).replace(',', '.'));
  const canAdd = !!lbl.trim() && Number.isFinite(amountNum) && amountNum > 0;

  const totalMonthly = round2(recurring.reduce(
    (s, r) => s + (r.active === false ? 0 : monthlyEq(r.amount || 0, r.cadence || 'monthly')),
    0,
  ));
  // In modifica il totale di confronto esclude la voce che stai cambiando.
  const totalOthers = round2(recurring.reduce(
    (s, r) => s + (r.active === false || r.id === editId ? 0 : monthlyEq(r.amount || 0, r.cadence || 'monthly')),
    0,
  ));

  const reset = () => {
    setLbl(''); setAmt(''); setCadence('monthly'); setDay(1); setMonth(1); setEditId(null);
  };

  const submit = () => {
    if (!canAdd) return;
    const patch = { label: lbl, amount: amountNum, cadence, day, month: cadence === 'annual' ? month : null };
    // Niente `?.` qui: se la prop mancasse, la modifica sparirebbe in silenzio
    // e l'utente crederebbe di aver salvato. Meglio un errore rumoroso.
    if (editId) { updateRecurring(editId, patch); haptic('success'); }
    else addRecurring(patch);
    reset();
    setAdding(false);
  };

  const usePreset = (p) => {
    haptic('light');
    reset();
    setLbl(p.label);
    setCadence(p.cadence);
    setAdding(true);
  };

  // Tocca una voce per correggerla: importo sbagliato, giorno cambiato, rincaro.
  const edit = (r) => {
    haptic('light');
    setEditId(r.id);
    setLbl(r.label || '');
    setAmt(String(r.amount ?? '').replace('.', ','));
    setCadence(r.cadence || 'monthly');
    setDay(r.day || 1);
    setMonth(r.month || 1);
    setAdding(true);
  };

  return (
    <Sheet open={open} onClose={() => { onClose(); setAdding(false); reset(); }} title="Pagamenti fissi">
      <p className="rec-intro">
        Tutto quello che paghi a intervalli regolari: affitto, bollette, abbonamenti,
        assicurazione. AURA li toglie dai soldi spendibili <b>prima</b> che arrivi la scadenza,
        così quello che vedi è già al netto.
      </p>

      {recurring.length > 0 && (
        <>
          <div className="rec-total">
            <span>Ti pesano</span>
            <b>€{$n(totalMonthly)} al mese</b>
          </div>
          <div className="rec-list">
            {recurring.map((r) => {
              const off = r.active === false;
              const Ico = iconForCategory(null, r.label);
              const when = r.cadence === 'annual'
                ? `ogni anno · ${MONTHS[(r.month || 1) - 1]}`
                : r.cadence === 'weekly'
                  ? 'ogni settimana'
                  : `${CADENCE_WORD[r.cadence] || 'ogni mese'} · il ${r.day || 1}`;
              return (
                <div key={r.id} className={`rec-row ${off ? 'off' : ''}`}>
                  <button
                    type="button"
                    className="rec-ic"
                    onClick={() => toggleRecurring(r.id)}
                    aria-label={off ? `Riattiva ${r.label}` : `Sospendi ${r.label}`}
                    aria-pressed={!off}
                  >
                    {off ? <IcX /> : <Ico />}
                  </button>
                  <button type="button" className="rec-body" onClick={() => edit(r)}>
                    <span className="rec-lbl">{r.label}</span>
                    <span className="rec-when">{off ? 'sospeso · tocca per modificare' : `${when} · modifica`}</span>
                  </button>
                  <span className="rec-amt">€{$n(r.amount)}</span>
                  <button
                    type="button"
                    className="rec-del"
                    onClick={() => removeRecurring(r.id)}
                    aria-label={`Elimina ${r.label}`}
                  ><IcX width="15" height="15" /></button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!adding ? (
        <>
          <div className="rec-sub">Aggiungine uno · tocca una scorciatoia</div>
          <div className="rec-presets">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className="rec-chip" onClick={() => usePreset(p)}>
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className="rec-chip other"
              onClick={() => { haptic('light'); setAdding(true); }}
            >
              <IcPlus width="13" height="13" /> Altro
            </button>
          </div>
        </>
      ) : (
        <div className="rec-form">
          <label className="qa-lbl">Cos'è</label>
          <input
            className="qa-input"
            value={lbl}
            onChange={(e) => setLbl(e.target.value)}
            placeholder="Affitto, Netflix, assicurazione…"
            autoFocus={!lbl}
          />

          <label className="qa-lbl" style={{ marginTop: 14 }}>Quanto</label>
          <input
            className="qa-input"
            type="text"
            inputMode="decimal"
            value={amt}
            onChange={(e) => setAmt(e.target.value.replace(/[^0-9.,]/g, ''))}
            placeholder="0,00"
            autoFocus={!!lbl}
          />

          <label className="qa-lbl" style={{ marginTop: 14 }}>Ogni quanto</label>
          <div className="rec-seg" role="radiogroup" aria-label="Ogni quanto">
            {CADENCES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={cadence === c.id}
                className={cadence === c.id ? 'on' : ''}
                onClick={() => { haptic('light'); setCadence(c.id); }}
              >{c.label}</button>
            ))}
          </div>

          {cadence !== 'weekly' && (
            <div className="rec-when-row">
              {cadence === 'annual' && (
                <label className="rec-field">
                  <span className="qa-lbl">In che mese</span>
                  <select className="qa-input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </label>
              )}
              <label className="rec-field">
                <span className="qa-lbl">Che giorno</span>
                <select className="qa-input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {canAdd && (
            <div className="rec-preview">
              <IcCheck width="14" height="14" />
              <span>
                Sono <b>€{$n(monthlyEq(amountNum, cadence))} al mese</b>
                {cadence !== 'monthly' ? ' spalmati' : ''} · totale €{$n(round2(totalOthers + monthlyEq(amountNum, cadence)))}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button variant="default" size="lg" onClick={() => { setAdding(false); reset(); }}>Annulla</Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={submit} disabled={!canAdd}>
              {editId ? <><IcCheck /> Salva</> : <><IcPlus /> Aggiungi</>}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
};
