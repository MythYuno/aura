import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, Shield, Zap, TrendingUp, Check, Brain } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Logo } from '../components/ui/Logo.jsx';
import { parseNum } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

const steps = [
  { key: 'welcome' },
  { key: 'name' },
  { key: 'salary' },
  { key: 'day' },
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
        name: form.name.trim(),
        salary: parseNum(form.salary),
        day: parseInt(form.day) || 1,
        savings: parseNum(form.savings),
      });
    } else {
      setStep(step + 1);
    }
  };

  const prev = () => { if (step > 0) { haptic('light'); setStep(step - 1); } };

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md mx-auto relative">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-8">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === step ? 28 : 4,
                background: i <= step ? 'var(--accent)' : 'var(--fg-5)',
                boxShadow: i === step ? '0 0 10px var(--accent-glow)' : 'none',
              }}
            />
          ))}
        </div>

        <div className="glass-card p-7 sm:p-9 rounded-[28px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20, filter: 'blur(6px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && <WelcomeStep />}
              {step === 1 && <NameStep value={form.name} onChange={f('name')} onNext={next} canNext={canNext()} />}
              {step === 2 && <SalaryStep value={form.salary} savings={form.savings} onChange={f('salary')} onSavingsChange={f('savings')} onNext={next} canNext={canNext()} />}
              {step === 3 && <DayStep value={form.day} onChange={f('day')} onNext={next} canNext={canNext()} />}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between mt-7 pt-5 border-t" style={{ borderColor: 'var(--glass-bd)' }}>
            {step > 0 ? (
              <button onClick={prev} className="text-[13px] font-semibold text-fg-3 hover:text-fg transition-colors">
                ← Indietro
              </button>
            ) : <span />}
            <Button variant="primary" size="lg" onClick={next} disabled={!canNext()} iconRight={<ArrowRight size={15} />}>
              {step === 0 ? 'Inizia' : step === steps.length - 1 ? 'Fatto' : 'Avanti'}
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-fg-4 mt-5 flex items-center justify-center gap-1.5">
          <Lock size={11} /> Zero cloud · dati sul tuo dispositivo
        </p>
      </div>
    </div>
  );
};

const WelcomeStep = () => (
  <>
    <div className="flex justify-center mb-5">
      <Logo size="lg" withText={false} />
    </div>
    <p className="text-[11px] uppercase tracking-[0.2em] text-accent text-center font-bold mb-3">Benvenuto in</p>
    <h1 className="text-center text-[40px] sm:text-[44px] font-semibold leading-[1] tracking-[-0.035em] mb-4">
      AURA
    </h1>
    <p className="text-center text-sm text-fg-2 leading-relaxed mb-4 max-w-sm mx-auto">
      Il tuo denaro, chiaro ogni giorno. Registri una spesa, AURA ti dice quanto puoi ancora permetterti.
    </p>
    <div
      className="mx-auto max-w-sm rounded-2xl p-3.5 mb-6 flex items-start gap-2.5"
      style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-20)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: 'var(--accent)' }}>
        <Brain size={16} className="text-black" />
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-2)' }}>
        <strong style={{ color: 'var(--accent)' }}>AURA impara da te.</strong> Più spese registri, più capisce le tue abitudini e ti suggerisce come distribuire il budget.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2.5">
      {[
        { icon: Shield, label: 'Privacy totale', sub: 'Zero cloud' },
        { icon: Zap, label: 'Veloce', sub: 'Spese in 3 tap' },
        { icon: TrendingUp, label: 'Si adatta a te', sub: 'Pattern locali' },
        { icon: Check, label: 'Gratis per sempre', sub: 'Open source' },
      ].map((it, i) => {
        const Ico = it.icon;
        return (
          <div key={i} className="glass rounded-xl p-3.5 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-10)' }}>
              <Ico size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[12px] font-semibold">{it.label}</p>
              <p className="text-[10px] text-fg-3 mt-0.5">{it.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  </>
);

const NameStep = ({ value, onChange, onNext, canNext }) => (
  <>
    <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold mb-3">Passo 1 di 3</p>
    <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] mb-3">
      Come ti chiami?
    </h1>
    <p className="text-sm text-fg-2 mb-6">Il nome che vedrai nel saluto ogni giorno.</p>
    <input
      className="inp text-lg py-4"
      value={value}
      onChange={onChange}
      onKeyDown={(e) => e.key === 'Enter' && canNext && onNext()}
      placeholder="Es. Simone"
      autoFocus
    />
  </>
);

const SalaryStep = ({ value, savings, onChange, onSavingsChange, onNext, canNext }) => (
  <>
    <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold mb-3">Passo 2 di 3</p>
    <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] mb-3">
      Quanto guadagni al mese?
    </h1>
    <p className="text-sm text-fg-2 mb-6">Stipendio netto. Serve solo a calcolare il budget.</p>
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-fg-3 mb-2">Stipendio netto</label>
        <div className="inp flex items-center gap-2 py-0 pr-4 pl-4">
          <span className="text-fg-3 font-semibold text-lg select-none">€</span>
          <input
            className="flex-1 bg-transparent border-none outline-none text-lg py-4 font-mono text-fg placeholder:text-fg-4"
            type="text"
            inputMode="decimal"
            value={value}
            onChange={onChange}
            onKeyDown={(e) => e.key === 'Enter' && canNext && onNext()}
            placeholder="1800"
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-fg-3 mb-2">Risparmi attuali (opzionale)</label>
        <div className="inp flex items-center gap-2 py-0 pr-4 pl-4">
          <span className="text-fg-3 font-semibold text-lg select-none">€</span>
          <input
            className="flex-1 bg-transparent border-none outline-none text-base py-3.5 font-mono text-fg placeholder:text-fg-4"
            type="text"
            inputMode="decimal"
            value={savings}
            onChange={onSavingsChange}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  </>
);

const DayStep = ({ value, onChange, onNext, canNext }) => {
  const handlePick = (day) => {
    onChange({ target: { value: String(day) } });
    haptic('light');
  };
  const current = parseInt(value) || 1;

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold mb-3">Passo 3 di 3</p>
      <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] mb-3">
        Quando arriva lo stipendio?
      </h1>
      <p className="text-sm text-fg-2 mb-5">Tocca il giorno del mese.</p>

      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
          const isSel = current === day;
          return (
            <button
              key={day}
              onClick={() => handlePick(day)}
              className="aspect-square rounded-xl text-sm font-semibold transition-all font-mono"
              style={{
                background: isSel ? 'var(--accent)' : 'var(--glass)',
                color: isSel ? '#000' : 'var(--fg-2)',
                border: `1px solid ${isSel ? 'var(--accent)' : 'var(--glass-bd)'}`,
                boxShadow: isSel ? '0 4px 16px var(--accent-glow)' : 'none',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[12px]" style={{ color: 'var(--fg-3)' }}>
        Il <strong style={{ color: 'var(--accent)' }}>{current}</strong> di ogni mese il budget si resetta
      </p>
    </>
  );
};
