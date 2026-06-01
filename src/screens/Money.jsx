import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { Sheet } from '../components/ui/Sheet.jsx';
import { Button } from '../components/ui/Button.jsx';
import { RecurringSheet } from '../components/RecurringSheet.jsx';
import {
  IcSalary, IcSubscription, IcChevR, IcCheck, IcClock, iconForCategory,
} from '../lib/icons.jsx';
import { parseNum, $n, maskedMoney, round2 } from '../lib/format.js';
import { nextIncomeDate } from '../lib/analytics.js';
import { haptic } from '../lib/haptic.js';
import { useToast } from '../hooks/useUndoToast.js';

/**
 * Piano (v0.17 "Prugna") — dove stanno i soldi prima di essere spesi.
 *
 *  carta prugna: saldo nel conto
 *  due tessere: spendibili · al giorno
 *  pannello ciclo: linea del tempo oggi → paga + proiezione
 *  pannello movimenti: cosa esce prima della paga, con "pagato"/"salta" in riga
 *  pagamenti fissi: la lista unica (ex fisse + abbonamenti + annuali)
 *  allinea col conto
 */
export const Money = ({ store }) => {
  const {
    currentBalance, cushion, spendableUntilNext, nextIncomeAt, daysToNextIncome, incomes,
    monthlySavingsTarget,
    needsBalanceUpdate, lastPaydayDate, needsReconcile, lastBalanceUpdate,
    reconcileBalance,
    dailyQuota,
    markRecurringPaid, isRecurringPaid,
    toggleSkipRecurring, isRecurringSkipped,
    recurring, addRecurring, updateRecurring, removeRecurring, toggleRecurring, recurringMonthly,
    subscriptions,
    privacy,
    now,
  } = store;
  const tour = useTour('money', store);
  const toast = useToast();

  const [showBalanceQuick, setShowBalanceQuick] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [showRecurring, setShowRecurring] = useState(false);

  const onMarkPaid = (m) => {
    const ok = markRecurringPaid({ id: m.id, label: m.label, amount: m.amount, date: m._date, catId: 'home' });
    if (ok) toast?.show?.(`${m.label} segnata come pagata`, null);
  };
  const onToggleSkip = (m) => {
    const wasSkipped = isRecurringSkipped(m.id, m._date);
    const ok = toggleSkipRecurring(m.id, m._date);
    if (ok) toast?.show?.(wasSkipped ? `${m.label} torna in programma` : `${m.label}: saltata questo mese`, null);
  };

  // ─── Movimenti prima della prossima entrata ─────
  const futureMovements = useMemo(() => {
    const items = [];
    const limit = nextIncomeAt || new Date(now.getTime() + 30 * 864e5);

    // Solo le mensili hanno una data certa nel periodo: le altre cadenze sono
    // spalmate dal motore e non compaiono come evento puntuale.
    subscriptions.filter((s) => s.active !== false && (s.cadence || 'monthly') === 'monthly').forEach((item) => {
      const day = Math.min(28, Math.max(1, parseInt(item.day || item.deductDay || item.dayOfMonth || 1)));
      let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
      let safety = 0;
      while (cursor < limit && safety < 4) {
        const due = new Date(cursor.getFullYear(), cursor.getMonth(), day);
        if (due >= now && due < limit) { items.push({ ...item, _date: due }); break; }
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        safety++;
      }
    });

    incomes.filter((i) => i.active !== false).forEach((inc) => {
      const next = nextIncomeDate([inc], now);
      if (next && nextIncomeAt && next.getTime() === nextIncomeAt.getTime()) {
        items.push({ ...inc, _date: next, _isIncome: true });
      }
    });
    return items.sort((a, b) => a._date - b._date);
  }, [subscriptions, incomes, now, nextIncomeAt]);

  // Proiezione del saldo lungo il ciclo ("se continui così").
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

  const openBalanceQuick = () => { setBalanceInput(''); setShowBalanceQuick(true); haptic('light'); };
  const balanceDelta = balanceInput.trim() === '' ? 0 : round2(parseNum(balanceInput) - (currentBalance || 0));
  const saveBalanceQuick = (track = true) => {
    const res = reconcileBalance(balanceInput, track);
    setShowBalanceQuick(false);
    haptic('success');
    if (res && Math.abs(res.delta) >= 0.01 && res.tracked) {
      toast?.show?.(
        res.delta < 0
          ? `€${$n(Math.abs(res.delta))} segnati come "Non tracciato"`
          : `€${$n(res.delta)} aggiunti come entrata non tracciata`,
        null,
      );
    }
  };

  const formatDate = (d) => (d ? `${d.getDate()}/${d.getMonth() + 1}` : '');
  const inRed = (currentBalance || 0) < 0;
  // Un solo promemoria alla volta: la paga vince sul controllo periodico.
  const nudge = needsBalanceUpdate
    ? {
      icon: <IcSalary />,
      title: 'Stipendio arrivato?',
      text: `${lastPaydayDate ? `Paga prevista il ${lastPaydayDate.getDate()}/${lastPaydayDate.getMonth() + 1}. ` : ''}Aggiorna il saldo per tenere i conti precisi.`,
    }
    : needsReconcile
      ? {
        icon: <IcCheck />,
        title: 'Il saldo torna ancora?',
        text: 'Sono passate due settimane: confrontalo con l\'app della banca.',
      }
      : null;

  return (
    <div className="screen-money asst">
      <Tour {...tour} />

      {nudge && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={openBalanceQuick}
          className="balance-nudge"
        >
          <span className="balance-nudge-ic">{nudge.icon}</span>
          <span className="balance-nudge-body"><strong>{nudge.title}</strong> {nudge.text}</span>
          <span className="balance-nudge-cta">Aggiorna</span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bk-card"
        style={{ cursor: 'default' }}
      >
        <div className="top">
          <div style={{ minWidth: 0 }}>
            <div className="lab">Saldo nel conto</div>
            <div className="big">
              {inRed && !privacy && '−'}{maskedMoney(Math.abs(currentBalance || 0), { privacy, decimals: 2 })}
              <span className="cur">€</span>
            </div>
          </div>
          {nextIncomeAt && (
            <div className="bk-pill">{formatDate(nextIncomeAt)}</div>
          )}
        </div>
        <div className="foot" style={{ marginTop: 13 }}>
          <span>
            {inRed
              ? <>Sei in rosso. Riallinea appena puoi.</>
              : spendableUntilNext > 0 && nextIncomeAt
                ? <>Di questi <b>€{maskedMoney(spendableUntilNext, { privacy, decimals: 0 })}</b> spendibili{monthlySavingsTarget > 0 ? `, €${$n(monthlySavingsTarget)} da parte` : ''}</>
                : <>Il libero è tutto in cuscinetto e risparmi</>}
          </span>
        </div>
      </motion.div>

      <div className="bk-duo">
        <div className="bk-tile">
          <div className="l">Spendibili</div>
          <div className="v">€{maskedMoney(Math.max(0, spendableUntilNext), { privacy, decimals: 0 })}</div>
          {daysToNextIncome ? (
            <div className="bk-tile-sub">in {daysToNextIncome} {daysToNextIncome === 1 ? 'giorno' : 'giorni'}</div>
          ) : null}
        </div>
        <div className="bk-tile">
          <div className="l">Al giorno</div>
          <div className="v">€{maskedMoney(Math.max(0, dailyQuota), { privacy, decimals: 0 })}</div>
          <div className="bk-tile-sub">budget di oggi</div>
        </div>
      </div>

      {/* Linea del tempo del ciclo + proiezione del saldo alla paga */}
      {nextIncomeAt && daysToNextIncome > 0 && (
        <div className="bk-panel">
          <div className="bk-head">
            <span className="t">Da oggi alla paga</span>
            <span className="m">{daysToNextIncome} {daysToNextIncome === 1 ? 'giorno' : 'giorni'}</span>
          </div>
          <div className="cyc">
            <span className="cyc-track" />
            <span className="cyc-dot start" />
            {futureMovements.filter((m) => !m._isIncome).map((m, i) => {
              const pct = Math.min(96, Math.max(4, ((m._date - now) / (nextIncomeAt - now)) * 100));
              return <span key={i} className="cyc-dot mov" style={{ left: `${pct}%` }} />;
            })}
            <span className="cyc-dot end" />
          </div>
          <div className="cyc-lbls"><span>oggi</span><span>paga · {formatDate(nextIncomeAt)}</span></div>
          {spark && (
            <>
              <svg className="cyc-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={spark.pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div className="cyc-proj">
                Se continui così arrivi alla paga con <b style={{ color: spark.projAtPay < 0 ? 'var(--red)' : 'var(--fg)' }}>
                  {spark.projAtPay < 0 ? '−' : ''}€{maskedMoney(Math.abs(spark.projAtPay), { privacy, decimals: 0 })}
                </b>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cosa esce prima della paga — in chiaro, non dentro un foglio */}
      {futureMovements.length > 0 && (
        <div className="bk-panel">
          <div className="bk-head">
            <span className="t">Cosa esce prima della paga</span>
            <span className="m">già tolto dagli spendibili</span>
          </div>
          {futureMovements.map((m, idx) => {
            const paid = !m._isIncome && m.id && isRecurringPaid(m.id, m._date);
            const skipped = !paid && !m._isIncome && m.id && isRecurringSkipped(m.id, m._date);
            const Ico = m._isIncome ? IcSalary : iconForCategory(null, m.label);
            return (
              <div key={idx} className={`mv ${paid || skipped ? 'done' : ''}`}>
                <span className={`mv-ic ${m._isIncome ? 'in' : ''}`}><Ico /></span>
                <span className="mv-body">
                  <span className="mv-lbl">{m.label}</span>
                  <span className="mv-when">
                    {formatDate(m._date)}
                    {paid ? ' · pagata' : skipped ? ' · saltata questo mese' : ''}
                  </span>
                </span>
                <span className={`mv-amt ${m._isIncome ? 'in' : ''}`}>
                  {m._isIncome ? '+' : '−'}€{$n(m.amount)}
                </span>
                {!m._isIncome && m.id && !paid && (
                  <span className="mv-acts">
                    {skipped ? (
                      <button type="button" onClick={() => onToggleSkip(m)}>Annulla</button>
                    ) : (
                      <>
                        <button type="button" onClick={() => onMarkPaid(m)}>Pagato</button>
                        <button type="button" className="ghost" onClick={() => onToggleSkip(m)}>Salta</button>
                      </>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nextScadenza && daysToNextScadenza !== null && daysToNextScadenza <= 5 && (
        <div className="hs-warm">
          <span className="ic"><IcClock /></span>
          <div className="body">
            <div className="t">{nextScadenza.label} {daysToNextScadenza === 0 ? 'oggi' : daysToNextScadenza === 1 ? 'domani' : `tra ${daysToNextScadenza} giorni`}</div>
            <div className="s">€{$n(nextScadenza.amount)} il {formatDate(nextScadenza._date)}</div>
          </div>
        </div>
      )}

      <button type="button" className="hs-tap" onClick={() => { haptic('light'); setShowRecurring(true); }}>
        <span className="ic"><IcSubscription /></span>
        <div className="body">
          <div className="t">Pagamenti fissi</div>
          <div className="s">
            {recurring.length === 0
              ? 'Affitto, bollette, abbonamenti, assicurazione…'
              : `${recurring.length} ${recurring.length === 1 ? 'voce' : 'voci'} · €${$n(recurringMonthly)} al mese`}
          </div>
        </div>
        <span className="chev"><IcChevR /></span>
      </button>

      <button type="button" className="hs-tap" onClick={openBalanceQuick}>
        <span className="ic"><IcCheck /></span>
        <div className="body">
          <div className="t">Allinea col conto</div>
          <div className="s">
            {lastBalanceUpdate
              ? `Ultimo controllo ${Math.max(0, Math.round((Date.now() - lastBalanceUpdate) / 864e5))} giorni fa · quello che manca lo segno io`
              : 'Confronta col saldo della banca · quello che manca lo segno io'}
          </div>
        </div>
        <span className="chev"><IcChevR /></span>
      </button>

      {/* ───── SHEETS ───── */}
      <RecurringSheet
        open={showRecurring}
        onClose={() => setShowRecurring(false)}
        recurring={recurring}
        addRecurring={addRecurring}
        updateRecurring={updateRecurring}
        removeRecurring={removeRecurring}
        toggleRecurring={toggleRecurring}
      />

      <Sheet open={showBalanceQuick} onClose={() => setShowBalanceQuick(false)} title="Allinea col conto">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Guarda quanto hai <strong>davvero in conto adesso</strong> sull'app della banca e scrivilo qui.
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

        {balanceInput.trim() !== '' && Math.abs(balanceDelta) >= 0.01 && (
          <div className="recon">
            <div className="rc-row"><span>Nei conti dell'app</span><b>€{$n(currentBalance || 0)}</b></div>
            <div className="rc-row"><span>In banca</span><b>€{$n(parseNum(balanceInput))}</b></div>
            <div className={`rc-row diff ${balanceDelta < 0 ? 'out' : 'in'}`}>
              <span>{balanceDelta < 0 ? 'Spese che non hai registrato' : 'Entrate che non hai registrato'}</span>
              <b>{balanceDelta < 0 ? '−' : '+'}€{$n(Math.abs(balanceDelta))}</b>
            </div>
            <p className="rc-hint">
              {balanceDelta < 0
                ? <>Le segno come <b>Non tracciato</b> nello storico: così i conti tornano e la media resta vera.</>
                : <>La segno come <b>Non tracciato</b> tra le entrate, così il saldo torna.</>}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button variant="default" size="lg" className="flex-1" onClick={() => setShowBalanceQuick(false)}>Annulla</Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={() => saveBalanceQuick(true)}>
            {Math.abs(balanceDelta) >= 0.01 ? 'Allinea e registra' : 'Salva saldo'}
          </Button>
        </div>
        {Math.abs(balanceDelta) >= 0.01 && (
          <button
            type="button"
            onClick={() => saveBalanceQuick(false)}
            style={{
              display: 'block', width: '100%', marginTop: 10, padding: '8px 0',
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 600, color: 'var(--fg-3)',
            }}
          >
            Correggi e basta, senza registrare nulla
          </button>
        )}
      </Sheet>
    </div>
  );
};
