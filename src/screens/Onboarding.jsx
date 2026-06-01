import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/ui/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';
import { IcChevR, IcChevL } from '../lib/icons.jsx';
import { parseNum, uid, $n } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { parseBackupFile, applyBackup } from '../lib/backup.js';

const clamp28 = (d) => Math.min(28, Math.max(1, parseInt(d) || 1));

/**
 * Onboarding v6 (AURA 2.0) — TRE passi, un minuto.
 *
 * Filosofia: chiediamo solo ciò che serve alla cascata del calcolo.
 *   0. Benvenuto + nome
 *   1. Saldo reale nel conto            → currentBalance
 *   2. La paga (quanto · ogni quanto)   → incomes[0] (con cadenza/ancora)
 *   3. Da parte (cuscinetto + risparmio)→ cushion + monthlySavingsTarget
 *
 * Fissi, abbonamenti e annuali NON si chiedono più qui: l'app li rileva da
 * sola dalle spese (auto-ricorrenze) o si aggiungono dopo da Impostazioni.
 */
export const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    balance: '',
    payAmount: '',
    payDay: '27',
    payCadence: 'monthly',
    payAnchor: '',
    cushion: '',
    savings: '',
  });
  const total = 4; // welcome + 3 passi
  const update = (patch) => setForm((p) => ({ ...p, ...patch }));

  // v0.10.1: ripristino backup direttamente dal benvenuto (reinstallo/telefono nuovo).
  const fileRef = useRef(null);
  const [restoreErr, setRestoreErr] = useState(null);
  const onRestoreFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const parsed = parseBackupFile(ev.target.result);
        applyBackup(parsed.data);
        setTimeout(() => window.location.reload(), 100);
      } catch (err) {
        setRestoreErr(err?.message || 'File non valido');
        setTimeout(() => setRestoreErr(null), 4000);
      }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  const balance = parseNum(form.balance);
  const payAmount = parseNum(form.payAmount);
  const cushion = parseNum(form.cushion) || 0;
  const savings = parseNum(form.savings) || 0;

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return balance >= 0;
    if (step === 2) {
      if (!(payAmount > 0)) return true; // la paga si può saltare e aggiungere dopo
      return form.payCadence === 'monthly' || !!form.payAnchor;
    }
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    haptic('light');
    if (step < total - 1) { setStep(step + 1); return; }

    // SUBMIT — nuovo modello + campi legacy per le schermate non ancora riscritte.
    const legacySalary = payAmount > 0 ? payAmount : 0;
    onDone({
      name: form.name.trim(),
      currentBalance: balance >= 0 ? balance : 0,
      incomes: payAmount > 0 ? [{
        id: uid(),
        label: 'Stipendio',
        amount: payAmount,
        dayOfMonth: clamp28(form.payDay),
        kind: 'salary',
        active: true,
        ...(form.payCadence !== 'monthly' && form.payAnchor
          ? { cadence: form.payCadence, anchorTs: new Date(form.payAnchor + 'T00:00:00').getTime() }
          : {}),
      }] : [],
      cushion,
      monthlySavingsTarget: savings,
      // legacy (compatibilità)
      salary: legacySalary,
      day: clamp28(form.payDay),
      buffer: legacySalary > 0 ? Math.round((cushion / legacySalary) * 100) : 0,
      initialBalance: 0,
      fixed: [],
      annualExpenses: [],
      subscriptions: [],
    });
  };
  const prev = () => { if (step > 0) { haptic('light'); setStep(step - 1); } };

  return (
    <div className="onb-shell">
      <div className="onb-card">
        <div className="onb-progress">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`seg ${s < step ? 'done' : s === step ? 'now' : ''}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                  <Logo size="lg" withText={false} />
                </div>
                <p className="onb-step-label">Benvenuto in</p>
                <h1 className="onb-title">AURA</h1>
                <p className="onb-help" style={{ textAlign: 'center', marginTop: 12 }}>
                  Una sola domanda: <strong>quanto posso spendere serenamente oggi?</strong><br />
                  Tre passi, un minuto. Il resto lo imparo da solo, dalle tue spese.
                </p>
                <label className="onb-lbl" style={{ marginTop: 16 }}>Come ti chiami?</label>
                <input
                  className="onb-input lg"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && form.name.trim()) next(); }}
                  placeholder="Es. Marco"
                  autoFocus
                />
                <div className="onb-pillars">
                  <div><strong>Privacy</strong><br />tutto sul tuo telefono</div>
                  <div><strong>Onesta</strong><br />parte dal saldo vero</div>
                  <div><strong>Impara</strong><br />dalle tue abitudini</div>
                </div>
                {/* v0.10.1: telefono nuovo / reinstallo → riparti dal tuo backup */}
                <input ref={fileRef} type="file" accept=".json,application/json" onChange={onRestoreFile} style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => { haptic('light'); fileRef.current?.click(); }}
                  style={{
                    display: 'block', margin: '14px auto 0', background: 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12.5, fontWeight: 600, color: 'var(--accent-text, var(--accent))',
                  }}
                >
                  Hai già un backup? Ripristinalo
                </button>
                {restoreErr && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{restoreErr}</p>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <p className="onb-step-label">1 di 3 · Il punto di partenza</p>
                <h1 className="onb-question">Quanto hai nel conto adesso?</h1>
                <p className="onb-help">
                  Apri l'app della banca e scrivi <strong style={{ color: 'var(--accent)' }}>quanto vedi oggi</strong>.
                  È l'unica verità da cui parte ogni calcolo.
                </p>
                <label className="onb-lbl">Saldo disponibile oggi</label>
                <div className="onb-input-prefix">
                  <span>€</span>
                  <input
                    type="text" inputMode="decimal" value={form.balance}
                    onChange={(e) => update({ balance: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && balance >= 0) next(); }}
                    placeholder="1.247" autoFocus
                  />
                </div>
                <p className="onb-help" style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-3)' }}>
                  Più conti? Somma tutto. Se sbagli, si corregge in un tap.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <p className="onb-step-label">2 di 3 · Cosa entra</p>
                <h1 className="onb-question">Quando arriva la paga?</h1>
                <p className="onb-help">
                  Il budget si conta <strong>da oggi alla prossima paga</strong>, non sul mese.
                  Se ora non hai entrate regolari, salta pure.
                </p>
                <label className="onb-lbl">Quanto, ogni volta</label>
                <div className="onb-input-prefix">
                  <span>€</span>
                  <input
                    type="text" inputMode="decimal" value={form.payAmount}
                    onChange={(e) => update({ payAmount: e.target.value })}
                    placeholder="1.850" autoFocus
                  />
                </div>
                <label className="onb-lbl" style={{ marginTop: 14 }}>Ogni quanto arriva?</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['monthly', 'Mensile'], ['weekly', 'Ogni settimana'], ['biweekly', 'Ogni 2 sett.'], ['fourweekly', 'Ogni 4 sett.']].map(([v, l]) => (
                    <button key={v} onClick={() => { haptic('light'); update({ payCadence: v }); }} className={`onb-tag ${form.payCadence === v ? 'sel' : ''}`}>{l}</button>
                  ))}
                </div>
                {form.payCadence === 'monthly' ? (
                  <>
                    <label className="onb-lbl" style={{ marginTop: 14 }}>Giorno del mese</label>
                    <div className="onb-grid7">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <button
                          key={d}
                          onClick={() => { haptic('light'); update({ payDay: String(d) }); }}
                          className={`onb-day ${parseInt(form.payDay) === d ? 'sel' : ''}`}
                        >{d}</button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="onb-lbl" style={{ marginTop: 14 }}>Ultima paga ricevuta</label>
                    <input className="onb-input" type="date" value={form.payAnchor} onChange={(e) => update({ payAnchor: e.target.value })} />
                    <p className="onb-help" style={{ marginTop: 6, fontSize: 12 }}>Da quella data conto le prossime (es. ogni venerdì).</p>
                  </>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <p className="onb-step-label">3 di 3 · I soldi protetti</p>
                <h1 className="onb-question">Quanto vuoi mettere al sicuro?</h1>
                <p className="onb-help">
                  Due protezioni, entrambe facoltative: il <strong>cuscinetto</strong> (paracadute per
                  gli imprevisti) e il <strong style={{ color: 'var(--accent)' }}>risparmio del mese</strong> (quanto
                  vuoi far crescere, ogni mese). Non li conto mai come spendibili.
                </p>
                <label className="onb-lbl">Cuscinetto per imprevisti</label>
                <div className="onb-input-prefix">
                  <span>€</span>
                  <input
                    type="text" inputMode="decimal" value={form.cushion}
                    onChange={(e) => update({ cushion: e.target.value })}
                    placeholder="300" autoFocus
                  />
                </div>
                <label className="onb-lbl" style={{ marginTop: 14 }}>Da mettere via ogni mese</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[100, 200, 300, 500].map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => { haptic('light'); update({ savings: String(c) }); }}
                      className={`onb-tag ${savings === c ? 'sel' : ''}`}
                      style={{ flex: 1 }}
                    >€{c}</button>
                  ))}
                </div>
                <div className="onb-input-prefix">
                  <span>€</span>
                  <input
                    type="text" inputMode="decimal" value={form.savings}
                    onChange={(e) => update({ savings: e.target.value })}
                    placeholder="300"
                  />
                </div>
                {(balance > 0 || payAmount > 0) && (
                  <div className="onb-recap">
                    <div className="onb-recap-row"><span>Saldo nel conto</span><strong style={{ color: 'var(--accent)' }}>€{$n(balance)}</strong></div>
                    {payAmount > 0 && <div className="onb-recap-row"><span>Paga</span><strong style={{ color: 'var(--accent)' }}>+€{$n(payAmount)}</strong></div>}
                    {cushion > 0 && <div className="onb-recap-row"><span>Cuscinetto</span><strong>−€{$n(cushion)}</strong></div>}
                    {savings > 0 && <div className="onb-recap-row"><span>Risparmio / mese</span><strong>−€{$n(savings)}</strong></div>}
                    <div className="onb-recap-divider" />
                    <div className="onb-recap-row final">
                      <span>Spendibile (stima)</span>
                      <strong style={{ color: 'var(--info)' }}>~€{$n(Math.max(0, balance - cushion - savings))}</strong>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="onb-actions">
          {step > 0 ? (
            <button onClick={prev} className="onb-back"><IcChevL /> Indietro</button>
          ) : <span />}
          <Button variant="primary" size="lg" onClick={next} disabled={!canNext()}>
            {step === 0 ? 'Inizia' : step === total - 1 ? 'Vai' : 'Avanti'}
            <IcChevR style={{ marginLeft: 4 }} />
          </Button>
        </div>
      </div>
      <p className="onb-foot">Zero cloud · dati sul tuo dispositivo</p>
    </div>
  );
};
