import { Card } from '../ui/Card.jsx';
import { Heatmap } from '../charts/Heatmap.jsx';
import { Calendar, Brain } from 'lucide-react';
import { DynIcon } from '../ui/DynIcon.jsx';
import { $d, cn } from '../../lib/format.js';

export const HeatmapCard = ({ txs, privacy }) => {
  if (txs.length === 0) return null;
  return (
    <Card padding="md" className="col-span-full" delay={0.2}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(216,180,254,0.1)' }}>
          <Calendar size={14} className="text-purple" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Calendario abitudini · 12 settimane</p>
      </div>
      <Heatmap txs={txs} color="var(--purple)" privacy={privacy} />
    </Card>
  );
};

export const UpcomingCard = ({ upcoming, privacy }) => {
  if (upcoming.length === 0) return null;
  return (
    <Card padding="md" delay={0.25} className="col-span-full" style={{ background: 'linear-gradient(135deg, rgba(253,224,71,0.04), transparent)', borderColor: 'rgba(253,224,71,0.1)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(253,224,71,0.1)' }}>
          <Calendar size={14} className="text-gold" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold" style={{ color: 'var(--gold)' }}>Prossimi addebiti</p>
      </div>
      <div className="flex flex-col gap-2">
        {upcoming.slice(0, 3).map((d) => (
          <div key={d.id} className="flex items-center gap-3 py-2.5 px-3 bg-bg-1 rounded-xl border border-bd-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,224,71,0.08)' }}>
              <DynIcon name="Calendar" size={15} className="text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium">{d.label}</p>
              <p className="text-[10px] text-fg-4">{d.daysUntil === 0 ? 'Oggi' : d.daysUntil === 1 ? 'Domani' : `Tra ${d.daysUntil} giorni`}</p>
            </div>
            <p className={cn('text-[13px] font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--gold)' }}>€{$d(d.amount)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const InsightsCard = ({ insights, weeklyInsight, privacy }) => {
  const items = [...(insights || [])];
  if (weeklyInsight?.topCat && Math.abs(weeklyInsight.diff) > 10) {
    items.push({
      id: 'weekly',
      icon: 'Brain',
      title: `Top categoria settimanale`,
      text: `${weeklyInsight.topPct}% delle spese in ${weeklyInsight.topCat.label}. ${weeklyInsight.diff > 0 ? '+' : ''}${Math.round(weeklyInsight.diff)}% vs media 4 settimane.`,
      color: 'info',
    });
  }
  if (items.length === 0) return null;

  return (
    <Card padding="md" className="col-span-full" delay={0.3}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(103,232,249,0.1)' }}>
          <Brain size={14} className="text-info" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Insights intelligenti</p>
      </div>
      <div className="space-y-2.5">
        {items.slice(0, 3).map((ins) => {
          const colorMap = { info: 'var(--info)', red: 'var(--red)', orange: 'var(--orange)', ok: 'var(--ok)' };
          const color = colorMap[ins.color] || 'var(--info)';
          return (
            <div key={ins.id} className="flex gap-3 items-start py-2 px-3 rounded-xl bg-bg-1 border border-bd-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                <DynIcon name={ins.icon} size={13} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold mb-0.5" style={{ color }}>{ins.title}</p>
                <p className={cn('text-[11px] text-fg-3 leading-snug', privacy && 'privacy-blur')}>{ins.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
