import { useState, useEffect, useMemo, useRef } from 'react';
import { load, save } from '../lib/storage.js';
import { realCost, uid, parseNum, round2, dayKeyLocal, monthlyEq } from '../lib/format.js';
import { computeSmartSuggestions, computeInsights, computeLearningConfidence, getLearningLevel, applySmartAllocation, compute503020 } from '../lib/intelligence.js';
import { prevIncomeDate } from '../lib/analytics.js';
import { computeFinance } from '../lib/engine/prediction.js';
import { haptic } from '../lib/haptic.js';
import { defaultCats } from '../data/categories.js';
import { defaultWidgets } from '../data/widgets.js';

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// resetDay is the day of the month the budget period restarts. Clamped 1..28
// so we never reference Feb 29/30/31 (or April 31, etc).
const clampResetDay = (d) => {
  const n = parseInt(d);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(28, n));
};

const dayInMonth = (year, monthZeroBased, day) => {
  const max = new Date(year, monthZeroBased + 1, 0).getDate();
  return Math.min(Math.max(1, day), max);
};

const monthAnchor = (year, monthZeroBased, day) => {
  return new Date(year, monthZeroBased, dayInMonth(year, monthZeroBased, day));
};

export const useStore = () => {
  const stored = useMemo(() => load(), []);
  const [booted, setBooted] = useState(!!stored);

  // Stable "today" anchor — refreshes only at midnight crossing.
  // Prevents useMemo invalidation on every render (was: `const now = new Date()` at top-level).
  const [todayKey, setTodayKey] = useState(() => startOfDay().getTime());
  useEffect(() => {
    const tick = () => {
      const k = startOfDay().getTime();
      if (k !== todayKey) setTodayKey(k);
    };
    const next = startOfDay();
    next.setDate(next.getDate() + 1);
    const ms = Math.max(1000, next.getTime() - Date.now() + 500);
    const t = setTimeout(tick, ms);
    const visHandler = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', visHandler);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', visHandler); };
  }, [todayKey]);
  // `now` is the start-of-today timestamp, stable across renders within the same day.
  // Day-granularity is sufficient for budgeting (period boundaries, streaks, monthly history).
  const now = useMemo(() => new Date(todayKey), [todayKey]);

  const [name, setName] = useState(stored?.name || '');
  const [salary, setSalary] = useState(stored?.salary || 0);
  const [resetDay, setResetDayRaw] = useState(clampResetDay(stored?.resetDay || 1));
  const setResetDay = (v) => setResetDayRaw(clampResetDay(v));

  // Salary override: if the user gets paid more/less in a given month, they
  // can rectify the actual amount. Keyed by month 'YYYY-MM' → number.
  const [salaryOverrides, setSalaryOverrides] = useState(stored?.salaryOverrides || {});

  const [cats, setCats] = useState(stored?.cats || defaultCats);
  const [txs, setTxs] = useState(stored?.txs || []);
  const [fixed, setFixed] = useState(stored?.fixed || []);
  // Annual expenses with month-of-due. Auto-allocated 1/12 each month so the
  // money is ready when the bill arrives.
  // Schema: { id, label, amount, dueMonth (1..12), color?, icon? }
  const [annualExpenses, setAnnualExpenses] = useState(stored?.annualExpenses || []);
  // Up to 4 category ids surfaced as quick chips on the home quick-add.
  const [homeCats, setHomeCats] = useState(stored?.homeCats || ['food', 'transport', 'home']);
  const [buffer, setBuffer] = useState(stored?.buffer ?? 10);
  const [widgets, setWidgets] = useState(stored?.widgets || defaultWidgets);
  const [subscriptions, setSubscriptions] = useState(stored?.subscriptions || []);
  const [extraIncomes, setExtraIncomes] = useState(stored?.extraIncomes || []);
  const [celebrated, setCelebrated] = useState(stored?.celebrated || {});
  // v0.9.3: rimossi stati legacy mai usati nell'UI: currentSavings, quickActions,
  // dreams (e dreamAlloc), rolloverTarget/History. Erano salvati a vuoto.

  // User-defined categorization rules: { id, contains, catId } — overrides smart-cat suggestions.
  const [catRules, setCatRules] = useState(stored?.catRules || []);
  // Wishes: aspirational goals (auto, casa, viaggio…) the app helps you plan.
  // Schema: { id, label, amount, months }
  const [wishes, setWishes] = useState(stored?.wishes || []);
  // v0.9: Obiettivi (ex Salvadanaio + Desideri unificati).
  // Schema: { id, label, target, saved, months?, icon?, createdTs }
  // I soldi "saved" sono earmarked (restano in currentBalance ma escono dal
  // libero spendibile, come il cuscinetto). Vedi freeUntilNextIncome.
  // v0.9.1: migrazione one-shot dei vecchi "wishes" → goals (idempotente per id:
  //   riusando l'id del wish, alla prossima load risultano già in goals e non
  //   vengono ri-aggiunti). target = amount del desiderio, saved parte da 0.
  const migratedGoals = (() => {
    const g = Array.isArray(stored?.goals) ? stored.goals : [];
    // v0.9.6 FIX: la migrazione wishes→goals deve girare UNA SOLA VOLTA.
    // Senza il flag girava a OGNI avvio e ri-creava gli obiettivi che l'utente
    // aveva eliminato (bug "l'obiettivo cancellato ricompare al riavvio").
    if (stored?.goalsMigrated) return g;
    const w = Array.isArray(stored?.wishes) ? stored.wishes : [];
    const have = new Set(g.map((x) => x.id));
    const fromWishes = w.filter((x) => !have.has(x.id)).map((x) => ({
      id: x.id || uid(),
      label: x.label || 'Obiettivo',
      target: parseNum(x.amount),
      saved: 0,
      months: x.months || null,
      createdTs: Date.now(),
    }));
    return [...g, ...fromWishes];
  })();
  const [goals, setGoals] = useState(migratedGoals);
  // v0.9: registro "ricorrente segnata come pagata".
  // Chiave: `${itemId}_${YYYY-MM}` → ts del pagamento. Serve a NON contare due
  // volte un fisso/abbonamento nel "libero" una volta che l'hai registrato come
  // spesa reale (vedi sumLockedBetween, che salta le occorrenze marcate).
  const [recurringPaid, setRecurringPaid] = useState(stored?.recurringPaid || {});
  // v0.9.25: occorrenze ricorrenti SALTATE ("questo mese non lo pago"), chiave
  // `${id}_YYYY-MM` come recurringPaid. Saltata = il libero non la sconta più
  // questo mese, ma NON crea nessuna spesa (a differenza di "pagato").
  const [recurringSkipped, setRecurringSkipped] = useState(stored?.recurringSkipped || {});
  // v0.9.19: ricorrenze rilevate che l'utente ha "ignorato" (per chiave pattern),
  // così non ricompaiono più tra i suggerimenti automatici.
  const [dismissedRecurring, setDismissedRecurring] = useState(stored?.dismissedRecurring || []);
  // Tutorial visited flags — keyed per screen so we can show the tour once.
  const [tutorialState, setTutorialState] = useState(stored?.tutorialState || {});

  // ─── Balance-first model (capitolo 2) ─────────────────────────
  // Il nuovo modello "parti quando vuoi": l'app non assume più che inizi
  // il giorno dello stipendio. Lavora sul saldo reale + entrate future
  // dichiarate. Convive col modello vecchio (salary/resetDay/freeBudget)
  // per non rompere le schermate esistenti — verrà sostituito nel cap. 4.
  //
  // Migrazione automatica per utenti esistenti: se non hanno currentBalance,
  // lo deriviamo dallo stipendio come stima iniziale (conservativa).
  const migratedBalance = stored?.currentBalance != null
    ? stored.currentBalance
    : (stored?.salary || 0); // stima conservativa per utenti pre-v5
  const migratedIncomes = stored?.incomes != null
    ? stored.incomes
    : (stored?.salary > 0
        ? [{
            id: 'inc_salary_legacy',
            label: 'Stipendio',
            amount: stored.salary,
            dayOfMonth: clampResetDay(stored?.resetDay || 1),
            kind: 'salary',
            active: true,
          }]
        : []);
  const migratedCushion = stored?.cushion != null
    ? stored.cushion
    : Math.round(((stored?.salary || 0) * (stored?.buffer ?? 10)) / 100);

  const [currentBalance, setCurrentBalance] = useState(migratedBalance);
  const [incomes, setIncomes] = useState(migratedIncomes);
  const [cushion, setCushion] = useState(migratedCushion);
  // v0.9.9 (Financial Copilot): quanto l'utente vuole CONSERVARE ogni mese, oltre
  // al cuscinetto. È il cuore del modello "arrivare a fine mese tenendo da parte X".
  // 0 = non impostato (l'hero mostra comunque la previsione di fine mese).
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(stored?.monthlySavingsTarget ?? 0);

  // ─── Multi-conto (cap. B) ──────────────────────────────────
  // Permette di separare i soldi: es. Banca + Contanti + PayPal. Ogni tx
  // ha un campo `account` (id stringa). Se l'utente non configura conti
  // multipli, esiste solo 'main' che contiene tutto il currentBalance.
  // Migrazione: utenti pre-multi-account → unico account 'main' con balance
  // = currentBalance corrente.
  const migratedAccounts = stored?.accounts != null
    ? stored.accounts
    : [{ id: 'main', label: 'Principale', balance: migratedBalance, icon: 'wallet', active: true }];
  const [accounts, setAccounts] = useState(migratedAccounts);

  const [theme, setTheme] = useState(stored?.theme || 'dark');
  const [themeId, setThemeId] = useState(stored?.themeId || 'aurora');
  const [privacy, setPrivacy] = useState(false);
  // Legacy global flag — kept so existing backups still work. New tutorial
  // flow uses tutorialState[screenId] instead.
  const [tutorialSeen, setTutorialSeen] = useState(stored?.tutorialSeen || false);

  // v0.8.2: timestamp dell'ultimo aggiornamento MANUALE del saldo. Serve al
  // promemoria "è arrivata la paga, aggiorna il saldo" (modello manuale).
  // null = mai aggiornato; viene inizializzato a now() al primo boot così
  // il primo promemoria scatta dopo la prima paga futura, non subito.
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState(stored?.lastBalanceUpdate ?? null);
  const markBalanceUpdated = () => setLastBalanceUpdate(Date.now());

  // v0.9.3: timestamp dell'ultimo backup esportato. Per il promemoria backup
  // (rete di sicurezza: l'app non ha cloud, i dati vivono solo qui).
  const [lastBackup, setLastBackup] = useState(stored?.lastBackup ?? null);
  const markBackup = () => setLastBackup(Date.now());

  // Debounced save: collapses bursts (slider drags, rapid toggles) into one write.
  // Flushes on unmount/visibility change to avoid losing the last edit.
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);
  useEffect(() => {
    if (!booted) return;
    pendingSave.current = {
      name, salary, resetDay, salaryOverrides,
      cats, txs, fixed, annualExpenses, homeCats,
      buffer, widgets, theme, themeId, extraIncomes, subscriptions,
      celebrated,
      catRules, tutorialState, tutorialSeen,
      // v0.9.6: wishes svuotati (ormai migrati in goals) + flag one-shot, così
      // la migrazione non rigenera gli obiettivi eliminati.
      wishes: [], goals, goalsMigrated: true, recurringPaid, recurringSkipped, dismissedRecurring,
      // balance-first (cap. 2)
      currentBalance, incomes, cushion, monthlySavingsTarget,
      lastBalanceUpdate, lastBackup,
      // multi-conto (cap. B)
      accounts,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pendingSave.current) save(pendingSave.current);
      pendingSave.current = null;
    }, 250);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [
    name, salary, resetDay, salaryOverrides,
    cats, txs, fixed, annualExpenses, homeCats,
    buffer, widgets, booted, theme, themeId, extraIncomes, subscriptions,
    celebrated,
    catRules, tutorialState, tutorialSeen,
    wishes, goals, recurringPaid, recurringSkipped, dismissedRecurring,
    currentBalance, incomes, cushion, monthlySavingsTarget,
    lastBalanceUpdate, lastBackup,
    accounts,
  ]);

  useEffect(() => {
    const flush = () => {
      if (pendingSave.current) {
        save(pendingSave.current);
        pendingSave.current = null;
        if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      }
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      flush();
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  const computePeriod = (offset = 0) => {
    const candidate = monthAnchor(now.getFullYear(), now.getMonth(), resetDay);
    const currentMonthBase = candidate > now ? now.getMonth() - 1 : now.getMonth();
    const target = new Date(now.getFullYear(), currentMonthBase - offset, 1);
    const start = monthAnchor(target.getFullYear(), target.getMonth(), resetDay);
    const next = new Date(target.getFullYear(), target.getMonth() + 1, 1);
    const end = monthAnchor(next.getFullYear(), next.getMonth(), resetDay);
    return { start, end };
  };

  const periodStart = useMemo(() => computePeriod(0).start, [resetDay, todayKey]);
  const periodEnd = useMemo(() => computePeriod(0).end, [resetDay, todayKey]);
  const daysInPeriod = useMemo(() => Math.max(1, Math.round((periodEnd - periodStart) / 864e5)), [periodStart, periodEnd]);
  const dayOfPeriod = useMemo(() => Math.max(1, Math.min(daysInPeriod, Math.ceil((now - periodStart) / 864e5))), [periodStart, daysInPeriod]);
  const daysLeft = useMemo(() => Math.max(1, daysInPeriod - dayOfPeriod + 1), [daysInPeriod, dayOfPeriod]);

  // v0.8.1: round2 su tutti gli aggregati monetari per evitare accumulazione
  // drift float (es. somma di 100 tx da €1.10 può dare 110.0000000001 in JS).
  const fixedMonthly = useMemo(() => round2(fixed.reduce((s, f) => s + (f.type === 'annual' ? f.amount / 12 : f.amount), 0)), [fixed]);
  // v0.8.1: usa monthlyEq per gestire cadenze diverse (annual, semestrale, etc.).
  // Un sub annuale di €120 → contribuisce €10/mese a subscriptionsMonthly.
  // Sub legacy senza cadence: default 'monthly' = stesso comportamento di prima.
  const subscriptionsMonthly = useMemo(
    () => round2(subscriptions.reduce(
      (a, s) => a + (s.active === false ? 0 : monthlyEq(s.amount || 0, s.cadence || 'monthly')),
      0
    )),
    [subscriptions]
  );
  // Annual expenses spread evenly across 12 months as auto-savings.
  const annualMonthly = useMemo(
    () => round2(annualExpenses.reduce((a, e) => a + (e.amount || 0) / 12, 0)),
    [annualExpenses]
  );

  // Salary actually received this period — the user can rectify it from Soldi.
  const monthKey = useMemo(() => {
    const d = periodStart;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [periodStart]);
  const effectiveSalary = useMemo(
    () => (salaryOverrides[monthKey] != null ? salaryOverrides[monthKey] : salary),
    [salaryOverrides, monthKey, salary]
  );

  const bufferAmt = useMemo(() => round2(Math.max(0, (effectiveSalary * buffer) / 100)), [effectiveSalary, buffer]);
  const extraThisPeriod = useMemo(() => round2(extraIncomes.filter((e) => e.ts >= periodStart.getTime() && e.ts < periodEnd.getTime()).reduce((a, e) => a + (e.amount || 0), 0)), [extraIncomes, periodStart, periodEnd]);
  const totalLocked = useMemo(() => round2(fixedMonthly + subscriptionsMonthly + annualMonthly + bufferAmt), [fixedMonthly, subscriptionsMonthly, annualMonthly, bufferAmt]);
  const freeBudget = useMemo(() => round2(Math.max(0, effectiveSalary + extraThisPeriod - totalLocked)), [effectiveSalary, extraThisPeriod, totalLocked]);
  const pTxs = useMemo(() => txs.filter((t) => t.ts >= periodStart.getTime() && t.ts < periodEnd.getTime()), [txs, periodStart, periodEnd]);
  const totalSpent = useMemo(() => round2(pTxs.reduce((a, t) => a + realCost(t), 0)), [pTxs]);
  const remaining = useMemo(() => round2(freeBudget - totalSpent), [freeBudget, totalSpent]);
  const dailyBudget = useMemo(() => round2(Math.max(0, remaining / daysLeft)), [remaining, daysLeft]);
  const isOver = freeBudget > 0 && totalSpent > freeBudget * 0.8;
  const burnPct = freeBudget > 0 ? Math.min(100, (totalSpent / freeBudget) * 100) : 0;

  const smartAlloc = useMemo(() => {
    const tw = cats.reduce((a, c) => a + c.weight, 0) || 1;
    return cats.map((c) => ({
      ...c,
      budget: (freeBudget * c.weight) / tw,
      pct: (c.weight / tw) * 100,
    }));
  }, [cats, freeBudget]);

  const smartSuggestions = useMemo(() => computeSmartSuggestions(txs, cats, 3, salary), [txs, cats, salary]);
  const insights = useMemo(() => computeInsights(txs, cats), [txs, cats]);
  const learningConfidence = useMemo(() => computeLearningConfidence(txs), [txs]);
  const learningLevel = useMemo(() => getLearningLevel(learningConfidence), [learningConfidence]);

  const applySmart = () => {
    if (!smartSuggestions) return;
    haptic('success');
    setCats((p) => applySmartAllocation(p, smartSuggestions));
  };

  const apply503020 = () => {
    haptic('success');
    setCats((p) => applySmartAllocation(p, compute503020(p)));
  };

  const forecast = useMemo(() => {
    if (dayOfPeriod < 2 || freeBudget <= 0) return null;
    const dailyAvg = totalSpent / dayOfPeriod;
    const projected = dailyAvg * daysInPeriod;
    const overrun = projected - freeBudget;
    return { dailyAvg, projected, overrun, willOverrun: overrun > 0 };
  }, [totalSpent, dayOfPeriod, daysInPeriod, freeBudget]);

  const upcomingDeductions = useMemo(() => {
    const all = [];
    const nowDay = now.getDate();
    const nowMonth = now.getMonth() + 1;
    [...fixed, ...subscriptions.map((s) => ({ ...s, type: 'subscription' }))].forEach((item) => {
      if (item.active === false) return;
      if (item.type === 'annual' && item.deductMonth !== nowMonth) return;
      const dDay = item.deductDay || 1;
      let daysUntil = dDay - nowDay;
      if (daysUntil < 0) daysUntil += 30;
      if (daysUntil <= 3 && daysUntil >= 0) all.push({ ...item, daysUntil });
    });
    return all.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [fixed, subscriptions, todayKey]);

  // v0.8.1: aggiunto todayKey nelle deps. Prima `new Date()` era chiamato
  // dentro il useMemo ma todayKey non era in deps → al midnight (es. lunedì
  // appena passato), weekStart restava calcolato sulla domenica precedente
  // finchè txs/cats non cambiavano.
  const weeklyInsight = useMemo(() => {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const thisWeek = txs.filter((t) => t.ts >= weekStart.getTime()).reduce((a, t) => a + realCost(t), 0);
    let prev = 0, cnt = 0;
    for (let i = 1; i <= 4; i++) {
      const ws = new Date(weekStart);
      ws.setDate(ws.getDate() - 7 * i);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const w = txs.filter((t) => t.ts >= ws.getTime() && t.ts < we.getTime()).reduce((a, t) => a + realCost(t), 0);
      if (w > 0) { prev += w; cnt++; }
    }
    const avg = cnt > 0 ? prev / cnt : 0;
    if (avg <= 0) return null;
    const diff = ((thisWeek - avg) / avg) * 100;
    const catTotals = {};
    txs.filter((t) => t.ts >= weekStart.getTime()).forEach((t) => { catTotals[t.cat] = (catTotals[t.cat] || 0) + realCost(t); });
    const topCatId = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];
    const topCat = cats.find((c) => c.id === topCatId);
    const topPct = thisWeek > 0 ? Math.round(((catTotals[topCatId] || 0) / thisWeek) * 100) : 0;
    return { thisWeek, avg, diff, topCat, topPct };
  }, [txs, cats, todayKey]);

  // Streak ottimizzato: pre-calcola un Set di "giorni-chiave con spese non
  // essenziali" in O(n), poi due loop di durata fissa (365 + storia).
  // Prima era O(txs × 365 × 2) ≈ 1.5M operazioni con 2000 tx → ~10ms+ render.
  // Ora è O(txs + 365 + giorni-storia) → < 1ms.
  //
  // v0.8.1: dayKeyLocal sostituisce Math.floor(ts / 864e5) per coerenza
  // timezone — vedi format.js. Era bug per tx fatte tra mezzanotte e l'01:00
  // ora locale (cadevano nel giorno UTC precedente).
  const streakData = useMemo(() => {
    const nonEssentialCats = new Set(['vices', 'wants', 'fun']);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dayKeyLocal(today.getTime());

    // Pre-calcolo: per ogni tx non-essenziale ricavo il dayKey (numero del giorno locale)
    const nonEssDays = new Set();
    let earliestTs = Infinity;
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i];
      if (t.ts < earliestTs) earliestTs = t.ts;
      if (nonEssentialCats.has(t.cat)) {
        nonEssDays.add(dayKeyLocal(t.ts));
      }
    }

    // Current streak (dai giorni partendo da oggi, conta backward)
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const dKey = todayKey - d;
      if (nonEssDays.has(dKey)) {
        if (d === 0) return { days: 0, bestStreak: 0 };
        break;
      }
      streak++;
    }

    // Best streak storico
    let best = 0, cur = 0;
    if (earliestTs !== Infinity) {
      const earliestKey = dayKeyLocal(earliestTs);
      const daysSince = todayKey - earliestKey;
      for (let d = 0; d <= daysSince; d++) {
        const dKey = earliestKey + d;
        if (nonEssDays.has(dKey)) { best = Math.max(best, cur); cur = 0; }
        else cur++;
      }
      best = Math.max(best, cur);
    }
    return { days: streak, bestStreak: best };
  }, [txs, todayKey]);

  const monthsHistory = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const p = computePeriod(i);
      const mTxs = txs.filter((t) => t.ts >= p.start.getTime() && t.ts < p.end.getTime());
      const total = round2(mTxs.reduce((a, t) => a + realCost(t), 0));
      const label = p.start.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
      arr.push({ offset: i, start: p.start, end: p.end, total, label, txCount: mTxs.length });
    }
    return arr;
  }, [txs, resetDay, todayKey]);

  const pendingCredits = useMemo(() => pTxs.filter((t) => t.credit > 0 && !t.creditReceived), [pTxs]);
  const totalPendingCredit = useMemo(() => round2(pendingCredits.reduce((a, t) => a + t.credit, 0)), [pendingCredits]);
  const totalReceivedCredit = useMemo(() => round2(pTxs.filter((t) => t.credit > 0 && t.creditReceived).reduce((a, t) => a + t.credit, 0)), [pTxs]);

  // ─── CRUD transazioni (con sync currentBalance) ─────────────────
  // Ogni operazione che cambia spese o entrate aggiorna anche il saldo
  // del modello balance-first così Today/Soldi mostrano sempre lo stesso
  // numero. `addTx` accetta anche un `ts` opzionale per inserire spese
  // di giorni passati (utile se hai dimenticato di registrarne una).
  const addTx = (amount, catId, label = '', creditExpected = 0, tags = [], ts = Date.now()) => {
    const a = parseNum(amount);
    const credit = parseNum(creditExpected);
    // Rifiuto silenzioso di importi non validi o non positivi (audit #6 bug 10).
    // Una spesa negativa romperebbe tutti i calcoli (totalSpent, freeBudget,
    // anomalia). Se l'utente intende un'entrata deve usare addExtraIncome.
    if (!Number.isFinite(a) || a <= 0) return;
    if (!catId) return;
    haptic('medium');
    setTxs((p) => [{
      id: uid(), amount: a, cat: catId, label,
      type: 'expense', ts: ts || Date.now(),
      credit, creditReceived: false,
      tags: Array.isArray(tags) ? tags : [],
    }, ...p].sort((x, y) => y.ts - x.ts));
    // realCost = amount - (creditReceived ? credit : 0). Per una tx nuova
    // creditReceived = false, quindi il costo reale = amount.
    // round2: protegge da drift binario su somme ripetute (è un'app di soldi).
    // v0.8.2: NIENTE clamp a 0 — se spendi più del saldo vai in rosso (overdraft)
    // e i conti restano corretti. Il clamp precedente "dimenticava" il debito.
    setCurrentBalance((b) => round2(b - a));
  };

  const deleteTx = (id, onUndo) => {
    const tx = txs.find((t) => t.id === id);
    if (!tx) return;
    haptic('warning');
    const restore = realCost(tx);
    setTxs((p) => p.filter((t) => t.id !== id));
    setCurrentBalance((b) => round2(b + restore));
    if (typeof onUndo === 'function') {
      onUndo(() => {
        setTxs((p) => [...p, tx].sort((a, b) => b.ts - a.ts));
        setCurrentBalance((b) => round2(b - restore)); // v0.8.2: no clamp (simmetrico al delete)
      });
    }
  };

  // Modifica una tx esistente (importo/label/cat/data). Ricalcola il delta
  // sul currentBalance se l'importo cambia.
  // Calcolo il delta FUORI dal setTxs callback per evitare l'anti-pattern
  // React di setState annidati (cattura `txs` dal closure attuale).
  const updateTx = (id, patch) => {
    haptic('medium');
    const oldTx = txs.find((t) => t.id === id);
    if (!oldTx) return;
    const updated = { ...oldTx, ...patch };
    if (patch.amount != null) updated.amount = parseNum(patch.amount);
    if (patch.ts != null) updated.ts = patch.ts;
    const delta = round2(realCost(updated) - realCost(oldTx));
    setTxs((p) => p.map((t) => t.id === id ? updated : t).sort((a, b) => b.ts - a.ts));
    if (delta !== 0) setCurrentBalance((b) => round2(b - delta)); // v0.8.2: no clamp
  };

  const markCreditReceived = (id) => {
    // Calcolo il delta FUORI dal setTxs callback (no setState annidato).
    // Idempotency: se la tx è già marked received, NON aggiungiamo di nuovo
    // il credit al balance (audit #6 sospetto, in realtà già protetto qui).
    const tx = txs.find((t) => t.id === id);
    if (!tx || tx.creditReceived || !(tx.credit > 0)) return;
    haptic('success');
    setTxs((p) => p.map((t) => t.id === id ? { ...t, creditReceived: true } : t));
    setCurrentBalance((b) => round2(b + tx.credit));
  };

  const addExtraIncome = (amount, label) => {
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0) return; // no entrate <= 0
    haptic('success');
    setExtraIncomes((p) => [...p, { id: uid(), amount: a, label, ts: Date.now() }]);
    setCurrentBalance((b) => round2(b + a));
  };

  const addSubscription = (label, amount, deductDay, cadence = 'monthly', deductMonth = null) => {
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0) return;
    haptic('medium');
    setSubscriptions((p) => [...p, {
      id: uid(),
      label: String(label || '').trim().slice(0, 60),
      amount: a,
      deductDay: Math.min(28, Math.max(1, parseInt(deductDay) || 1)),
      // v0.8.1: cadence ('weekly'|'monthly'|'bimonthly'|'quarterly'|'semiannual'|'annual')
      cadence: cadence || 'monthly',
      // v0.9.4: mese di addebito per le cadenze annuali/semestrali (1..12).
      deductMonth: deductMonth ? Math.min(12, Math.max(1, parseInt(deductMonth) || 1)) : null,
      active: true,
    }]);
  };

  const removeSubscription = (id) => {
    haptic('warning');
    setSubscriptions((p) => p.filter((s) => s.id !== id));
  };

  const toggleSubscription = (id) => {
    haptic('light');
    setSubscriptions((p) => p.map((s) => s.id === id ? { ...s, active: s.active === false ? true : false } : s));
  };

  // v0.9.19: "ignora" una ricorrenza rilevata → non riproporla più.
  const dismissRecurring = (key) => {
    if (!key) return;
    haptic('light');
    setDismissedRecurring((p) => (p.includes(key) ? p : [...p, key]));
  };

  const importTxs = (newTxs) => {
    haptic('success');
    // Importo CSV: detrae dal balance la somma di tutte le spese importate.
    // Le entrate (se presenti) andrebbero importate via addExtraIncome separato.
    const totalCost = round2(newTxs.reduce((s, t) => s + realCost(t), 0));
    setTxs((p) => [...newTxs, ...p].sort((a, b) => b.ts - a.ts));
    setCurrentBalance((b) => round2(b - totalCost)); // v0.8.2: no clamp
  };

  // Annual expenses
  const addAnnual = (label, amount, dueMonth, color) => {
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0) return;
    haptic('medium');
    setAnnualExpenses((p) => [...p, {
      id: uid(), label, amount: a,
      dueMonth: Math.min(12, Math.max(1, parseInt(dueMonth) || 1)),
      color,
    }]);
  };
  const removeAnnual = (id) => {
    haptic('warning');
    setAnnualExpenses((p) => p.filter((e) => e.id !== id));
  };

  // Salary override (rectify month's actual paycheck)
  const setSalaryForMonth = (key, amount) => {
    haptic('light');
    const next = { ...salaryOverrides };
    if (amount == null) delete next[key];
    else next[key] = parseNum(amount);
    setSalaryOverrides(next);
  };

  // Categorization rules
  const addCatRule = (contains, catId) => {
    if (!contains) return;
    haptic('light');
    setCatRules((p) => [...p, { id: uid(), contains: contains.toLowerCase().trim(), catId }]);
  };
  const removeCatRule = (id) => {
    setCatRules((p) => p.filter((r) => r.id !== id));
  };

  // Splice an extra income across N months. Records the original event + spreads
  // the amount as N additional `extraIncomes` entries dated +1m, +2m, ... +Nm.
  //
  // v0.8.1: BUGFIX. Prima la PRIMA rata veniva accreditata al balance, ma le
  // rate future avevano `ts` futuro e NESSUN meccanismo le accreditava al loro
  // mese. Risultato: splice di €1200 in 12 mesi ti dava €100 di balance e le
  // altre 11 rate sparivano nel nulla — bug finanziario.
  // Ora: rate future hanno `pendingCredit: true`. Un useEffect al cambio
  // todayKey scansiona e accredita quelle con ts <= now.
  //
  // v0.8.1: BUGFIX FLOATING POINT. Prima `per = amount / months` causava drift.
  // Es: €1000/12 = 83.333... → sommando 12 rate ottenevi 999.9996, non 1000.
  // Ora distribuiamo i centesimi: se restano N cents dalla divisione intera,
  // le prime N rate ricevono 1 cent in più. Garantisce SUM(rate) === amount.
  //
  // v0.8.1: cap m a 24 anche internamente (SpliceModal già lo fa nel slider,
  // ma se qualcuno chiama da console/test/script con months=100 non vogliamo
  // creare 100 entries).
  const addSplicedIncome = (amount, label, months) => {
    haptic('success');
    const a = parseNum(amount);
    if (a <= 0) return;
    const m = Math.max(1, Math.min(24, parseInt(months) || 1));

    // Distribuzione esatta dei centesimi (no floating-point drift):
    // totalCents = importo totale in centesimi (intero, no float error)
    // perCents = quota base = floor(totalCents / m)
    // remainder = totalCents - perCents * m (centesimi avanzati 0..m-1)
    // Le prime `remainder` rate ricevono perCents+1 cents; le altre perCents.
    // Esempio: €1000/12 → totalCents=100000, perCents=8333, remainder=4
    //   prime 4 rate = €83.34, ultime 8 rate = €83.33, totale esatto €1000.
    const totalCents = Math.round(a * 100);
    const baseCents = Math.floor(totalCents / m);
    const remainder = totalCents - baseCents * m;
    const centsForRate = (i) => baseCents + (i < remainder ? 1 : 0);

    const items = [];
    const baseTs = Date.now();
    const baseDate = new Date(baseTs);
    for (let i = 0; i < m; i++) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() + i);
      items.push({
        id: uid(),
        amount: centsForRate(i) / 100, // riconverti in euro a 2 decimali esatti
        label: i === 0 ? label : `${label} (${i + 1}/${m})`,
        ts: i === 0 ? baseTs : d.getTime(),
        // Rate future marcate pending: il midnight tick le accredita
        // quando arriva il loro mese (catch-up anche se l'app è chiusa).
        pendingCredit: i > 0,
      });
    }
    setExtraIncomes((p) => [...p, ...items]);
    // La PRIMA rata e' di "oggi" e viene accreditata subito.
    setCurrentBalance((b) => round2(b + items[0].amount));
  };

  // Catch-up rate splice arrivate: scansiona extraIncomes con pendingCredit=true
  // e ts <= ora, le accredita al balance e marca pendingCredit=false.
  // Trigger: ad ogni cambio di todayKey (midnight tick) + al boot dell'app
  // (così se l'utente non apre l'app per 6 mesi, al riavvio recupera tutto).
  useEffect(() => {
    if (!booted) return;
    const nowTs = Date.now();
    const due = extraIncomes.filter((e) => e.pendingCredit && e.ts <= nowTs);
    if (due.length === 0) return;
    // round2 sul totale: somma di N rate da 83.33+83.34+... = importo originale
    // esatto se le rate sono già intere-in-centesimi (cap. splice fix). Round2
    // è una safety net anche per backup vecchi che non avevano il fix.
    const total = round2(due.reduce((s, e) => s + (e.amount || 0), 0));
    const dueIds = new Set(due.map((e) => e.id));
    setExtraIncomes((p) => p.map((e) => dueIds.has(e.id) ? { ...e, pendingCredit: false } : e));
    setCurrentBalance((b) => round2(b + total));
  }, [todayKey, booted]);  // extraIncomes intenzionalmente NON in deps: evita loop infinito (la stessa useEffect modifica extraIncomes).

  // Tutorial state
  const markTutorialSeen = (screenId) => {
    setTutorialState((p) => ({ ...p, [screenId]: true }));
  };
  const resetAllTutorials = () => {
    setTutorialState({});
    setTutorialSeen(false);
  };

  // ─── Balance-first derived (cap. 2) ─────────────────────────────
  // Tutte le quantità seguenti sono calcolate al volo dal saldo reale
  // e dalle entrate dichiarate. Non sostituiscono ancora salary/freeBudget,
  // ma le schermate nuove (cap. 4) leggeranno da qui.

  // ─── Modello balance-first → Prediction Engine (lib/engine) ─────
  // v0.9.x (Financial Copilot · Tappa 0): i derivati balance-first sono ora
  // calcolati da computeFinance() — funzione PURA, fonte unica, stesse formule
  // di prima. Qui li memorizziamo e li ridistribuiamo con gli stessi nomi.
  const fin = useMemo(
    () => computeFinance(
      { currentBalance, cushion, goals, fixed, subscriptions, incomes, extraIncomes, recurringPaid, recurringSkipped, txs, todayKey, daysInPeriod, dayOfPeriod, monthlySavingsTarget },
      now,
    ),
    [currentBalance, cushion, goals, fixed, subscriptions, incomes, extraIncomes, recurringPaid, recurringSkipped, txs, todayKey, daysInPeriod, dayOfPeriod, monthlySavingsTarget],
  );
  const totalGoalsSaved = fin.totalGoalsSaved;
  const nextIncomeAt = fin.nextIncomeAt;
  const lockedUntilNext = fin.lockedUntilNext;
  const freeUntilNext = fin.freeUntilNext;
  const spendableUntilNext = fin.spendableUntilNext; // libero dopo aver messo via i risparmi
  const daysToNextIncome = fin.daysToNextIncome;
  const cycleStatus = fin.cycleStatus;               // semaforo: sereno | attento | rosso
  const cycleStatusReason = fin.cycleStatusReason;

  // v0.8.2: promemoria "aggiorna saldo dopo la paga" (modello manuale).
  // lastPaydayDate = paga più recente <= oggi. Se è successiva all'ultimo
  // aggiornamento manuale del saldo, l'utente è stato pagato ma non ha
  // ancora rinfrescato il saldo → mostriamo un nudge in Soldi.
  const lastPaydayDate = useMemo(() => prevIncomeDate(incomes, now), [incomes, todayKey]);
  const needsBalanceUpdate = useMemo(() => {
    if (lastBalanceUpdate == null) return false; // non ancora inizializzato
    if (!lastPaydayDate) return false;            // nessuna entrata configurata
    return lastPaydayDate.getTime() > lastBalanceUpdate;
  }, [lastBalanceUpdate, lastPaydayDate]);

  // v0.9.25: riconciliazione. Il saldo è manuale → nel tempo può discostarsi
  // dalla banca (spese non segnate, arrotondamenti). Ogni 14+ giorni dall'ultimo
  // aggiornamento proponiamo un controllo gentile. Mai insieme al nudge paga.
  const needsReconcile = useMemo(() => {
    if (!booted || lastBalanceUpdate == null || needsBalanceUpdate) return false;
    return (Date.now() - lastBalanceUpdate) > 14 * 864e5;
  }, [booted, lastBalanceUpdate, needsBalanceUpdate, todayKey]);

  // v0.9.3: promemoria backup. Scatta se ci sono dati che vale la pena salvare
  // e non fai un backup da 30+ giorni (o mai). Non disturba i nuovissimi utenti.
  const daysSinceBackup = useMemo(
    () => (lastBackup ? Math.floor((Date.now() - lastBackup) / 864e5) : null),
    [lastBackup, todayKey]
  );
  const needsBackup = useMemo(() => {
    const hasData = txs.length >= 5 || goals.length > 0;
    if (!hasData) return false;
    return lastBackup == null || (daysSinceBackup != null && daysSinceBackup >= 30);
  }, [txs.length, goals.length, lastBackup, daysSinceBackup]);
  // Init: al primo boot, se lastBalanceUpdate è null lo settiamo a ora così
  // il primo promemoria scatta dopo la PROSSIMA paga (non retroattivamente).
  useEffect(() => {
    if (booted && lastBalanceUpdate == null) setLastBalanceUpdate(Date.now());
  }, [booted, lastBalanceUpdate]);

  // QUOTA GIORNALIERA CANONICA — unica fonte di verità per Today e Money.
  // Calcolata nel Prediction Engine (vedi `fin` sopra): spesa di oggi, quota
  // teorica del giorno (stabile), quanto puoi ancora spendere, sforamento.
  const spentToday = fin.spentToday;
  const dailyQuota = fin.dailyQuota;
  const effectiveDaily = fin.effectiveDaily;
  const dailyOverflow = fin.dailyOverflow;

  // CRUD multi-conto (cap. B)
  // v0.8.1: validazione finanziaria. Tutti i balance passano da round2 (no
  // drift float), Math.max(0, ...) (no saldi negativi), Number.isFinite
  // (no NaN/Infinity da input malformati o devtools).
  const addAccount = (label, balance = 0, icon = 'wallet') => {
    haptic('success');
    const id = `acc_${uid()}`;
    const safeBalance = round2(Math.max(0, parseNum(balance) || 0));
    setAccounts((p) => [...p, { id, label: label || 'Conto', balance: safeBalance, icon, active: true }]);
    return id;
  };
  const updateAccount = (id, patch) => {
    // Sanitize patch: balance deve essere finito e arrotondato 2 dec.
    // v0.8.2: AMMESSO negativo (coerenza col saldo principale) — utile per
    // registrare un conto carta di credito in rosso. Il trasferimento tra
    // conti resta comunque bloccato se i fondi non bastano (transferBetween).
    const safe = { ...patch };
    if (safe.balance != null) {
      const n = parseNum(safe.balance);
      safe.balance = round2(Number.isFinite(n) ? n : 0);
    }
    setAccounts((p) => p.map((a) => a.id === id ? { ...a, ...safe } : a));
  };
  const removeAccount = (id) => {
    if (id === 'main') return; // 'main' non eliminabile
    haptic('warning');
    // Prima di rimuovere, AUTO-MERGE il balance del conto eliminato
    // nel 'main', così i soldi non spariscono visivamente (audit #6 bug 10).
    setAccounts((p) => {
      const toRemove = p.find((a) => a.id === id);
      const transferAmount = round2(toRemove?.balance || 0);
      return p
        .filter((a) => a.id !== id)
        .map((a) => a.id === 'main' ? { ...a, balance: round2((a.balance || 0) + transferAmount) } : a);
    });
  };
  // Trasferisci tra conti (solo movimento interno, non tocca currentBalance globale).
  // Restituisce true se ok, false in caso di errore — il chiamante puo' mostrare toast.
  const transferBetween = (fromId, toId, amount) => {
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0 || fromId === toId) return false;
    const from = accounts.find((acc) => acc.id === fromId);
    const to = accounts.find((acc) => acc.id === toId);
    if (!from || !to) return false; // account cancellato nel frattempo
    if ((from.balance || 0) < a) return false; // saldo insufficiente
    haptic('success');
    setAccounts((p) => p.map((acc) => {
      // round2 su entrambe le operazioni per evitare drift float
      if (acc.id === fromId) return { ...acc, balance: round2(Math.max(0, (acc.balance || 0) - a)) };
      if (acc.id === toId) return { ...acc, balance: round2((acc.balance || 0) + a) };
      return acc;
    }));
    return true;
  };

  // CRUD entrate ricorrenti
  // v0.9.25: `extra` opzionale { cadence, anchorTs } per entrate non mensili
  // (weekly | biweekly | fourweekly + data di una paga nota come ancora).
  const addIncome = (label, amount, dayOfMonth, kind = 'extra', extra = {}) => {
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0) return;
    const validCadence = ['weekly', 'biweekly', 'fourweekly'].includes(extra.cadence)
      && Number.isFinite(extra.anchorTs);
    haptic('success');
    setIncomes((p) => [...p, {
      id: uid(),
      label: label || 'Entrata',
      amount: a,
      dayOfMonth: Math.min(28, Math.max(1, parseInt(dayOfMonth) || 1)),
      kind,
      active: true,
      ...(validCadence ? { cadence: extra.cadence, anchorTs: extra.anchorTs } : {}),
    }]);
  };
  const updateIncome = (id, patch) => {
    // Clamp di sicurezza: anche tramite edit diretto, dayOfMonth deve restare
    // 1..28 (evitare 29-31 che non esistono in feb e rompono freeUntilNextIncome).
    const safe = { ...patch };
    if (safe.dayOfMonth != null) {
      safe.dayOfMonth = Math.min(28, Math.max(1, parseInt(safe.dayOfMonth) || 1));
    }
    if (safe.amount != null) safe.amount = parseNum(safe.amount);
    setIncomes((p) => p.map((i) => i.id === id ? { ...i, ...safe } : i));
  };
  const removeIncome = (id) => {
    haptic('warning');
    setIncomes((p) => p.filter((i) => i.id !== id));
  };
  const toggleIncome = (id) => {
    setIncomes((p) => p.map((i) => i.id === id ? { ...i, active: i.active === false ? true : false } : i));
  };

  // Wishes: feature unificata negli Obiettivi (v0.9.1). La CRUD dedicata è
  // stata rimossa; `wishes` resta solo come SORGENTE di migrazione verso goals
  // (vedi migratedGoals all'inizio dello store). Niente più scrittura su wishes.

  // ─── Salvadanaio / obiettivi di risparmio (v0.9) ───────────────
  // Modello "envelope": accantonare sposta soldi dal LIBERO al salvadanaio
  // senza toccare currentBalance (che resta = saldo in banca). I soldi messi
  // via escono dallo spendibile via freeUntilNextIncome(goalsSaved).
  const addGoal = (label, target, months = null, icon = 'goal') => {
    haptic('success');
    const id = uid();
    setGoals((p) => [...p, {
      id,
      label: String(label || 'Obiettivo').trim().slice(0, 60),
      target: Math.max(0, parseNum(target)),
      saved: 0,
      months: months ? Math.max(1, Math.min(120, parseInt(months) || 0)) || null : null,
      icon,
      createdTs: Date.now(),
    }]);
    return id;
  };
  const updateGoal = (id, patch) => {
    const safe = { ...patch };
    if (safe.target != null) safe.target = Math.max(0, parseNum(safe.target));
    if (safe.label != null) safe.label = String(safe.label).trim().slice(0, 60);
    setGoals((p) => p.map((g) => g.id === id ? { ...g, ...safe } : g));
  };
  // Metti via: earmark dal libero. Ritorna true se ok, false se fondi insufficienti.
  const contributeGoal = (id, amount) => {
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0) return false;
    // non puoi accantonare più di quello che è davvero libero
    if (a > freeUntilNext + 0.001) return false;
    haptic('success');
    setGoals((p) => p.map((g) => g.id === id ? { ...g, saved: round2((g.saved || 0) + a) } : g));
    return true;
  };
  // Preleva: i soldi tornano al libero. Ritorna true se ok.
  const withdrawGoal = (id, amount) => {
    const g = goals.find((x) => x.id === id);
    const a = parseNum(amount);
    if (!g || !Number.isFinite(a) || a <= 0 || a > (g.saved || 0) + 0.001) return false;
    haptic('medium');
    setGoals((p) => p.map((x) => x.id === id ? { ...x, saved: round2((x.saved || 0) - a) } : x));
    return true;
  };
  const removeGoal = (id) => {
    haptic('warning');
    // i soldi accantonati tornano automaticamente al libero (totalGoalsSaved cala)
    setGoals((p) => p.filter((g) => g.id !== id));
  };

  // ─── Segna ricorrente come pagata (v0.9) ───────────────────────
  const recurringPaidKey = (id, date) => {
    const d = new Date(date || Date.now());
    return `${id}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const isRecurringPaid = (id, date) => !!recurringPaid[recurringPaidKey(id, date)];
  // Registra un fisso/abbonamento come spesa reale: crea la tx (scala il saldo)
  // E marca l'occorrenza come pagata (così non viene più contata nel "locked"/
  // libero, evitando il doppio conteggio). Ritorna true se ok, false se già pagata.
  const markRecurringPaid = ({ id, label, amount, date, catId }) => {
    const key = recurringPaidKey(id, date);
    if (recurringPaid[key]) return false; // già segnata pagata per quel mese
    const a = parseNum(amount);
    if (!Number.isFinite(a) || a <= 0) return false;
    const cat = catId && cats.some((c) => c.id === catId) ? catId : (cats[0]?.id || '');
    const dueTs = date ? new Date(date).getTime() : Date.now();
    const ts = (Number.isFinite(dueTs) && dueTs <= Date.now()) ? dueTs : Date.now();
    // Tag 'ricorrente': la spesa è reale (scala il saldo) ma NON è spesa
    // variabile → il burn rate la esclude, altrimenti verrebbe contata due
    // volte (una qui, una nei fissi/abbonamenti del flusso mensile).
    addTx(a, cat, label || 'Spesa ricorrente', 0, ['ricorrente'], ts); // scala il saldo
    setRecurringPaid((p) => ({ ...p, [key]: Date.now() }));
    return true;
  };

  // v0.9.25: salta/ripristina un'occorrenza ricorrente del mese ("non lo pago").
  // Toggle: se era saltata torna in programma. Non si può saltare una già pagata.
  const toggleSkipRecurring = (id, date) => {
    const key = recurringPaidKey(id, date);
    if (recurringPaid[key]) return false; // già pagata questo mese
    haptic('light');
    setRecurringSkipped((p) => {
      const n = { ...p };
      if (n[key]) delete n[key]; else n[key] = Date.now();
      return n;
    });
    return true;
  };
  const isRecurringSkipped = (id, date) => !!recurringSkipped[recurringPaidKey(id, date)];

  return {
    booted, setBooted,
    name, setName, salary, setSalary, resetDay, setResetDay,
    salaryOverrides, setSalaryForMonth, effectiveSalary, monthKey,
    cats, setCats, txs, setTxs, fixed, setFixed,
    annualExpenses, setAnnualExpenses, addAnnual, removeAnnual, annualMonthly,
    homeCats, setHomeCats,
    buffer, setBuffer, widgets, setWidgets,
    subscriptions, setSubscriptions, extraIncomes, setExtraIncomes,
    celebrated, setCelebrated,
    catRules, setCatRules, addCatRule, removeCatRule,
    tutorialState, markTutorialSeen, resetAllTutorials,
    wishes,
    // v0.9: salvadanaio
    goals, addGoal, updateGoal, contributeGoal, withdrawGoal, removeGoal, totalGoalsSaved,
    // v0.9: segna ricorrente come pagata
    recurringPaid, markRecurringPaid, isRecurringPaid,
    // v0.9.25: salta un'occorrenza del mese senza crearne la spesa
    recurringSkipped, toggleSkipRecurring, isRecurringSkipped,
    theme, setTheme, themeId, setThemeId, privacy, setPrivacy,
    tutorialSeen, setTutorialSeen,
    now, todayKey, periodStart, periodEnd, daysInPeriod, dayOfPeriod, daysLeft,
    fixedMonthly, subscriptionsMonthly, bufferAmt,
    extraThisPeriod, totalLocked, freeBudget, pTxs, totalSpent, remaining,
    dailyBudget, isOver, burnPct, smartAlloc, smartSuggestions, insights,
    learningConfidence, learningLevel, applySmart, apply503020,
    forecast, upcomingDeductions, weeklyInsight, streakData, monthsHistory,
    pendingCredits, totalPendingCredit, totalReceivedCredit,
    addTx, updateTx, deleteTx, markCreditReceived,
    addExtraIncome, addSplicedIncome,
    addSubscription, removeSubscription, toggleSubscription,
    // v0.9.19: ricorrenze rilevate (suggerimenti con un tap)
    dismissedRecurring, dismissRecurring,
    importTxs, computePeriod,
    // balance-first (cap. 2) — schermate cap. 4 leggeranno da qui
    currentBalance, setCurrentBalance,
    incomes, setIncomes,
    cushion, setCushion,
    monthlySavingsTarget, setMonthlySavingsTarget,
    addIncome, updateIncome, removeIncome, toggleIncome,
    nextIncomeAt, daysToNextIncome, lockedUntilNext, freeUntilNext, spendableUntilNext,
    cycleStatus, cycleStatusReason,
    // v0.8.2: promemoria aggiornamento saldo dopo la paga (modello manuale)
    lastBalanceUpdate, markBalanceUpdated, needsBalanceUpdate, lastPaydayDate,
    needsReconcile,
    // v0.9.3: promemoria backup
    lastBackup, markBackup, needsBackup, daysSinceBackup,
    // v0.8.2: quota giornaliera canonica (Today + Money leggono da qui)
    spentToday, dailyQuota, effectiveDaily, dailyOverflow,
    // multi-conto (cap. B)
    accounts, setAccounts, addAccount, updateAccount, removeAccount, transferBetween,
  };
};
