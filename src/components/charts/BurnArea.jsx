import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { realCost } from '../../lib/format.js';

export const BurnArea = ({ txs, periodStart, dayOfPeriod, daysInPeriod, freeBudget, height = 180 }) => {
  const data = useMemo(() => {
    const arr = [];
    const dailyIdeal = daysInPeriod > 0 ? freeBudget / daysInPeriod : 0;
    let cum = 0;
    const limit = Math.min(dayOfPeriod, 31);
    for (let i = 0; i < limit; i++) {
      const ds = new Date(periodStart);
      ds.setDate(ds.getDate() + i);
      const de = new Date(ds);
      de.setDate(de.getDate() + 1);
      const day = txs.filter((t) => t.ts >= ds.getTime() && t.ts < de.getTime())
                     .reduce((a, t) => a + realCost(t), 0);
      cum += day;
      arr.push({
        day: ds.getDate().toString(),
        spent: Math.round(cum * 100) / 100,
        ideal: Math.round(dailyIdeal * (i + 1) * 100) / 100,
      });
    }
    return arr;
  }, [txs, periodStart, dayOfPeriod, daysInPeriod, freeBudget]);

  if (data.length < 2) {
    return (
      <div className="text-center text-fg-5 text-xs py-8">
        Aggiungi spese per vedere il grafico
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pink)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--pink)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="id-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ok)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--ok)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--bd-1)" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="var(--fg-5)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="var(--fg-5)"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `€${Math.round(v)}`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-1)',
            border: '1px solid var(--bd-2)',
            borderRadius: 12,
            fontSize: 12,
            backdropFilter: 'blur(20px)',
          }}
          labelStyle={{ color: 'var(--fg-3)', fontSize: 11, marginBottom: 4 }}
          formatter={(v) => [`€${v.toFixed(2)}`, '']}
          labelFormatter={(l) => `Giorno ${l}`}
        />
        <Area
          type="monotone"
          dataKey="ideal"
          stroke="var(--ok)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="url(#id-area)"
          strokeOpacity={0.5}
          isAnimationActive
          animationDuration={1400}
        />
        <Area
          type="monotone"
          dataKey="spent"
          stroke="var(--pink)"
          strokeWidth={2.5}
          fill="url(#sp-area)"
          isAnimationActive
          animationDuration={1800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
