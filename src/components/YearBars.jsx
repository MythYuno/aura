import { motion } from 'framer-motion';
import { maskedMoney } from '../lib/format.js';

/**
 * Bar chart of the last 12 months. Current month highlighted in accent.
 *
 * @param months — Array<{ key, label, total, isCurrent }>
 */
export const YearBars = ({ months, onMonthTap, privacy = false }) => {
  const max = Math.max(1, ...months.map((m) => m.total));
  const min = Math.min(...months.filter((m) => m.total > 0).map((m) => m.total)) || 0;
  const peak = Math.max(...months.map((m) => m.total));

  return (
    <div className="year-bars">
      <div className="year-bars-canvas">
        {months.map((m, i) => {
          const h = m.total > 0 ? Math.max(8, (m.total / max) * 100) : 4;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onMonthTap?.(m)}
              className={`yb ${m.isCurrent ? 'current' : ''}`}
              aria-label={privacy ? `${m.label}: importo nascosto` : `${m.label}: €${Math.round(m.total)}`}
            >
              <motion.div
                className={`yb-fill ${m.total > 0 ? 'has' : ''}`}
                initial={{ height: '0%' }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.45, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }}
              />
              <span className="yb-lbl">{m.label}</span>
            </button>
          );
        })}
      </div>
      {peak > 0 && (
        <div className="year-bars-num">
          <span>min <strong>€{maskedMoney(min, { privacy })}</strong></span>
          <span>max <strong>€{maskedMoney(peak, { privacy })}</strong></span>
        </div>
      )}
    </div>
  );
};
