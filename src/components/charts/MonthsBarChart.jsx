import { motion } from 'framer-motion';
import { $n } from '../../lib/format.js';

export const MonthsBarChart = ({ months, onSelect, selectedOffset, privacy = false }) => {
  const max = Math.max(...months.map((m) => m.total), 1);
  const avg = months.reduce((a, m) => a + m.total, 0) / (months.length || 1);

  return (
    <div>
      <div className="relative flex items-end justify-between gap-2 h-[180px] mb-4">
        {avg > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-accent/30 z-[1]"
            style={{ bottom: `${(avg / max) * 160 + 20}px` }}
          >
            <span className="tnum absolute right-0 -top-4 text-[9px] text-accent font-bold bg-bg px-1.5 rounded">
              media €{$n(avg)}
            </span>
          </div>
        )}
        {months.map((m, i) => {
          const h = (m.total / max) * 160;
          const isCurrent = m.offset === 0;
          const isSelected = m.offset === selectedOffset;
          return (
            <button
              key={m.offset}
              onClick={() => onSelect?.(m.offset)}
              className="flex-1 flex flex-col items-center gap-1.5 bg-transparent border-0 cursor-pointer"
            >
              <span className={`tnum text-[10px] font-bold ${privacy ? 'blur-sm' : ''} ${isCurrent ? 'text-accent' : 'text-fg-3'}`}>
                €{$n(m.total)}
              </span>
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-full rounded-md origin-bottom"
                style={{
                  height: `${h || 2}px`,
                  minHeight: 2,
                  background: isCurrent
                    ? 'linear-gradient(180deg, var(--accent), var(--accent-dim))'
                    : 'linear-gradient(180deg, var(--pink), rgba(240,171,252,0.4))',
                  boxShadow: isCurrent ? '0 0 20px var(--accent-glow)' : isSelected ? '0 0 15px rgba(240,171,252,0.3)' : 'none',
                  outline: isSelected && !isCurrent ? '2px solid var(--pink)' : 'none',
                  outlineOffset: 2,
                }}
              />
              <span className={`text-[10px] capitalize ${isCurrent ? 'text-accent font-bold' : 'text-fg-4 font-medium'}`}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
