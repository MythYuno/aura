import { useState, useEffect, useMemo } from 'react';
import { Sheet } from './ui/Sheet.jsx';
import { Button } from './ui/Button.jsx';
import { IcPlus, IcX, IcGoal, IcCheck } from '../lib/icons.jsx';
import { parseNum, maskedMoney, $n, round2 } from '../lib/format.js';
import { evaluateWish, suggestTrim, formatMonths } from '../lib/wish.js';
import { categoryHistoricalStats } from '../lib/analytics.js';
import { haptic } from '../lib/haptic.js';
import { useToast } from '../hooks/useUndoToast.js';

/**
 * Obiettivi (v0.9.1) — unifica i vecchi "Desideri" (valutazione fattibilità)
 * col "Salvadanaio" (accantonamento reale). Un solo posto dove:
 *   1. imposti un traguardo (nome + costo + eventuale scadenza)
 *   2. l'app ti DICE se è fattibile e COME impostarlo (€/mese, tempo, dove tagliare)
 *   3. accantoni davvero, con barra di progresso (modello envelope: earmark dal
 *      libero senza toccare il saldo in banca)
 */
const toneColor = (c) => c === 'warn' ? 'var(--warn)' : c === 'danger' ? 'var(--red)' : 'var(--accent)';

export const Goals = ({ store }) => {
  const {
    goals, addGoal, updateGoal, contributeGoal, withdrawGoal, removeGoal,
    totalGoalsSaved, freeUntilNext, daysToNextIncome, freeBudget,
    txs, cats, monthKey, privacy,
  } = store;
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editGoal, setEditGoal] = useState(null); // obiettivo in modifica
  const [move, setMove] = useState(null); // { id, mode: 'fund' | 'take' }

  // Libero MENSILE stimato (per la valutazione di fattibilità).
  const freeMonthly = useMemo(() => {
    if (typeof freeUntilNext === 'number' && freeUntilNext > 0 && daysToNextIncome > 0) {
      return round2((freeUntilNext / daysToNextIncome) * 30);
    }
    return freeBudget || 0;
  }, [freeUntilNext, daysToNextIncome, freeBudget]);

  const catStats = useMemo(() => categoryHistoricalStats(txs, monthKey), [txs, monthKey]);

  return (
    <div style={{ marginTop: 32 }}>
      <div className="area-section-title">
        <span className="ttl">I tuoi obiettivi</span>
        <button
          type="button"
          onClick={() => { haptic('light'); setShowAdd(true); }}
          className="wishes-add"
          aria-label="Aggiungi un obiettivo"
        >
          <IcPlus /> nuovo
        </button>
      </div>

      {goals.length === 0 ? (
        <button type="button" className="wishes-empty" onClick={() => { haptic('light'); setShowAdd(true); }}>
          <IcGoal style={{ width: 18, height: 18, color: 'var(--accent)' }} />
          <div>
            <div className="wishes-empty-ttl">Cosa vorresti?</div>
            <div className="wishes-empty-sub">
              Vacanza, fondo emergenza, un acquisto… dimmi quanto costa: ti dico se è fattibile e ti aiuto a metterlo via.
            </div>
          </div>
        </button>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '.04em', marginBottom: 10 }}>
            Messi via in tutto: <strong style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>€{maskedMoney(totalGoalsSaved, { privacy })}</strong> · non contano nel libero
          </div>
          <div className="goal-list">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                privacy={privacy}
                freeMonthly={freeMonthly}
                catStats={catStats}
                cats={cats}
                onEdit={() => { haptic('light'); setEditGoal(g); }}
                onFund={() => setMove({ id: g.id, mode: 'fund' })}
                onTake={() => setMove({ id: g.id, mode: 'take' })}
                onRemove={() => {
                  removeGoal(g.id);
                  toast?.show?.('Obiettivo rimosso · i soldi tornano nel libero', null);
                }}
              />
            ))}
          </div>
        </>
      )}

      <GoalFormSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        freeMonthly={freeMonthly}
        privacy={privacy}
        onSubmit={(label, target, months) => { addGoal(label, target, months); setShowAdd(false); }}
      />

      {/* v0.9.3: modifica obiettivo esistente */}
      <GoalFormSheet
        open={!!editGoal}
        initial={editGoal}
        onClose={() => setEditGoal(null)}
        freeMonthly={freeMonthly}
        privacy={privacy}
        onSubmit={(label, target, months) => { if (editGoal) updateGoal(editGoal.id, { label, target, months }); setEditGoal(null); }}
      />

      <MoveSheet
        data={move}
        goals={goals}
        freeUntilNext={freeUntilNext}
        privacy={privacy}
        onClose={() => setMove(null)}
        onConfirm={(id, mode, amount) => {
          const ok = mode === 'fund' ? contributeGoal(id, amount) : withdrawGoal(id, amount);
          if (!ok) {
            toast?.show?.(mode === 'fund' ? 'Non hai abbastanza nel libero' : 'Importo non valido', null);
            return;
          }
          setMove(null);
        }}
      />
    </div>
  );
};

const GoalCard = ({ goal, privacy, freeMonthly, catStats, cats, onEdit, onFund, onTake, onRemove }) => {
  const saved = goal.saved || 0;
  const target = goal.target || 0;
  const remaining = round2(Math.max(0, target - saved));
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const done = target > 0 && saved >= target;

  // Valutazione intelligente sul RESIDUO da accantonare.
  const evalRes = useMemo(() => {
    if (done || target <= 0) return null;
    return evaluateWish({ amount: remaining, months: goal.months || 12, freeBudget: freeMonthly });
  }, [done, target, remaining, goal.months, freeMonthly]);

  const trim = useMemo(() => {
    if (!evalRes || !goal.months) return null;
    if (evalRes.color === 'accent') return null; // solo se è teso/difficile
    return suggestTrim({ amount: remaining, months: goal.months, freeBudget: freeMonthly, categoryStats: catStats, cats });
  }, [evalRes, goal.months, remaining, freeMonthly, catStats, cats]);

  // Consiglio "come impostarlo" se non c'è una scadenza fissa.
  // v0.9.2 FIX: il suggerimento mensile non può MAI superare il residuo
  // (prima per un obiettivo da €200 con libero alto consigliava €710/mese →
  // assurdo). Se il residuo sta in un mese di libero, lo diciamo chiaramente.
  const safeMonthly = round2(Math.max(0, freeMonthly * 0.85));
  const affordableSoon = remaining > 0 && safeMonthly > 0 && remaining <= safeMonthly;
  const suggestMonthly = round2(Math.min(safeMonthly / 2, remaining));
  const monthsAtSuggest = suggestMonthly > 0 ? Math.max(1, Math.ceil(remaining / suggestMonthly)) : null;

  return (
    <div className={`goal-card ${done ? 'done' : ''}`}>
      <div className="goal-head">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Modifica ${goal.label}`}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
        >
          <div className="goal-label">{goal.label} <span style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 400 }}>modifica</span></div>
          <div className="goal-sub">
            €{maskedMoney(saved, { privacy })}{target > 0 && <> di €{maskedMoney(target, { privacy })}</>}
            {done && ' · completo 🎉'}
            {!done && target > 0 && <> · mancano €{maskedMoney(remaining, { privacy })}</>}
          </div>
        </button>
        {target > 0 && <div className="goal-pct">{privacy ? '••' : `${pct}%`}</div>}
      </div>

      {target > 0 && (
        <div className="goal-meter">
          <div className="goal-meter-fill" style={{ width: `${privacy ? 50 : pct}%` }} />
        </div>
      )}

      {/* Consiglio intelligente (la parte "ex-Desideri") */}
      {!privacy && !done && evalRes && (
        <div className="goal-advice">
          {goal.months ? (
            <>
              <span className="goal-advice-dot" style={{ background: toneColor(evalRes.color) }} />
              <span>
                <strong style={{ color: toneColor(evalRes.color) }}>{evalRes.label}.</strong>{' '}
                {evalRes.hint}
              </span>
            </>
          ) : (
            <>
              <span className="goal-advice-dot" style={{ background: 'var(--accent)' }} />
              <span>
                {safeMonthly <= 0
                  ? <>Aggiungi entrate e fissi in Setup per stimare i tempi.</>
                  : affordableSoon
                    ? <>Ce la fai in poco: bastano <strong>€{$n(remaining)}</strong> dal tuo libero. Mettine via quando vuoi.</>
                    : <>Mettendo via <strong>~€{$n(suggestMonthly)}/mese</strong> lo raggiungi in <strong>{formatMonths(monthsAtSuggest)}</strong>.</>}
              </span>
            </>
          )}
        </div>
      )}
      {!privacy && trim && (
        <div className="goal-trim">
          Per renderlo più leggero potresti tagliare ~<strong>€{trim.saveProposed}/mese</strong> da <strong>{trim.label}</strong>.
        </div>
      )}

      <div className="goal-actions">
        <button type="button" className="goal-btn fund" onClick={() => { haptic('light'); onFund(); }}>
          Metti via
        </button>
        <button type="button" className="goal-btn take" onClick={() => { haptic('light'); onTake(); }} disabled={saved <= 0}>
          Preleva
        </button>
        <button type="button" className="goal-btn icon" onClick={() => { haptic('warning'); onRemove(); }} aria-label="Elimina obiettivo">
          <IcX width="14" height="14" />
        </button>
      </div>
    </div>
  );
};

const HORIZONS = [
  { label: 'Nessuna fretta', months: null },
  { label: '3 mesi', months: 3 },
  { label: '6 mesi', months: 6 },
  { label: '1 anno', months: 12 },
  { label: '2 anni', months: 24 },
];

// Converte una data (YYYY-MM-DD) nel numero di mesi da oggi (1..120).
const monthsFromDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = (d.getTime() - today.getTime()) / 864e5;
  if (days < 1) return 1;
  return Math.max(1, Math.min(120, Math.ceil(days / 30.44)));
};

const GoalFormSheet = ({ open, onClose, onSubmit, initial = null, freeMonthly, privacy }) => {
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [months, setMonths] = useState(null);    // da chip preset
  const [customDate, setCustomDate] = useState(''); // data precisa (override)
  // Prefill in modifica; reset alla chiusura.
  useEffect(() => {
    if (open) {
      setLabel(initial?.label || '');
      setTarget(initial?.target != null && initial?.target > 0 ? String(initial.target) : '');
      setMonths(initial?.months || null);
      setCustomDate('');
    } else {
      setLabel(''); setTarget(''); setMonths(null); setCustomDate('');
    }
  }, [open, initial]);

  const targetNum = parseNum(target);
  const canAdd = !!label.trim() && targetNum > 0;

  // Scadenza effettiva: la data precisa ha priorità sui chip.
  const effMonths = customDate ? monthsFromDate(customDate) : months;

  // min per il date input = domani
  const minDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Anteprima fattibilità live (math corretta: suggerimento mai > residuo).
  const preview = useMemo(() => {
    if (targetNum <= 0) return null;
    const e = evaluateWish({ amount: targetNum, months: effMonths || 12, freeBudget: freeMonthly });
    const safeMonthly = Math.max(0, freeMonthly * 0.85);
    const affordableSoon = safeMonthly > 0 && targetNum <= safeMonthly;
    const suggestMonthly = round2(Math.min(safeMonthly / 2, targetNum));
    const monthsAtSuggest = suggestMonthly > 0 ? Math.max(1, Math.ceil(targetNum / suggestMonthly)) : null;
    return { ...e, safeMonthly, affordableSoon, suggestMonthly, monthsAtSuggest };
  }, [targetNum, effMonths, freeMonthly]);

  return (
    <Sheet open={open} onClose={onClose} title={initial ? 'Modifica obiettivo' : 'Nuovo obiettivo'}>
      <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
        Dimmi cosa vuoi e quanto costa. Ti dico subito se è alla portata e come impostarlo.
      </p>
      <label className="qa-lbl">Per cosa?</label>
      <input className="qa-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Vacanza, fondo emergenza, MacBook…" autoFocus />
      <label className="qa-lbl" style={{ marginTop: 12 }}>Quanto costa?</label>
      <input className="qa-input" type="text" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="1.200" />

      <label className="qa-lbl" style={{ marginTop: 14 }}>Entro quando? (facoltativo)</label>
      <div className="qa-cats">
        {HORIZONS.map((h) => {
          const sel = !customDate && months === h.months;
          return (
            <button
              key={h.label}
              type="button"
              className={`qa-cat ${sel ? 'active' : ''}`}
              onClick={() => { haptic('light'); setMonths(h.months); setCustomDate(''); }}
              style={sel ? { background: 'var(--accent-10)', borderColor: 'var(--accent-20)', color: 'var(--accent)' } : undefined}
            >
              {h.label}
            </button>
          );
        })}
      </div>
      {/* v0.9.2: data precisa personalizzabile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--fg-3)', flexShrink: 0 }}>o entro il</span>
        <input
          type="date"
          className="qa-input"
          style={{ flex: 1 }}
          min={minDate}
          value={customDate}
          onChange={(e) => { setCustomDate(e.target.value); if (e.target.value) setMonths(null); }}
        />
      </div>

      {/* Anteprima verdetto (math corretta) */}
      {canAdd && preview && !privacy && (
        <div style={{
          marginTop: 14, padding: '11px 13px',
          background: `color-mix(in srgb, ${toneColor(effMonths ? preview.color : 'accent')} 10%, var(--glass))`,
          border: `1px solid color-mix(in srgb, ${toneColor(effMonths ? preview.color : 'accent')} 28%, transparent)`,
          borderRadius: 12, fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5,
        }}>
          {effMonths ? (
            <>
              <strong style={{ color: toneColor(preview.color) }}>{preview.label}</strong>
              {customDate && <span style={{ color: 'var(--fg-3)' }}> · {formatMonths(effMonths)}</span>}
              <br />
              {preview.hint}
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--accent)' }}>A tuo ritmo</strong>
              <br />
              {preview.safeMonthly <= 0
                ? 'Aggiungi entrate e fissi in Setup per stimare i tempi.'
                : preview.affordableSoon
                  ? <>Ce la fai in poco: bastano <strong>€{$n(targetNum)}</strong> dal tuo libero.</>
                  : <>Metti via <strong>~€{$n(preview.suggestMonthly)}/mese</strong> e lo raggiungi in <strong>{formatMonths(preview.monthsAtSuggest)}</strong>.</>}
            </>
          )}
        </div>
      )}

      <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 16 }} onClick={() => onSubmit(label, target, effMonths)} disabled={!canAdd}>
        {initial ? 'Salva modifiche' : <><IcPlus /> Crea obiettivo</>}
      </Button>
    </Sheet>
  );
};

const MoveSheet = ({ data, goals, freeUntilNext, privacy, onClose, onConfirm }) => {
  const open = !!data;
  const goal = data ? goals.find((g) => g.id === data.id) : null;
  const mode = data?.mode || 'fund';
  const [amt, setAmt] = useState('');
  useEffect(() => { if (open) setAmt(''); }, [open, data?.id, data?.mode]);
  if (!goal) return <Sheet open={open} onClose={onClose} title=" ">{null}</Sheet>;

  const saved = goal.saved || 0;
  const target = goal.target || 0;
  const maxFund = round2(freeUntilNext);
  const remainingToTarget = round2(Math.max(0, target - saved));
  const suggestedFull = mode === 'fund'
    ? round2(Math.min(maxFund, remainingToTarget > 0 ? remainingToTarget : maxFund))
    : saved;
  const amount = parseNum(amt);
  const cap = mode === 'fund' ? maxFund : saved;
  const valid = amount > 0 && amount <= cap + 0.001;
  const quickChips = mode === 'fund' ? [10, 25, 50, 100] : [10, 25, 50];

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'fund' ? `Metti via · ${goal.label}` : `Preleva · ${goal.label}`}>
      <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
        {mode === 'fund'
          ? <>Hai <strong style={{ color: 'var(--accent)' }}>€{maskedMoney(maxFund, { privacy })}</strong> liberi. Quanto vuoi accantonare?</>
          : <>Nel salvadanaio ci sono <strong style={{ color: 'var(--accent)' }}>€{maskedMoney(saved, { privacy })}</strong>. Quanto vuoi riprendere?</>}
      </p>
      <input className="qa-amount" type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0,00" autoFocus />
      <div className="qa-cats" style={{ marginTop: 12 }}>
        {quickChips.filter((c) => c <= cap).map((c) => (
          <button key={c} type="button" className="qa-cat" onClick={() => { haptic('light'); setAmt(String(c)); }}>
            +€{c}
          </button>
        ))}
        {suggestedFull > 0 && (
          <button type="button" className="qa-cat" onClick={() => { haptic('light'); setAmt(String(suggestedFull)); }}>
            {mode === 'fund' && remainingToTarget > 0 && remainingToTarget <= maxFund ? 'Completa' : 'Tutto'} €{$n(suggestedFull)}
          </button>
        )}
      </div>
      {amt.trim() !== '' && !valid && (
        <p className="qa-err"><IcX width="12" height="12" /> {mode === 'fund' ? 'Più del libero disponibile' : 'Più di quanto hai nel salvadanaio'}</p>
      )}
      <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 16 }} onClick={() => onConfirm(goal.id, mode, amount)} disabled={!valid}>
        {mode === 'fund' ? <><IcCheck /> Metti via €{$n(amount || 0)}</> : <>Preleva €{$n(amount || 0)}</>}
      </Button>
    </Sheet>
  );
};
