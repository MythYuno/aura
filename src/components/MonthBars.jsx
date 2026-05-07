import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { dailyTimeline, meanSd } from '../lib/stats.js';
import { realCost } from '../lib/format.js';

/**
 * Bar chart of the 30-ish days of the current period.
 * - "spike" tone for days > mean + 2σ
 * - "high" tone for days > mean + 0.8σ
 * - normal accent otherwise
 * - today is outlined
 * - peak labels appear over the highest 1-2 days and over today/yesterday
 *
 * Tap on any bar → onDayTap({ ts, total, txs })
 */
export const MonthBars = ({ txs, periodStart, periodEnd, dayOfPeriod, onDayTap }) => {
  const days = Math.max(1, Math.round((periodEnd - periodStart) / 864e5));

  const timeline = useMemo(() => {
    const periodTxs = txs.filter((t) => t.ts >= periodStart.getTime() && t.ts < periodEnd.getTime());
    return dailyTimeline(periodTxs, periodStart, periodEnd);
  }, [txs, periodStart, periodEnd]);

  // Compute scale + threshold tones based on non-zero days
  const { max, meanLine, classify } = useMemo(() => {
    const nonZero = timeline.filter((v) => v > 0);
    const max = Math.max(1, ...timeline);
    const { mean, sd } = meanSd(nonZero.length ? nonZero : [0]);
    const meanLine = nonZero.length ? mean / max : 0;
    const classify = (v) => {
      if (v <= 0) return 'zero';
      if (sd > 0 && v > mean + 2 * sd) return 'spike';
      if (sd > 0 && v > mean + 0.8 * sd) return 'high';
      return 'normal';
    };
    return { max, meanLine, classify };
  }, [timeline]);

  // Pick top peaks for label rendering
  const labels = useMemo(() => {
    const out = {};
    // Highest peak overall
    let peakIdx = -1, peakVal = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i] > peakVal) { peakVal = timeline[i]; peakIdx = i; }
    }
    if (peakIdx >= 0 && peakVal > 0) {
      out[peakIdx] = { text: `€${Math.round(peakVal)}`, side: 'right' };
    }
    // Second-highest, only if not adjacent
    let secondIdx = -1, secondVal = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (i === peakIdx) continue;
      if (Math.abs(i - peakIdx) <= 1) continue;
      if (timeline[i] > secondVal) { secondVal = timeline[i]; secondIdx = i; }
    }
    if (secondIdx >= 0 && secondVal > 0 && classify(secondVal) !== 'normal') {
      out[secondIdx] = { text: `€${Math.round(secondVal)}`, side: 'left' };
    }
    return out;
  }, [timeline, classify]);

  const todayIdx = Math.max(0, Math.min(days - 1, dayOfPeriod - 1));

  return (
    <div className="month-bars" aria-label="Andamento del mese">
      <div className="month-bars-canvas">
        {meanLine > 0 && (
          <div className="avg-h-line" style={{ bottom: `${Math.max(8, meanLine * 100)}%` }}>
            <span className="lb">media</span>
          </div>
        )}
        <div className="month-bars-grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
          {timeline.map((v, i) => {
            const heightPct = v > 0 ? Math.max(6, (v / max) * 100) : 4;
            const tone = classify(v);
            const isToday = i === todayIdx;
            const isFuture = i > todayIdx;
            const lbl = labels[i];

            return (
              <button
                key={i}
                type="button"
                className={`mb ${isToday ? 'today' : ''}`}
                onClick={() => v > 0 && onDayTap?.(periodStart.getTime() + i * 864e5)}
                disabled={isFuture || v === 0}
                aria-label={`Giorno ${i + 1}: €${Math.round(v)}`}
              >
                <motion.div
                  className={`mb-fill ${tone}`}
                  initial={{ height: '0%' }}
                  animate={{ height: `${isFuture ? 0 : heightPct}%` }}
                  transition={{ duration: 0.4, delay: 0.02 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  {lbl && (
                    <span className={`mb-label ${lbl.side === 'left' ? 'shift-left' : 'shift-right'}`}>
                      {lbl.text}
                    </span>
                  )}
                  {isToday && !lbl && (
                    <span className="mb-label today">oggi</span>
                  )}
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="month-bars-axis">
        <span>{periodStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()}</span>
        <span>{new Date(periodEnd.getTime() - 864e5).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).toUpperCase()}</span>
      </div>
    </div>
  );
};
