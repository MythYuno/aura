import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/ui/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';
import {
  IcChevR, IcChevL, IcPlus, IcX, IcShield, IcSubscription, IcArrowIn,
  IcSalary, IcHome, IcBolt, IcDrop,
} from '../lib/icons.jsx';
import { parseNum, uid, $n } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

const monthName = (m) => ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'][(m - 1) % 12];

/**
 * Onboarding — 7 step "racconta-mi-tu" flow:
 *  1. Welcome
 *  2. Name
 *  3. Salary + reset day
 *  4. Monthly fixed expenses
 *  5. Annual expenses (auto-saving)
 *  6. Subscriptions
 *  7. Imprevisti % + summary
 */
export const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    salary: '',
    day: '27',
    fixed: [],
    annual: [],
    subscriptions: [],
    buffer: 10,
  });

  const total = 7;
  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  // Derived: how much is "free" with current inputs
  const salary = parseNum(form.salary);
  const fixedTotal = form.fixed.reduce((s, f) => s + parseNum(f.amount || 0), 0);
  const annualMonthly = form.annual.reduce((s, e) => s + parseNum(e.amount || 0) / 12, 0);
  const subsTotal = form.subscriptions.reduce((s, x) => s + parseNum(x.amount || 0), 0);
  const bufferAmt = (salary * form.buffer) / 100;
  const free = Math.max(0, salary - fixedTotal - annualMonthly - subsTotal - bufferAmt);

  const canNext = () => {
    if (step === 1) return form.name.trim().length > 0;
    if (step === 2) return salary > 0 && parseInt(form.day) >= 1 && parseInt(form.day) <= 28;
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    haptic('light');
    if (step === total - 1) {
      onDone({
        name: form.name.trim(),
        salary,
        day: parseInt(form.day),
        fixed: form.fixed.map((f) => ({
          id: uid(),
          label: f.label || 'Spesa fissa',
          amount: parseNum(f.amount),
          type: 'monthly',
          deductDay: 1,
        })),
        annualExpenses: form.annual.map((e) => ({
          id: uid(),
          label: e.label || 'Spesa annuale',
          amount: parseNum(e.amount),
          dueMonth: parseInt(e.dueMonth) || 1,
        })),
        subscriptions: form.subscriptions.map((s) => ({
          id: uid(),
          label: s.label || 'Abbonamento',
          amount: parseNum(s.amount),
          deductDay: 1,
          active: true,
        })),
        buffer: form.buffer,
      });
    } else {
      setStep(step + 1);
    }
  };
  const prev = () => { if (step > 0) { haptic('light'); setStep(step - 1); } };

  return (
    <div className="onb-shell">
      <div className="onb-card">
        <div className="onb-progress">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`seg ${i < step ? 'done' : i === step ? 'now' : ''}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && <Welcome />}
            {step === 1 && <NameStep value={form.name} onChange={(v) => update({ name: v })} onNext={next} />}
            {step === 2 && <SalaryStep value={form.salary} day={form.day} onChange={(v) => update({ salary: v })} onDayChange={(d) => update({ day: d })} />}
            {step === 3 && <FixedStep items={form.fixed} setItems={(x) => update({ fixed: x })} />}
            {step === 4 && <AnnualStep items={form.annual} setItems={(x) => update({ annual: x })} />}
            {step === 5 && <SubsStep items={form.subscriptions} setItems={(x) => update({ subscriptions: x })} />}
            {step === 6 && <BufferStep buffer={form.buffer} setBuffer={(b) => update({ buffer: b })} salary={salary} fixedTotal={fixedTotal} annualMonthly={annualMonthly} subsTotal={subsTotal} bufferAmt={bufferAmt} free={free} />}
          </motion.div>
        </AnimatePresence>

        <div className="onb-actions">
          {step > 0 ? (
            <button onClick={prev} className="onb-back">
              <IcChevL /> Indietro
            </button>
          ) : <span />}
          <Button variant="primary" size="lg" onClick={next} disabled={!canNext()}>
            {step === 0 ? 'Inizia' : step === total - 1 ? 'Inizia' : 'Avanti'}
            <IcChevR style={{ marginLeft: 4 }} />
          </Button>
        </div>
      </div>
      <p className="onb-foot">Zero cloud · dati sul tuo dispositivo</p>
    </div>
  );
};

// ───────── Steps ─────────

const Welcome = () => (
  <>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
      <Logo size="lg" withText={false} />
    </div>
    <p className="onb-step-label">Benvenuto in</p>
    <h1 className="onb-title">AURA</h1>
    <p className="onb-help" style={{ textAlign: 'center', marginTop: 12 }}>
      Una piccola app per capire dove vanno i tuoi soldi.
      Niente budget rigidi, niente notifiche: ti chiedo qualche dato all'inizio
      e poi imparo dalle tue spese.
    </p>
    <div className="onb-pillars">
      <div><strong>Privacy</strong><br/>tutto sul tuo dispositivo</div>
      <div><strong>Veloce</strong><br/>spesa in 2 tap</div>
      <div><strong>Impara</strong><br/>dai tuoi pattern</div>
    </div>
  </>
);

const NameStep = ({ value, onChange, onNext }) => (
  <>
    <p className="onb-step-label">1 di 6</p>
    <h1 className="onb-question">Come ti chiami?</h1>
    <p className="onb-help">Il nome che vedrai nel saluto ogni giorno.</p>
    <input
      className="onb-input lg"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onNext(); }}
      placeholder="Es. Marco"
      autoFocus
    />
  </>
);

const SalaryStep = ({ value, day, onChange, onDayChange }) => (
  <>
    <p className="onb-step-label">2 di 6</p>
    <h1 className="onb-question">Quanto guadagni al mese?</h1>
    <p className="onb-help">Stipendio netto. Se varia di mese in mese, mettine uno medio — potrai sempre rettificare.</p>
    <label className="onb-lbl">Stipendio netto</label>
    <div className="onb-input-prefix">
      <span>€</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="2000"
        autoFocus
      />
    </div>
    <label className="onb-lbl" style={{ marginTop: 16 }}>Giorno paga (intorno a)</label>
    <div className="onb-grid7">
      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
        const sel = parseInt(day) === d;
        return (
          <button
            key={d}
            onClick={() => { haptic('light'); onDayChange(String(d)); }}
            className={`onb-day ${sel ? 'sel' : ''}`}
          >
            {d}
          </button>
        );
      })}
    </div>
  </>
);

const FixedStep = ({ items, setItems }) => {
  const [open, setOpen] = useState(false);
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');

  const add = () => {
    if (!lbl || !amt) return;
    setItems([...items, { id: uid(), label: lbl, amount: amt }]);
    setLbl(''); setAmt(''); setOpen(false);
  };
  const remove = (id) => setItems(items.filter((i) => i.id !== id));
  const total = items.reduce((s, i) => s + parseNum(i.amount || 0), 0);

  return (
    <>
      <p className="onb-step-label">3 di 6 · Spese fisse</p>
      <h1 className="onb-question">Cosa paghi ogni mese?</h1>
      <p className="onb-help">Affitto, mutuo, bollette ricorrenti. Per le bollette variabili va bene una stima media — la rettifichi quando arriva.</p>

      {items.map((i) => (
        <div className="onb-item" key={i.id}>
          <span className="onb-item-ic" style={{ color: 'var(--info)' }}><IcHome /></span>
          <div className="onb-item-body">
            <div>{i.label}</div>
          </div>
          <div className="onb-item-amt">€{$n(i.amount)}</div>
          <button onClick={() => remove(i.id)} aria-label="Rimuovi" className="onb-item-x"><IcX /></button>
        </div>
      ))}

      {open ? (
        <div className="onb-add-form">
          <input className="onb-input" placeholder="Affitto, luce, …" value={lbl} onChange={(e) => setLbl(e.target.value)} autoFocus />
          <div className="onb-input-prefix" style={{ marginTop: 8 }}>
            <span>€</span>
            <input type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="650" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button variant="default" size="sm" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="primary" size="sm" onClick={add} disabled={!lbl || !amt}>Aggiungi</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="onb-add-btn">
          <IcPlus /> Aggiungi spesa fissa
        </button>
      )}

      {items.length > 0 && (
        <div className="onb-summary">
          <div className="lb">Totale fisse</div>
          <div className="vl">€{$n(total)}<span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 400 }}>/mese</span></div>
        </div>
      )}
    </>
  );
};

const AnnualStep = ({ items, setItems }) => {
  const [open, setOpen] = useState(false);
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');
  const [month, setMonth] = useState('1');

  const add = () => {
    if (!lbl || !amt) return;
    setItems([...items, { id: uid(), label: lbl, amount: amt, dueMonth: month }]);
    setLbl(''); setAmt(''); setMonth('1'); setOpen(false);
  };
  const remove = (id) => setItems(items.filter((i) => i.id !== id));
  const monthly = items.reduce((s, i) => s + parseNum(i.amount || 0) / 12, 0);

  return (
    <>
      <p className="onb-step-label">4 di 6 · Spese annuali</p>
      <h1 className="onb-question">Paghi qualcosa una volta l'anno?</h1>
      <p className="onb-help">Assicurazione, bollo, IMU, tasse. Ti accantono ogni mese 1/12: quando arriva la scadenza i soldi sono già pronti.</p>

      {items.map((i) => (
        <div className="onb-item" key={i.id}>
          <span className="onb-item-ic" style={{ color: 'var(--purple)' }}><IcShield /></span>
          <div className="onb-item-body">
            <div>{i.label}</div>
            <div className="onb-item-sub">€{$n(i.amount)} · scade a {monthName(parseInt(i.dueMonth))}</div>
          </div>
          <div className="onb-item-amt-small">
            €{$n(parseNum(i.amount) / 12)}<span>/mese</span>
          </div>
          <button onClick={() => remove(i.id)} aria-label="Rimuovi" className="onb-item-x"><IcX /></button>
        </div>
      ))}

      {open ? (
        <div className="onb-add-form">
          <input className="onb-input" placeholder="Assicurazione, bollo, IMU…" value={lbl} onChange={(e) => setLbl(e.target.value)} autoFocus />
          <div className="onb-input-prefix" style={{ marginTop: 8 }}>
            <span>€</span>
            <input type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="600" />
          </div>
          <select className="onb-input" style={{ marginTop: 8, appearance: 'menulist' }} value={month} onChange={(e) => setMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>scade a {monthName(i + 1)}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button variant="default" size="sm" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="primary" size="sm" onClick={add} disabled={!lbl || !amt}>Aggiungi</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="onb-add-btn">
          <IcPlus /> Aggiungi spesa annuale
        </button>
      )}

      {items.length > 0 && (
        <div className="onb-summary">
          <div className="lb">Da accantonare ogni mese</div>
          <div className="vl">€{$n(monthly)}<span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 400 }}>/mese</span></div>
          <div className="onb-summary-help">
            Quando arriva la scadenza, <strong style={{ color: 'var(--accent)' }}>i soldi sono già pronti</strong>.
          </div>
        </div>
      )}
    </>
  );
};

const SubsStep = ({ items, setItems }) => {
  const [open, setOpen] = useState(false);
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');

  const add = () => {
    if (!lbl || !amt) return;
    setItems([...items, { id: uid(), label: lbl, amount: amt }]);
    setLbl(''); setAmt(''); setOpen(false);
  };
  const remove = (id) => setItems(items.filter((i) => i.id !== id));
  const total = items.reduce((s, i) => s + parseNum(i.amount || 0), 0);

  return (
    <>
      <p className="onb-step-label">5 di 6 · Abbonamenti</p>
      <h1 className="onb-question">Quali abbonamenti hai?</h1>
      <p className="onb-help">Netflix, Spotify, palestra, iCloud, telefono… Li puoi sospendere o riattivare in qualsiasi momento.</p>

      {items.map((i) => (
        <div className="onb-item" key={i.id}>
          <span className="onb-item-ic" style={{ color: 'var(--pink)' }}><IcSubscription /></span>
          <div className="onb-item-body"><div>{i.label}</div></div>
          <div className="onb-item-amt">€{$n(i.amount)}<span style={{ fontSize: 9, color: 'var(--fg-3)', marginLeft: 4 }}>/mese</span></div>
          <button onClick={() => remove(i.id)} aria-label="Rimuovi" className="onb-item-x"><IcX /></button>
        </div>
      ))}

      {open ? (
        <div className="onb-add-form">
          <input className="onb-input" placeholder="Netflix, Spotify…" value={lbl} onChange={(e) => setLbl(e.target.value)} autoFocus />
          <div className="onb-input-prefix" style={{ marginTop: 8 }}>
            <span>€</span>
            <input type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="9,99" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button variant="default" size="sm" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="primary" size="sm" onClick={add} disabled={!lbl || !amt}>Aggiungi</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="onb-add-btn">
          <IcPlus /> Aggiungi abbonamento
        </button>
      )}

      {items.length > 0 && (
        <div className="onb-summary">
          <div className="lb">Totale abbonamenti</div>
          <div className="vl">€{$n(total)}<span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 400 }}>/mese</span></div>
        </div>
      )}
    </>
  );
};

const BufferStep = ({ buffer, setBuffer, salary, fixedTotal, annualMonthly, subsTotal, bufferAmt, free }) => (
  <>
    <p className="onb-step-label">6 di 6 · Imprevisti</p>
    <h1 className="onb-question">Quanto vuoi mettere da parte?</h1>
    <p className="onb-help">Una piccola % dello stipendio messa via per quando ne hai bisogno: dentista, frigorifero rotto, ecc.</p>

    <div className="onb-buffer-row">
      <span className="onb-buffer-pct">{buffer}<span style={{ fontSize: 16 }}>%</span></span>
      <input
        type="range"
        min="0"
        max="30"
        value={buffer}
        onChange={(e) => setBuffer(parseInt(e.target.value))}
        style={{ flex: 1 }}
      />
      <span className="onb-buffer-amt">€{$n(bufferAmt)}/mese</span>
    </div>

    <div className="onb-recap">
      <div className="onb-recap-row">
        <span>Stipendio</span><strong style={{ color: 'var(--accent)' }}>+€{$n(salary)}</strong>
      </div>
      <div className="onb-recap-row">
        <span>Spese fisse</span><strong>−€{$n(fixedTotal)}</strong>
      </div>
      <div className="onb-recap-row">
        <span>Annuali (1/12)</span><strong>−€{$n(annualMonthly)}</strong>
      </div>
      <div className="onb-recap-row">
        <span>Abbonamenti</span><strong>−€{$n(subsTotal)}</strong>
      </div>
      <div className="onb-recap-row">
        <span>Imprevisti {buffer}%</span><strong>−€{$n(bufferAmt)}</strong>
      </div>
      <div className="onb-recap-divider" />
      <div className="onb-recap-row final">
        <span>Ti restano</span><strong style={{ color: 'var(--info)' }}>€{$n(free)}/mese</strong>
      </div>
    </div>
  </>
);
