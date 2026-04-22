import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Lock, Check, Zap, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { parseNum } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

const steps = [
  { title: 'Il tuo denaro, finalmente chiaro.', key: 'welcome' },
  { title: 'Come ti chiami?', key: 'name' },
  { title: 'Quanto guadagni al mese?', key: 'salary' },
  { title: 'Quando ti arriva?', key: 'day' },
];

export const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', salary: '', day: '1', savings: '0' });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const canNext = () => {
    if (step === 1) return form.name.trim().length > 0;
    if (step === 2) return parseNum(form.salary) > 0;
    if (step === 3) return parseInt(form.day) >= 1 && parseInt(form.day) <= 28;
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    haptic('medium');
    if (step === steps.length - 1) {
      onDone({
        ...form,
        salary: parseNum(form.salary),
        day: parseInt(form.day) || 1,
        savings: parseNum(form.savings),
      });
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg overflow-hidden flex flex-col z-[9500]">
      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full animate-orb-float" style={{ top: '-15%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute rounded-full animate-orb-float" style={{ bottom: '-10%', right: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(103,232,249,0.08), transparent 70%)', filter: 'blur(80px)', animationDelay: '10s', animationDirection: 'reverse' }} />
      </div>
      <div className="noise" />

      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-8" style={{ paddingTop: 'max(32px, env(safe-area-inset-top))', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: i === step ? 40 : 20,
                  background: i <= step ? 'var(--ok)' : 'var(--fg-5)',
                  boxShadow: i === step ? '0 0 10px var(--accent-glow)' : 'none',
                }}
              />
            ))}
          </div>
          {step > 0 && (
            <button
              onClick={() => { haptic('light'); setStep(step - 1); }}
              className="text-xs text-fg-4 hover:text-fg-2 transition-colors"
            >
              ← Indietro
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && <WelcomeStep title={steps[0].title} />}
              {step === 1 && <NameStep form={form} f={f} next={next} />}
              {step === 2 && <SalaryStep form={form} f={f} next={next} />}
              {step === 3 && <DayStep form={form} f={f} next={next} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8">
          <Button
            variant="primary"
            size="xl"
            className="w-full"
            onClick={next}
            disabled={!canNext()}
            icon={step === steps.length - 1 ? <Sparkles size={16} /> : null}
          >
            {step === 0 ? 'Iniziamo' : step === steps.length - 1 ? 'Attiva AURA' : 'Continua'}
            {step !== steps.length - 1 && <ArrowRight size={16} />}
          </Button>
          {step === 0 && (
            <p className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-fg-4">
              <Lock size={11} /> Nessun account. Nessun server. Nessun problema.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const WelcomeStep = ({ title }) => (
  <>
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, delay: 0.1 }}
      className="relative w-52 h-52 mx-auto mb-8"
    >
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="c1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ok)" />
            <stop offset="100%" stopColor="var(--ok-dim)" />
          </linearGradient>
          <linearGradient id="c2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--info)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--info)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="c3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--pink)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--pink)" stopOpacity="0.3" />
          </linearGradient>
          <filter id="b1"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <circle cx="100" cy="100" r="65" fill="url(#c1)" opacity="0.15" filter="url(#b1)" />
        <g transform="translate(100 100)">
          <motion.g
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x="-52" y="-36" width="104" height="72" rx="14" fill="url(#c3)" opacity="0.7" transform="rotate(-8)" />
          </motion.g>
          <motion.g
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          >
            <rect x="-52" y="-36" width="104" height="72" rx="14" fill="url(#c2)" opacity="0.85" transform="rotate(-3)" />
          </motion.g>
          <motion.g
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          >
            <rect x="-52" y="-36" width="104" height="72" rx="14" fill="url(#c1)" />
            <rect x="-40" y="-20" width="20" height="14" rx="3" fill="rgba(0,0,0,0.3)" />
            <rect x="-40" y="12" width="40" height="3" rx="1.5" fill="rgba(0,0,0,0.3)" />
            <rect x="-40" y="20" width="28" height="3" rx="1.5" fill="rgba(0,0,0,0.2)" />
          </motion.g>
        </g>
        <motion.g
          transform="translate(160 40)"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <path d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill="var(--ok)" />
        </motion.g>
        <motion.g
          transform="translate(40 50)"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        >
          <path d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z" fill="var(--info)" />
        </motion.g>
      </svg>
    </motion.div>
    <p className="text-[11px] uppercase tracking-widest text-ok text-center font-semibold mb-3">Benvenuto in</p>
    <h1 className="font-hero text-[52px] text-center leading-[0.95] mb-4">
      Il tuo denaro,<br /><span className="font-medium text-gradient-ok">finalmente chiaro</span>
    </h1>
    <p className="text-[14px] text-fg-3 text-center leading-relaxed max-w-sm mx-auto">
      AURA è il tracker finanziario che non ti giudica. Solo chiarezza, design bello, e tutti i tuoi dati al sicuro sul tuo dispositivo.
    </p>
    <div className="grid grid-cols-2 gap-2 mt-8">
      {[
        { icon: Check, title: 'Zero costi', sub: 'Gratis per sempre', color: 'var(--ok)' },
        { icon: Zap, title: 'Istantaneo', sub: 'Nessun login', color: 'var(--info)' },
        { icon: Shield, title: '100% privato', sub: 'Dati solo locali', color: 'var(--purple)' },
        { icon: Sparkles, title: 'Smart', sub: 'Insights intelligenti', color: 'var(--pink)' },
      ].map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.08 }}
          className="p-3 bg-bg-2 border border-bd-1 rounded-2xl text-center"
        >
          <div className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ background: `${f.color}15` }}>
            <f.icon size={16} style={{ color: f.color }} />
          </div>
          <p className="text-xs font-semibold">{f.title}</p>
          <p className="text-[10px] text-fg-4 mt-0.5">{f.sub}</p>
        </motion.div>
      ))}
    </div>
  </>
);

const NameStep = ({ form, f, next }) => (
  <>
    <p className="text-[11px] uppercase tracking-widest text-ok font-semibold mb-3">Step 1 di 3</p>
    <h1 className="font-hero text-[44px] leading-[0.95] mb-3">
      Come ti chiami?
    </h1>
    <p className="text-[14px] text-fg-3 mb-8">Il nome che vedrai nel saluto.</p>
    <input
      className="inp"
      placeholder="Il tuo nome"
      value={form.name}
      onChange={f('name')}
      onKeyDown={(e) => e.key === 'Enter' && next()}
      autoFocus
      style={{ fontSize: 22, padding: '18px 20px' }}
    />
  </>
);

const SalaryStep = ({ form, f, next }) => (
  <>
    <p className="text-[11px] uppercase tracking-widest text-ok font-semibold mb-3">Step 2 di 3</p>
    <h1 className="font-hero text-[44px] leading-[0.95] mb-3">
      Il tuo <span className="font-medium text-gradient-ok">stipendio</span>
    </h1>
    <p className="text-[14px] text-fg-3 mb-8">Netto mensile, in euro.</p>
    <input
      className="inp"
      type="text"
      inputMode="decimal"
      placeholder="2.000"
      value={form.salary}
      onChange={f('salary')}
      onKeyDown={(e) => e.key === 'Enter' && next()}
      autoFocus
      style={{ fontSize: 36, padding: '20px 24px', textAlign: 'center', color: 'var(--ok)', fontWeight: 300 }}
    />
  </>
);

const DayStep = ({ form, f, next }) => (
  <>
    <p className="text-[11px] uppercase tracking-widest text-ok font-semibold mb-3">Step 3 di 3</p>
    <h1 className="font-hero text-[44px] leading-[0.95] mb-3">
      Giorno di reset
    </h1>
    <p className="text-[14px] text-fg-3 mb-8">Il giorno del mese in cui ti arriva lo stipendio (1-28).</p>
    <input
      className="inp"
      type="number"
      min={1}
      max={28}
      value={form.day}
      onChange={f('day')}
      onKeyDown={(e) => e.key === 'Enter' && next()}
      autoFocus
      style={{ fontSize: 36, padding: '20px 24px', textAlign: 'center' }}
    />
    <div className="mt-6">
      <label className="block text-[10px] uppercase tracking-widest text-fg-4 font-bold mb-2">Risparmi attuali (opzionale)</label>
      <input
        className="inp"
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={form.savings}
        onChange={f('savings')}
      />
    </div>
  </>
);
