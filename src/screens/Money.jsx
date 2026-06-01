import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { Sheet } from '../components/ui/Sheet.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SpendingAreas } from '../components/SpendingAreas.jsx';
import {
  IcSalary, IcShield, IcSubscription, IcChevR, IcPlus, IcX,
  IcArrowIn, IcCalendar, IcClock, IcGoal, IcCheck,
} from '../lib/icons.jsx';
import { parseNum, $n, maskedMoney, round2 } from '../lib/format.js';
import { nextIncomeDate } from '../lib/analytics.js';
import { haptic } from '../lib/haptic.js';
import { useToast } from '../hooks/useUndoToast.js';

/**
 * Money (v5 · Headspace style + balance-first):
 *  - eyebrow con periodo dinamico
 *  - hero card grande: "Saldo nel conto" → currentBalance
 *  - twin: liberi periodo / al giorno
 *  - flow list "Cosa entra e cosa esce" (movimenti futuri prima della prossima entrata)
 *  - tap card: I tuoi desideri (apre Wishes inline)
 *  - tap card: Rettifica stipendio del mese (sheet)
 *  - warm card: prossima scadenza imminente
 */
export const Money = ({ store, onOpenCategory }) => {
  const {
    name,
    // balance-first
    currentBalance, setCurrentBalance, cushion, freeUntilNext, spendableUntilNext, nextIncomeAt, daysToNextIncome, lockedUntilNext, incomes,
    monthlySavingsTarget,
    // v0.8.2: promemoria aggiornamento saldo dopo la paga
    needsBalanceUpdate, lastPaydayDate, markBalanceUpdated,
    // v0.9.25: controllo gentile "il saldo torna con la banca?"
    needsReconcile,
    // v0.8.2: quota giornaliera canonica (stessa di Oggi)
    dailyQuota,
    // v0.9: segna ricorrente come pagata
    markRecurringPaid, isRecurringPaid,
    // v0.9.25: salta un'occorrenza del mese ("questo mese non lo pago")
    toggleSkipRecurring, isRecurringSkipped,
    // legacy (mantenuti per le funzionalita esistenti)
    salary, effectiveSalary, monthKey, setSalaryForMonth,
    annualExpenses, addAnnual, removeAnnual, annualMonthly,
    fixed, fixedMonthly, subscriptions, subscriptionsMonthly,
    extraIncomes,
    periodStart, periodEnd,
    privacy,
    now,           // stable today-anchor del store: cambia solo a mezzanotte
  } = store;
  const tour = useTour('money', store);
  const toast = useToast();
  // v0.9: segna un fisso/abbonamento come pagato → crea la spesa e lo toglie dal libero
  const onMarkPaid = (m) => {
    const catId = m._kind === 'sub' ? 'fun' : 'home';
    const ok = markRecurringPaid({ id: m.id, label: m.label, amount: m.amount, date: m._date, catId });
    if (ok) toast?.show?.(`${m.label} segnata come pagata`, null);
  };
  // v0.9.25: salta questo mese (toggle). Niente spesa creata, libero ricalcolato.
  const onToggleSkip = (m) => {
    const wasSkipped = isRecurringSkipped(m.id, m._date);
    const ok = toggleSkipRecurring(m.id, m._date);
    if (ok) toast?.show?.(wasSkipped ? `${m.label} torna in programma` : `${m.label}: saltata questo mese`, null);
  };

  const [showSalaryEdit, setShowSalaryEdit] = useState(false);
  const [salaryInput, setSalaryInput] = useState(String(effectiveSalary || ''));
  const [showAnnual, setShowAnnual] = useState(false);
  const [aLbl, setALbl] = useState('');
  const [aAmt, setAAmt] = useState('');
  const [aMonth, setAMonth] = useState('1');
  const [showFlow, setShowFlow] = useState(false);
  // v0.8.2: sheet rapido per aggiornare il saldo dopo la paga
  const [showBalanceQuick, setShowBalanceQuick] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  // ─── Periodo dinamico (oggi → prossima entrata) ─────
  // `now` arriva dallo store come anchor di mezzanotte stable, così i useMemo
  // sotto NON si invalidano ad ogni render (causa di lentezza con 2000+ tx).
  const periodLabel = useMemo(() => {
    if (nextIncomeAt) {
      const d = nextIncomeAt;
      const dayStr = d.getDate();
      const monthStr = d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
      return `Periodo · oggi → ${dayStr} ${monthStr}`;
    }
    // fallback: usa il mese di calendario
    return `${now.toLocaleDateString('it-IT', { month: 'long' })}, giorno ${now.getDate()}`;
  }, [nextIncomeAt, now]);

  // v0.8.2: "al giorno" ora usa la quota canonica dello store (dailyQuota),
  // così Oggi e Soldi mostrano lo STESSO budget giornaliero. Niente più
  // calcolo locale divergente.

  // ─── Movimenti futuri prima della prossima entrata ─────
  const futureMovements = useMemo(() => {
    const items = [];
    const todayDate = now.getDate();
    const limit = nextIncomeAt || new Date(now.getTime() + 30 * 864e5);

    const pushIfBefore = (item, kind) => {
      // v0.9: solo cadenza mensile è "occorrenza singola" segnabile-come-pagata.
      // I non-mensili (annuali ecc.) non compaiono qui come evento puntuale.
      if (kind === 'sub' && item.cadence && item.cadence !== 'monthly') return;
      const day = Math.min(28, Math.max(1, parseInt(item.deductDay || item.dayOfMonth || 1)));
      let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
      let safety = 0;
      while (cursor < limit && safety < 4) {
        const due = new Date(cursor.getFullYear(), cursor.getMonth(), day);
        if (due >= now && due < limit) {
          items.push({ ...item, _date: due, _kind: kind });
          break;
        }
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        safety++;
      }
    };
    fixed.filter((f) => f.active !== false).forEach((f) => pushIfBefore(f, 'fixed'));
    subscriptions.filter((s) => s.active !== false).forEach((s) => pushIfBefore(s, 'sub'));

    // Entrate ricorrenti future (anche la stessa che chiude il periodo).
    // v0.9.25: via nextIncomeDate → vale anche per cadenze settimanali/quindicinali.
    incomes.filter((i) => i.active !== false).forEach((inc) => {
      const next = nextIncomeDate([inc], now);
      if (next && nextIncomeAt && next.getTime() === nextIncomeAt.getTime()) {
        items.push({ ...inc, _date: next, _isIncome: true });
      }
    });
    return items.sort((a, b) => a._date - b._date);
  }, [fixed, subscriptions, incomes, now, nextIncomeAt]);

  // v0.10.1: proiezione del saldo lungo il ciclo ("se continui così").
  // saldo_t = saldo − spesa media×t − impegni che cadono entro il giorno t.
  // Stima onesta: usa la media robusta del motore, esclude pagati/saltati.
  const spark = useMemo(() => {
    if (!nextIncomeAt || !daysToNextIncome || daysToNextIncome < 2) return null;
    const avg = store.finance?.avgDailySpend || 0;
    const outs = futureMovements
      .filter((m) => !m._isIncome && !(m.id && (isRecurringPaid(m.id, m._date) || isRecurringSkipped(m.id, m._date))))
      .map((m) => ({ inDays: Math.max(0, Math.round((m._date - now) / 864e5)), amount: m.amount || 0 }));
    const D = daysToNextIncome;
    const vals = [];
    for (let t = 0; t <= D; t++) {
      const outSum = outs.filter((o) => o.inDays <= t).reduce((s, o) => s + o.amount, 0);
      vals.push(round2((currentBalance || 0) - avg * t - outSum));
    }
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals);
    const range = (max - min) || 1;
    const pts = vals.map((v, t) => `${((t / D) * 100).toFixed(1)},${(26 - ((v - min) / range) * 22).toFixed(1)}`).join(' ');
    return { pts, projAtPay: vals[vals.length - 1] };
  }, [nextIncomeAt, daysToNextIncome, futureMovements, currentBalance, store.finance?.avgDailySpend, now, isRecurringPaid, isRecurringSkipped]);

  const nextScadenza = futureMovements.find((m) => !m._isIncome);
  const daysToNextScadenza = nextScadenza ? Math.max(0, Math.round((nextScadenza._date - now) / 864e5)) : null;

  // ─── Submit handlers ───────────────────────────────
  const saveSalary = () => {
    setSalaryForMonth(monthKey, parseNum(salaryInput));
    setShowSalaryEdit(false);
  };
  // v0.8.2: apri lo sheet rapido col saldo attuale pre-compilato
  const openBalanceQuick = () => {
    setBalanceInput(String(currentBalance || ''));
    setShowBalanceQuick(true);
    haptic('light');
  };
  const saveBalanceQuick = () => {
    setCurrentBalance(round2(parseNum(balanceInput)));
    markBalanceUpdated();
    setShowBalanceQuick(false);
    haptic('success');
  };
  const saveAnnual = () => {
    if (!aLbl || !aAmt) return;
    addAnnual(aLbl, aAmt, aMonth);
    setALbl(''); setAAmt(''); setAMonth('1');
    setShowAnnual(false);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };
  const dotColorFor = (item) => {
    if (item._isIncome) return 'var(--accent)';
    if (item.type === 'annual' || item.dueMonth) return 'var(--purple)';
    if (subscriptions.includes(item)) return 'var(--info)';
    return 'var(--purple)';
  };

  return (
    <div className="screen-money">
      <Tour {...tour} />

      <div className="hs-eyebrow">{periodLabel}</div>

      {/* v0.8.2: promemoria post-paga (modello manuale). Appare solo quando
          una paga è passata dopo l'ultimo aggiornamento del saldo. */}
      {needsBalanceUpdate && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={openBalanceQuick}
          className="balance-nudge"
        >
          <span className="balance-nudge-ic"><IcSalary /></span>
          <span className="balance-nudge-body">
            <strong>Stipendio arrivato?</strong>
            {lastPaydayDate ? ` Paga prevista il ${lastPaydayDate.getDate()}/${lastPaydayDate.getMonth() + 1}.` : ''} Aggiorna il saldo per tenere i conti precisi.
          </span>
          <span className="balance-nudge-cta">Aggiorna</span>
        </motion.button>
      )}

      {/* v0.9.25: riconciliazione — il saldo è manuale, ogni ~2 settimane
          proponiamo di confrontarlo con la banca. Un tap → sheet aggiorna saldo. */}
      {needsReconcile && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={openBalanceQuick}
          className="balance-nudge"
        >
          <span className="balance-nudge-ic"><IcCheck /></span>
          <span className="balance-nudge-body">
            <strong>Il saldo torna ancora?</strong> Sono passate 2+ settimane: confrontalo con l'app della banca e, se serve, riallinea.
          </span>
          <span className="balance-nudge-cta">Controlla</span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`hs-hero ${(currentBalance || 0) < 0 ? 'overflow' : ''}`}
      >
        <div className="l">Saldo nel conto</div>
        {/* v0.8.2: saldo può essere negativo (overdraft). Mostro il segno − e,
            sotto, un avviso "sei in rosso" invece del testo normale sui liberi. */}
        <div className="v">
          {(currentBalance || 0) < 0 && !privacy && <span className="cur">−</span>}
          <span className="cur">€</span>{maskedMoney(Math.abs(currentBalance || 0), { privacy, decimals: 0 })}
        </div>
        <div className="s">
          {(currentBalance || 0) < 0
            ? <>Sei <b>in rosso di €{maskedMoney(Math.abs(currentBalance), { privacy, decimals: 0 })}</b>. Aggiorna il saldo da Setup o rientra appena puoi.</>
            : spendableUntilNext > 0 && nextIncomeAt
              ? <>Di questi, <b>€{maskedMoney(spendableUntilNext, { privacy, decimals: 0 })}</b> spendibili fino al {formatDate(nextIncomeAt)}{monthlySavingsTarget > 0 ? ` (€${$n(monthlySavingsTarget)} da parte)` : ''}.</>
              : cushion > 0 || monthlySavingsTarget > 0
                ? <>Tutto il libero va in <b>cuscinetto e risparmi</b> in questo periodo.</>
                : 'Aggiungi entrate e cuscinetto in Setup per il calcolo del periodo.'}
        </div>
      </motion.div>

      <div className="hs-twin">
        <div className="c">
          <div className="l">Spendibili</div>
          <div className="v g">€{maskedMoney(Math.max(0, spendableUntilNext), { privacy, decimals: 0 })}</div>
          {daysToNextIncome && (
            <div className="sub">in {daysToNextIncome} {daysToNextIncome === 1 ? 'giorno' : 'giorni'}{monthlySavingsTarget > 0 ? ' · risparmi esclusi' : ''}</div>
          )}
        </div>
        <div className="c">
          <div className="l">Al giorno</div>
          <div className="v">€{maskedMoney(Math.max(0, dailyQuota), { privacy, decimals: 0 })}</div>
          <div className="sub">budget di oggi</div>
        </div>
      </div>

      {/* v0.10: TIMELINE DEL CICLO — oggi → paga, con i movimenti come punti.
          Posizione = giorni dalla data di oggi / giorni totali del ciclo. Tap → sheet. */}
      {nextIncomeAt && daysToNextIncome > 0 && (
        <button
          type="button"
          className="cycle-line"
          onClick={() => { haptic('light'); setShowFlow(true); }}
          aria-label="Timeline del ciclo: tocca per i movimenti"
        >
          <div className="bar">
            <span className="dot start" />
            {futureMovements.filter((m) => !m._isIncome).map((m, i) => {
              const pct = Math.min(96, Math.max(4, ((m._date - now) / (nextIncomeAt - now)) * 100));
              return <span key={i} className="dot mov" style={{ left: `${pct}%` }} />;
            })}
            <span className="dot end" />
          </div>
          <div className="lbls"><span>oggi</span><span>paga · {formatDate(nextIncomeAt)}</span></div>
          {/* v0.10.1: proiezione del saldo lungo il ciclo ("se continui così") */}
          {spark && (
            <>
              <svg className="cl-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={spark.pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
              </svg>
              <div className="cl-proj">
                Se continui così: <b style={{ color: spark.projAtPay < 0 ? 'var(--red)' : 'var(--fg)' }}>
                  ≈{spark.projAtPay < 0 ? '−' : ''}€{maskedMoney(Math.abs(spark.projAtPay), { privacy, decimals: 0 })}
                </b> sul conto alla vigilia della paga
              </div>
            </>
          )}
        </button>
      )}

      <button
        type="button"
        className="hs-tap"
        onClick={() => { haptic('light'); setShowFlow(true); }}
      >
        <span className="ic"><IcArrowIn /></span>
        <div className="body">
          <div className="t">Cosa entra e cosa esce</div>
          <div className="s">
            {futureMovements.length === 0
              ? 'Nessun movimento pianificato'
              : `${futureMovements.length} ${futureMovements.length === 1 ? 'movimento' : 'movimenti'} prima del prossimo stipendio`}
          </div>
        </div>
        <span className="chev"><IcChevR /></span>
      </button>

      {/* Card legacy "Rettifica stipendio del mese" — utile solo se l'utente
          ha il vecchio modello (salary > 0). Con il nuovo balance-first la
          rettifica e' fatta aggiornando il saldo da Setup → Saldo & cuscinetto. */}
      {salary > 0 && (
        <button
          type="button"
          className="hs-tap"
          onClick={() => { haptic('light'); setShowSalaryEdit(true); }}
        >
          <span className="ic"><IcSalary /></span>
          <div className="body">
            <div className="t">Rettifica stipendio del mese</div>
            <div className="s">
              {effectiveSalary !== salary
                ? <>Quest'oggi: <b style={{ color: 'var(--accent)' }}>€{$n(effectiveSalary)}</b> (default €{$n(salary)})</>
                : <>€{$n(salary)} di default. Tap se questo mese è diverso.</>}
            </div>
          </div>
          <span className="chev"><IcChevR /></span>
        </button>
      )}

      {nextScadenza && daysToNextScadenza !== null && daysToNextScadenza <= 5 && (
        <div className="hs-warm" style={{ marginTop: 6 }}>
          <span className="ic"><IcClock /></span>
          <div className="body">
            <div className="t">{nextScadenza.label} {daysToNextScadenza === 0 ? 'oggi' : daysToNextScadenza === 1 ? 'domani' : `tra ${daysToNextScadenza} giorni`}</div>
            <div className="s">€{$n(nextScadenza.amount)} il {formatDate(nextScadenza._date)} — già conteggiato nel libero</div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="hs-tap"
        onClick={() => { haptic('light'); setShowAnnual(true); }}
      >
        <span className="ic" style={{ background: 'rgba(167,139,250,.15)', color: 'var(--purple)' }}><IcShield /></span>
        <div className="body">
          <div className="t">Spese annuali</div>
          <div className="s">
            {annualExpenses.length === 0
              ? 'Aggiungi assicurazione, bollo, IMU…'
              : <>{annualExpenses.length} {annualExpenses.length === 1 ? 'voce' : 'voci'} · €{$n(annualMonthly)}/mese accantonati</>}
          </div>
        </div>
        <span className="chev"><IcChevR /></span>
      </button>

      {/* v0.9: "Dove vanno i soldi" — aree di spesa per categoria col
          confronto sulla media storica. Sezione promessa dal tour e finalmente
          renderizzata. onOpenCategory naviga alla Storia filtrata (#4). */}
      <SpendingAreas store={store} onOpenCategory={onOpenCategory} />

      {/* v0.9.9: gli Obiettivi sono ora una tab dedicata (barra) — vedi App.jsx. */}

      {/* ───── SHEETS ───── */}
      <Sheet open={showFlow} onClose={() => setShowFlow(false)} title="Movimenti del periodo">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Cosa succede tra <strong>oggi</strong> e {nextIncomeAt ? formatDate(nextIncomeAt) : 'fine periodo'}.
          Tutto questo è già scontato dai tuoi <strong style={{ color: 'var(--accent)' }}>€{maskedMoney(Math.max(0, spendableUntilNext), { privacy, decimals: 0 })}</strong> spendibili.
        </p>
        <div className="hs-flow">
          {futureMovements.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'center', padding: '24px 0' }}>
              Nessun movimento pianificato.
            </p>
          ) : futureMovements.map((m, idx) => {
            const paid = !m._isIncome && m.id && isRecurringPaid(m.id, m._date);
            const skipped = !paid && !m._isIncome && m.id && isRecurringSkipped(m.id, m._date);
            return (
              <div key={idx} className={`r ${m._isIncome ? 'in' : 'out'}`} style={(paid || skipped) ? { opacity: 0.55 } : undefined}>
                <span className="d" style={{ background: dotColorFor(m), boxShadow: m._isIncome ? `0 0 6px ${dotColorFor(m)}` : 'none' }} />
                <span className="n" style={(paid || skipped) ? { textDecoration: 'line-through' } : undefined}>{m.label}</span>
                <span className="when">{formatDate(m._date)}</span>
                <span className="a">€{$n(m.amount)}</span>
                {/* v0.9: pagato · v0.9.25: salta questo mese (solo uscite mensili) */}
                {!m._isIncome && m.id && (
                  paid ? (
                    <span className="flow-paid" aria-label="già pagata"><IcCheck width="12" height="12" /></span>
                  ) : skipped ? (
                    <button type="button" className="flow-paid-btn" onClick={() => onToggleSkip(m)}>
                      Annulla salto
                    </button>
                  ) : (
                    <>
                      <button type="button" className="flow-paid-btn" onClick={() => onMarkPaid(m)}>
                        Pagato
                      </button>
                      <button type="button" className="flow-paid-btn" style={{ color: 'var(--fg-3)' }} onClick={() => onToggleSkip(m)}>
                        Salta
                      </button>
                    </>
                  )
                )}
              </div>
            );
          })}
          <div className="r free" style={{ marginTop: 6 }}>
            <span className="d" style={{ background: 'var(--accent)' }} />
            <span className="n">Spendibile{monthlySavingsTarget > 0 ? ' (risparmi esclusi)' : ''}</span>
            <span className="a">€{maskedMoney(Math.max(0, spendableUntilNext), { privacy, decimals: 0 })}</span>
          </div>
        </div>
      </Sheet>

      <Sheet open={showSalaryEdit} onClose={() => setShowSalaryEdit(false)} title="Rettifica stipendio">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Solo per <strong>{monthKey}</strong>. Le rettifiche valgono per il mese corrente — il prossimo mese torna al default di €{$n(salary)}.
        </p>
        <label className="qa-lbl">Importo effettivo</label>
        <input
          type="text"
          inputMode="decimal"
          className="qa-input"
          value={salaryInput}
          onChange={(e) => setSalaryInput(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button variant="default" size="lg" className="flex-1" onClick={() => setShowSalaryEdit(false)}>Annulla</Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={saveSalary}>Salva</Button>
        </div>
      </Sheet>

      {/* v0.8.2: aggiornamento rapido del saldo dopo la paga */}
      <Sheet open={showBalanceQuick} onClose={() => setShowBalanceQuick(false)} title="Aggiorna saldo">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Controlla quanto hai <strong>davvero in conto adesso</strong> (app della banca) e scrivilo qui.
          Da questo numero AURA ricalcola quanto puoi spendere fino alla prossima paga.
        </p>
        <label className="qa-lbl">Saldo nel conto adesso</label>
        <input
          type="text"
          inputMode="decimal"
          className="qa-input"
          value={balanceInput}
          onChange={(e) => setBalanceInput(e.target.value)}
          autoFocus
        />
        {parseNum(balanceInput) !== (currentBalance || 0) && (
          <div style={{
            marginTop: 10, padding: '10px 12px',
            background: 'var(--accent-10)', border: '1px solid var(--accent-20)',
            borderRadius: 10, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
          }}>
            Nuovo saldo: <strong style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              €{$n(parseNum(balanceInput))}
            </strong>
            {cushion > 0 && <> · liberi ~€{$n(Math.max(0, parseNum(balanceInput) - cushion))} dopo il cuscinetto</>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button variant="default" size="lg" className="flex-1" onClick={() => setShowBalanceQuick(false)}>Annulla</Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={saveBalanceQuick}>Salva saldo</Button>
        </div>
      </Sheet>

      <Sheet open={showAnnual} onClose={() => setShowAnnual(false)} title="Spese annuali">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Cose che paghi una volta l'anno. Te le accantono <strong>1/12 al mese</strong> così quando arriva la scadenza i soldi sono pronti.
        </p>
        {annualExpenses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {annualExpenses.map((e) => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6,
                background: 'var(--glass)', borderRadius: 12,
                border: '1px solid var(--glass-bd)',
              }}>
                <span style={{ flex: 1, fontSize: 13 }}>{e.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>€{$n(e.amount)}</span>
                <button onClick={() => removeAnnual(e.id)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }} aria-label="Rimuovi"><IcX width="14" height="14" /></button>
              </div>
            ))}
          </div>
        )}
        <label className="qa-lbl">Descrizione</label>
        <input className="qa-input" value={aLbl} onChange={(e) => setALbl(e.target.value)} placeholder="Assicurazione auto" />
        <label className="qa-lbl" style={{ marginTop: 12 }}>Importo annuo</label>
        <input className="qa-input" type="text" inputMode="decimal" value={aAmt} onChange={(e) => setAAmt(e.target.value)} placeholder="600" />
        <label className="qa-lbl" style={{ marginTop: 12 }}>Mese di scadenza</label>
        <select className="qa-input" value={aMonth} onChange={(e) => setAMonth(e.target.value)} style={{ appearance: 'menulist' }}>
          {['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'].map((m, i) => (
            <option key={i+1} value={i+1}>{m}</option>
          ))}
        </select>
        <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 18 }} onClick={saveAnnual} disabled={!aLbl || !aAmt}>
          <IcPlus /> Aggiungi
        </Button>
      </Sheet>
    </div>
  );
};
