import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { realCost, $d } from '../../lib/format.js';

export const Heatmap = ({ txs, color = 'var(--ok)', privacy = false }) => {
  const { weeks, max, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const start = d.getTime();
      const end = start + 864e5;
      const spent = txs.filter((t) => t.ts >= start && t.ts < end).reduce((a, t) => a + realCost(t), 0);
      days.push({ date: d, spent });
    }
    const max = Math.max(...days.map((d) => d.spent), 1);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const monthLabels = [];
    let lastMonth = -1;
    weeks.forEach((w, wi) => {
      const m = w[0]?.date.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ idx: wi, label: w[0].date.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '') });
        lastMonth = m;
      }
    });
    return { weeks, max, monthLabels };
  }, [txs]);

  // Color intensity based on theme accent - use CSS var with opacity variations
  const getOpacity = (spent) => {
    if (spent === 0) return 0;
    const intensity = Math.min(1, Math.pow(spent / max, 0.65));
    return 0.15 + intensity * 0.75;
  };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1.5">
        {/* Month labels */}
        <div className="flex gap-[3px] h-4 relative ml-5">
          {monthLabels.map((m) => (
            <span
              key={m.idx}
              className="absolute text-[9px] font-semibold text-fg-4 capitalize"
              style={{ left: m.idx * 17 }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {/* Weeks grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((d, di) => (
                  <motion.div
                    key={di}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (wi * 7 + di) * 0.004, duration: 0.3 }}
                    title={`${d.date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}: €${$d(d.spent)}`}
                    className="w-3.5 h-3.5 rounded-[3px] cursor-pointer transition-transform hover:scale-125"
                    style={{
                      background: d.spent === 0 ? 'var(--bg-2)' : color,
                      opacity: d.spent === 0 ? 1 : getOpacity(d.spent),
                      border: d.spent === 0 ? '1px solid var(--bd-1)' : 'none',
                      filter: privacy ? 'blur(6px)' : 'none',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-fg-4 mt-2 ml-1">
          <span>Meno</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[3px]"
              style={{
                background: v === 0 ? 'var(--bg-2)' : color,
                opacity: v === 0 ? 1 : 0.15 + v * 0.75,
                border: v === 0 ? '1px solid var(--bd-1)' : 'none',
              }}
            />
          ))}
          <span>Più</span>
        </div>
      </div>
    </div>
  );
};
