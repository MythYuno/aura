import { useState, useEffect, useMemo, useRef } from 'react';
import { load, save } from '../lib/storage.js';
import { realCost, uid, parseNum } from '../lib/format.js';
import { computeSmartSuggestions, computeInsights, computeLearningConfidence, getLearningLevel, applySmartAllocation, compute503020 } from '../lib/intelligence.js';
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
  const [currentSavings, setCurrentSavings] = useState(stored?.currentSavings || 0);

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
  const [quickActions, setQuickActions] = useState(stored?.quickActions || []);
  // Up to 4 category ids surfaced as quick chips on the home quick-add.
  const [homeCats, setHomeCats] = useState(stored?.homeCats || ['food', 'transport', 'home']);
  const [dreams, setDreams] = useState(stored?.dreams || []);
  const [buffer, setBuffer] = useState(stored?.buffer ?? 10);
  const [widgets, setWidgets] = useState(stored?.widgets || defaultWidgets);
  const [subscriptions, setSubscriptions] = useState(stored?.subscriptions || []);
  const [extraIncomes, setExtraIncomes] = useState(stored?.extraIncomes || []);
  const [rolloverTarget, setRolloverTarget] = useState(stored?.rolloverTarget || 'none');
  const [rolloverHistory, setRolloverHistory] = useState(stored?.rolloverHistory || []);
  const [celebrated, setCelebrated] = useState(stored?.celebrated || {});

  // User-defined categorization rules: { id, contains, catId } — overrides smart-cat suggestions.
  const [catRules, setCatRules] = useState(stored?.catRules || []);
  // Tutorial visited flags — keyed per screen so we can show the tour once.
  const [tutorialState, setTutorialState] = useState(stored?.tutorialState || {});

  const [theme, setTheme] = useState(stored?.theme || 'dark');
  const [themeId, setThemeId] = useState(stored?.themeId || 'aurora');
  const [privacy, setPrivacy] = useState(false);
  // Legacy global flag — kept so existing backups still work. New tutorial
  // flow uses tutorialState[screenId] instead.
  const [tutorialSeen, setTutorialSeen] = useState(stored?.tutorialSeen || false);

  // Debounced save: collapses bursts (slider drags, rapid toggles) into one write.
  // Flushes on unmount/visibility change to avoid losing the last edit.
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);
  useEffect(() => {
    if (!booted) return;
    pendingSave.current = {
      name, salary, resetDay, currentSavings, salaryOverrides,
      cats, txs, fixed, annualExpenses, quickActions, homeCats,
      dreams, buffer, widgets, theme, themeId, extraIncomes, subscriptions,
      rolloverTarget, rolloverHistory, celebrated,
      catRules, tutorialState, tutorialSeen,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pendingSave.current) save(pendingSave.current);
      pendingSave.current = null;
    }, 250);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [
    name, salary, resetDay, currentSavings, salaryOverrides,
    cats, txs, fixed, annualExpenses, quickActions, homeCats,
    dreams, buffer, widgets, booted, theme, themeId, extraIncomes, subscriptions,
    rolloverTarget, rolloverHistory, celebrated,
    catRules, tutorialState, tutorialSeen,
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

  const fixedMonthly = useMemo(() => fixed.reduce((s, f) => s + (f.type === 'annual' ? f.amount / 12 : f.amount), 0), [fixed]);
  const subscriptionsMonthly = useMemo(() => subscriptions.reduce((a, s) => a + (s.active === false ? 0 : s.amount || 0), 0), [subscriptions]);
  // Annual expenses spread evenly across 12 months as auto-savings.
  const annualMonthly = useMemo(
    () => annualExpenses.reduce((a, e) => a + (e.amount || 0) / 12, 0),
    [annualExpenses]
  );
  const dreamAlloc = useMemo(() => dreams.reduce((a, d) => a + (d.alloc || 0), 0), [dreams]);

  // Salary actually received this period — the user can rectify it from Soldi.
  const monthKey = useMemo(() => {
    const d = periodStart;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [periodStart]);
  const effectiveSalary = useMemo(
    () => (salaryOverrides[monthKey] != null ? salaryOverrides[monthKey] : salary),
    [salaryOverrides, monthKey, salary]
  );

  const bufferAmt = useMemo(() => Math.max(0, (effectiveSalary * buffer) / 100), [effectiveSalary, buffer]);
  const extraThisPeriod = useMemo(() => extraIncomes.filter((e) => e.ts >= periodStart.getTime() && e.ts < periodEnd.getTime()).reduce((a, e) => a + (e.amount || 0), 0), [extraIncomes, periodStart, periodEnd]);
  const totalLocked = useMemo(() => fixedMonthly + subscriptionsMonthly + annualMonthly + dreamAlloc + bufferAmt, [fixedMonthly, subscriptionsMonthly, annualMonthly, dreamAlloc, bufferAmt]);
  const freeBudget = useMemo(() => Math.max(0, effectiveSalary + extraThisPeriod - totalLocked), [effectiveSalary, extraThisPeriod, totalLocked]);
  const pTxs = useMemo(() => txs.filter((t) => t.ts >= periodStart.getTime() && t.ts < periodEnd.getTime()), [txs, periodStart, periodEnd]);
  const totalSpent = useMemo(() => pTxs.reduce((a, t) => a + realCost(t), 0), [pTxs]);
  const remaining = useMemo(() => freeBudget - totalSpent, [freeBudget, totalSpent]);
  const dailyBudget = useMemo(() => Math.max(0, remaining / daysLeft), [remaining, daysLeft]);
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
  }, [txs, cats]);

  const streakData = useMemo(() => {
    const nonEssentialCats = ['vices', 'wants', 'fun'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let d = 0; d < 365; d++) {
      const ds = new Date(today);
      ds.setDate(ds.getDate() - d);
      const de = new Date(ds);
      de.setDate(de.getDate() + 1);
      const hasNonEss = txs.some((t) => t.ts >= ds.getTime() && t.ts < de.getTime() && nonEssentialCats.includes(t.cat));
      if (hasNonEss) { if (d === 0) return { days: 0, bestStreak: 0 }; break; }
      streak++;
    }
    let best = 0, cur = 0;
    const sorted = [...txs].sort((a, b) => a.ts - b.ts);
    if (sorted.length > 0) {
      const earliest = new Date(sorted[0].ts);
      earliest.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today - earliest) / 864e5);
      for (let d = 0; d <= daysSince; d++) {
        const ds = new Date(earliest);
        ds.setDate(ds.getDate() + d);
        const de = new Date(ds);
        de.setDate(de.getDate() + 1);
        const hasNonEss = txs.some((t) => t.ts >= ds.getTime() && t.ts < de.getTime() && nonEssentialCats.includes(t.cat));
        if (hasNonEss) { best = Math.max(best, cur); cur = 0; } else cur++;
      }
      best = Math.max(best, cur);
    }
    return { days: streak, bestStreak: best };
  }, [txs]);

  const monthsHistory = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const p = computePeriod(i);
      const mTxs = txs.filter((t) => t.ts >= p.start.getTime() && t.ts < p.end.getTime());
      const total = mTxs.reduce((a, t) => a + realCost(t), 0);
      const label = p.start.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
      arr.push({ offset: i, start: p.start, end: p.end, total, label, txCount: mTxs.length });
    }
    return arr;
  }, [txs, resetDay, todayKey]);

  const pendingCredits = useMemo(() => pTxs.filter((t) => t.credit > 0 && !t.creditReceived), [pTxs]);
  const totalPendingCredit = useMemo(() => pendingCredits.reduce((a, t) => a + t.credit, 0), [pendingCredits]);
  const totalReceivedCredit = useMemo(() => pTxs.filter((t) => t.credit > 0 && t.creditReceived).reduce((a, t) => a + t.credit, 0), [pTxs]);

  const addTx = (amount, catId, label = '', creditExpected = 0, tags = []) => {
    haptic('medium');
    setTxs((p) => [...p, {
      id: uid(), amount: parseNum(amount), cat: catId, label,
      type: 'expense', ts: Date.now(),
      credit: parseNum(creditExpected), creditReceived: false,
      tags: Array.isArray(tags) ? tags : [],
    }]);
  };

  const deleteTx = (id, onUndo) => {
    const tx = txs.find((t) => t.id === id);
    if (!tx) return;
    haptic('warning');
    setTxs((p) => p.filter((t) => t.id !== id));
    if (typeof onUndo === 'function') {
      onUndo(() => setTxs((p) => [...p, tx].sort((a, b) => b.ts - a.ts)));
    }
  };

  const markCreditReceived = (id) => {
    haptic('success');
    setTxs((p) => p.map((t) => (t.id === id ? { ...t, creditReceived: true } : t)));
  };

  const addExtraIncome = (amount, label) => {
    haptic('success');
    setExtraIncomes((p) => [...p, { id: uid(), amount: parseNum(amount), label, ts: Date.now() }]);
  };

  const addSubscription = (label, amount, deductDay) => {
    haptic('medium');
    setSubscriptions((p) => [...p, {
      id: uid(), label, amount: parseNum(amount),
      deductDay: parseInt(deductDay) || 1, active: true,
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

  const importTxs = (newTxs) => {
    haptic('success');
    setTxs((p) => [...p, ...newTxs]);
  };

  // Annual expenses
  const addAnnual = (label, amount, dueMonth, color) => {
    haptic('medium');
    setAnnualExpenses((p) => [...p, {
      id: uid(), label, amount: parseNum(amount),
      dueMonth: parseInt(dueMonth) || 1, color,
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
  const addSplicedIncome = (amount, label, months) => {
    haptic('success');
    const a = parseNum(amount);
    if (a <= 0) return;
    const m = Math.max(1, parseInt(months) || 1);
    const per = a / m;
    const items = [];
    const baseTs = Date.now();
    for (let i = 0; i < m; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      items.push({
        id: uid(),
        amount: per,
        label: i === 0 ? label : `${label} (${i + 1}/${m})`,
        ts: i === 0 ? baseTs : d.getTime(),
      });
    }
    setExtraIncomes((p) => [...p, ...items]);
  };

  // Tutorial state
  const markTutorialSeen = (screenId) => {
    setTutorialState((p) => ({ ...p, [screenId]: true }));
  };
  const resetAllTutorials = () => {
    setTutorialState({});
    setTutorialSeen(false);
  };

  return {
    booted, setBooted,
    name, setName, salary, setSalary, resetDay, setResetDay,
    currentSavings, setCurrentSavings,
    salaryOverrides, setSalaryForMonth, effectiveSalary, monthKey,
    cats, setCats, txs, setTxs, fixed, setFixed,
    annualExpenses, setAnnualExpenses, addAnnual, removeAnnual, annualMonthly,
    quickActions, setQuickActions,
    homeCats, setHomeCats,
    dreams, setDreams,
    buffer, setBuffer, widgets, setWidgets,
    subscriptions, setSubscriptions, extraIncomes, setExtraIncomes,
    rolloverTarget, setRolloverTarget, rolloverHistory, setRolloverHistory,
    celebrated, setCelebrated,
    catRules, setCatRules, addCatRule, removeCatRule,
    tutorialState, markTutorialSeen, resetAllTutorials,
    theme, setTheme, themeId, setThemeId, privacy, setPrivacy,
    tutorialSeen, setTutorialSeen,
    now, todayKey, periodStart, periodEnd, daysInPeriod, dayOfPeriod, daysLeft,
    fixedMonthly, subscriptionsMonthly, dreamAlloc, bufferAmt,
    extraThisPeriod, totalLocked, freeBudget, pTxs, totalSpent, remaining,
    dailyBudget, isOver, burnPct, smartAlloc, smartSuggestions, insights,
    learningConfidence, learningLevel, applySmart, apply503020,
    forecast, upcomingDeductions, weeklyInsight, streakData, monthsHistory,
    pendingCredits, totalPendingCredit, totalReceivedCredit,
    addTx, deleteTx, markCreditReceived,
    addExtraIncome, addSplicedIncome,
    addSubscription, removeSubscription, toggleSubscription,
    importTxs, computePeriod,
  };
};
