import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { Sheet } from '../components/ui/Sheet.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  IcSalary, IcShield, IcGoal, IcSubscription, IcChevR, IcPlus, IcX,
  IcArrowIn, IcCalendar, IcClock,
} from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { categoryHistoricalStats } from '../lib/stats.js';
import { categoryForecast } from '../lib/forecast.js';
import { realCost, parseNum, uid, $n, cn } from '../lib/format.js';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { haptic } from '../lib/haptic.js';

/**
 * Money screen — the "where do my €s go?" page.
 * Hero "Ti restano da spendere" → waterfall mini → committed cards
 * (salary rectifiable, annual savings, scheduled extras) → spending areas
 * with historical-mean comparison.
 */
export const Money = ({ store, onSettingsTap }) => {
  const {
    salary, effectiveSalary, monthKey, setSalaryForMonth,
    annualExpenses, addAnnual, removeAnnual, annualMonthly,
    fixed, fixedMonthly, subscriptions, subscriptionsMonthly, dreams, dreamAlloc,
    bufferAmt, buffer, freeBudget, totalLocked,
    extraIncomes, periodStart, periodEnd, daysLeft, daysInPeriod, dayOfPeriod,
    txs, cats, totalSpent, privacy, pTxs,
  } = store;
  const tour = useTour('money', store);

  const [showSalaryEdit, setShowSalaryEdit] = useState(false);
  const [salaryInput, setSalaryInput] = useState(String(effectiveSalary));
  const [showAnnual, setShowAnnual] = useState(false);
  const [aLbl, setALbl] = useState('');
  const [aAmt, setAAmt] = useState('');
  const [aMonth, setAMonth] = useState('1');

  // Upcoming extra incomes already scheduled (events in this period or later)
  const futureExtras = useMemo(() => {
    const fromTs = Date.now();
    return extraIncomes
      .filter((e) => e.ts >= fromTs)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 3);
  }, [extraIncomes]);

  const upcomingAnnual = useMemo(() => {
    const month = new Date().getMonth() + 1;
    return annualExpenses
      .map((e) => {
        let monthsAhead = (e.dueMonth || 1) - month;
        if (monthsAhead < 0) monthsAhead += 12;
        return { ...e, monthsAhead };
      })
      .sort((a, b) => a.monthsAhead - b.monthsAhead);
  }, [annualExpenses]);

  const stats = useMemo(
    () => categoryHistoricalStats(txs, monthKey),
    [txs, monthKey]
  );

  const areas = useMemo(() => {
    return cats.map((c) => {
      const spent = pTxs.filter((t) => t.cat === c.id).reduce((s, t) => s + realCost(t), 0);
      const cs = stats[c.id] || { mean: 0, sd: 0, n: 0 };
      const fc = categoryForecast({
        periodTxs: pTxs, allTxs: txs, dayOfPeriod, daysInPeriod, currentMonthKey: monthKey, catId: c.id,
      });
      const expected = cs.mean > 0 ? (cs.mean * dayOfPeriod) / daysInPeriod : 0;
      const deltaPct = cs.mean > 0 ? ((spent - expected) / cs.mean) * 100 : 0;
      const status = cs.mean === 0
        ? 'neutral'
        : deltaPct > 20 ? 'up'
        : deltaPct < -15 ? 'down'
        : 'flat';
      // Bar width: where the user is now vs the expected position
      const barWidth = cs.mean > 0 ? Math.min(100, (spent / cs.mean) * 100) : 0;
      const tickAt = cs.mean > 0 ? Math.min(100, (expected / cs.mean) * 100) : 0;
      const lastTx = pTxs.filter((t) => t.cat === c.id).sort((a, b) => b.ts - a.ts)[0];
      const lastTxLbl = lastTx
        ? humanizeRelative(lastTx.ts)
        : null;
      return { ...c, spent, mean: cs.mean, n: cs.n, status, deltaPct, barWidth, tickAt, lastTxLbl, projected: fc.projected, count: pTxs.filter((t) => t.cat === c.id).length };
    });
  }, [cats, pTxs, txs, stats, monthKey, dayOfPeriod, daysInPeriod]);

  const submitSalaryEdit = () => {
    const v = parseNum(salaryInput);
    if (v <= 0) return;
    setSalaryForMonth(monthKey, v);
    setShowSalaryEdit(false);
  };
  const resetSalaryEdit = () => {
    setSalaryForMonth(monthKey, null);
    setShowSalaryEdit(false);
  };

  const submitAnnual = () => {
    const v = parseNum(aAmt);
    if (!aLbl || v <= 0) return;
    addAnnual(aLbl, v, aMonth);
    setALbl(''); setAAmt(''); setAMonth('1');
    setShowAnnual(false);
  };

  return (
    <div>
      <div className="meta-row" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>
            DAL {periodStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()}
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em' }}>Soldi</div>
        </div>
        <div className="pill"><span className="dot" />{daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'}</div>
      </div>

      {/* Hero */}
      <div data-tut="free" style={{ textAlign: 'center', margin: '20px 0 16px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700 }}>
          Ti restano da spendere
        </div>
        <div className={cn('tnum', privacy && 'privacy-blur')} style={{ fontSize: 56, fontWeight: 100, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--fg)', marginTop: 4 }}>
          <span style={{ fontSize: '0.45em', color: 'var(--fg-3)', marginRight: 4 }}>€</span>
          <NumberTicker value={Math.max(0, freeBudget - totalSpent)} decimals={2} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 8 }}>
          Su <strong style={{ color: 'var(--accent)' }}>€{$n(freeBudget)}</strong> liberi questo mese.
        </p>
      </div>

      {/* Waterfall */}
      <div className="waterfall">
        <div className="waterfall-cell income">
          <div className="lbl">Entrate</div>
          <div className="vl">+€{$n(effectiveSalary)}</div>
        </div>
        <div className="waterfall-cell committed">
          <div className="lbl">Già impegnati</div>
          <div className="vl">−€{$n(totalLocked)}</div>
        </div>
        <div className="waterfall-cell free">
          <div className="lbl">Liberi</div>
          <div className="vl">€{$n(freeBudget)}</div>
        </div>
      </div>

      {/* Salary card */}
      <button
        className="money-card"
        data-tut="salary"
        onClick={() => { setSalaryInput(String(effectiveSalary)); setShowSalaryEdit(true); }}
        style={{ background: 'linear-gradient(135deg, var(--accent-10), var(--glass))' }}
      >
        <span className="ic" style={{ color: 'var(--accent)' }}><IcSalary /></span>
        <div className="body">
          <div className="title"><strong>€{$n(effectiveSalary)}</strong> · stipendio del mese</div>
          <div className="sub">
            {effectiveSalary === salary
              ? `Atteso intorno al ${store.resetDay} · tap per rettificare`
              : `Rettificato (default €${$n(salary)}) · tap per modificare`}
          </div>
        </div>
        <IcChevR />
      </button>

      {/* Annual savings */}
      <button
        className="money-card"
        data-tut="annual"
        onClick={() => setShowAnnual(true)}
        style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.06), var(--glass))' }}
      >
        <span className="ic" style={{ color: 'var(--purple)' }}><IcShield /></span>
        <div className="body">
          <div className="title">
            <strong>€{$n(annualMonthly)}</strong> accantonati per spese annuali
          </div>
          <div className="sub">
            {annualExpenses.length === 0
              ? 'Nessuna spesa annuale · tap per aggiungere'
              : upcomingAnnual.length > 0
                ? `${upcomingAnnual.slice(0, 2).map((u) => u.label).join(' · ')} · prossima ${upcomingAnnual[0].monthsAhead === 0 ? 'questo mese' : `tra ${upcomingAnnual[0].monthsAhead} mesi`}`
                : 'Tap per gestire'}
          </div>
        </div>
        <IcChevR />
      </button>

      {/* Future extras */}
      {futureExtras.length > 0 && (
        <div className="money-card" data-tut="extra" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.06), var(--glass))' }}>
          <span className="ic" style={{ color: 'var(--info)' }}><IcArrowIn /></span>
          <div className="body">
            <div className="title">
              <strong>+€{$n(futureExtras.reduce((s, e) => s + e.amount, 0))}</strong> in arrivo
            </div>
            <div className="sub">
              {futureExtras.slice(0, 1).map((e) => `${e.label} · ${humanizeRelative(e.ts)}`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Compact summary */}
      <div className="money-card subtle">
        <span className="ic" style={{ color: 'var(--fg-3)' }}><IcClock /></span>
        <div className="body" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
          <strong style={{ color: 'var(--fg)' }}>€{$n(totalLocked)}</strong> impegnati ·
          {' '}{fixed.length} fisse · {subscriptions.filter((s) => s.active !== false).length} abbon. ·
          {' '}imprevisti {buffer}%
        </div>
      </div>

      {/* Areas of spending */}
      <div className="area-section-title" data-tut="areas">
        <span className="ttl">Dove sono andati</span>
        <span className="meta">
          <strong>€{$n(totalSpent)}</strong> · {pTxs.length} {pTxs.length === 1 ? 'spesa' : 'spese'}
        </span>
      </div>

      {areas.map((a) => {
        const Icon = iconForCategory(a.id);
        return (
          <div className="area-row" key={a.id}>
            <div className="area-row-head">
              <span className="ic-mono" style={{ color: 'var(--fg-3)' }}><Icon /></span>
              <div className="name">{a.label}</div>
              <div className="now" style={{
                color: a.status === 'up' ? 'var(--warn)' : 'var(--fg)',
              }}>€{$n(a.spent)}</div>
              {a.n > 0 && (
                <div className={cn('area-delta', a.status)}>
                  {a.status === 'up' ? `+${Math.round(a.deltaPct)}%`
                    : a.status === 'down' ? `${Math.round(a.deltaPct)}%`
                    : a.status === 'flat' ? `±${Math.round(Math.abs(a.deltaPct))}%`
                    : '—'}
                </div>
              )}
            </div>
            {a.mean > 0 && (
              <div className="area-prog">
                <div
                  className={cn('area-prog-fill', a.status)}
                  style={{ width: `${a.barWidth}%` }}
                />
                <div className="area-prog-tick" style={{ left: `${a.tickAt}%` }} />
              </div>
            )}
            <div className="area-meta">
              {a.mean > 0 ? (
                <>
                  <div className="item">media <strong>€{$n(a.mean)}/mese</strong></div>
                  <div className="sep">·</div>
                </>
              ) : (
                <div className="item" style={{ color: 'var(--fg-4)' }}>
                  ancora poche spese per fare media
                </div>
              )}
              {a.lastTxLbl && a.mean > 0 && (
                <>
                  <div className="item">ultima <strong>{a.lastTxLbl}</strong></div>
                  <div className="sep">·</div>
                </>
              )}
              {a.count > 0 && (
                <div className="item">{a.count} {a.count === 1 ? 'spesa' : 'spese'}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* ─── Salary edit sheet ─── */}
      <Sheet open={showSalaryEdit} onClose={() => setShowSalaryEdit(false)} title="Stipendio del mese">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Quanto hai effettivamente ricevuto questo mese? La modifica vale solo per <strong>{monthLabel(monthKey)}</strong>.
        </p>
        <label className="qa-lbl">Importo</label>
        <input
          className="qa-amount"
          type="text"
          inputMode="decimal"
          value={salaryInput}
          onChange={(e) => setSalaryInput(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button variant="default" size="lg" className="flex-1" onClick={resetSalaryEdit}>Default €{$n(salary)}</Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={submitSalaryEdit}>Salva</Button>
        </div>
      </Sheet>

      {/* ─── Annual sheet ─── */}
      <Sheet open={showAnnual} onClose={() => setShowAnnual(false)} title="Spese annuali">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          AURA accantona ogni mese 1/12 dell'importo. Quando arriva la scadenza, i soldi sono pronti.
        </p>

        {annualExpenses.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            {annualExpenses.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--glass)', borderRadius: 12, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    €{$n(e.amount)} · scade a {monthName(e.dueMonth)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>€{$n(e.amount / 12)}</div>
                  <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>/mese</div>
                </div>
                <button
                  onClick={() => removeAnnual(e.id)}
                  aria-label="Rimuovi"
                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                >
                  <IcX />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ paddingTop: 12, borderTop: '1px solid var(--glass-bd)' }}>
          <label className="qa-lbl">Nome</label>
          <input className="qa-input" placeholder="Assicurazione, bollo, IMU…" value={aLbl} onChange={(e) => setALbl(e.target.value)} />
          <label className="qa-lbl" style={{ marginTop: 12 }}>Importo annuale (€)</label>
          <input className="qa-input" type="text" inputMode="decimal" placeholder="600" value={aAmt} onChange={(e) => setAAmt(e.target.value)} />
          <label className="qa-lbl" style={{ marginTop: 12 }}>Scadenza</label>
          <select
            className="qa-input"
            value={aMonth}
            onChange={(e) => setAMonth(e.target.value)}
            style={{ appearance: 'menulist' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
            ))}
          </select>
          <Button variant="primary" size="lg" className="w-full" onClick={submitAnnual} style={{ marginTop: 14 }}>
            Aggiungi
          </Button>
        </div>
      </Sheet>

      <Tour tourId="money" open={tour.open} onClose={tour.close} />
    </div>
  );
};

const monthName = (m) => ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'][(m - 1) % 12];
const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return `${monthName(parseInt(m))} ${y}`;
};
const humanizeRelative = (ts) => {
  const now = Date.now();
  const diff = ts - now;
  const dayMs = 864e5;
  if (Math.abs(diff) < dayMs * 0.5) return 'oggi';
  const days = Math.round(diff / dayMs);
  if (days === 1) return 'domani';
  if (days === -1) return 'ieri';
  if (days > 0 && days < 30) return `tra ${days} giorni`;
  if (days < 0 && days > -30) return `${-days} giorni fa`;
  if (days >= 30 && days < 60) return 'tra circa un mese';
  if (days < 0 && days <= -30) return 'il mese scorso';
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};
