import { motion } from 'framer-motion';
import { Card } from '../ui/Card.jsx';
import { NumberTicker } from '../ui/NumberTicker.jsx';
import { cn } from '../../lib/format.js';

export const BalanceHero = ({ dailyBudget, remaining, daysLeft, totalSpent, freeBudget, bufferAmt, dreamAlloc, isOver, privacy }) => {
  const burnPct = freeBudget > 0 ? Math.min(100, (totalSpent / freeBudget) * 100) : 0;

  // Three-state status: on-track / watch / over
  const status = remaining < 0
    ? { label: 'Budget superato', color: 'var(--red)', bgVar: 'color-mix(in srgb, var(--red) 12%, transparent)', bdVar: 'color-mix(in srgb, var(--red) 25%, transparent)' }
    : isOver
    ? { label: 'Sopra il ritmo', color: 'var(--warn)', bgVar: 'color-mix(in srgb, var(--warn) 12%, transparent)', bdVar: 'color-mix(in srgb, var(--warn) 25%, transparent)' }
    : { label: 'In rotta', color: 'var(--accent)', bgVar: 'var(--accent-10)', bdVar: 'var(--accent-20)' };

  return (
    <Card padding="lg" className="col-span-full relative overflow-hidden" delay={0.05}>
      {/* Floating orbs behind number */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none orb-drift" style={{
        background: 'radial-gradient(circle, var(--accent-glow), transparent 65%)',
        filter: 'blur(50px)',
        transform: 'translate(30%, -35%)',
      }} />

      {/* Status chip + burn bar */}
      <div className="relative flex items-center justify-between gap-3 mb-5">
        <span className={cn('inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0')}
              role="status"
              style={{
                background: status.bgVar,
                border: `1px solid ${status.bdVar}`,
                color: status.color,
                backdropFilter: 'blur(10px)',
              }}>
          <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} aria-hidden="true">
            <span className="absolute inset-0 rounded-full live-pulse" style={{ background: 'currentColor' }} />
          </span>
          {status.label}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${burnPct}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${status.color}, ${status.color === 'var(--accent)' ? 'var(--accent-dim)' : status.color})`,
                boxShadow: `0 0 8px ${status.color}55`,
              }}
            />
          </div>
          <span
            className={cn('text-[10px] font-bold tnum tabular-nums', privacy && 'privacy-blur')}
            style={{ color: status.color, minWidth: 36, textAlign: 'right' }}
            aria-label={`Speso ${Math.round(burnPct)} percento del budget`}
          >
            {Math.round(burnPct)}%
          </span>
        </div>
      </div>

      <p className="text-[10px] text-fg-3 mb-1.5 relative font-bold uppercase tracking-[0.2em]">Oggi puoi spendere</p>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'font-display text-[58px] sm:text-[78px] leading-[0.95] tracking-[-0.04em] relative text-gradient-accent',
          privacy && 'privacy-blur'
        )}
      >
        <span className="text-3xl sm:text-4xl opacity-65 mr-1 align-top font-medium" style={{ letterSpacing: 0 }}>€</span>
        <NumberTicker value={dailyBudget} decimals={2} />
      </motion.h1>

      <div className="flex items-center gap-2.5 mt-3 text-[13px] relative">
        <span className={cn('flex items-baseline gap-1 tnum', privacy && 'privacy-blur')}>
          <strong className="text-fg font-semibold">€<NumberTicker value={remaining} decimals={2} /></strong>
          <span className="text-fg-3 text-[11px]">rimasti</span>
        </span>
        <span className="w-1 h-1 rounded-full" style={{ background: 'var(--fg-5)' }} aria-hidden="true" />
        <span className="flex items-baseline gap-1 tnum">
          <strong className="text-fg font-semibold">{daysLeft}</strong>
          <span className="text-fg-3 text-[11px]">{daysLeft === 1 ? 'giorno' : 'giorni'}</span>
        </span>
      </div>

      <div
        className="h-px my-5 relative"
        style={{ background: 'linear-gradient(90deg, transparent, var(--glass-bd-2), transparent)' }}
        aria-hidden="true"
      />

      <div className="grid grid-cols-3 gap-2 relative">
        {[
          { label: 'Speso', value: totalSpent, dec: 2, color: 'var(--pink)' },
          { label: 'Budget', value: freeBudget, dec: 0, color: 'var(--fg)' },
          { label: 'Salvati', value: bufferAmt + dreamAlloc, dec: 0, color: 'var(--info)' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.08 }}
            className="relative p-3 rounded-xl overflow-hidden"
            style={{
              background: 'var(--glass)',
              border: '1px solid var(--glass-bd)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${s.color}40, transparent)` }}
              aria-hidden="true"
            />
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-fg-3 mb-1.5">{s.label}</p>
            <p className={cn('font-mono text-[16px] font-semibold tnum', privacy && 'privacy-blur')} style={{ color: s.color }}>
              €<NumberTicker value={s.value} decimals={s.dec} />
            </p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
