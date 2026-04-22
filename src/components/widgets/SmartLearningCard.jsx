import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { haptic } from '../../lib/haptic.js';

export const SmartLearningCard = ({ learningConfidence, learningLevel, smartSuggestions, applySmart }) => {
  const pct = Math.round(learningConfidence * 100);
  const canApply = smartSuggestions && learningConfidence > 0.15;

  return (
    <Card padding="md" className="col-span-full" delay={0.2}>
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-20)' }}
        >
          <Brain size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: 'var(--fg-3)' }}>
              AURA impara
            </p>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'var(--accent-10)', color: 'var(--accent)' }}
            >
              Livello {learningLevel.level} / 3
            </span>
          </div>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--fg)' }}>{learningLevel.label}</p>
          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg-3)' }}>{learningLevel.desc}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-4)' }}>
            Confidenza
          </span>
          <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--accent), var(--accent-dim))',
              boxShadow: '0 0 8px var(--accent-glow)',
            }}
          />
        </div>
      </div>

      {canApply ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { haptic('success'); applySmart(); }}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
            boxShadow: '0 4px 16px var(--accent-glow)',
          }}
        >
          <Sparkles size={15} />
          Applica allocazione intelligente
        </motion.button>
      ) : (
        <p className="text-[11px] text-center py-2" style={{ color: 'var(--fg-4)' }}>
          Continua a registrare spese — tra qualche settimana saprò suggerirti meglio.
        </p>
      )}
    </Card>
  );
};
