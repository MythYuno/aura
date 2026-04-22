import { motion } from 'framer-motion';
import { Card } from '../ui/Card.jsx';
import { NumberTicker } from '../ui/NumberTicker.jsx';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/format.js';

export const BalanceHero = ({ dailyBudget, remaining, daysLeft, totalSpent, freeBudget, bufferAmt, dreamAlloc, isOver, privacy }) => {
  return (
    <Card padding="xl" className="col-span-full relative overflow-hidden" delay={0.05}>
      {/* Orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, var(--accent-glow), transparent 60%)',
        filter: 'blur(50px)',
        transform: 'translate(30%, -30%)',
      }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(103,232,249,0.06), transparent 70%)',
        filter: 'blur(40px)',
        transform: 'translate(-30%, 30%)',
      }} />

      {/* Status chip */}
      <div className="relative flex items-center gap-2 mb-5">
        <span className={cn(
          'inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-[11px] font-medium tracking-wide',
          isOver ? 'bg-red/10 text-red border border-red/20' : 'bg-ok/10 text-ok border border-ok/20'
        )}>
          <span className="relative w-2 h-2 rounded-full" style={{ background: isOver ? 'var(--red)' : 'var(--ok)' }}>
            <span className="absolute inset-0 rounded-full animate-pulse-soft" style={{ background: isOver ? 'var(--red)' : 'var(--ok)' }} />
          </span>
          {isOver ? 'Attenzione alle spese' : 'Tutto sotto controllo'}
        </span>
      </div>

      <p className="text-[13px] text-fg-3 mb-2 relative">Disponibile oggi</p>

      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'text-[64px] sm:text-[80px] font-extralight leading-[0.9] tracking-[-0.045em] relative text-gradient-ok',
          privacy && 'privacy-blur'
        )}
      >
        <span className="text-4xl opacity-60 font-light mr-1 align-top leading-none">€</span>
        <NumberTicker value={dailyBudget} decimals={2} />
      </motion.h1>

      <div className="flex gap-2 mt-3 text-[13px] text-fg-3 relative">
        <span className={privacy ? 'privacy-blur' : ''}>
          <strong className="text-fg-1 font-semibold">€<NumberTicker value={remaining} decimals={2} /></strong> rimasti
        </span>
        <span className="text-fg-5">·</span>
        <span><strong className="text-fg-1 font-semibold">{daysLeft}</strong> {daysLeft === 1 ? 'giorno' : 'giorni'} al reset</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6 relative">
        {[
          { label: 'Speso', value: totalSpent, dec: 2, color: 'var(--pink)' },
          { label: 'Budget', value: freeBudget, dec: 0, color: 'var(--fg-1)' },
          { label: 'Salvati', value: bufferAmt + dreamAlloc, dec: 0, color: 'var(--info)' },
        ].map((s) => (
          <div key={s.label} className="p-3 bg-bg-1 rounded-xl border border-bd-1">
            <p className="text-[10px] uppercase tracking-widest text-fg-4 font-semibold mb-1.5">{s.label}</p>
            <p className={cn('text-[17px] font-medium tracking-tight tnum', privacy && 'privacy-blur')} style={{ color: s.color }}>
              €<NumberTicker value={s.value} decimals={s.dec} />
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
