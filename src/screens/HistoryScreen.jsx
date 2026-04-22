import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card.jsx';
import { DynIcon } from '../components/ui/DynIcon.jsx';
import { SwipeRow } from '../components/ui/SwipeRow.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { MonthsBarChart } from '../components/charts/MonthsBarChart.jsx';
import { Search, Calendar, TrendingDown, X } from 'lucide-react';
import { realCost, $d, $n, cn } from '../lib/format.js';
import { useToast } from '../hooks/useUndoToast.js';

export const HistoryScreen = ({ store }) => {
  const { txs, cats, deleteTx, periodStart, monthsHistory, privacy } = store;
  const toast = useToast();
  const [view, setView] = useState('list');
  const [monthOffset, setMonthOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSwipeId, setActiveSwipeId] = useState(null);

  const selectedPeriod = useMemo(() => {
    const start = new Date(periodStart);
    start.setMonth(start.getMonth() - monthOffset);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  }, [periodStart, monthOffset]);

  const filteredTxs = useMemo(() => {
    let list = txs.filter((t) => t.ts >= selectedPeriod.start.getTime() && t.ts < selectedPeriod.end.getTime());
    if (activeFilter !== 'all') list = list.filter((t) => t.cat === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const cat = cats.find((c) => c.id === t.cat);
        return (t.label || '').toLowerCase().includes(q)
          || (cat?.label || '').toLowerCase().includes(q)
          || (t.tags || []).some((tg) => tg.toLowerCase().includes(q));
      });
    }
    return list.sort((a, b) => b.ts - a.ts);
  }, [txs, selectedPeriod, activeFilter, search, cats]);

  const grouped = useMemo(() => {
    const g = {};
    filteredTxs.forEach((t) => {
      const d = new Date(t.ts);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!g[key]) g[key] = [];
      g[key].push(t);
    });
    return g;
  }, [filteredTxs]);

  const monthTotal = useMemo(() => {
    return txs.filter((t) => t.ts >= selectedPeriod.start.getTime() && t.ts < selectedPeriod.end.getTime()).reduce((a, t) => a + realCost(t), 0);
  }, [txs, selectedPeriod]);

  const diffVsPrev = useMemo(() => {
    const prevStart = new Date(selectedPeriod.start); prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(selectedPeriod.end); prevEnd.setMonth(prevEnd.getMonth() - 1);
    const prev = txs.filter((t) => t.ts >= prevStart.getTime() && t.ts < prevEnd.getTime()).reduce((a, t) => a + realCost(t), 0);
    if (prev === 0) return null;
    return ((monthTotal - prev) / prev) * 100;
  }, [txs, selectedPeriod, monthTotal]);

  const catCounts = useMemo(() => {
    const all = txs.filter((t) => t.ts >= selectedPeriod.start.getTime() && t.ts < selectedPeriod.end.getTime());
    const c = { all: all.length };
    cats.forEach((cat) => { c[cat.id] = all.filter((t) => t.cat === cat.id).length; });
    return c;
  }, [txs, selectedPeriod, cats]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Card padding="none" className="col-span-full flex gap-1 p-1 rounded-2xl" delay={0.05}>
        {[{ id: 'list', l: 'Mensile', i: Calendar }, { id: 'compare', l: 'Confronto', i: TrendingDown }].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'flex-1 py-2.5 px-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-colors',
              view === v.id ? 'bg-bg-3 text-fg-1' : 'text-fg-4 hover:text-fg-2'
            )}
          >
            <v.i size={13} className={view === v.id ? 'text-ok' : ''} />
            {v.l}
          </button>
        ))}
      </Card>

      {view === 'list' && (
        <>
          <div className="col-span-full -mx-4 px-4">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {monthsHistory.slice().reverse().map((m) => (
                <motion.button
                  key={m.offset}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMonthOffset(m.offset)}
                  className="min-w-[90px] flex flex-col items-center gap-1 px-4 py-3 rounded-2xl flex-shrink-0 transition-colors"
                  style={{
                    background: monthOffset === m.offset ? 'var(--ok-10)' : 'var(--bg-2)',
                    border: `1px solid ${monthOffset === m.offset ? 'var(--ok-20)' : 'var(--bd-1)'}`,
                  }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: monthOffset === m.offset ? 'var(--ok)' : 'var(--fg-4)' }}>
                    {m.offset === 0 ? 'Ora' : m.label}
                  </span>
                  <span className={cn('text-[14px] font-semibold tnum', privacy && 'privacy-blur')}>€{$n(m.total)}</span>
                  <span className="text-[9px] text-fg-5">{m.txCount} tx</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="col-span-full grid grid-cols-3 gap-2">
            <Card padding="md" delay={0.1} className="col-span-2" style={{ background: 'linear-gradient(135deg, var(--ok-10), rgba(255,255,255,0.02))', borderColor: 'var(--ok-20)' }}>
              <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-2">
                {selectedPeriod.start.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </p>
              <p className={cn('text-[26px] font-light tracking-tight tnum leading-none', privacy && 'privacy-blur')} style={{ color: 'var(--ok)' }}>
                €<NumberTicker value={monthTotal} decimals={2} />
              </p>
              {diffVsPrev !== null && (
                <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: diffVsPrev < 0 ? 'var(--ok)' : 'var(--red)' }}>
                  {diffVsPrev > 0 ? '↑' : '↓'} {Math.abs(diffVsPrev).toFixed(0)}% vs mese prec.
                </p>
              )}
            </Card>
            <Card padding="md" delay={0.12}>
              <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-2">Tx</p>
              <p className="text-[26px] font-light tracking-tight tnum leading-none">{filteredTxs.length}</p>
            </Card>
          </div>

          <Card padding="none" className="col-span-full px-4 py-3 flex items-center gap-2.5" delay={0.15}>
            <Search size={16} className="text-fg-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cerca transazioni, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-sm font-medium placeholder:text-fg-5"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-fg-4 hover:text-fg-2">
                <X size={15} />
              </button>
            )}
          </Card>

          <div className="col-span-full -mx-4 px-4">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[{ id: 'all', label: 'Tutte', icon: null, color: null }, ...cats].filter((c) => c.id === 'all' || catCounts[c.id] > 0).map((c) => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveFilter(c.id)}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full text-[11px] font-semibold flex-shrink-0 transition-colors"
                  style={{
                    background: activeFilter === c.id ? (c.color ? `${c.color}15` : 'var(--ok-10)') : 'var(--bg-2)',
                    border: `1px solid ${activeFilter === c.id ? (c.color ? `${c.color}30` : 'var(--ok-20)') : 'var(--bd-1)'}`,
                    color: activeFilter === c.id ? (c.color || 'var(--ok)') : 'var(--fg-2)',
                  }}
                >
                  {c.icon && <DynIcon name={c.icon} size={12} />}
                  <span>{c.label}</span>
                  <span className="px-1.5 py-0.5 bg-black/20 rounded text-[9px] tnum font-mono">{catCounts[c.id] || 0}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {filteredTxs.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                illustration="noData"
                title="Nessuna transazione"
                description={search ? 'Nessun risultato per la ricerca' : 'Questo periodo non ha ancora spese registrate'}
              />
            </div>
          ) : (
            <div className="col-span-full">
              {Object.entries(grouped).map(([key, items]) => {
                const d = new Date(items[0].ts);
                const total = items.reduce((a, t) => a + realCost(t), 0);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const y = new Date(today); y.setDate(y.getDate() - 1);
                const txDate = new Date(d); txDate.setHours(0, 0, 0, 0);
                const label = txDate.getTime() === today.getTime() ? 'Oggi'
                  : txDate.getTime() === y.getTime() ? 'Ieri'
                  : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
                return (
                  <div key={key} className="mb-6">
                    <div className="flex justify-between items-center mb-2.5 px-1">
                      <p className="text-[11px] font-bold text-fg-2 capitalize">{label}</p>
                      <p className={cn('text-[11px] font-semibold text-fg-4 tnum', privacy && 'privacy-blur')}>€{$d(total)}</p>
                    </div>
                    {items.map((t) => {
                      const cat = cats.find((c) => c.id === t.cat);
                      return (
                        <SwipeRow
                          key={t.id}
                          id={t.id}
                          activeId={activeSwipeId}
                          setActiveId={setActiveSwipeId}
                          actions={[{
                            icon: 'Trash2',
                            label: 'ELIMINA',
                            bg: 'var(--red)',
                            onClick: () => deleteTx(t.id, (undo) => toast?.show?.('Spesa eliminata', undo)),
                          }]}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat?.color || '#888'}15`, border: `1px solid ${cat?.color || '#888'}20` }}>
                              <DynIcon name={cat?.icon || 'Circle'} size={15} style={{ color: cat?.color || '#888' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold truncate">{t.label || cat?.label || 'Spesa'}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-fg-4">
                                  {new Date(t.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {t.credit > 0 && (
                                  <span className="text-[9px] font-bold text-teal px-1.5 py-0.5 rounded-md bg-teal/10">
                                    {t.creditReceived ? '✓ Rimborsato' : `Credito €${$d(t.credit)}`}
                                  </span>
                                )}
                                {(t.tags || []).slice(0, 2).map((tag) => (
                                  <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-bg-3 text-fg-3 font-mono">#{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={cn('text-[14px] font-semibold tnum tracking-tight', privacy && 'privacy-blur')}>€{$d(t.amount)}</p>
                              {t.credit > 0 && <p className="text-[9px] text-teal mt-0.5 tnum">reale €{$d(realCost(t))}</p>}
                            </div>
                          </div>
                        </SwipeRow>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'compare' && (
        <Card padding="lg" className="col-span-full" delay={0.1}>
          <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-4">Ultimi 6 mesi</p>
          <MonthsBarChart months={monthsHistory} onSelect={(o) => { setMonthOffset(o); setView('list'); }} selectedOffset={monthOffset} privacy={privacy} />
        </Card>
      )}
    </div>
  );
};
