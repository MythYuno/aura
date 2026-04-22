import { Card } from '../ui/Card.jsx';
import { RingChart } from '../charts/RingChart.jsx';
import { PieChart } from 'lucide-react';

export const CategoriesRing = ({ pTxs, cats, freeBudget, totalSpent, privacy }) => {
  return (
    <Card padding="md" className="col-span-full" delay={0.15}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,171,252,0.1)' }}>
          <PieChart size={14} className="text-pink" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Allocazione categorie</p>
      </div>
      <div className={privacy ? 'privacy-blur' : ''}>
        <RingChart pTxs={pTxs} cats={cats} freeBudget={freeBudget} totalSpent={totalSpent} />
      </div>
    </Card>
  );
};
