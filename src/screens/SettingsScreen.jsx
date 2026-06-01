import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/Button.jsx';
import { Confirm } from '../components/ui/Confirm.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import {
  IcChevR, IcCheck, IcX, IcPlus, IcEdit, IcEye, IcEyeOff, IcSalary, IcHome,
  IcShield, IcSubscription, IcSparkle, IcClock, IcArrowIn,
  IcUser, IcWallet, IcCard, IcSun, IcDownload, IcUpload, IcFile, IcFileDown, IcReset, IcTrash, IcOther,
  IcMic,
} from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { RecurringSheet as PagamentiSheet } from '../components/RecurringSheet.jsx';
import { parseNum, uid, $n, maskedMoney, monthlyEq, CADENCE_LABEL, CADENCE_LIST, round2 } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { exportBackup, parseBackupFile, applyBackup } from '../lib/backup.js';
import { useToast } from '../hooks/useUndoToast.js';
import { availableColors } from '../data/categories.js';
import { notificationStatus, requestNotificationPermission } from '../lib/notifications.js';
import { detectRecurring } from '../lib/intelligence.js';
import { CURRENT_VERSION, IS_BETA } from '../data/changelog.js';

/**
 * Setup (v5 · Headspace style).
 * 5a tab nella tab bar (non piu sheet). Gruppi card con tap-row impilate,
 * ognuna apre uno sheet con la funzionalita relativa.
 *
 * Sezioni:
 *   • Identità        nome
 *   • I tuoi soldi    saldo · entrate · pagamenti fissi · categorie
 *   • Aspetto         tema · privacy
 *   • Promemoria      notifiche scadenze
 *   • Dati            backup
 *   • Avanzate        reset (danger)
 */
export const SettingsScreen = ({ store, onReset, onClose }) => {
  const toast = useToast();
  const {
    name, setName,
    // balance-first
    currentBalance, setCurrentBalance,
    cushion, setCushion,
    incomes, addIncome, removeIncome, toggleIncome,
    // legacy
    salary, setSalary, resetDay, setResetDay,
    // v0.17: la lista unica dei pagamenti che si ripetono
    recurring: recurringList, addRecurring, updateRecurring, removeRecurring, toggleRecurring, recurringMonthly,
    addSubscription,
    cats, setCats, catRules, addCatRule, removeCatRule,
    theme, setTheme, privacy, setPrivacy,
    txs,
    // v0.14: ripartenza pulita (azzera storico, tiene la configurazione)
    restartFresh,
  } = store;

  // Ricorrenze RILEVATE dall'algoritmo guardando le spese (cap. B) — da non
  // confondere con `recurringList`, che è la lista inserita dall'utente.
  const detected = useMemo(() => detectRecurring(txs), [txs]);

  // Quale sezione è aperta come sheet
  const [openSheet, setOpenSheet] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // v0.14: "Ricomincia da capo" — sheet + saldo di ripartenza
  const [showRestart, setShowRestart] = useState(false);
  const [restartBalance, setRestartBalance] = useState('');
  const [backupPreview, setBackupPreview] = useState(null);
  const [backupError, setBackupError] = useState(null);
  const backupInputRef = useRef(null);

  // Status notifiche browser — si aggiorna al focus della tab
  const [notifStatus, setNotifStatus] = useState(notificationStatus());
  useEffect(() => {
    const onFocus = () => setNotifStatus(notificationStatus());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const askNotifPermission = async () => {
    haptic('light');
    const res = await requestNotificationPermission();
    setNotifStatus(res);
    if (res === 'granted') toast?.show?.('Notifiche attive · ti avviso 3 giorni prima', null);
    else if (res === 'denied') toast?.show?.('Permesso negato · attivale dal browser', null);
  };

  const handleBackupUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try { setBackupPreview(parseBackupFile(ev.target.result)); setBackupError(null); }
      catch (err) { setBackupError(err.message); setTimeout(() => setBackupError(null), 4000); }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400,
        letterSpacing: '-.02em', marginBottom: 4, color: 'var(--fg)',
      }}>
        Impostazioni
      </h1>
      <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 24 }}>
        AURA {CURRENT_VERSION}{IS_BETA ? ' · beta' : ''} · tutto resta sul tuo dispositivo
      </p>

      {/* v0.9.3: promemoria backup gentile (l'app non ha cloud) */}
      {store.needsBackup && (
        <button
          type="button"
          className="balance-nudge"
          onClick={() => { haptic('medium'); exportBackup(); store.markBackup?.(); toast?.show?.('Backup scaricato · al sicuro', null); }}
        >
          <span className="balance-nudge-ic">
            <IcDownload width="16" height="16" />
          </span>
          <span className="balance-nudge-body">
            <strong>Fai un backup</strong>{' '}
            {store.lastBackup ? `· sono passati ${store.daysSinceBackup} giorni` : '· non l\'hai mai fatto'}. I tuoi dati vivono solo qui: mettili al sicuro in un file.
          </span>
          <span className="balance-nudge-cta">Esporta</span>
        </button>
      )}

      {/* IDENTITÀ */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">Identità</div>
        <div className="hs-set-list">
          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('name'); }}>
            <span className="ic">
              <IcUser />
            </span>
            <div className="body">
              <div className="t">Il tuo nome</div>
              <div className="s">{name || 'non impostato'}</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>
        </div>
      </div>

      {/* I TUOI SOLDI */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">I tuoi soldi</div>
        <div className="hs-set-list">
          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('balance'); }}>
            <span className="ic">
              <IcWallet />
            </span>
            <div className="body">
              <div className="t">Saldo & cuscinetto</div>
              <div className="s">€{$n(currentBalance || 0)} · riserva €{$n(cushion || 0)}</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>


          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('incomes'); }}>
            <span className="ic"><IcSalary /></span>
            <div className="body">
              <div className="t">Entrate ricorrenti</div>
              <div className="s">{incomes.length} {incomes.length === 1 ? 'voce' : 'voci'} · €{$n(incomes.reduce((s, i) => s + (i.amount || 0) * ({ weekly: 30.44 / 7, biweekly: 30.44 / 14, fourweekly: 30.44 / 28 }[i.cadence] || 1), 0))}/mese</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          {/* v0.17: una riga sola al posto di Spese fisse + Abbonamenti + Spese annuali. */}
          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('pagamenti'); }}>
            <span className="ic"><IcSubscription /></span>
            <div className="body">
              <div className="t">Pagamenti fissi</div>
              <div className="s">
                {recurringList.length === 0
                  ? 'Affitto, bollette, abbonamenti, assicurazione…'
                  : `${recurringList.length} ${recurringList.length === 1 ? 'voce' : 'voci'} · €${$n(recurringMonthly)}/mese`}
              </div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('cats'); }}>
            <span className="ic">
              <IcOther />
            </span>
            <div className="body">
              <div className="t">Categorie</div>
              <div className="s">
                {cats.length} categorie
                {catRules.length > 0 && ` · ${catRules.length} ${catRules.length === 1 ? 'cosa imparata' : 'cose imparate'}`}
              </div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          {detected.length > 0 && (
            <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('recurring'); }}>
              <span className="ic"><IcSparkle /></span>
              <div className="body">
                <div className="t">Ricorrenze rilevate</div>
                <div className="s">{detected.length} di spesa ripetuta</div>
              </div>
              <span className="chev"><IcChevR /></span>
            </button>
          )}
        </div>
      </div>

      {/* ASPETTO */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">Aspetto</div>
        <div className="hs-set-list">
          <div className="hs-set-row" style={{ cursor: 'default' }}>
            <span className="ic">
              <IcSun />
            </span>
            <div className="body">
              <div className="t">Tema</div>
              <div className="s">{theme === 'light' ? 'Sempre chiaro' : theme === 'dark' ? 'Sempre scuro' : 'Come il telefono'}</div>
            </div>
            <div role="radiogroup" style={{ display: 'flex', gap: 4, background: 'var(--glass2)', padding: 3, borderRadius: 10 }}>
              {[{ id: 'auto', label: 'Auto' }, { id: 'light', label: 'Chiaro' }, { id: 'dark', label: 'Scuro' }].map((m) => {
                const sel = theme === m.id;
                return (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={sel}
                    onClick={() => { haptic('light'); setTheme(m.id); }}
                    style={{
                      padding: '5px 9px', borderRadius: 7,
                      fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
                      background: sel ? 'var(--accent-10)' : 'transparent',
                      color: sel ? 'var(--accent)' : 'var(--fg-3)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >{m.label}</button>
                );
              })}
            </div>
          </div>

          <button
            className="hs-set-row"
            onClick={() => { haptic('light'); setPrivacy(!privacy); }}
          >
            <span className="ic">{privacy ? <IcEyeOff /> : <IcEye />}</span>
            <div className="body">
              <div className="t">Privacy</div>
              <div className="s">Nascondi importi nelle schermate</div>
            </div>
            <span className="v">{privacy ? 'attivo' : 'spento'}</span>
          </button>
        </div>
      </div>

      {/* PROMEMORIA */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">Promemoria</div>
        <div className="hs-set-list">
          <button
            className="hs-set-row"
            onClick={notifStatus === 'granted' ? undefined : askNotifPermission}
            style={{ cursor: notifStatus === 'granted' ? 'default' : 'pointer' }}
          >
            <span className="ic"><IcClock /></span>
            <div className="body">
              <div className="t">Notifiche scadenze</div>
              <div className="s">
                {notifStatus === 'granted' && 'Attive · ti avviso 3 giorni prima'}
                {notifStatus === 'denied' && 'Permesso negato · attivale dal browser'}
                {notifStatus === 'default' && 'Tap per attivare'}
                {notifStatus === 'unsupported' && 'Non supportato da questo browser'}
              </div>
            </div>
            <span className="v">
              {notifStatus === 'granted' ? 'attive' : notifStatus === 'denied' ? 'negate' : notifStatus === 'unsupported' ? '—' : 'tap'}
            </span>
          </button>

          {/* v0.18: la scorciatoia Siri esisteva già nel codice (l'app accetta
              comandi via URL) ma non era scritta da nessuna parte. */}
          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('siri'); }}>
            <span className="ic"><IcMic /></span>
            <div className="body">
              <div className="t">Segna una spesa con Siri</div>
              <div className="s">Senza aprire l'app · si prepara una volta sola</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>
        </div>
      </div>

      {/* DATI */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">Dati</div>
        <div className="hs-set-list">
          <button className="hs-set-row" onClick={() => { haptic('medium'); exportBackup(); store.markBackup?.(); toast?.show?.('Backup scaricato · al sicuro', null); }}>
            <span className="ic" style={store.needsBackup ? { color: 'var(--accent)' } : undefined}>
              <IcDownload />
            </span>
            <div className="body">
              <div className="t">
                Esporta backup
                {store.needsBackup && (
                  <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent-on-solid)', background: 'var(--accent)', padding: '2px 6px', borderRadius: 5, verticalAlign: 'middle' }}>consigliato</span>
                )}
              </div>
              <div className="s">
                {store.lastBackup
                  ? `Ultimo backup ${store.daysSinceBackup === 0 ? 'oggi' : store.daysSinceBackup === 1 ? 'ieri' : `${store.daysSinceBackup} giorni fa`}`
                  : 'Mai fatto · salva i tuoi dati in un file'}
              </div>
            </div>
          </button>

          <button className="hs-set-row" onClick={() => backupInputRef.current?.click()}>
            <span className="ic">
              <IcUpload />
            </span>
            <div className="body">
              <div className="t">Ripristina da backup</div>
              <div className="s">Sostituisce tutti i dati attuali</div>
            </div>
            <input type="file" ref={backupInputRef} hidden accept=".json,application/json" onChange={handleBackupUpload} />
          </button>




        </div>
      </div>

      {/* AVANZATE */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">Avanzate</div>
        <div className="hs-set-list">
          {/* v0.14: ripartenza pulita — azzera lo storico, TIENE la configurazione */}
          <button className="hs-set-row" onClick={() => { haptic('light'); setRestartBalance(''); setShowRestart(true); }}>
            <span className="ic"><IcReset /></span>
            <div className="body">
              <div className="t">Ricomincia da capo</div>
              <div className="s">Azzera spese e storico · tiene entrate, fissi e categorie</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>
          <button className="hs-set-row danger" onClick={() => { haptic('warning'); setConfirmReset(true); }}>
            <span className="ic">
              <IcTrash />
            </span>
            <div className="body">
              <div className="t">Cancella tutti i dati</div>
              <div className="s">Riporta AURA come appena installata</div>
            </div>
          </button>
        </div>
      </div>

      {backupError && (
        <div style={{
          padding: 12, borderRadius: 10, background: 'rgba(248,113,113,.1)',
          color: 'var(--red)', fontSize: 12, fontWeight: 600, marginTop: 12,
        }}>{backupError}</div>
      )}

      {/* ═════ SHEETS ═════ */}

      {/* Nome */}
      <Sheet open={openSheet === 'name'} onClose={() => setOpenSheet(null)} title="Il tuo nome">
        <label className="qa-lbl">Come ti chiami</label>
        <input className="qa-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 18 }} onClick={() => setOpenSheet(null)}>OK</Button>
      </Sheet>

      {/* Saldo & cuscinetto */}
      <BalanceSheet
        open={openSheet === 'balance'} onClose={() => setOpenSheet(null)}
        currentBalance={currentBalance} setCurrentBalance={setCurrentBalance}
        cushion={cushion} setCushion={setCushion}
        markBalanceUpdated={store.markBalanceUpdated}
      />

      {/* Entrate ricorrenti */}
      <IncomesSheet
        open={openSheet === 'incomes'} onClose={() => setOpenSheet(null)}
        incomes={incomes} addIncome={addIncome} removeIncome={removeIncome} toggleIncome={toggleIncome}
      />

      {/* v0.18: come dettare una spesa a Siri */}
      <SiriSheet open={openSheet === 'siri'} onClose={() => setOpenSheet(null)} toast={toast} />

      {/* v0.17: pagamenti fissi — la lista unica */}
      <PagamentiSheet
        open={openSheet === 'pagamenti'} onClose={() => setOpenSheet(null)}
        recurring={recurringList} addRecurring={addRecurring} updateRecurring={updateRecurring}
        removeRecurring={removeRecurring} toggleRecurring={toggleRecurring}
      />

      {/* Categorie */}
      <CatsSheet
        open={openSheet === 'cats'} onClose={() => setOpenSheet(null)}
        cats={cats} setCats={setCats} catRules={catRules} removeCatRule={removeCatRule}
      />

      {/* Backup preview */}
      <Sheet open={!!backupPreview} onClose={() => setBackupPreview(null)} title="Ripristina backup">
        {backupPreview && (
          <>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 14 }}>
              Backup del <strong>{backupPreview.data.exportedAt ? new Date(backupPreview.data.exportedAt).toLocaleDateString('it-IT') : '?'}</strong>.
              Contiene <strong>{backupPreview.data.txs?.length || 0}</strong> transazioni.
            </p>
            <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 18 }}>
              ⚠ Tutti i dati attuali verranno sostituiti.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="default" size="lg" className="flex-1" onClick={() => setBackupPreview(null)}>Annulla</Button>
              <Button variant="danger" size="lg" className="flex-1" onClick={() => {
                applyBackup(backupPreview.data); setBackupPreview(null);
                setTimeout(() => window.location.reload(), 100);
              }}>Ripristina</Button>
            </div>
          </>
        )}
      </Sheet>


      {/* Ricorrenze rilevate */}
      <RecurringSheet
        open={openSheet === 'recurring'}
        onClose={() => setOpenSheet(null)}
        patterns={detected}
        cats={cats}
        addCatRule={addCatRule}
        addSubscription={addSubscription}
        toast={toast}
      />

      {/* Conti & tasche (v0.9.3: Principale = saldo app) */}


      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onReset}
        title="Cancellare tutto?"
        msg="Spariranno tutte le spese, le impostazioni e i desideri. Non si torna indietro."
      />

      {/* v0.14: Ricomincia da capo — la ripartenza pulita di chi torna dopo mesi */}
      <Sheet open={showRestart} onClose={() => setShowRestart(false)} title="Ricomincia da capo">
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.55 }}>
          Riparti pulito senza riconfigurare niente. Dimmi solo quanto hai
          <strong> in conto adesso</strong>.
        </p>

        <div className="restart-box">
          <div className="rb-line keep">
            <span className="k">Restano</span>
            <span className="v">entrate, spese fisse, abbonamenti, categorie, cuscinetto e obiettivo di risparmio</span>
          </div>
          <div className="rb-line drop">
            <span className="k">Si azzerano</span>
            <span className="v">tutte le spese registrate, lo storico e i soldi messi da parte negli obiettivi</span>
          </div>
        </div>

        <label className="qa-lbl" style={{ marginTop: 16 }}>Saldo nel conto adesso</label>
        <input
          type="text"
          inputMode="decimal"
          className="qa-input"
          value={restartBalance}
          onChange={(e) => setRestartBalance(e.target.value)}
          placeholder="1.250"
        />
        <p style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 8, lineHeight: 1.5 }}>
          Consiglio: prima di ricominciare, fai un backup dalla sezione Backup —
          ci vuole un secondo e ti tieni lo storico.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button variant="default" size="lg" className="flex-1" onClick={() => setShowRestart(false)}>Annulla</Button>
          <Button
            variant="primary" size="lg" className="flex-1"
            disabled={parseNum(restartBalance) < 0 || restartBalance.trim() === ''}
            onClick={() => {
              restartFresh(restartBalance);
              setShowRestart(false);
              toast?.show?.('Ripartenza pulita · buon rientro', null);
            }}
          >Ricomincia</Button>
        </div>
      </Sheet>
    </div>
  );
};

// ─── Sheet: Saldo & cuscinetto ────────────────────────────────────
const BalanceSheet = ({ open, onClose, currentBalance, setCurrentBalance, cushion, setCushion, markBalanceUpdated }) => {
  const [bal, setBal] = useState(String(currentBalance || ''));
  const [cu, setCu] = useState(String(cushion || ''));
  useEffect(() => { if (open) { setBal(String(currentBalance || '')); setCu(String(cushion || '')); } }, [open, currentBalance, cushion]);
  const save = () => {
    setCurrentBalance(round2(parseNum(bal)));
    setCushion(round2(Math.max(0, parseNum(cu))));
    // v0.8.2: marca l'aggiornamento manuale → spegne il promemoria post-paga
    markBalanceUpdated?.();
    haptic('success');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Saldo & cuscinetto">
      <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14, lineHeight: 1.55 }}>
        Aggiorna ogni tanto il saldo per tenere il calcolo onesto. Il cuscinetto è quello che <strong>non vuoi toccare</strong>.
      </p>
      <label className="qa-lbl">Saldo nel conto adesso</label>
      <input className="qa-input" type="text" inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value)} />
      <label className="qa-lbl" style={{ marginTop: 14 }}>Cuscinetto intoccabile</label>
      <input className="qa-input" type="text" inputMode="decimal" value={cu} onChange={(e) => setCu(e.target.value)} />
      <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 18 }} onClick={save}>Salva</Button>
    </Sheet>
  );
};

// ─── Sheet: Entrate ricorrenti ────────────────────────────────────
// v0.9.25: etichetta cadenza per la lista voci ("ogni settimana", "il 27…").
const incomeCadLabel = (i) =>
  i.cadence === 'weekly' ? 'ogni settimana'
  : i.cadence === 'biweekly' ? 'ogni 2 settimane'
  : i.cadence === 'fourweekly' ? 'ogni 4 settimane'
  : `il ${i.dayOfMonth} di ogni mese`;

const IncomesSheet = ({ open, onClose, incomes, addIncome, removeIncome, toggleIncome }) => {
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');
  const [day, setDay] = useState('27');
  const [kind, setKind] = useState('salary');
  // v0.9.25: cadenza ('monthly' default) + data ancora per le non-mensili
  const [cadence, setCadence] = useState('monthly');
  const [anchor, setAnchor] = useState('');
  const canAdd = !!lbl && !!amt && (cadence === 'monthly' || !!anchor);
  const submit = () => {
    if (!canAdd) return;
    const extra = cadence !== 'monthly'
      ? { cadence, anchorTs: new Date(anchor + 'T00:00:00').getTime() }
      : {};
    addIncome(lbl, amt, day, kind, extra);
    setLbl(''); setAmt('');
  };
  return (
    <Sheet open={open} onClose={onClose} title="Entrate ricorrenti">
      {incomes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {incomes.map((i) => (
            <div key={i.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', marginBottom: 6,
              background: 'var(--glass)', borderRadius: 12,
              border: '1px solid var(--glass-bd)',
              opacity: i.active === false ? 0.5 : 1,
            }}>
              <span style={{ color: 'var(--accent)' }}>
                {i.kind === 'salary' ? <IcSalary /> : <IcArrowIn />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{i.label}</div>
                <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 1 }}>{incomeCadLabel(i)}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>+€{$n(i.amount)}</span>
              <button onClick={() => toggleIncome(i.id)} title={i.active === false ? 'Attiva' : 'Sospendi'} style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 11 }}>
                {i.active === false ? <IcCheck width="14" height="14" /> : <IcEyeOff width="14" height="14" />}
              </button>
              <button onClick={() => removeIncome(i.id)} aria-label="Rimuovi" style={{ background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }}>
                <IcX width="14" height="14" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="onb-add-form">
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={() => { setKind('salary'); setLbl('Stipendio'); }} className={`onb-tag ${kind === 'salary' ? 'sel' : ''}`}>Stipendio</button>
          <button onClick={() => { setKind('extra'); setLbl(''); }} className={`onb-tag ${kind === 'extra' ? 'sel' : ''}`}>Altra</button>
        </div>
        <input className="qa-input" placeholder={kind === 'salary' ? 'Stipendio' : 'Freelance, affitto…'} value={lbl} onChange={(e) => setLbl(e.target.value)} />
        <input className="qa-input" style={{ marginTop: 8 }} type="text" inputMode="decimal" placeholder="1.850" value={amt} onChange={(e) => setAmt(e.target.value)} />

        {/* v0.9.25: cadenza — non tutti sono pagati a data fissa del mese */}
        <label className="qa-lbl" style={{ marginTop: 12 }}>Ogni quanto arriva?</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['monthly', 'Mensile'], ['weekly', 'Ogni settimana'], ['biweekly', 'Ogni 2 sett.'], ['fourweekly', 'Ogni 4 sett.']].map(([v, l]) => (
            <button key={v} onClick={() => { haptic('light'); setCadence(v); }} className={`onb-tag ${cadence === v ? 'sel' : ''}`}>{l}</button>
          ))}
        </div>

        {cadence === 'monthly' ? (
          <>
            <label className="qa-lbl" style={{ marginTop: 12 }}>Giorno del mese (1–28)</label>
            <input className="qa-input" type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} />
          </>
        ) : (
          <>
            <label className="qa-lbl" style={{ marginTop: 12 }}>Ultima paga ricevuta</label>
            <input className="qa-input" type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 6, lineHeight: 1.4 }}>
              Da quella data conto le prossime (es. ogni venerdì). Le previsioni si aggiornano da sole.
            </p>
          </>
        )}

        <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 12 }} onClick={submit} disabled={!canAdd}>
          <IcPlus /> Aggiungi
        </Button>
      </div>
    </Sheet>
  );
};

// ─── Sheet: Fissi ─────────────────────────────────────────────────

// ─── Sheet: Abbonamenti ───────────────────────────────────────────
// v0.8.1: refactor UX.
//  - Cadenza variabile (settimanale → annuale) via chip selector
//  - Day picker grafico (chip 1-28) invece di input number
//  - Preset abbonamenti famosi per quick-add
//  - Preview impatto in tempo reale "€X/mese equivalenti"
const SUBSCRIPTION_PRESETS = [
  { label: 'Netflix', amount: 12.99, cadence: 'monthly' },
  { label: 'Spotify', amount: 10.99, cadence: 'monthly' },
  { label: 'Disney+', amount: 9.99, cadence: 'monthly' },
  { label: 'Prime', amount: 49.90, cadence: 'annual' },
  { label: 'YouTube Premium', amount: 11.99, cadence: 'monthly' },
  { label: 'Apple One', amount: 19.95, cadence: 'monthly' },
  { label: 'iCloud+', amount: 2.99, cadence: 'monthly' },
];

const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const MONTHS_LONG = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];


// ─── Day chip picker (1-28) ──────────────────────────────────────
// v0.8.1: alternativa grafica a input type="number". 7 chip per riga,
// 4 righe, tap = selezione. Ovvio visivamente, comodo su mobile.
const DayChipPicker = ({ value, onChange }) => {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 4,
    }}>
      {days.map((d) => {
        const sel = +value === d;
        return (
          <button
            key={d}
            type="button"
            onClick={() => { haptic('light'); onChange(d); }}
            style={{
              aspectRatio: '1',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: sel ? 'var(--accent)' : 'var(--glass)',
              border: sel ? '1px solid var(--accent)' : '1px solid var(--glass-bd)',
              color: sel ? 'var(--accent-on-solid)' : 'var(--fg-2)',
              cursor: 'pointer',
              fontFamily: 'Geist Mono, monospace',
              transition: 'transform 0.12s var(--ease-back), background 0.18s var(--ease)',
              boxShadow: sel ? '0 4px 12px var(--accent-glow)' : 'none',
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
};

// ─── Sheet: Annuali ───────────────────────────────────────────────
// v0.8.1: refactor AnnualSheet con preset, month picker grafico, preview impatto.
const ANNUAL_PRESETS = [
  { label: 'Assicurazione auto', amount: 600, dueMonth: 5 },
  { label: 'Bollo auto', amount: 200, dueMonth: 4 },
  { label: 'RC famiglia', amount: 150, dueMonth: 1 },
  { label: 'IMU', amount: 400, dueMonth: 6 },
  { label: 'TARI', amount: 250, dueMonth: 9 },
  { label: 'Canone TV', amount: 90, dueMonth: 1 },
  { label: 'Antivirus PC', amount: 40, dueMonth: 11 },
];


// ─── Month chip picker (12 mesi, 4×3) ─────────────────────────────
// v0.8.1: alternativa grafica al <select>. Tap = scelta, grid 4×3.
const MonthChipPicker = ({ value, onChange, labels }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 4,
    }}>
      {labels.map((m, i) => {
        const monthValue = i + 1;
        const sel = +value === monthValue;
        return (
          <button
            key={monthValue}
            type="button"
            onClick={() => { haptic('light'); onChange(monthValue); }}
            style={{
              padding: '10px 6px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: sel ? 'var(--accent)' : 'var(--glass)',
              border: sel ? '1px solid var(--accent)' : '1px solid var(--glass-bd)',
              color: sel ? 'var(--accent-on-solid)' : 'var(--fg-2)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textTransform: 'capitalize',
              transition: 'transform 0.12s var(--ease-back), background 0.18s var(--ease)',
              boxShadow: sel ? '0 4px 12px var(--accent-glow)' : 'none',
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
};

// ─── Sheet: segna una spesa con Siri ──────────────────────────────
// L'app accetta già comandi via URL (vedi App.jsx, ?action=add): qui si
// spiega come collegarli a Siri con l'app Comandi di iOS. Zero codice nuovo,
// toglie l'attrito più grosso — aprire l'app per segnare 5 euro di caffè.
const SiriSheet = ({ open, onClose, toast }) => {
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '/');
  const url = `${base}?action=add`;
  const copia = async () => {
    try {
      await navigator.clipboard.writeText(url);
      haptic('success');
      toast?.show?.('Indirizzo copiato', null);
    } catch {
      toast?.show?.('Copia non riuscita · selezionalo a mano', null);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Segna una spesa con Siri">
      <p className="rec-intro">
        Si prepara una volta sola, poi basta dire <b>«Ehi Siri, spesa»</b>: ti chiede
        quanto, e AURA si apre con l'importo già scritto. Ti resta da toccare la categoria.
      </p>

      <ol className="siri-steps">
        <li><span className="n">1</span><span className="tx">Apri l'app <b>Comandi</b> di iPhone e tocca <b>+</b></span></li>
        <li><span className="n">2</span><span className="tx">Aggiungi l'azione <b>Chiedi input</b>, tipo <b>Numero</b>, domanda «Quanto hai speso?»</span></li>
        <li>
          <span className="n">3</span>
          <span className="tx">
            Aggiungi l'azione <b>Apri URL</b> e incolla questo, poi scrivi <b>&amp;amount=</b> e
            trascina dentro <b>Input fornito</b>
            <span className="siri-url">{url}</span>
            <button type="button" className="siri-copy" onClick={copia}>Copia indirizzo</button>
          </span>
        </li>
        <li><span className="n">4</span><span className="tx">Rinomina il comando <b>Spesa</b> e salva</span></li>
      </ol>

      <p className="siri-note">
        Se vuoi anche la categoria già scelta, aggiungi in fondo all'indirizzo
        <b> &amp;cat=food</b> (o <b>transport</b>, <b>home</b>, <b>health</b>, <b>fun</b>, <b>wants</b>, <b>other</b>):
        così AURA registra la spesa da sola, senza chiederti altro.
      </p>
      <p className="siri-note">
        Funziona anche su Android con qualunque app di scorciatoie, e come segnalibro
        nel browser.
      </p>

      {/* Le notifiche programmate non esistono nello standard web: senza un
          server non si può avvisare ad app chiusa, e AURA non ha server. Questa
          automazione la crei tu sul telefono ed è l'unica che funziona davvero. */}
      <div className="siri-sep" />
      <p className="rec-intro" style={{ marginBottom: 12 }}>
        <b>Vuoi un promemoria la sera?</b> AURA non può mandarti notifiche quando è chiusa:
        non ha un server, e senza server il web non lo permette. Puoi però dirlo tu al telefono,
        una volta sola.
      </p>
      <ol className="siri-steps">
        <li><span className="n">1</span><span className="tx">In <b>Comandi</b> vai su <b>Automazione</b> → <b>Nuova automazione</b> → <b>Ora del giorno</b></span></li>
        <li><span className="n">2</span><span className="tx">Scegli l'orario in cui di solito sei a casa (verso le <b>21</b>) e <b>Ogni giorno</b></span></li>
        <li><span className="n">3</span><span className="tx">Come azione metti <b>Apri app</b> → AURA, e attiva <b>Esegui subito</b> senza chiedere</span></li>
      </ol>
      <p className="siri-note">
        Se apri l'app di sera e non hai segnato niente, te lo faccio notare io — con
        un tasto per registrare e uno per dire che oggi non hai speso.
      </p>
    </Sheet>
  );
};

// ─── Sheet: Categorie ─────────────────────────────────────────────
const CatsSheet = ({ open, onClose, cats, setCats, catRules, removeCatRule }) => {
  const [editId, setEditId] = useState(null);
  const [editLbl, setEditLbl] = useState('');
  const [editColor, setEditColor] = useState('#1E6B4F');
  const [newLbl, setNewLbl] = useState('');
  const [newColor, setNewColor] = useState(availableColors[0]);

  const startEdit = (c) => { setEditId(c.id); setEditLbl(c.label); setEditColor(c.color); };
  const cancelEdit = () => { setEditId(null); setEditLbl(''); };
  const saveEdit = () => {
    setCats(cats.map((c) => c.id === editId ? { ...c, label: editLbl, color: editColor } : c));
    cancelEdit();
    haptic('success');
  };
  const addNew = () => {
    if (!newLbl) return;
    const id = newLbl.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    if (cats.find((c) => c.id === id)) return;
    setCats([...cats, { id, label: newLbl, color: newColor, weight: 5 }]);
    setNewLbl(''); setNewColor(availableColors[0]);
    haptic('success');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Categorie">
      <div style={{ marginBottom: 18 }}>
        {cats.map((c) => {
          const Icon = iconForCategory(c.id);
          if (editId === c.id) {
            return (
              <div key={c.id} style={{ padding: 12, marginBottom: 6, background: 'var(--glass2)', borderRadius: 12, border: '1px solid var(--accent-20)' }}>
                <input className="qa-input" value={editLbl} onChange={(e) => setEditLbl(e.target.value)} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {availableColors.map((col) => (
                    <button
                      key={col}
                      onClick={() => setEditColor(col)}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: col, border: editColor === col ? '2px solid white' : '1px solid var(--glass-bd)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <Button variant="default" size="sm" onClick={cancelEdit}>Annulla</Button>
                  <Button variant="primary" size="sm" onClick={saveEdit}>Salva</Button>
                </div>
              </div>
            );
          }
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', marginBottom: 6,
              background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--glass-bd)',
            }}>
              <span style={{ color: c.color }}><Icon /></span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.label}</div>
              <button onClick={() => startEdit(c)} aria-label="Modifica" style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer' }}>
                <IcEdit width="14" height="14" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="onb-add-form" style={{ marginBottom: 18 }}>
        <input className="qa-input" placeholder="Nuova categoria…" value={newLbl} onChange={(e) => setNewLbl(e.target.value)} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {availableColors.slice(0, 10).map((col) => (
            <button
              key={col}
              onClick={() => setNewColor(col)}
              style={{
                width: 22, height: 22, borderRadius: 6, background: col,
                border: newColor === col ? '2px solid white' : '1px solid var(--glass-bd)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <Button variant="primary" size="sm" className="w-full" style={{ marginTop: 10 }} onClick={addNew} disabled={!newLbl}>
          <IcPlus /> Crea categoria
        </Button>
      </div>

      {/* v0.17: niente più "regole" da scrivere. Qui c'è solo quello che
          l'app ha imparato dalle tue correzioni, detto in italiano, con la
          possibilità di farglielo dimenticare se ha capito male. */}
      {catRules.length > 0 && (
        <>
          <div className="learned-ttl">Cosa ho imparato</div>
          <p className="learned-sub">
            Quando sposti una spesa in un'altra categoria me lo ricordo, e la volta
            dopo la propongo già giusta.
          </p>
          <div className="learned-list">
            {catRules.map((r) => {
              const cat = cats.find((c) => c.id === r.catId);
              return (
                <div key={r.id} className="learned-row">
                  <span
                    className="learned-dot"
                    style={{ background: cat?.color || 'var(--fg-3)' }}
                    aria-hidden="true"
                  />
                  <span className="learned-tx">
                    Se scrivi <b>{r.contains}</b> è <b>{cat?.label || 'una categoria che non c\'è più'}</b>
                  </span>
                  <button
                    type="button"
                    className="learned-forget"
                    onClick={() => removeCatRule(r.id)}
                  >Dimentica</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
};

// ─── Sheet: Conti & tasche ────────────────────────────────────────
// v0.9.3: reso onesto. Il conto "Principale" SEGUE il saldo dell'app (quello
// usato per i calcoli). Gli altri sono tasche personali (banca, contanti,
// PayPal…) che aggiorni a mano, NON usate dal budget. Prima la scritta diceva
// il falso ("il totale è quello che AURA usa") e il main divergeva dal saldo.

// ─── Sheet: Ricorrenze rilevate ───────────────────────────────────
const RecurringSheet = ({ open, onClose, patterns, cats, addCatRule, addSubscription, toast }) => {
  if (!patterns || patterns.length === 0) {
    return (
      <Sheet open={open} onClose={onClose} title="Ricorrenze rilevate">
        <p style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'center', padding: '24px 0' }}>
          Nessun pattern rilevato. Aggiungi più spese per scoprire le tue ricorrenze.
        </p>
      </Sheet>
    );
  }
  return (
    <Sheet open={open} onClose={onClose} title="Ricorrenze rilevate">
      <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 16 }}>
        Ho notato spese che si ripetono spesso. Puoi salvarle come <strong>regola automatica</strong> di
        categorizzazione, oppure come <strong>abbonamento mensile</strong> se è una spesa fissa.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {patterns.map((p) => {
          const cat = cats.find((c) => c.id === p.catId);
          return (
            <div key={p.key} style={{
              padding: 14,
              background: 'var(--glass)',
              border: '1px solid var(--glass-bd)',
              borderRadius: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{p.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                  €{$n(p.avgAmount)}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 10 }}>
                {p.count} volte · {p.cadence}{cat ? ` · ${cat.label}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    // v0.8.1: usa commonToken (parola più caratteristica) invece
                    // del label completo → la regola matcha varianti future
                    // (es. "Esselunga" matcha sia "Esselunga 12,4" che "Esselunga 8,20").
                    const needle = p.commonToken || p.label.toLowerCase().slice(0, 30);
                    addCatRule(needle, p.catId);
                    haptic('success');
                    toast?.show?.(`Regola "${needle}" salvata · prossime spese auto-categorizzate`, null);
                  }}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 9,
                    background: 'var(--accent-10)', color: 'var(--accent-text, var(--accent))',
                    border: '1px solid var(--accent-20)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Salva regola</button>
                {p.cadence === 'mensile' && (
                  <button
                    onClick={() => {
                      // v0.8.1: usa commonDay (giorno modale del mese) invece dell'ultimo.
                      // Più rappresentativo della reale data di scadenza dell'abbo.
                      const dayForSub = p.commonDay || new Date(p.lastTs).getDate();
                      addSubscription(p.label, p.avgAmount, dayForSub);
                      haptic('success');
                      toast?.show?.('Aggiunta come abbonamento mensile', null);
                    }}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 9,
                      background: 'var(--glass2)', color: 'var(--fg-2)',
                      border: '1px solid var(--glass-bd)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Salva come abbonamento</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};
