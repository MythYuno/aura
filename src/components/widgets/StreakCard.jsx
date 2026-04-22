import { Card } from '../ui/Card.jsx';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export const StreakCard = ({ streakData }) => {
  if (streakData.days === 0) return null;
  return (
    <Card padding="default" delay={0.2} className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(253,186,116,0.08), rgba(255,255,255,0.02))', borderColor: 'rgba(253,186,116,0.12)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(253,186,116,0.12)' }}
        >
          <Flame size={14} className="text-orange" style={{ filter: 'drop-shadow(0 0 6px rgba(253,186,116,0.6))' }} />
        </motion.div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Streak</p>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] font-light tracking-tight tnum text-orange leading-none">{streakData.days}</span>
        <span className="text-[12px] text-fg-4 font-medium">{streakData.days === 1 ? 'giorno' : 'giorni'}</span>
      </div>
      <p className="text-[10px] text-fg-4 mt-2">Senza vizi · Record: {streakData.bestStreak}g</p>
    </Card>
  );
};
