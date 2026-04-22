import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import { DynIcon } from '../components/ui/DynIcon.jsx';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { Plus, X, Shield, RotateCcw, Target } from 'lucide-react';
import { $n, $d, parseNum, uid, cn } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

export const PlannerScreen = ({ store }) => {
  const {
    privacy, salary, freeBudget, fixedMonthly, subscriptionsMonthly, dreamAlloc,
    bufferAmt, totalLocked, fixed, setFixed, subscriptions, setSubscriptions,
    extraIncomes, setExtraIncomes, periodStart, periodEnd,
    cats, setCats, buffer, setBuffer, dreams, setDreams,
    smartSuggestions, rolloverTarget, setRolloverTarget,
    addExtraIncome, addSubscription, removeSubscription, toggleSubscription,
  } = store;

  const [showFixed, setShowFixed] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [fLbl, setFLbl] = useState('');
  const [fAmt, setFAmt] = useState('');
  const [fType, setFType] = useState('monthly');
  const [fDay, setFDay] = useState('1');
  const [fMonth, setFMonth] = useState('1');
  const [sLbl, setSLbl] = useState('');
  const [sAmt, setSAmt] = useState('');
  const [sDay, setSDay] = useState('1');
  const [eiLbl, setEiLbl] = useState('');
  const [eiAmt, setEiAmt] = useState('');

  const periodExtras = extraIncomes.filter((e) => e.ts >= periodStart.getTime() && e.ts < periodEnd.getTime());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Hero distribution */}
      <Card padding="xl" className="col-span-full relative overflow-hidden" delay={0.05}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)',
          filter: 'blur(50px)',
          transform: 'translate(30%, -30%)',
        }} />
        <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-5">Distribuzione stipendio</p>
        <div className={cn('flex justify-between items-end mb-5', privacy && 'privacy-blur')}>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1">Entrate</p>
            <p className="text-[34px] font-light tracking-tight leading-none tnum" style={{ color: 'var(--accent)' }}>
              €<NumberTicker value={salary} decimals={0} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1">Libero</p>
            <p className="text-[28px] font-light tracking-tight leading-none tnum">
              €<NumberTicker value={freeBudget} decimals={0} />
            </p>
          </div>
        </div>

        <div className="h-3.5 rounded-full bg-glass flex overflow-hidden mb-4 border border-glass-bd">
          {salary > 0 && (
            <>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(fixedMonthly / salary) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} style={{ background: 'linear-gradient(90deg, var(--blue), #5D6BFF)' }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${(subscriptionsMonthly / salary) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} style={{ background: 'linear-gradient(90deg, var(--pink), #E569C9)' }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${(bufferAmt / salary) * 100}%` }} transition={{ duration: 0.8, delay: 0.4 }} style={{ background: 'linear-gradient(90deg, var(--info), #30C8E5)' }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${(dreamAlloc / salary) * 100}%` }} transition={{ duration: 0.8, delay: 0.5 }} style={{ background: 'linear-gradient(90deg, var(--purple), #A77EFF)' }} />
              <motion.div initial={{ width: 0 }} animate={{ width: `auto`, flex: 1 }} transition={{ duration: 0.8, delay: 0.6 }} style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-dim))' }} />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Fisse', c: 'var(--blue)', v: fixedMonthly },
            { l: 'Abbonamenti', c: 'var(--pink)', v: subscriptionsMonthly },
            { l: 'Buffer', c: 'var(--info)', v: bufferAmt },
            { l: 'Obiettivi', c: 'var(--purple)', v: dreamAlloc },
          ].map((x) => (
            <div key={x.l} className="flex items-center gap-2.5 px-3 py-2.5 bg-glass rounded-xl border border-glass-bd">
              <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: x.c }} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-fg-4 font-bold">{x.l}</p>
                <p className={cn('text-[13px] font-semibold tnum', privacy && 'privacy-blur')} style={{ color: x.c }}>€{$n(x.v)}</p>
              </div>
            </div>
          ))}
        </div>

        {salary > 0 && totalLocked > salary && (
          <p className="text-[11px] text-red mt-3 p-2.5 bg-red/10 rounded-lg border border-red/20">
            ⚠ Stai allocando più del tuo stipendio. Riduci spese fisse, abbonamenti o obiettivi.
          </p>
        )}
      </Card>

      {/* Fixed */}
      <Section title="Spese fisse" onAdd={() => { haptic('light'); setFLbl(''); setFAmt(''); setFType('monthly'); setFDay('1'); setFMonth('1'); setShowFixed(true); }} color="var(--blue)" delay={0.1}>
        {fixed.length === 0 ? (
          <EmptyMsg>Affitto, bollette, assicurazioni...</EmptyMsg>
        ) : fixed.map((fx) => (
          <div key={fx.id} className="flex justify-between items-center px-4 py-3 bg-glass rounded-xl border border-glass-bd mb-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">{fx.label}</p>
              <p className="text-[10px] text-fg-4 mt-0.5">
                {fx.type === 'annual' ? `Annuale · ${['', 'Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][fx.deductMonth || 1]}` : 'Mensile'} · Giorno {fx.deductDay || 1}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-[14px] font-semibold tnum', privacy && 'privacy-blur')}>€{$d(fx.amount)}</span>
              <button onClick={() => { haptic('warning'); setFixed((p) => p.filter((x) => x.id !== fx.id)); }} className="p-1 text-red">
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* Subscriptions */}
      <Section title="Abbonamenti" onAdd={() => { haptic('light'); setSLbl(''); setSAmt(''); setSDay('1'); setShowSub(true); }} color="var(--pink)" delay={0.15}>
        {subscriptions.length === 0 ? (
          <EmptyMsg>Netflix, Spotify, palestra — sospendi quando non servono</EmptyMsg>
        ) : subscriptions.map((sb) => (
          <div key={sb.id} className={cn('flex justify-between items-center px-4 py-3 bg-glass rounded-xl border border-glass-bd mb-1.5', sb.active === false && 'opacity-50')}>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">{sb.label}</p>
              <p className="text-[10px] text-fg-4 mt-0.5">Giorno {sb.deductDay || 1} · {sb.active === false ? '⏸ Sospeso' : '✓ Attivo'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-[14px] font-semibold tnum', privacy && 'privacy-blur')}>€{$d(sb.amount)}</span>
              <button onClick={() => toggleSubscription(sb.id)} className="px-2 py-1 rounded-md text-[9px] font-bold" style={{
                background: sb.active === false ? 'var(--accent-10)' : 'rgba(253,224,71,0.1)',
                color: sb.active === false ? 'var(--accent)' : 'var(--gold)',
              }}>
                {sb.active === false ? 'RIATTIVA' : 'SOSPENDI'}
              </button>
              <button onClick={() => removeSubscription(sb.id)} className="p-1 text-red">
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* Extra incomes */}
      <Section title="Entrate extra" onAdd={() => { haptic('light'); setEiLbl(''); setEiAmt(''); setShowExtra(true); }} color="var(--accent)" delay={0.2}>
        {periodExtras.length === 0 ? (
          <EmptyMsg>Bonus, regali, vendite di questo mese</EmptyMsg>
        ) : periodExtras.map((e) => (
          <div key={e.id} className="flex justify-between items-center px-4 py-3 bg-glass rounded-xl border border-glass-bd mb-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">{e.label || 'Entrata extra'}</p>
              <p className="text-[10px] text-fg-4 mt-0.5">{new Date(e.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-[14px] font-semibold tnum', privacy && 'privacy-blur')} style={{ color: 'var(--accent)' }}>+€{$d(e.amount)}</span>
              <button onClick={() => { haptic('warning'); setExtraIncomes((p) => p.filter((x) => x.id !== e.id)); }} className="p-1 text-red">
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* Rollover */}
      <Card padding="md" className="col-span-full" delay={0.25}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(94,234,212,0.1)', border: '1px solid rgba(94,234,212,0.2)' }}>
            <RotateCcw size={14} className="text-teal" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Rollover automatico</p>
            <p className="text-[10px] text-fg-3 mt-0.5">Cosa fare con i soldi non spesi a fine mese</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[{ v: 'none', l: 'Niente' }, { v: 'buffer', l: '→ Buffer' }, ...dreams.map((d) => ({ v: d.id, l: `→ ${d.label}` }))].map((opt) => (
            <button
              key={opt.v}
              onClick={() => { haptic('light'); setRolloverTarget(opt.v); }}
              className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors"
              style={{
                background: rolloverTarget === opt.v ? 'rgba(94,234,212,0.12)' : 'var(--glass)',
                border: `1px solid ${rolloverTarget === opt.v ? 'rgba(94,234,212,0.25)' : 'var(--glass-bd)'}`,
                color: rolloverTarget === opt.v ? 'var(--teal)' : 'var(--fg-3)',
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </Card>

      {/* Smart allocation */}
      <div className="col-span-full">
        <div className="flex justify-between items-center px-1 mb-3 flex-wrap gap-2">
          <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Allocazione smart</p>
          <div className="flex gap-1.5 flex-wrap">
            {smartSuggestions && (
              <button
                onClick={() => { haptic('success'); setCats((p) => p.map((c) => ({ ...c, weight: smartSuggestions[c.id] ?? c.weight }))); }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider"
                style={{ background: 'rgba(103,232,249,0.1)', border: '1px solid rgba(103,232,249,0.25)', color: 'var(--info)' }}
              >
                ✦ BASATI SU TE
              </button>
            )}
            {cats.some((c) => c.suggested !== undefined && c.suggested !== c.weight) && (
              <button
                onClick={() => { haptic('success'); setCats((p) => p.map((c) => ({ ...c, weight: c.suggested !== undefined ? c.suggested : c.weight }))); }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider text-black"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))' }}
              >
                ✦ 50/30/20
              </button>
            )}
          </div>
        </div>
        {cats.map((cat, i) => {
          const tw = cats.reduce((a, c) => a + c.weight, 0) || 1;
          const catBudget = (freeBudget * cat.weight) / tw;
          return (
            <Card key={cat.id} padding="default" className="mb-2" delay={0.25 + i * 0.03}>
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}25` }}>
                    <DynIcon name={cat.icon} size={14} style={{ color: cat.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{cat.label}</p>
                    <p className={cn('text-[11px] font-semibold tnum', privacy && 'privacy-blur')} style={{ color: cat.color }}>€{$d(catBudget)}/mese</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-light tnum tracking-tight" style={{ color: cat.color }}>
                    {cat.weight}<span className="text-[13px] opacity-60">%</span>
                  </p>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={cat.weight}
                onChange={(e) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, weight: parseInt(e.target.value) || 0 } : c))}
                style={{ accentColor: cat.color }}
              />
            </Card>
          );
        })}
      </div>

      {/* Buffer */}
      <Card padding="md" className="col-span-full" delay={0.3}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(103,232,249,0.1)', border: '1px solid rgba(103,232,249,0.2)' }}>
              <Shield size={14} className="text-info" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">Safety buffer</p>
              <p className={cn('text-[11px] font-semibold tnum mt-0.5', privacy && 'privacy-blur')} style={{ color: 'var(--info)' }}>€{$n(bufferAmt)}/mese accantonati</p>
            </div>
          </div>
          <p className="text-[24px] font-light tnum" style={{ color: 'var(--info)' }}>
            {buffer}<span className="text-[14px] opacity-60">%</span>
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          value={buffer}
          onChange={(e) => setBuffer(parseInt(e.target.value) || 0)}
          style={{ accentColor: 'var(--info)' }}
        />
      </Card>

      {/* Dreams */}
      <Section title="Obiettivi di risparmio" onAdd={() => { haptic('light'); setDreams((p) => [...p, { id: uid(), label: 'Nuovo obiettivo', target: 1000, saved: 0, alloc: 0 }]); }} color="var(--purple)" delay={0.35}>
        {dreams.length === 0 ? (
          <EmptyMsg>Imposta i tuoi obiettivi di risparmio</EmptyMsg>
        ) : dreams.map((d) => {
          const pct = d.target > 0 ? (d.saved / d.target) * 100 : 0;
          const mo = d.alloc > 0 && d.saved < d.target ? Math.ceil((d.target - d.saved) / d.alloc) : null;
          return (
            <Card padding="default" className="mb-2" key={d.id}>
              <input
                className="inp"
                value={d.label}
                onChange={(e) => setDreams((p) => p.map((x) => x.id === d.id ? { ...x, label: e.target.value } : x))}
                style={{ fontSize: 15, fontWeight: 700, background: 'transparent', border: 'none', padding: 0, marginBottom: 12 }}
              />
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <span className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Obiettivo (€)</span>
                  <input className="inp" type="text" inputMode="decimal" value={d.target} onChange={(e) => setDreams((p) => p.map((x) => x.id === d.id ? { ...x, target: parseNum(e.target.value) } : x))} />
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Risparmiato (€)</span>
                  <input className="inp" type="text" inputMode="decimal" value={d.saved} onChange={(e) => setDreams((p) => p.map((x) => x.id === d.id ? { ...x, saved: parseNum(e.target.value) } : x))} />
                </div>
              </div>
              <div className="mb-3">
                <span className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Quota mensile (€)</span>
                <input className="inp" type="text" inputMode="decimal" value={d.alloc} onChange={(e) => setDreams((p) => p.map((x) => x.id === d.id ? { ...x, alloc: parseNum(e.target.value) } : x))} />
              </div>
              <div className="h-1.5 bg-glass rounded-full overflow-hidden mb-2">
                <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: 'linear-gradient(90deg, var(--purple), var(--pink))' }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold tnum text-fg-3">{Math.round(pct)}% completato</span>
                {mo && <span className="text-[11px] font-semibold" style={{ color: 'var(--purple)' }}>⏱ {mo > 12 ? `${Math.floor(mo/12)}a ${mo%12}m` : `${mo} mesi`}</span>}
                <button onClick={() => { haptic('warning'); setDreams((p) => p.filter((x) => x.id !== d.id)); }} className="text-[10px] text-red opacity-50">
                  Elimina
                </button>
              </div>
            </Card>
          );
        })}
      </Section>

      {/* Sheets */}
      <Sheet open={showFixed} onClose={() => setShowFixed(false)} title="Nuova spesa fissa">
        <div className="space-y-4">
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Nome</label>
            <input className="inp" placeholder="Affitto, bollette..." value={fLbl} onChange={(e) => setFLbl(e.target.value)} autoFocus /></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Importo (€)</label>
            <input className="inp" type="text" inputMode="decimal" value={fAmt} onChange={(e) => setFAmt(e.target.value)} /></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {[{ v: 'monthly', l: 'Mensile' }, { v: 'annual', l: 'Annuale' }].map((t) => (
                <button key={t.v} onClick={() => setFType(t.v)} className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-colors" style={{
                  background: fType === t.v ? 'var(--accent-10)' : 'var(--glass)',
                  border: `1px solid ${fType === t.v ? 'var(--accent-20)' : 'var(--glass-bd)'}`,
                  color: fType === t.v ? 'var(--accent)' : 'var(--fg-3)',
                }}>{t.l}</button>
              ))}
            </div></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Giorno addebito (1-28)</label>
            <input className="inp" type="number" min={1} max={28} value={fDay} onChange={(e) => setFDay(e.target.value)} /></div>
          {fType === 'annual' && <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Mese</label>
            <input className="inp" type="number" min={1} max={12} value={fMonth} onChange={(e) => setFMonth(e.target.value)} /></div>}
          <Button variant="primary" size="xl" className="w-full mt-2" onClick={() => {
            const a = parseNum(fAmt);
            if (fLbl && a > 0) {
              setFixed((p) => [...p, { id: uid(), label: fLbl, amount: a, type: fType, deductDay: parseInt(fDay) || 1, deductMonth: parseInt(fMonth) || 1 }]);
              setShowFixed(false);
            }
          }}>Aggiungi</Button>
        </div>
      </Sheet>

      <Sheet open={showSub} onClose={() => setShowSub(false)} title="Nuovo abbonamento">
        <div className="space-y-4">
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Nome</label>
            <input className="inp" placeholder="Netflix, Spotify..." value={sLbl} onChange={(e) => setSLbl(e.target.value)} autoFocus /></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Importo (€)</label>
            <input className="inp" type="text" inputMode="decimal" placeholder="9,99" value={sAmt} onChange={(e) => setSAmt(e.target.value)} /></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Giorno addebito (1-28)</label>
            <input className="inp" type="number" min={1} max={28} value={sDay} onChange={(e) => setSDay(e.target.value)} /></div>
          <Button variant="primary" size="xl" className="w-full mt-2" onClick={() => {
            const a = parseNum(sAmt);
            if (sLbl && a > 0) { addSubscription(sLbl, a, sDay); setShowSub(false); }
          }}>Aggiungi</Button>
        </div>
      </Sheet>

      <Sheet open={showExtra} onClose={() => setShowExtra(false)} title="Entrata extra">
        <div className="space-y-4">
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Importo (€)</label>
            <input className="inp" type="text" inputMode="decimal" placeholder="0,00" value={eiAmt} onChange={(e) => setEiAmt(e.target.value)} autoFocus
              style={{ fontSize: 28, padding: 18, textAlign: 'center', color: 'var(--accent)', fontWeight: 300 }} /></div>
          <div><label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-1.5">Descrizione</label>
            <input className="inp" placeholder="Bonus, regalo, vendita..." value={eiLbl} onChange={(e) => setEiLbl(e.target.value)} /></div>
          <Button variant="primary" size="xl" className="w-full mt-2" onClick={() => {
            const a = parseNum(eiAmt);
            if (a > 0) { addExtraIncome(a, eiLbl || 'Entrata extra'); setShowExtra(false); }
          }}>Registra</Button>
        </div>
      </Sheet>
    </div>
  );
};

const Section = ({ title, onAdd, color, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className="col-span-full"
  >
    <div className="flex justify-between items-center px-1 mb-2.5">
      <p className="text-[10px] uppercase tracking-widest text-fg-4 font-bold">{title}</p>
      <button
        onClick={onAdd}
        className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider"
        style={{ color: color || 'var(--accent)', background: `${color || 'var(--accent)'}15`, border: `1px solid ${color || 'var(--accent)'}25` }}
      >
        + AGGIUNGI
      </button>
    </div>
    {children}
  </motion.div>
);

const EmptyMsg = ({ children }) => (
  <p className="text-center text-fg-5 text-[12px] py-6">{children}</p>
);
