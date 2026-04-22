import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { realCost, $d } from '../../lib/format.js';
import { NumberTicker } from '../ui/NumberTicker.jsx';

export const RingChart = ({ pTxs, cats, freeBudget, totalSpent }) => {
  const data = useMemo(() => {
    const byCat = {};
    pTxs.forEach((t) => { byCat[t.cat] = (byCat[t.cat] || 0) + realCost(t); });
    return cats
      .filter((c) => byCat[c.id] > 0)
      .map((c) => ({ id: c.id, name: c.label, value: byCat[c.id], color: c.color, icon: c.icon }))
      .sort((a, b) => b.value - a.value);
  }, [pTxs, cats]);

  const usedPct = freeBudget > 0 ? Math.round((totalSpent / freeBudget) * 100) : 0;

  if (data.length === 0) {
    return (
      <div className="text-center text-fg-5 text-xs py-10">
        Nessuna spesa registrata in questo periodo
      </div>
    );
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={54}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              animationDuration={1200}
              animationBegin={200}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', damping: 18 }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <div className="text-[22px] font-medium tracking-tight leading-none">
            <NumberTicker value={usedPct} decimals={0} suffix="%" />
          </div>
          <div className="text-[9px] uppercase tracking-widest text-fg-4 font-semibold mt-0.5">usato</div>
        </motion.div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {data.slice(0, 5).map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-center gap-2 text-[11px]"
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-fg-2 truncate">{d.name}</span>
            <span className="ml-auto font-medium tnum text-fg-1">€{$d(d.value)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
