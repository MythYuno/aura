import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DayDetail } from '../components/DayDetail.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { askCopilot } from '../lib/engine/copilot.js';
import {
  IcAlert, IcTrendUp, IcTrendDown, IcCard, IcGoal, IcPiggy, IcSparkle,
  IcCheck, IcGauge, IcCalendar, IcArrowR, IcChevR,
} from '../lib/icons.jsx';
import { $n, parseNum, maskedMoney, realCost } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

const DAY_MS = 864e5;

// ─── icone (Lucide, coerenti col resto dell'app) ───────────────────
const ICONS = {
  warning: IcAlert, 'trend-up': IcTrendUp, 'trend-down': IcTrendDown,
  card: IcCard, target: IcGoal, piggy: IcPiggy, sparkle: IcSparkle,
  check: IcCheck, gauge: IcGauge, calendar: IcCalendar, arrow: IcArrowR, chev: IcChevR,
};
const Ic = ({ name, ...p }) => {
  const C = ICONS[name] || IcSparkle;
  return <C {...p} />;
};
// scintilla bianca per la pillola Copilot (come nel mockup)
const SparkWhite = () => (
  <svg viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" />
    <path d="M18 15l.7 1.9L20.5 17.5l-1.8.6L18 20l-.7-1.9L15.5 17.5l1.8-.6L18 15Z" />
  </svg>
);

const SAVE_CHIPS = [100, 200, 300, 500];

/**
 * Assistant (Financial Copilot · Tappa 3)
 *
 * La home come "assistente": un hero col modello reale (disponibile oggi ·
 * budget al giorno · saldo previsto a fine mese, col tuo obiettivo di risparmio)
 * e sotto il FEED di insight prioritizzato. Tutto letto da useFinance()
 * (store.finance / store.feed) — una sola fonte di verità, niente ricalcoli.
 */
export const Assistant = ({ store, onGoToMoney, onOpenCategory, onPrefillAdd }) => {
  const {
    name, txs, cats, todayKey, privacy, setPrivacy,
    updateTx, deleteTx,
    currentBalance, freeUntilNext, cushion, monthlySavingsTarget, setMonthlySavingsTarget,
    spentToday, dailyQuota, effectiveDaily,
    needsBalanceUpdate,
    addSubscription, dismissRecurring,
  } = store;

  const suggestions = store.recurringSuggest || [];
  const addSuggestion = (s) => {
    haptic('success');
    addSubscription(s.label, s.amount, s.day, s.cadence);
  };

  const finance = store.finance || {};
  const feed = store.feed || [];

  const [dayTs, setDayTs] = useState(null);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [savingsInput, setSavingsInput] = useState('');
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMsgs, setCopilotMsgs] = useState([]);
  const [copilotInput, setCopilotInput] = useState('');
  const copMsgsRef = useRef(null);
  const copilotMemRef = useRef(null); // memoria conversazione (slot ultima domanda)
  const [lastIntent, setLastIntent] = useState(null); // per le chip contestuali
  useEffect(() => {
    const el = copMsgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [copilotMsgs]);

  // Doppio tap sull'hero → toggle privacy (gesto coerente con la vecchia home).
  const tapRef = useMemo(() => ({ t: 0 }), []);
  const onHeroTap = () => {
    const now = Date.now();
    if (now - tapRef.t < 350) { haptic('medium'); setPrivacy(!privacy); tapRef.t = 0; }
    else tapRef.t = now;
  };

  // Spese di oggi (per la riga slim "oggi" → dettaglio).
  const todayTxs = useMemo(
    () => txs.filter((t) => t.ts >= todayKey && t.ts < todayKey + DAY_MS),
    [txs, todayKey],
  );

  // ── numeri hero ──
  // "Oggi puoi spendere" = quanto resta per oggi (quota giornaliera − speso oggi).
  const canToday = Math.max(0, Number.isFinite(effectiveDaily) ? effectiveDaily : 0);
  // "Liberi a fine mese" = spendibile prima della prossima paga, già tolti
  // cuscinetto, salvadanaio e i €X che vuoi accantonare. Può essere negativo.
  const eom = finance.freeAtEndOfCycle;
  const eomOk = Number.isFinite(eom);
  const target = monthlySavingsTarget || 0;

  // SEMAFORO (v0.10): stato del ciclo dal motore — tre stati, sempre spiegati.
  // Senza obiettivo di risparmio la pillola diventa la CTA per sceglierlo.
  const reassure = useMemo(() => {
    if (target <= 0) return { tone: 'good', icon: 'piggy', text: 'Scegli quanto conservare ogni mese', cta: true };
    const st = store.cycleStatus || 'sereno';
    const tone = st === 'rosso' ? 'risk' : st === 'attento' ? 'warn' : 'good';
    const icon = st === 'sereno' ? 'check' : 'warning';
    const label = st === 'rosso' ? 'Rosso' : st === 'attento' ? 'Attento' : 'Sereno';
    return { tone, icon, text: `${label} · ${store.cycleStatusReason || ''}` };
  }, [target, store.cycleStatus, store.cycleStatusReason]);

  // ── feed mostrato: prepende il promemoria saldo se serve ──
  const rows = useMemo(() => {
    const nudge = needsBalanceUpdate
      ? { id: 'nudge', tone: 'warn', icon: 'card', text: 'È arrivata la paga? Aggiorna il saldo per ricalcolare tutto.', action: { label: 'Aggiorna', target: 'balance' } }
      : null;
    return [nudge, ...feed].filter(Boolean);
  }, [needsBalanceUpdate, feed]);

  const handleAction = (action) => {
    if (!action) return;
    haptic('light');
    const t = action.target || '';
    if (t === 'balance' || t.startsWith('goal:')) { onGoToMoney?.(); return; }
    if (t.startsWith('history:')) { onOpenCategory?.(t.split(':')[1]); return; }
    if (t === 'ask') { openCopilot(); return; }
  };

  const openCopilot = () => {
    haptic('light');
    setCopilotOpen(true);
  };

  const submitCopilot = (text) => {
    const t = (text || '').trim();
    if (!t) return;
    haptic('light');
    // Il Copilot legge SOLO i numeri già calcolati dai motori (zero calcoli qui).
    const co = store.copilot || {};
    const cf = store.cashflow || {};
    const res = askCopilot(t, {
      freeUntilNext: store.spendableUntilNext ?? freeUntilNext,
      dailyQuota,
      daysToNextIncome: finance.daysToNextIncome ?? store.daysToNextIncome,
      nextIncomeAt: finance.nextIncomeAt,
      eom: finance.freeAtEndOfCycle,
      cushion,
      savingsTarget: monthlySavingsTarget,
      name,
      // contesto extra (Copilot più intelligente)
      cats,
      spentToday,
      avgDailySpend: finance.avgDailySpend,
      spentMonth: co.spentMonth,
      spentWeek: co.spentWeek,
      byCategory: co.byCategory,
      topCategory: co.topCategory,
      upcoming: co.upcoming,
      upcomingWeek: co.upcomingWeek,
      upcomingMonth: co.upcomingMonth,
      restOfMonthDays: co.restOfMonthDays,
      lowSpendData: co.lowSpendData,
      // previsioni a lungo termine + tempo-obiettivo
      currentBalance,
      monthlyNet: cf.net,
      monthlyIncome: cf.income,
      monthlyRecurring: cf.recurring,
      monthlyAvgSpend: cf.avgSpend,
      goals: store.goals,
      // semaforo del ciclo (per "come sto messo?")
      cycleStatus: store.cycleStatus,
      cycleStatusReason: store.cycleStatusReason,
      // memoria: ultimo contesto (per i seguiti tipo "e in 3 anni?")
      prev: copilotMemRef.current,
    });
    // ricorda gli slot dell'ultima risposta utile (per i seguiti + chip contestuali)
    if (res.slots) { copilotMemRef.current = res.slots; setLastIntent(res.slots.intent); }
    setCopilotMsgs((prev) => [...prev, { role: 'user', text: t }, { role: 'assistant', text: res.text, action: res.action }]);
    setCopilotInput('');
  };

  // v0.10.1: chip contestuali — dopo una risposta, suggerimenti che la continuano.
  const copChips = useMemo(() => {
    if (lastIntent === 'afford') return ['E a rate in 3 anni?', 'E con anticipo 5000?', 'Quanto avrò tra un anno?'];
    if (lastIntent === 'forecast') return ['E tra 2 anni?', 'E tra 5 anni?', 'Tra quanto raggiungo 5000?'];
    if (lastIntent === 'goal') return ['E se metto via 500 al mese?', 'Quanto avrò tra un anno?'];
    return ['Posso permettermi 25 mila a rate in 5 anni al 6%?', 'Quanto avrò tra un anno?', 'Tra quanto raggiungo 5000?', 'Quanto ho speso in cibo?', 'Cosa pago questa settimana?'];
  }, [lastIntent]);

  const saveSavings = (val) => {
    const n = Math.max(0, Math.round(parseNum(val) || 0));
    setMonthlySavingsTarget(n);
    haptic('success');
    setSavingsOpen(false);
    setSavingsInput('');
  };

  // ── EMPTY STATE: utente appena onboardato, 0 spese ──
  if (txs.length === 0) {
    return (
      <div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="hs-hero"
          style={{ paddingTop: 30, paddingBottom: 30 }}
        >
          <div className="l">Ciao{name ? ` ${name}` : ''}</div>
          <div className="v" style={{ fontSize: 34 }}>Sono il tuo assistente</div>
          <div className="s">
            Registra la prima spesa: inizio a capire i tuoi ritmi e ti aiuto ad arrivare a fine mese.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="empty-orb-wrap" aria-hidden="true"
        >
          <svg viewBox="0 0 120 120" width="120" height="120" className="empty-orb">
            <circle cx="60" cy="60" r="4" fill="var(--accent)" />
            <circle cx="60" cy="60" r="22" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.22" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.12" />
            <circle cx="82" cy="60" r="3" fill="var(--accent-2, var(--accent))" className="empty-orb-d1" />
            <circle cx="22" cy="60" r="2.5" fill="var(--accent-2, var(--accent))" className="empty-orb-d2" />
            <circle cx="60" cy="98" r="2" fill="var(--accent-2, var(--accent))" className="empty-orb-d3" />
          </svg>
        </motion.div>

        <p className="empty-cta-line">Tocca il <strong>+</strong> in basso al centro per cominciare</p>
        <div className="empty-foot">I tuoi dati restano sul tuo dispositivo. Nessun cloud, nessun account.</div>
      </div>
    );
  }

  return (
    <motion.div
      className="asst"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── HERO ── */}
      <div
        className="asst-hero"
        role="status" aria-live="polite"
        onClick={onHeroTap}
        title="Doppio tap per nascondere/mostrare gli importi"
      >
        <div className="glow" aria-hidden="true" />
        <div className="lab">Oggi puoi spendere ancora</div>
        <div className="big">
          <span className="cur">€</span>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <NumberTicker value={canToday} decimals={2} className={privacy ? 'opacity-0' : ''} />
            {privacy && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }} aria-hidden="true">***</span>}
          </span>
        </div>

        <button
          type="button"
          className={`re ${reassure.tone}`}
          onClick={(e) => { e.stopPropagation(); haptic('light'); setSavingsInput(target ? String(target) : ''); setSavingsOpen(true); }}
        >
          {reassure.icon && <Ic name={reassure.icon} />}
          <span>{reassure.text}</span>
        </button>

        <div className="strip">
          <div className="stat">
            {/* Il ciclo finisce alla PAGA, non al mese di calendario: il label dice il vero. */}
            <div className="sl">{finance.nextIncomeAt ? 'Liberi fino alla paga' : 'Liberi nel periodo'}</div>
            <div className="sv" style={eomOk && eom < 0 ? { color: 'var(--red)' } : undefined}>
              {eomOk ? <>{eom < 0 ? '-' : ''}€{maskedMoney(Math.abs(eom), { privacy, decimals: 0 })}</> : '—'}
            </div>
          </div>
          <button
            type="button"
            className="stat"
            onClick={(e) => { e.stopPropagation(); if (todayTxs.length) { haptic('light'); setDayTs(todayKey); } }}
            disabled={todayTxs.length === 0}
            style={{ border: 'none', font: 'inherit', textAlign: 'left', cursor: todayTxs.length ? 'pointer' : 'default' }}
          >
            <div className="sl">Speso oggi{todayTxs.length ? ` · ${todayTxs.length} ${todayTxs.length === 1 ? 'spesa' : 'spese'}` : ''}</div>
            <div className="sv">€{maskedMoney(spentToday, { privacy, decimals: 0 })}</div>
          </button>
        </div>

        {/* v0.10.1: posizione nel ciclo paga→paga — rende tangibile il modello */}
        {finance.cycleDaysTotal != null && (
          <div className="cycle-meta">
            <div className="cm-bar"><span style={{ width: `${Math.round((finance.cycleDayNumber / finance.cycleDaysTotal) * 100)}%` }} /></div>
            <div className="cm-t">Giorno {finance.cycleDayNumber} di {finance.cycleDaysTotal} del ciclo</div>
          </div>
        )}
      </div>

      {/* ── RICORRENZE RILEVATE (proposte con un tap · #2) ── */}
      {suggestions.length > 0 && (
        <div className="asst-suggest">
          <div className="asst-feedhead"><span className="e">Rilevati per te</span><span className="ln" /></div>
          {suggestions.map((s) => (
            <div key={s.key} className="sg-card">
              <div className="sg-top">
                <div className="sg-ic"><Ic name="card" /></div>
                <div className="sg-tx">
                  <p>Paghi spesso <b>{s.label}</b></p>
                  <span className="sg-meta">≈ €{$n(Math.round(s.amount))} · {s.cadenceLabel}{s.day ? `, il ${s.day}` : ''} · visto {s.count} volte</span>
                </div>
              </div>
              <div className="sg-acts">
                <button type="button" className="sg-add" onClick={() => addSuggestion(s)}>Aggiungi come ricorrente</button>
                <button type="button" className="sg-ign" onClick={() => { haptic('light'); dismissRecurring(s.key); }}>Ignora</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FEED ── */}
      <div className="asst-feedhead"><span className="e">Per te oggi</span><span className="ln" /></div>
      <div className="asst-feed">
        {/* v0.10: massimo 3 consigli al giorno — pochi e rilevanti */}
        {rows.slice(0, 3).map((it) => {
          const hasAction = !!it.action;
          return (
            <div key={it.id} className={`asst-row ${it.tone || 'info'}`}>
              <div className="ic"><Ic name={it.icon || 'sparkle'} /></div>
              <div className="tx">
                <p>{it.text}</p>
                {hasAction && (
                  <button type="button" className="act" onClick={() => handleAction(it.action)}>
                    <Ic name={it.action.target?.startsWith('history') ? 'chev' : it.icon || 'arrow'} />
                    {it.action.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── pillola Copilot (ingresso chat · Tappa 4) ── */}
      <button type="button" className="asst-ask" onClick={openCopilot}>
        <span className="asst-mark"><SparkWhite /></span>
        <span className="ap">Chiedimi qualcosa… “Posso permettermi una PS5?”</span>
        <span className="send" aria-hidden="true"><Ic name="arrow" stroke="#fff" /></span>
      </button>

      {/* Dettaglio spese del giorno */}
      <DayDetail
        open={dayTs != null}
        dayTs={dayTs}
        allTxs={txs}
        cats={cats}
        privacy={privacy}
        onClose={() => setDayTs(null)}
        onUpdateTx={updateTx}
        onDeleteTx={deleteTx}
      />

      {/* Sheet: obiettivo di risparmio mensile */}
      <Sheet open={savingsOpen} onClose={() => setSavingsOpen(false)} title="Quanto conservare ogni mese">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>
          Oltre al cuscinetto, quanto vuoi tenere da parte ogni mese? L'assistente
          ti avvisa se stai per intaccarlo.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {SAVE_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { haptic('light'); setSavingsInput(String(c)); }}
              style={{
                flex: 1, minWidth: 64, padding: '12px 8px', borderRadius: 12,
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                border: '1px solid', borderColor: String(parseNum(savingsInput)) === String(c) ? 'var(--accent)' : 'var(--glass-bd)',
                background: String(parseNum(savingsInput)) === String(c) ? 'var(--accent-10)' : 'var(--glass)',
                color: String(parseNum(savingsInput)) === String(c) ? 'var(--accent-text, var(--accent))' : 'var(--fg)',
              }}
            >€{c}</button>
          ))}
        </div>
        <input
          inputMode="decimal"
          value={savingsInput}
          onChange={(e) => setSavingsInput(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder="Importo personalizzato"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, marginBottom: 14,
            background: 'var(--glass)', border: '1px solid var(--glass-bd)', color: 'var(--fg)',
            fontSize: 16, fontWeight: 600, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          {target > 0 && (
            <button
              type="button"
              onClick={() => saveSavings(0)}
              style={{
                padding: 14, borderRadius: 14, background: 'var(--glass)', border: '1px solid var(--glass-bd)',
                color: 'var(--fg-2)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Azzera</button>
          )}
          <button
            type="button"
            onClick={() => saveSavings(savingsInput)}
            style={{
              flex: 1, padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
              color: 'var(--accent-on-solid)', fontSize: 14, fontWeight: 700,
              boxShadow: '0 8px 20px var(--accent-glow)',
            }}
          >Salva obiettivo</button>
        </div>
      </Sheet>

      {/* Copilot — chat LOCALE (intent + NLG dai motori, zero cloud) */}
      <Sheet open={copilotOpen} onClose={() => setCopilotOpen(false)} title="Copilot">
        <div className="cop">
          {copilotMsgs.length === 0 ? (
            <div className="cop-intro">
              <div className="cop-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z" />
                  <path d="M18 15l.7 1.9L20.5 17.5l-1.8.6L18 20l-.7-1.9L15.5 17.5l1.8-.6L18 15Z" />
                </svg>
              </div>
              <p>Faccio i conti per te, qui sul telefono: spese a rate (con anticipo e tasso), previsioni a mesi o anni, tra quanto raggiungi un obiettivo, quanto hai speso, quando arriva la paga. Chiedimi in linguaggio naturale.</p>
            </div>
          ) : (
            <div className="cop-msgs" ref={copMsgsRef}>
              {copilotMsgs.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'cop-q' : 'cop-a'}>
                  {m.text}
                  {/* v0.10.1: azione rapida — dalla risposta allo sheet Aggiungi, importo pronto */}
                  {m.role === 'assistant' && m.action?.kind === 'add-expense' && (
                    <button
                      type="button"
                      className="cop-act"
                      onClick={() => { haptic('light'); setCopilotOpen(false); onPrefillAdd?.({ amount: m.action.amount }); }}
                    >
                      Aggiungila come spesa · €{$n(m.action.amount)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="cop-chips">
            {copChips.map((q) => (
              <button key={q} type="button" className="cop-chip" onClick={() => submitCopilot(q)}>{q}</button>
            ))}
          </div>
          <form className="cop-input" onSubmit={(e) => { e.preventDefault(); submitCopilot(copilotInput); }}>
            <input
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder="Scrivi una domanda…"
              aria-label="Chiedi al Copilot"
            />
            <button type="submit" className="cop-send" aria-label="Invia"><Ic name="arrow" stroke="#fff" /></button>
          </form>
        </div>
      </Sheet>
    </motion.div>
  );
};
