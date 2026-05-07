import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { YearBars } from '../components/YearBars.jsx';
import { DayDetail } from '../components/DayDetail.jsx';
import { IcChevR, IcChevL, IcAlert } from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { findAnomalies } from '../lib/anomaly.js';
import { realCost, $d, $n, cn } from '../lib/format.js';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';

/**
 * History — month picker, summary, 12-month bar chart, anomalies, day list.
 */
export const History = ({ store }) => {
  const { txs, cats, computePeriod, monthsHistory, privacy } = store;
  const tour = useTour('history', store);

  const [offset, setOffset] = useState(0); // 0 = current month
  const [dayTs, setDayTs] = useState(null);

  const period = useMemo(() => computePeriod(offset), [computePeriod, offset]);
  const monthTxs = useMemo(
    () => txs.filter((t) => t.ts >= period.start.getTime() && t.ts < period.end.getTime()),
    [txs, period]
  );
  const monthTotal = monthTxs.reduce((s, t) => s + realCost(t), 0);

  // Delta vs previous month
  const prev = useMemo(() => computePeriod(offset + 1), [computePeriod, offset]);
  const prevTotal = useMemo(
    () => txs
      .filter((t) => t.ts >= prev.start.getTime() && t.ts < prev.end.getTime())
      .reduce((s, t) => s + realCost(t), 0),
    [txs, prev]
  );
  const deltaPct = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : 0;

  // 12 months of bars (oldest first)
  const yearMonths = useMemo(() => {
    const arr = [];
    for (let i = 11; i >= 0; i--) {
      const p = computePeriod(i);
      const tot = txs
        .filter((t) => t.ts >= p.start.getTime() && t.ts < p.end.getTime())
        .reduce((s, t) => s + realCost(t), 0);
      const lbl = p.start
        .toLocaleDateString('it-IT', { month: 'short' })
        .replace('.', '')
        .toLowerCase();
      arr.push({
        key: `${p.start.getFullYear()}-${p.start.getMonth() + 1}`,
        label: lbl,
        total: tot,
        offset: i,
        isCurrent: i === offset,
      });
    }
    return arr;
  }, [computePeriod, txs, offset]);

  // Anomalies of the selected month only
  const anomalies = useMemo(() => {
    return findAnomalies(monthTxs).slice(0, 3);
  }, [monthTxs]);

  // Group by day for the list
  const grouped = useMemo(() => {
    const g = {};
    monthTxs
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .forEach((t) => {
        const d = new Date(t.ts);
        const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!g[k]) g[k] = [];
        g[k].push(t);
      });
    return g;
  }, [monthTxs]);

  const monthLabel = period.start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div>
      <div className="meta-row" style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Mese precedente"
            disabled={offset >= 11}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--glass2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', cursor: 'pointer', opacity: offset >= 11 ? 0.4 : 1 }}
          >
            <IcChevL />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>
              {period.start.toLocaleDateString('it-IT', { month: 'long' })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{period.start.getFullYear()}</div>
          </div>
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            aria-label="Mese successivo"
            disabled={offset === 0}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--glass2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', cursor: 'pointer', opacity: offset === 0 ? 0.4 : 1 }}
          >
            <IcChevR />
          </button>
        </div>
        <div className={cn('tnum', privacy && 'privacy-blur')} style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>
          €{$d(monthTotal)}
        </div>
      </div>

      <div className="storia-summary" style={{ textAlign: 'center', margin: '20px 0 16px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 4 }}>
          {monthLabel}
        </div>
        <div className={cn('tnum', privacy && 'privacy-blur')} style={{ fontSize: 44, fontWeight: 200, letterSpacing: '-0.04em', lineHeight: 1 }}>
          <span style={{ fontSize: '0.5em', color: 'var(--fg-3)', marginRight: 4 }}>€</span>
          <NumberTicker value={monthTotal} decimals={0} />
        </div>
        {prevTotal > 0 && (
          <div style={{ fontSize: 12, color: deltaPct < 0 ? 'var(--accent)' : deltaPct > 5 ? 'var(--warn)' : 'var(--fg-3)', marginTop: 8, fontWeight: 500 }}>
            {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(Math.round(deltaPct))}% vs{' '}
            {prev.start.toLocaleDateString('it-IT', { month: 'long' }).toLowerCase()}
            {' · '}{monthTxs.length} {monthTxs.length === 1 ? 'spesa' : 'spese'}
          </div>
        )}
      </div>

      {/* Year bars */}
      <div data-tut="year">
        <YearBars
          months={yearMonths}
          onMonthTap={(m) => setOffset(m.offset)}
        />
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="anom-section" data-tut="anomalies">
          <div className="anom-section-ttl">Da controllare</div>
          {anomalies.map((a) => {
            const cat = cats.find((c) => c.id === a.cat);
            return (
              <button
                key={a.id}
                className="anom-row"
                onClick={() => {
                  const d = new Date(a.ts);
                  d.setHours(0, 0, 0, 0);
                  setDayTs(d.getTime());
                }}
              >
                <IcAlert />
                <span>
                  {humanizeDay(a.ts)} <strong>€{$d(realCost(a))} di {a.label || cat?.label || 'spesa'}</strong> — {a._anomaly.multiple.toFixed(1)}× la tua media
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Day list */}
      <div className="day-list" data-tut="days">
        {Object.keys(grouped).length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '40px 0' }}>
            Nessuna spesa in questo mese.
          </p>
        ) : (
          Object.entries(grouped).map(([key, items]) => {
            const d = new Date(items[0].ts);
            const total = items.reduce((s, t) => s + realCost(t), 0);
            return (
              <div key={key} className="day-group">
                <div className="day-header">
                  <div className="day-name">{humanizeDay(items[0].ts)}</div>
                  <div className={cn('day-total', privacy && 'privacy-blur')}>€{$d(total)}</div>
                </div>
                {items.map((t) => {
                  const cat = cats.find((c) => c.id === t.cat);
                  const Icon = iconForCategory(t.cat);
                  return (
                    <button
                      key={t.id}
                      className="tx-row"
                      onClick={() => {
                        const dd = new Date(t.ts);
                        dd.setHours(0, 0, 0, 0);
                        setDayTs(dd.getTime());
                      }}
                    >
                      <span className="ic-mono" style={{ color: 'var(--fg-3)' }}>
                        <Icon />
                      </span>
                      <div className="tx-body">
                        <div className="tx-label">{t.label || cat?.label || 'Spesa'}</div>
                        <div className="tx-meta">
                          {new Date(t.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{cat?.label || '—'}
                        </div>
                      </div>
                      <div className={cn('tx-amt', privacy && 'privacy-blur')}>€{$d(realCost(t))}</div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <DayDetail
        open={dayTs != null}
        dayTs={dayTs}
        allTxs={txs}
        cats={cats}
        onClose={() => setDayTs(null)}
      />

      <Tour tourId="history" open={tour.open} onClose={tour.close} />
    </div>
  );
};

const humanizeDay = (ts) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 864e5);
  if (diff === 0) return 'OGGI';
  if (diff === -1) return 'IERI';
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
};
