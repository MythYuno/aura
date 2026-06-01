import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DayDetail } from '../components/DayDetail.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { askCopilot } from '../lib/engine/copilot.js';
import {
  IcAlert, IcTrendUp, IcTrendDown, IcCard, IcGoal, IcPiggy, IcSparkle,
  IcCheck, IcGauge, IcCalendar, IcArrowR, IcChevR, iconForCategory,
} from '../lib/icons.jsx';
import { $n, parseNum, maskedMoney, realCost } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

const DAY_MS = 864e5;

// "Oggi" · "Ieri" · "12 mar" — etichetta breve per la lista movimenti.
const dayLabel = (ts, todayKey) => {
  const d = new Date(ts).setHours(0, 0, 0, 0);
  if (d === todayKey) return 'Oggi';
  if (d === todayKey - DAY_MS) return 'Ieri';
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace(/\./g, '');
};

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
export const Assistant = ({ store, onGoToMoney, onOpenCategory, onGoToHistory, onPrefillAdd }) => {
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

  // ── ultimi 7 giorni (grafico a barre) ──
  // Stessa unità del motore: realCost (importo meno il rimborso già incassato).
  const last7 = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const start = todayKey - i * DAY_MS;
      const tot = txs.reduce(
        (a, t) => (t.ts >= start && t.ts < start + DAY_MS ? a + realCost(t) : a),
        0,
      );
      out.push({ ts: start, tot: Math.round(tot * 100) / 100 });
    }
    return out;
  }, [txs, todayKey]);
  const max7 = useMemo(() => Math.max(1, ...last7.map((d) => d.tot)), [last7]);
  const avg7 = useMemo(() => last7.reduce((a, d) => a + d.tot, 0) / 7, [last7]);

  // ── ultimi movimenti (le 4 spese più recenti) ──
  const recent = useMemo(
    () => [...txs].sort((a, b) => b.ts - a.ts).slice(0, 4),
    [txs],
  );

  // ── il punto della settimana ────────────────────────────────────
  // La ricerca sull'abbandono delle app di spese dice che il rito settimanale
  // (poco, una volta a settimana) tiene più dell'attrito quotidiano. Qui in un
  // minuto: quanto è uscito, dove, cosa arriva, e cosa vale la pena correggere
  // — perché ogni correzione insegna qualcosa all'app.
  const weekly = useMemo(() => {
    const from = todayKey - 6 * DAY_MS;
    const prevFrom = todayKey - 13 * DAY_MS;
    const inRange = (t, a, b) => t.ts >= a && t.ts < b;
    const speso = txs.reduce((s, t) => (inRange(t, from, todayKey + DAY_MS) ? s + realCost(t) : s), 0);
    const spesoPrima = txs.reduce((s, t) => (inRange(t, prevFrom, from) ? s + realCost(t) : s), 0);

    const perCat = {};
    txs.forEach((t) => {
      if (!inRange(t, from, todayKey + DAY_MS)) return;
      perCat[t.cat] = (perCat[t.cat] || 0) + realCost(t);
    });
    const top = Object.entries(perCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id, amount]) => ({ cat: cats.find((c) => c.id === id), amount }));

    // Pagamenti mensili che cadono nei prossimi 7 giorni.
    const limite = new Date(todayKey + 7 * DAY_MS);
    const oggiD = new Date(todayKey);
    const inArrivo = [];
    (store.subscriptions || []).forEach((r) => {
      if (r.active === false || (r.cadence || 'monthly') !== 'monthly') return;
      const g = Math.min(28, Math.max(1, parseInt(r.day || r.deductDay || r.dayOfMonth || 1)));
      for (let m = 0; m < 2; m++) {
        const due = new Date(oggiD.getFullYear(), oggiD.getMonth() + m, g);
        if (due >= oggiD && due < limite) { inArrivo.push({ ...r, _date: due }); break; }
      }
    });

    // Spese che meritano un secondo sguardo: quelle finite in "Altro" e quelle
    // create dall'allineamento col conto.
    const daSistemare = txs
      .filter((t) => inRange(t, from, todayKey + DAY_MS)
        && (t.cat === 'other' || (t.tags || []).includes('non-tracciato')))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 3);

    return {
      speso: Math.round(speso * 100) / 100,
      delta: spesoPrima > 0 ? Math.round(((speso - spesoPrima) / spesoPrima) * 100) : null,
      top,
      inArrivo,
      inArrivoTot: inArrivo.reduce((s, r) => s + (r.amount || 0), 0),
      daSistemare,
    };
  }, [txs, todayKey, cats, store.subscriptions]);

  // Chiave della settimana: il lunedì di riferimento, in ora locale.
  const weekKey = useMemo(() => {
    const d = new Date(todayKey);
    const lun = new Date(d);
    lun.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const mm = String(lun.getMonth() + 1).padStart(2, '0');
    const gg = String(lun.getDate()).padStart(2, '0');
    return `aura_week_${lun.getFullYear()}-${mm}-${gg}`;
  }, [todayKey]);
  const [weekDone, setWeekDone] = useState(() => {
    try { return localStorage.getItem(weekKey) === '1'; } catch { return false; }
  });
  const closeWeek = () => {
    haptic('success');
    try { localStorage.setItem(weekKey, '1'); } catch {}
    setWeekDone(true);
  };
  // Sabato → martedì: una finestra larga, così non lo si perde se non si apre
  // l'app di domenica. Fuori da lì non compare.
  const giorno = new Date(todayKey).getDay();
  const showWeekly = !weekDone && (giorno === 6 || giorno === 0 || giorno === 1 || giorno === 2)
    && txs.length >= 3;

  // ── il richiamo della sera ──────────────────────────────────────
  // Le notifiche programmate non esistono nello standard web: senza un server
  // (e AURA non ne ha, per scelta) non si può avvisare ad app chiusa. Quello
  // che si può fare è accogliere bene chi apre l'app di sera senza aver
  // segnato niente — è lì che la giornata si perde. Niente rimproveri: due
  // strade, una per segnare e una per dire "oggi non ho speso".
  // Chiave del giorno costruita sull'ora LOCALE: con toISOString (UTC) in
  // Italia la sera si finiva sul giorno prima.
  const zeroKey = useMemo(() => {
    const d = new Date(todayKey);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const gg = String(d.getDate()).padStart(2, '0');
    return `aura_zero_${d.getFullYear()}-${mm}-${gg}`;
  }, [todayKey]);
  const [zeroDone, setZeroDone] = useState(() => {
    try { return localStorage.getItem(zeroKey) === '1'; } catch { return false; }
  });
  const askedZero = () => {
    haptic('success');
    try { localStorage.setItem(zeroKey, '1'); } catch {}
    setZeroDone(true);
  };
  const showEvening = new Date().getHours() >= 19
    && spentToday === 0
    && txs.length > 0
    && !zeroDone;

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
      {/* ── CARTA DI MARCA: il numero del giorno + la barra del ciclo ── */}
      <div
        className="bk-card"
        role="status" aria-live="polite"
        onClick={onHeroTap}
        title="Doppio tap per nascondere/mostrare gli importi"
      >
        <div className="top">
          <div style={{ minWidth: 0 }}>
            <div className="lab">Puoi spendere oggi</div>
            <div className="big">
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <NumberTicker value={canToday} decimals={2} className={privacy ? 'opacity-0' : ''} />
                {privacy && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }} aria-hidden="true">***</span>}
              </span>
              <span className="cur">€</span>
            </div>
          </div>
          {finance.cycleDaysTotal != null && (
            <div className="bk-pill">{finance.cycleDayNumber} / {finance.cycleDaysTotal}</div>
          )}
        </div>

        {finance.cycleDaysTotal != null && (() => {
          const pct = Math.min(100, Math.round((finance.cycleDayNumber / finance.cycleDaysTotal) * 100));
          return (
            <div className="bk-bar">
              <span style={{ width: `${pct}%` }} />
              <i style={{ left: `${pct}%` }} aria-hidden="true" />
            </div>
          );
        })()}

        <div className="foot">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (todayTxs.length) { haptic('light'); setDayTs(todayKey); } }}
            disabled={todayTxs.length === 0}
            style={{
              background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit',
              textAlign: 'left', cursor: todayTxs.length ? 'pointer' : 'default',
            }}
          >
            Oggi hai speso <b>€{maskedMoney(spentToday, { privacy, decimals: 2 })}</b>
          </button>
          <span>
            {finance.daysToNextIncome != null
              ? (finance.daysToNextIncome === 0
                ? 'Paga oggi'
                : `Paga tra ${finance.daysToNextIncome} ${finance.daysToNextIncome === 1 ? 'giorno' : 'giorni'}`)
              : `Giorno ${finance.cycleDayNumber || 1}`}
          </span>
        </div>
      </div>

      {/* ── SEMAFORO del ciclo (tap → obiettivo di risparmio) ── */}
      <button
        type="button"
        className={`bk-status ${reassure.tone}`}
        onClick={() => { haptic('light'); setSavingsInput(target ? String(target) : ''); setSavingsOpen(true); }}
      >
        <span className="dot" aria-hidden="true" />
        <span className="tx">{reassure.text}</span>
        <span className="chev" aria-hidden="true"><Ic name="chev" /></span>
      </button>

      {/* ── DUE TESSERE ── */}
      <div className="bk-duo">
        <div className="bk-tile">
          {/* Il ciclo finisce alla PAGA, non al mese di calendario. */}
          <div className="l">{finance.nextIncomeAt ? 'Liberi fino alla paga' : 'Liberi nel periodo'}</div>
          <div className={`v ${eomOk && eom < 0 ? 'neg' : ''}`}>
            {eomOk ? <>{eom < 0 ? '-' : ''}€{maskedMoney(Math.abs(eom), { privacy, decimals: 0 })}</> : '—'}
          </div>
        </div>
        <div className="bk-tile">
          <div className="l">{target > 0 ? 'Da parte ogni mese' : 'Cuscinetto'}</div>
          <div className="v">€{maskedMoney(target > 0 ? target : (cushion || 0), { privacy, decimals: 0 })}</div>
        </div>
      </div>

      {/* ── IL PUNTO DELLA SETTIMANA ── */}
      {showWeekly && (
        <div className="bk-panel wk">
          <div className="bk-head">
            <span className="t">Il punto della settimana</span>
            <span className="m">un minuto</span>
          </div>

          <div className="wk-big">
            <span className="v">€{maskedMoney(weekly.speso, { privacy, decimals: 0 })}</span>
            <span className="l">
              usciti in 7 giorni
              {weekly.delta != null && (
                <b className={weekly.delta > 0 ? 'up' : 'down'}>
                  {weekly.delta > 0 ? '+' : ''}{weekly.delta}% sulla settimana prima
                </b>
              )}
            </span>
          </div>

          {weekly.top.length > 0 && (
            <div className="wk-cats">
              {weekly.top.map(({ cat, amount }) => (
                <button
                  key={cat?.id || 'x'}
                  type="button"
                  className="wk-cat"
                  onClick={() => { haptic('light'); onOpenCategory?.(cat?.id); }}
                >
                  <span className="d" style={{ background: cat?.color || 'var(--fg-3)' }} />
                  <span className="n">{cat?.label || 'Altro'}</span>
                  <span className="a">€{maskedMoney(amount, { privacy, decimals: 0 })}</span>
                </button>
              ))}
            </div>
          )}

          {weekly.inArrivo.length > 0 && (
            <div className="wk-next">
              In arrivo nei prossimi 7 giorni: <b>{weekly.inArrivo.length} {weekly.inArrivo.length === 1 ? 'pagamento' : 'pagamenti'}</b> per <b>€{$n(weekly.inArrivoTot)}</b>
              <span className="wk-next-l">{weekly.inArrivo.map((r) => r.label).join(' · ')}</span>
            </div>
          )}

          {weekly.daSistemare.length > 0 && (
            <>
              <div className="wk-fix-ttl">Vale la pena sistemarle</div>
              <div className="wk-fix-sub">Se le metti nella categoria giusta, la prossima volta la indovino da solo.</div>
              {weekly.daSistemare.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="wk-fix"
                  onClick={() => { haptic('light'); setDayTs(new Date(t.ts).setHours(0, 0, 0, 0)); }}
                >
                  <span className="n">{t.label || 'Spesa senza descrizione'}</span>
                  <span className="w">{dayLabel(t.ts, todayKey)}</span>
                  <span className="a">€{maskedMoney(realCost(t), { privacy, decimals: 2 })}</span>
                </button>
              ))}
            </>
          )}

          <button type="button" className="wk-done" onClick={closeWeek}>Fatto, ci siamo</button>
        </div>
      )}

      {/* ── LA SERA, SE NON HAI SEGNATO NIENTE ── */}
      {showEvening && (
        <div className="bk-panel eve">
          <div className="eve-tx">
            <b>Oggi non hai segnato niente.</b> È andata così, o è solo sfuggito?
          </div>
          <div className="eve-acts">
            <button type="button" className="primary" onClick={() => { haptic('light'); onPrefillAdd?.({}); }}>
              Segna una spesa
            </button>
            <button type="button" onClick={askedZero}>Oggi zero</button>
          </div>
        </div>
      )}

      {/* ── ULTIMI 7 GIORNI ── */}
      <div className="bk-panel">
        <div className="bk-head">
          <span className="t">Ultimi 7 giorni</span>
          <span className="m">media €{maskedMoney(avg7, { privacy, decimals: 0 })} al giorno</span>
        </div>
        <div className="bk-chart">
          {/* Riga della media, posizionata sull'area barre (58px) sopra le
              etichette (12px di testo + 7px di gap). */}
          {avg7 > 0 && (
            <span className="bk-avg" style={{ bottom: `${19 + (avg7 / max7) * 58}px` }} aria-hidden="true">
              <em>media</em>
            </span>
          )}
          {last7.map((d, i) => (
            <button
              key={d.ts}
              type="button"
              className={`bk-col ${i === 6 ? 'on' : ''}`}
              onClick={() => { if (d.tot > 0) { haptic('light'); setDayTs(d.ts); } }}
              aria-label={`${new Date(d.ts).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}: €${$n(d.tot)}`}
            >
              <span className="bw">
                <span className="b" style={{ height: `${Math.max(4, Math.round((d.tot / max7) * 100))}%` }} />
              </span>
              <span className="d">
                {new Date(d.ts).toLocaleDateString('it-IT', { weekday: 'short' }).replace(/\./g, '').slice(0, 3)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── RICORRENZE RILEVATE (proposte con un tap · #2) ── */}
      {suggestions.length > 0 && (
        <div className="bk-panel asst-suggest">
          <div className="bk-head"><span className="t">Rilevati per te</span></div>
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
      {rows.length > 0 && (
        <div className="bk-panel">
          <div className="bk-head"><span className="t">Per te oggi</span></div>
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
        </div>
      )}

      {/* ── ULTIMI MOVIMENTI ── */}
      {recent.length > 0 && (
        <div className="bk-panel">
          <div className="bk-head">
            <span className="t">Ultimi movimenti</span>
            <button type="button" className="more" onClick={() => { haptic('light'); onGoToHistory?.(); }}>
              Vedi tutti
            </button>
          </div>
          {recent.map((t) => {
            const cat = cats.find((c) => c.id === t.cat);
            const color = cat?.color || 'var(--fg-3)';
            const CatIcon = iconForCategory(t.cat, cat?.label);
            return (
              <button
                key={t.id}
                type="button"
                className="bk-tx"
                onClick={() => { haptic('light'); setDayTs(new Date(t.ts).setHours(0, 0, 0, 0)); }}
              >
                <span
                  className="ic"
                  style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                  aria-hidden="true"
                ><CatIcon /></span>
                <span className="n">
                  <span className="t">{t.label || cat?.label || 'Spesa'}</span>
                  <span className="s">{dayLabel(t.ts, todayKey)}{cat?.label ? ` · ${cat.label}` : ''}</span>
                </span>
                <span className="a">−€{maskedMoney(realCost(t), { privacy, decimals: 2 })}</span>
              </button>
            );
          })}
        </div>
      )}

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
