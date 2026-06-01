import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../components/ui/Button.jsx';
import { Confirm } from '../components/ui/Confirm.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import {
  IcChevR, IcCheck, IcX, IcPlus, IcEdit, IcEye, IcEyeOff, IcSalary, IcHome,
  IcShield, IcSubscription, IcSparkle, IcClock, IcArrowIn,
  IcUser, IcWallet, IcCard, IcSun, IcDownload, IcUpload, IcFile, IcFileDown, IcReset, IcTrash, IcOther,
} from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { parseNum, uid, $n, maskedMoney, monthlyEq, CADENCE_LABEL, CADENCE_LIST, round2 } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';
import { exportCSV, parseCSVImport } from '../lib/csv.js';
import { exportBackup, parseBackupFile, applyBackup } from '../lib/backup.js';
import { useToast } from '../hooks/useUndoToast.js';
import { availableColors } from '../data/categories.js';
import { notificationStatus, requestNotificationPermission } from '../lib/notifications.js';
import { detectRecurring } from '../lib/intelligence.js';
import { YearReview } from '../components/YearReview.jsx';
import { CURRENT_VERSION, IS_BETA } from '../data/changelog.js';

/**
 * Setup (v5 · Headspace style).
 * 5a tab nella tab bar (non piu sheet). Gruppi card con tap-row impilate,
 * ognuna apre uno sheet con la funzionalita relativa.
 *
 * Sezioni:
 *   • Identità        nome
 *   • I tuoi soldi    saldo · entrate · fissi · annuali · abbonamenti · categorie & regole
 *   • Aspetto         tema · privacy
 *   • Promemoria      notifiche scadenze
 *   • Dati            backup · CSV · ricarica tutorial
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
    fixed, setFixed,
    annualExpenses, addAnnual, removeAnnual,
    subscriptions, addSubscription, removeSubscription, toggleSubscription,
    cats, setCats, catRules, addCatRule, removeCatRule,
    theme, setTheme, privacy, setPrivacy,
    txs, importTxs,
    resetAllTutorials,
  } = store;

  // Ricorrenze rilevate dall'algoritmo (cap. B). Recomputate solo quando
  // cambiano le txs — non ad ogni render.
  const recurring = useMemo(() => detectRecurring(txs), [txs]);

  // Quale sezione è aperta come sheet
  const [openSheet, setOpenSheet] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);
  const [backupError, setBackupError] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);
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

  const handleCSVUpload = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try { setImportPreview(parseCSVImport(ev.target.result, cats)); }
      catch { toast?.show?.('Errore lettura CSV', null); }
    };
    r.readAsText(f);
    e.target.value = '';
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

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('accounts'); }}>
            <span className="ic">
              <IcCard />
            </span>
            <div className="body">
              <div className="t">Conti & tasche</div>
              <div className="s">
                {store.accounts.length === 1
                  ? 'Solo il saldo dell\'app · tap per aggiungere banca, contanti, ecc.'
                  : `${store.accounts.length} voci · patrimonio €${$n(round2((store.currentBalance || 0) + store.accounts.filter(a => a.id !== 'main').reduce((s, a) => s + (a.balance || 0), 0)))}`}
              </div>
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

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('fixed'); }}>
            <span className="ic"><IcHome /></span>
            <div className="body">
              <div className="t">Spese fisse</div>
              <div className="s">{fixed.length} {fixed.length === 1 ? 'voce' : 'voci'} · €{$n(fixed.reduce((s, f) => s + (f.amount || 0), 0))}/mese</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('subs'); }}>
            <span className="ic"><IcSubscription /></span>
            <div className="body">
              <div className="t">Abbonamenti</div>
              <div className="s">{subscriptions.length} attivi · €{$n(subscriptions.filter(s => s.active !== false).reduce((s, x) => s + (x.amount || 0), 0))}/mese</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('annual'); }}>
            <span className="ic" style={{ color: 'var(--purple)' }}><IcShield /></span>
            <div className="body">
              <div className="t">Spese annuali</div>
              <div className="s">{annualExpenses.length} {annualExpenses.length === 1 ? 'voce' : 'voci'} · 1/12 al mese</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('cats'); }}>
            <span className="ic">
              <IcOther />
            </span>
            <div className="body">
              <div className="t">Categorie & regole</div>
              <div className="s">{cats.length} categorie · {catRules.length} {catRules.length === 1 ? 'regola auto' : 'regole auto'}</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>

          {recurring.length > 0 && (
            <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('recurring'); }}>
              <span className="ic"><IcSparkle /></span>
              <div className="body">
                <div className="t">Ricorrenze rilevate</div>
                <div className="s">{recurring.length} {recurring.length === 1 ? 'pattern' : 'pattern'} di spesa ripetuta</div>
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
              <div className="s">Scuro o chiaro</div>
            </div>
            <div role="radiogroup" style={{ display: 'flex', gap: 4, background: 'var(--glass2)', padding: 3, borderRadius: 10 }}>
              {[{ id: 'dark', label: 'Scuro' }, { id: 'light', label: 'Chiaro' }].map((m) => {
                const sel = theme === m.id;
                return (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={sel}
                    onClick={() => { haptic('light'); setTheme(m.id); }}
                    style={{
                      padding: '5px 11px', borderRadius: 7,
                      fontSize: 11, fontWeight: 700,
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

          <button className="hs-set-row" onClick={() => { haptic('medium'); exportCSV(txs, cats); toast?.show?.('CSV scaricato', null); }}>
            <span className="ic">
              <IcFile />
            </span>
            <div className="body">
              <div className="t">Esporta CSV</div>
              <div className="s">Solo le transazioni · per Excel/Sheets</div>
            </div>
          </button>

          <button className="hs-set-row" onClick={() => fileInputRef.current?.click()}>
            <span className="ic">
              <IcFileDown />
            </span>
            <div className="body">
              <div className="t">Importa CSV</div>
              <div className="s">Aggiunge spese a quelle esistenti</div>
            </div>
            <input type="file" ref={fileInputRef} hidden accept=".csv,text/csv" onChange={handleCSVUpload} />
          </button>

          <button className="hs-set-row" onClick={() => { haptic('light'); resetAllTutorials(); toast?.show?.('Tutorial pronti · cambia schermata per vederli', null); }}>
            <span className="ic">
              <IcReset />
            </span>
            <div className="body">
              <div className="t">Ricarica tutorial</div>
              <div className="s">Rivedi le welcome card al prossimo cambio tab</div>
            </div>
          </button>

          <button className="hs-set-row" onClick={() => { haptic('light'); setOpenSheet('yearReview'); }}>
            <span className="ic"><IcSparkle /></span>
            <div className="body">
              <div className="t">Il tuo anno in numeri</div>
              <div className="s">Statistiche e curiosità sulle tue spese del {new Date().getFullYear()}</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>
        </div>
      </div>

      {/* AVANZATE */}
      <div className="hs-set-group">
        <div className="hs-set-ttl">Avanzate</div>
        <div className="hs-set-list">
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

      {/* Fissi (riusa la struttura) */}
      <FixedSheet
        open={openSheet === 'fixed'} onClose={() => setOpenSheet(null)}
        fixed={fixed} setFixed={setFixed}
      />

      {/* Abbonamenti */}
      <SubsSheet
        open={openSheet === 'subs'} onClose={() => setOpenSheet(null)}
        subscriptions={subscriptions} addSubscription={addSubscription}
        removeSubscription={removeSubscription} toggleSubscription={toggleSubscription}
      />

      {/* Annuali */}
      <AnnualSheet
        open={openSheet === 'annual'} onClose={() => setOpenSheet(null)}
        annualExpenses={annualExpenses} addAnnual={addAnnual} removeAnnual={removeAnnual}
      />

      {/* Categorie & regole */}
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

      {/* CSV import preview */}
      <Sheet open={!!importPreview} onClose={() => setImportPreview(null)} title="Importa CSV">
        {importPreview && (
          <>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 14 }}>
              Trovate <strong>{importPreview.txs?.length || 0}</strong> righe valide.
              Verranno aggiunte alle tue spese esistenti.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <Button variant="default" size="lg" className="flex-1" onClick={() => setImportPreview(null)}>Annulla</Button>
              <Button variant="primary" size="lg" className="flex-1" onClick={() => {
                importTxs(importPreview.txs); setImportPreview(null);
                toast?.show?.(`${importPreview.txs.length} spese importate`, null);
              }}>Importa</Button>
            </div>
          </>
        )}
      </Sheet>

      {/* Ricorrenze rilevate */}
      <RecurringSheet
        open={openSheet === 'recurring'}
        onClose={() => setOpenSheet(null)}
        patterns={recurring}
        cats={cats}
        addCatRule={addCatRule}
        addSubscription={addSubscription}
        toast={toast}
      />

      {/* Conti & tasche (v0.9.3: Principale = saldo app) */}
      <AccountsSheet
        open={openSheet === 'accounts'}
        onClose={() => setOpenSheet(null)}
        accounts={store.accounts}
        addAccount={store.addAccount}
        updateAccount={store.updateAccount}
        removeAccount={store.removeAccount}
        transferBetween={store.transferBetween}
        currentBalance={store.currentBalance}
        setCurrentBalance={store.setCurrentBalance}
        markBalanceUpdated={store.markBalanceUpdated}
      />

      {/* Year in Review */}
      <YearReview
        open={openSheet === 'yearReview'}
        onClose={() => setOpenSheet(null)}
        txs={txs}
        cats={cats}
        year={new Date().getFullYear()}
        privacy={privacy}
      />

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={onReset}
        title="Cancellare tutto?"
        msg="Spariranno tutte le spese, le impostazioni e i desideri. Non si torna indietro."
      />
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
const FixedSheet = ({ open, onClose, fixed, setFixed }) => {
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');
  const [day, setDay] = useState(1);
  const amountNum = parseNum(amt);
  const canAdd = !!lbl.trim() && amountNum > 0;
  const totalMonthly = fixed.reduce((s, f) => s + (f.amount || 0), 0);
  const add = () => {
    // v0.8.1: validazione amount > 0 (prima accettava 0/non-valido → spesa
    // fissa fantasma di €0 che inquinava i calcoli).
    if (!canAdd) return;
    setFixed([...fixed, {
      id: uid(),
      label: lbl.trim().slice(0, 60),
      amount: amountNum,
      type: 'monthly',
      deductDay: Math.min(28, Math.max(1, parseInt(day) || 1)),
      active: true,
    }]);
    setLbl(''); setAmt(''); setDay(1);
    haptic('success');
  };
  const remove = (id) => setFixed(fixed.filter((f) => f.id !== id));
  return (
    <Sheet open={open} onClose={onClose} title="Spese fisse">
      {fixed.length > 0 && (
        <>
          <div style={{
            fontSize: 11, color: 'var(--fg-3)', letterSpacing: '.08em',
            fontWeight: 600, marginBottom: 8, textTransform: 'uppercase',
          }}>
            Totale · €{$n(totalMonthly)}/mese
          </div>
          <div style={{ marginBottom: 16 }}>
            {fixed.map((f) => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6,
                background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--glass-bd)',
              }}>
                <span style={{ color: 'var(--info)' }}><IcHome /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{f.label}</div>
                  {f.deductDay && <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>addebito il {f.deductDay}</div>}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)' }}>€{$n(f.amount)}</span>
                <button onClick={() => remove(f.id)} aria-label="Rimuovi" style={{ background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }}><IcX width="14" height="14" /></button>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="onb-add-form">
        <input className="qa-input" placeholder="Nome (es. Affitto, luce, internet)" value={lbl} onChange={(e) => setLbl(e.target.value)} />
        <input className="qa-input" style={{ marginTop: 8 }} type="text" inputMode="decimal" placeholder="Importo mensile (es. 650)" value={amt} onChange={(e) => setAmt(e.target.value)} />

        <label className="qa-lbl" style={{ marginTop: 14 }}>Giorno addebito del mese</label>
        <DayChipPicker value={day} onChange={setDay} />

        {canAdd && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: 'var(--accent-10)', border: '1px solid var(--accent-20)',
            borderRadius: 10,
            fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
          }}>
            Impatto: <strong style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              €{$n(amountNum)}/mese
            </strong> aggiunti ai fissi (totale €{$n(totalMonthly + amountNum)})
          </div>
        )}

        <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 12 }} onClick={add} disabled={!canAdd}>
          <IcPlus /> Aggiungi
        </Button>
      </div>
    </Sheet>
  );
};

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

const SubsSheet = ({ open, onClose, subscriptions, addSubscription, removeSubscription, toggleSubscription }) => {
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');
  const [day, setDay] = useState(1);
  const [cadence, setCadence] = useState('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1); // v0.9.4
  const [showPresets, setShowPresets] = useState(false);

  const amountNum = parseNum(amt);
  const canAdd = !!lbl.trim() && amountNum > 0;
  const monthlyImpact = canAdd ? monthlyEq(amountNum, cadence) : 0;
  // Cadenze "annuali" dove conta il mese specifico di addebito.
  const needsMonth = cadence === 'annual' || cadence === 'semiannual';

  const add = () => {
    if (!canAdd) return;
    addSubscription(lbl.trim(), amt, day, cadence, needsMonth ? month : null);
    setLbl(''); setAmt(''); setDay(1); setCadence('monthly'); setMonth(new Date().getMonth() + 1);
    setShowPresets(false);
  };
  const usePreset = (p) => {
    setLbl(p.label);
    setAmt(String(p.amount));
    setCadence(p.cadence);
    setShowPresets(false);
    haptic('light');
  };

  // Totale mensile equivalente di tutti gli abbo attivi
  const totalMonthly = subscriptions
    .filter((s) => s.active !== false)
    .reduce((sum, s) => sum + monthlyEq(s.amount || 0, s.cadence || 'monthly'), 0);

  return (
    <Sheet open={open} onClose={onClose} title="Abbonamenti">
      {subscriptions.length > 0 && (
        <>
          <div style={{
            fontSize: 11, color: 'var(--fg-3)', letterSpacing: '.08em',
            fontWeight: 600, marginBottom: 8, textTransform: 'uppercase',
          }}>
            Attivi · €{$n(totalMonthly)}/mese equivalenti
          </div>
          <div style={{ marginBottom: 16 }}>
            {subscriptions.map((s) => {
              const cad = s.cadence || 'monthly';
              const eqMonth = monthlyEq(s.amount || 0, cad);
              const cadLabel = CADENCE_LABEL[cad] || cad;
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', marginBottom: 6,
                  background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--glass-bd)',
                  opacity: s.active === false ? 0.5 : 1,
                }}>
                  <span style={{ color: 'var(--pink)' }}><IcSubscription /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 1 }}>
                      €{$n(s.amount)} {cadLabel}
                      {s.deductMonth ? ` · a ${MONTHS_SHORT[s.deductMonth - 1]}` : ''}
                      {cad !== 'monthly' && ` · €${$n(eqMonth)}/mese`}
                    </div>
                  </div>
                  <button onClick={() => toggleSubscription(s.id)} title={s.active === false ? 'Riattiva' : 'Sospendi'} style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer' }}>
                    {s.active === false ? <IcCheck width="14" height="14" /> : <IcEyeOff width="14" height="14" />}
                  </button>
                  <button onClick={() => removeSubscription(s.id)} aria-label="Rimuovi" style={{ background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }}><IcX width="14" height="14" /></button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="onb-add-form">
        {/* Quick preset toggle */}
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 10px', marginBottom: 10,
            background: 'transparent', border: '1px dashed var(--glass-bd-2)',
            borderRadius: 10, color: 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span>{showPresets ? '◂ Inserisci a mano' : '✨ Quick: scegli da preset'}</span>
        </button>

        {showPresets && (
          <div className="qa-cats" style={{ marginBottom: 10 }}>
            {SUBSCRIPTION_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="qa-cat"
                onClick={() => usePreset(p)}
                style={{ fontSize: 11 }}
              >
                <span>{p.label}</span>
                <span style={{ color: 'var(--fg-4)', marginLeft: 4 }}>€{p.amount}</span>
              </button>
            ))}
          </div>
        )}

        <input className="qa-input" placeholder="Nome (es. Netflix)" value={lbl} onChange={(e) => setLbl(e.target.value)} />
        <input className="qa-input" style={{ marginTop: 8 }} type="text" inputMode="decimal" placeholder="Importo (es. 9,99)" value={amt} onChange={(e) => setAmt(e.target.value)} />

        <label className="qa-lbl" style={{ marginTop: 14 }}>Ogni quanto</label>
        <div className="qa-cats">
          {CADENCE_LIST.map((c) => (
            <button
              key={c}
              type="button"
              className={`qa-cat ${cadence === c ? 'active' : ''}`}
              onClick={() => { haptic('light'); setCadence(c); }}
              style={cadence === c ? {
                background: 'var(--accent-10)',
                borderColor: 'var(--accent-20)',
                color: 'var(--accent)',
              } : undefined}
            >
              <span>{CADENCE_LABEL[c]}</span>
            </button>
          ))}
        </div>

        {/* v0.9.4: mese di addebito per cadenze annuali/semestrali */}
        {needsMonth && (
          <>
            <label className="qa-lbl" style={{ marginTop: 14 }}>In che mese si rinnova?</label>
            <MonthChipPicker value={month} onChange={setMonth} labels={MONTHS_SHORT} />
          </>
        )}

        <label className="qa-lbl" style={{ marginTop: 14 }}>Giorno addebito</label>
        <DayChipPicker value={day} onChange={setDay} />

        {canAdd && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: 'var(--accent-10)', border: '1px solid var(--accent-20)',
            borderRadius: 10,
            fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
          }}>
            Impatto: <strong style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              €{$n(monthlyImpact)}/mese
            </strong>{cadence !== 'monthly' ? ` (${CADENCE_LABEL[cadence]})` : ''}
            {needsMonth && <> · si rinnova a <strong>{MONTHS_LONG[month - 1]}</strong></>}
          </div>
        )}

        <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 12 }} onClick={add} disabled={!canAdd}>
          <IcPlus /> Aggiungi
        </Button>
      </div>
    </Sheet>
  );
};

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

const AnnualSheet = ({ open, onClose, annualExpenses, addAnnual, removeAnnual }) => {
  const [lbl, setLbl] = useState('');
  const [amt, setAmt] = useState('');
  const [month, setMonth] = useState(1);
  const [showPresets, setShowPresets] = useState(false);
  const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const monthsShort = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

  const amountNum = parseNum(amt);
  const canAdd = !!lbl.trim() && amountNum > 0;
  const monthlyImpact = canAdd ? amountNum / 12 : 0;

  const add = () => {
    if (!canAdd) return;
    addAnnual(lbl.trim().slice(0, 60), amt, month);
    setLbl(''); setAmt(''); setMonth(1);
    setShowPresets(false);
  };
  const usePreset = (p) => {
    setLbl(p.label);
    setAmt(String(p.amount));
    setMonth(p.dueMonth);
    setShowPresets(false);
    haptic('light');
  };

  const totalMonthly = annualExpenses.reduce((s, e) => s + (e.amount || 0) / 12, 0);

  return (
    <Sheet open={open} onClose={onClose} title="Spese annuali">
      <p style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.55, marginBottom: 14 }}>
        Spese che paghi <strong style={{ color: 'var(--fg-2)' }}>una volta l'anno</strong> (assicurazioni, bolli, tasse).
        AURA le spalma su 12 mesi: accantona ogni mese 1/12 del totale così quando arriva la scadenza i soldi ci sono già.
      </p>

      {annualExpenses.length > 0 && (
        <>
          <div style={{
            fontSize: 11, color: 'var(--fg-3)', letterSpacing: '.08em',
            fontWeight: 600, marginBottom: 8, textTransform: 'uppercase',
          }}>
            Accantonato · €{$n(totalMonthly)}/mese
          </div>
          <div style={{ marginBottom: 16 }}>
            {annualExpenses.map((e) => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6,
                background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--glass-bd)',
              }}>
                <span style={{ color: 'var(--purple)' }}><IcShield /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>scade a {months[(e.dueMonth || 1) - 1]} · €{$n(e.amount / 12)}/mese</div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>€{$n(e.amount)}</span>
                <button onClick={() => removeAnnual(e.id)} aria-label="Rimuovi" style={{ background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }}><IcX width="14" height="14" /></button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="onb-add-form">
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 10px', marginBottom: 10,
            background: 'transparent', border: '1px dashed var(--glass-bd-2)',
            borderRadius: 10, color: 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span>{showPresets ? '◂ Inserisci a mano' : '✨ Quick: scegli da preset'}</span>
        </button>

        {showPresets && (
          <div className="qa-cats" style={{ marginBottom: 10 }}>
            {ANNUAL_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="qa-cat"
                onClick={() => usePreset(p)}
                style={{ fontSize: 11 }}
              >
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        )}

        <input className="qa-input" placeholder="Nome (es. Assicurazione auto)" value={lbl} onChange={(e) => setLbl(e.target.value)} />
        <input className="qa-input" style={{ marginTop: 8 }} type="text" inputMode="decimal" placeholder="Importo totale annuo (es. 600)" value={amt} onChange={(e) => setAmt(e.target.value)} />

        <label className="qa-lbl" style={{ marginTop: 14 }}>Mese di scadenza</label>
        <MonthChipPicker value={month} onChange={setMonth} labels={monthsShort} />

        {canAdd && (
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: 'var(--accent-10)', border: '1px solid var(--accent-20)',
            borderRadius: 10,
            fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
          }}>
            Spalmato: <strong style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              €{$n(monthlyImpact)}/mese
            </strong> accantonati. A {months[month - 1]} pagherai i €{$n(amountNum)} senza sorprese.
          </div>
        )}

        <Button variant="primary" size="lg" className="w-full" style={{ marginTop: 12 }} onClick={add} disabled={!canAdd}>
          <IcPlus /> Aggiungi
        </Button>
      </div>
    </Sheet>
  );
};

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

// ─── Sheet: Categorie & regole ────────────────────────────────────
const CatsSheet = ({ open, onClose, cats, setCats, catRules, removeCatRule }) => {
  const [editId, setEditId] = useState(null);
  const [editLbl, setEditLbl] = useState('');
  const [editColor, setEditColor] = useState('#34D399');
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
    <Sheet open={open} onClose={onClose} title="Categorie & regole">
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

      {catRules.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            Regole auto-categoria
          </div>
          {catRules.map((r) => {
            const cat = cats.find((c) => c.id === r.catId);
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', marginBottom: 5,
                background: 'var(--glass)', borderRadius: 10, border: '1px solid var(--glass-bd)',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--fg-3)' }}>se "<strong style={{ color: 'var(--fg-2)' }}>{r.contains}</strong>" → </span>
                <span style={{ color: cat?.color || 'var(--accent)', fontWeight: 600 }}>{cat?.label || '?'}</span>
                <button onClick={() => removeCatRule(r.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }}>
                  <IcX width="12" height="12" />
                </button>
              </div>
            );
          })}
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
const AccountsSheet = ({ open, onClose, accounts, addAccount, updateAccount, removeAccount, transferBetween, currentBalance, setCurrentBalance, markBalanceUpdated }) => {
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [tFrom, setTFrom] = useState('');
  const [tTo, setTTo] = useState('');
  const [tAmount, setTAmount] = useState('');

  // Saldo mostrato per un conto: per 'main' è il saldo dell'app (currentBalance).
  const balanceOf = (a) => a.id === 'main' ? (currentBalance || 0) : (a.balance || 0);
  const nonMain = accounts.filter((a) => a.id !== 'main');

  const startEdit = (a) => { setEditId(a.id); setEditLabel(a.label); setEditBalance(String(balanceOf(a))); };
  const cancelEdit = () => { setEditId(null); setEditLabel(''); setEditBalance(''); };
  const saveEdit = () => {
    if (editId === 'main') {
      // Il Principale = saldo dell'app → aggiorna currentBalance (e spegne il
      // promemoria post-paga). Il nome resta "Principale".
      setCurrentBalance?.(round2(parseNum(editBalance)));
      markBalanceUpdated?.();
    } else {
      updateAccount(editId, { label: editLabel.trim() || 'Conto', balance: parseNum(editBalance) });
    }
    haptic('success');
    cancelEdit();
  };
  const addNew = () => {
    if (!newLabel.trim()) return;
    addAccount(newLabel.trim(), parseNum(newBalance));
    setNewLabel(''); setNewBalance('');
  };
  const doTransfer = () => {
    if (!tFrom || !tTo || tFrom === tTo) return;
    transferBetween(tFrom, tTo, tAmount); // solo tra tasche manuali (main escluso)
    setShowTransfer(false); setTFrom(''); setTTo(''); setTAmount('');
  };

  // Patrimonio totale = saldo app (Principale) + tasche manuali.
  const total = round2((currentBalance || 0) + nonMain.reduce((s, a) => s + (a.balance || 0), 0));

  return (
    <Sheet open={open} onClose={onClose} title="Conti & tasche">
      <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 14 }}>
        Il <strong>Principale</strong> segue il saldo dell'app (quello dei calcoli). Gli altri sono
        tue tasche da tenere d'occhio — banca, contanti, PayPal… — che aggiorni a mano.
        Il totale è il tuo <strong>patrimonio</strong>, non il budget del periodo.
      </p>

      <div style={{
        padding: 14, marginBottom: 16,
        background: 'linear-gradient(135deg, var(--accent-10), var(--glass))',
        border: '1px solid var(--accent-20)', borderRadius: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent-text, var(--accent))' }}>
          Totale
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: total < 0 ? 'var(--red)' : 'var(--fg)' }}>
          {total < 0 ? '−' : ''}€{$n(Math.abs(total))}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {accounts.map((a) => {
          if (editId === a.id) {
            return (
              <div key={a.id} style={{ padding: 12, marginBottom: 6, background: 'var(--glass2)', borderRadius: 12, border: '1px solid var(--accent-20)' }}>
                <input className="qa-input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Nome del conto" />
                <input className="qa-input" type="text" inputMode="decimal" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} placeholder="Saldo" style={{ marginTop: 8 }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <Button variant="default" size="sm" onClick={cancelEdit}>Annulla</Button>
                  <Button variant="primary" size="sm" onClick={saveEdit}>Salva</Button>
                </div>
              </div>
            );
          }
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', marginBottom: 6,
              background: 'var(--glass)', borderRadius: 12, border: '1px solid var(--glass-bd)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {a.id === 'main' ? 'Principale' : a.label}
                  {a.id === 'main' && <span style={{ fontSize: 10, color: 'var(--fg-4)', fontWeight: 400, marginLeft: 6 }}>saldo dell'app</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: balanceOf(a) < 0 ? 'var(--red)' : 'var(--fg-3)', marginTop: 2 }}>
                  {balanceOf(a) < 0 ? '−' : ''}€{$n(Math.abs(balanceOf(a)))}
                </div>
              </div>
              <button onClick={() => startEdit(a)} aria-label="Modifica" style={{ background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer' }}>
                <IcEdit width="14" height="14" />
              </button>
              {a.id !== 'main' && (
                <button onClick={() => removeAccount(a.id)} aria-label="Rimuovi" style={{ background: 'transparent', border: 'none', color: 'var(--fg-4)', cursor: 'pointer' }}>
                  <IcX width="14" height="14" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {nonMain.length >= 2 && (
        <button
          onClick={() => setShowTransfer(true)}
          style={{
            width: '100%', padding: 12, marginBottom: 12,
            borderRadius: 12, background: 'var(--glass2)',
            border: '1px solid var(--glass-bd)',
            color: 'var(--fg-2)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
          Trasferisci tra conti
        </button>
      )}

      {showTransfer && (
        <div style={{ padding: 14, marginBottom: 12, background: 'var(--glass2)', borderRadius: 12, border: '1px solid var(--glass-bd)' }}>
          <label className="qa-lbl">Da</label>
          <select className="qa-input" value={tFrom} onChange={(e) => setTFrom(e.target.value)} style={{ appearance: 'menulist' }}>
            <option value="">Seleziona…</option>
            {nonMain.map((a) => <option key={a.id} value={a.id}>{a.label} (€{$n(a.balance || 0)})</option>)}
          </select>
          <label className="qa-lbl" style={{ marginTop: 10 }}>A</label>
          <select className="qa-input" value={tTo} onChange={(e) => setTTo(e.target.value)} style={{ appearance: 'menulist' }}>
            <option value="">Seleziona…</option>
            {nonMain.filter((a) => a.id !== tFrom).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <label className="qa-lbl" style={{ marginTop: 10 }}>Importo</label>
          <input className="qa-input" type="text" inputMode="decimal" value={tAmount} onChange={(e) => setTAmount(e.target.value)} placeholder="100" />
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Button variant="default" size="sm" onClick={() => setShowTransfer(false)}>Annulla</Button>
            <Button variant="primary" size="sm" onClick={doTransfer} disabled={!tFrom || !tTo || parseNum(tAmount) <= 0}>Trasferisci</Button>
          </div>
        </div>
      )}

      <div className="onb-add-form">
        <input className="qa-input" placeholder="Nome del nuovo conto (es. Contanti)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        <input className="qa-input" type="text" inputMode="decimal" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} placeholder="Saldo iniziale (€)" style={{ marginTop: 8 }} />
        <Button variant="primary" size="sm" className="w-full" style={{ marginTop: 10 }} onClick={addNew} disabled={!newLabel.trim()}>
          <IcPlus /> Aggiungi conto
        </Button>
      </div>
    </Sheet>
  );
};

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
