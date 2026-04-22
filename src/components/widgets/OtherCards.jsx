import { Card } from '../ui/Card.jsx';
import { DynIcon } from '../ui/DynIcon.jsx';
import { RotateCcw, Plus, Target, Flame, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { $d, $n, cn } from '../../lib/format.js';
import { haptic } from '../../lib/haptic.js';

export const CreditsCard = ({ pendingCredits, totalPendingCredit, totalReceivedCredit, markCreditReceived, cats, privacy }) => {
  if (totalPendingCredit === 0 && totalReceivedCredit === 0) return null;
  return (
    <Card padding="md" className="col-span-full" delay={0.3}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(94,234,212,0.1)' }}>
          <RotateCcw size={14} className="text-teal" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Crediti & rimborsi</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-3 bg-glass rounded-xl border border-glass-bd">
          <p className="text-[10px] uppercase text-fg-4 font-semibold mb-1">In attesa</p>
          <p className={cn('text-lg font-medium tnum', privacy && 'privacy-blur')} style={{ color: 'var(--teal)' }}>€{$d(totalPendingCredit)}</p>
        </div>
        <div className="p-3 bg-glass rounded-xl border border-glass-bd">
          <p className="text-[10px] uppercase text-fg-4 font-semibold mb-1">Ricevuti</p>
          <p className={cn('text-lg font-medium tnum', privacy && 'privacy-blur')} style={{ color: 'var(--accent)' }}>€{$d(totalReceivedCredit)}</p>
        </div>
      </div>
      {pendingCredits.slice(0, 4).map((t) => {
        const cat = cats.find((c) => c.id === t.cat);
        return (
          <div key={t.id} className="flex items-center gap-2.5 py-2 border-t border-glass-bd">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(94,234,212,0.1)' }}>
              <DynIcon name={cat?.icon || 'Circle'} size={12} className="text-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">{t.label || 'Spesa'}</p>
              <p className="text-[10px] text-fg-4 tnum">€{$d(t.amount)} · rimborso €{$d(t.credit)}</p>
            </div>
            <button
              onClick={() => markCreditReceived(t.id)}
              className="px-2.5 py-1 rounded-lg bg-teal/12 border border-teal/20 text-[10px] font-bold text-teal uppercase tracking-wider hover:bg-teal/20"
            >
              ✓ Ricevuto
            </button>
          </div>
        );
      })}
    </Card>
  );
};

export const DreamsCard = ({ dreams, privacy }) => {
  if (dreams.length === 0) return null;
  return (
    <div className="col-span-full">
      <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-2.5 px-1">Obiettivi</p>
      <div className="grid grid-cols-1 gap-2">
        {dreams.map((d, i) => {
          const pct = d.target > 0 ? (d.saved / d.target) * 100 : 0;
          const mo = d.alloc > 0 && d.saved < d.target ? Math.ceil((d.target - d.saved) / d.alloc) : null;
          return (
            <Card padding="default" delay={0.3 + i * 0.05} key={d.id}>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-[15px] font-semibold">{d.label}</p>
                <p className={cn('text-[12px] font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--purple)' }}>
                  €{$n(d.saved)} / €{$n(d.target)}
                </p>
              </div>
              <div className="h-1.5 bg-glass rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct)}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, var(--purple), var(--pink))',
                    boxShadow: '0 0 10px rgba(216,180,254,0.4)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-fg-3 tnum">{Math.round(pct)}%</span>
                {mo && <span className="text-purple">⏱ {mo > 12 ? `${Math.floor(mo/12)}a ${mo%12}m` : `${mo} mesi`}</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const ExtraCard = ({ extraThisPeriod, privacy }) => {
  if (extraThisPeriod <= 0) return null;
  return (
    <Card padding="md" delay={0.35}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-accent" />
          <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Entrate extra</p>
        </div>
        <p className={cn('text-base font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--accent)' }}>
          +€{$d(extraThisPeriod)}
        </p>
      </div>
    </Card>
  );
};

export const VicesCard = ({ viceSpend, privacy }) => {
  if (viceSpend <= 0) return null;
  return (
    <Card padding="md" delay={0.35}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-orange" />
          <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Micro-vizi</p>
        </div>
        <p className={cn('text-base font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--orange)' }}>
          €{$d(viceSpend)}
        </p>
      </div>
    </Card>
  );
};

export const QuickActionsBar = ({ quickActions, cats, addTx }) => {
  if (quickActions.length === 0) return null;
  return (
    <div className="col-span-full">
      <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-2.5 px-1 flex items-center gap-2">
        <Zap size={12} className="text-accent" />
        Quick actions
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {quickActions.map((qa) => {
          const cat = cats.find((c) => c.id === qa.catId);
          return (
            <button
              key={qa.id}
              onClick={() => { haptic('medium'); addTx(qa.amount, qa.catId, qa.label); }}
              className="flex-shrink-0 flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-glass border border-glass-bd hover:bg-glass-2 hover:border-glass-bd-2 transition-colors"
            >
              <DynIcon name={cat?.icon || 'Zap'} size={14} style={{ color: cat?.color || 'var(--accent)' }} />
              <span className="text-xs font-medium">{qa.label}</span>
              <span className="text-[11px] font-semibold tnum" style={{ color: cat?.color || 'var(--accent)' }}>€{$d(qa.amount)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
