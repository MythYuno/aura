import { Card } from '../ui/Card.jsx';
import { BurnArea } from '../charts/BurnArea.jsx';
import { Target } from 'lucide-react';
import { $d, cn } from '../../lib/format.js';

export const ForecastCard = ({ forecast, txs, periodStart, dayOfPeriod, daysInPeriod, freeBudget, privacy, burnPct, isOver }) => {
  return (
    <Card padding="md" className="col-span-full" delay={0.1}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-10)' }}>
          <Target size={14} className="text-accent" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Previsione fine mese</p>
      </div>

      {forecast && (
        <p className="text-sm text-fg-2 leading-relaxed mb-4">
          A questo ritmo spenderai <strong className={cn('text-fg font-semibold px-1.5 rounded tnum', forecast.willOverrun ? 'bg-red/12 text-red' : 'bg-accent/12 text-accent', privacy && 'privacy-blur')}>€{$d(forecast.projected)}</strong>
          {forecast.willOverrun
            ? <> — superando il budget di <strong className={cn('font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--red)' }}>€{$d(forecast.overrun)}</strong></>
            : <> — risparmiando <strong className={cn('font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--accent)' }}>€{$d(Math.abs(forecast.overrun))}</strong></>
          }
        </p>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 bg-glass rounded-full overflow-hidden border border-glass-bd">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${burnPct}%`,
              background: isOver ? 'linear-gradient(90deg, var(--red), #FF4444)' : 'linear-gradient(90deg, var(--accent), var(--info))',
              boxShadow: isOver ? '0 0 10px rgba(255,90,90,.4)' : '0 0 10px var(--accent-glow)',
            }}
          />
        </div>
        <span className="text-[11px] font-bold tnum" style={{ color: isOver ? 'var(--red)' : 'var(--accent)' }}>
          {Math.round(burnPct)}%
        </span>
      </div>

      <div className={privacy ? 'privacy-blur' : ''}>
        <BurnArea txs={txs} periodStart={periodStart} dayOfPeriod={dayOfPeriod} daysInPeriod={daysInPeriod} freeBudget={freeBudget} height={130} />
      </div>
      <div className="flex gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-pink" />
          <span className="text-[10px] text-fg-3">Speso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-accent opacity-50" />
          <span className="text-[10px] text-fg-3">Ideale</span>
        </div>
      </div>
    </Card>
  );
};
