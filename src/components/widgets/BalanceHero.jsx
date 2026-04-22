import { motion } from 'framer-motion';
import { Card } from '../ui/Card.jsx';
import { NumberTicker } from '../ui/NumberTicker.jsx';
import { cn } from '../../lib/format.js';

export const BalanceHero = ({ dailyBudget, remaining, daysLeft, totalSpent, freeBudget, bufferAmt, dreamAlloc, isOver, privacy }) => {
  return (
    <Card padding="lg" className="col-span-full relative overflow-hidden" delay={0.05}>
      {/* Floating orbs behind number */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none orb-drift" style={{
        background: 'radial-gradient(circle, var(--accent-glow), transparent 65%)',
        filter: 'blur(50px)',
        transform: 'translate(30%, -35%)',
      }} />

      {/* Status chip */}
      <div className="relative flex items-center mb-5">
        <span className={cn('inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full text-[11px] font-semibold')}
              style={{
                background: isOver ? 'color-mix(in srgb, var(--red) 12%, transparent)' : 'var(--accent-10)',
                border: `1px solid ${isOver ? 'color-mix(in srgb, var(--red) 25%, transparent)' : 'var(--accent-20)'}`,
                color: isOver ? 'var(--red)' : 'var(--accent)',
                backdropFilter: 'blur(10px)',
              }}>
          <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }}>
            <span className="absolute inset-0 rounded-full live-pulse" style={{ background: 'currentColor' }} />
          </span>
          {isOver ? 'Attenzione' : 'Tutto ok'}
        </span>
      </div>

      <p className="text-[12px] text-fg-3 mb-2 relative font-medium uppercase tracking-[0.15em]">Budget giornaliero</p>

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

      <div className="flex gap-2 mt-3 text-[13px] text-fg-2 relative font-mono">
        <span className={privacy ? 'privacy-blur' : ''}>
          <strong className="text-fg font-semibold">€<NumberTicker value={remaining} decimals={2} /></strong>
          <span className="text-fg-3 ml-1">rimasti</span>
        </span>
        <span className="text-fg-4">·</span>
        <span><strong className="text-fg font-semibold">{daysLeft}</strong> <span className="text-fg-3">{daysLeft === 1 ? 'giorno' : 'giorni'}</span></span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6 relative">
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
            className="glass-2 p-3 rounded-xl"
          >
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
