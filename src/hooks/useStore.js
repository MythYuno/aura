import { useState, useEffect, useMemo } from 'react';
import { load, save } from '../lib/storage.js';
import { realCost, uid, parseNum } from '../lib/format.js';
import { computeSmartSuggestions, computeInsights } from '../lib/intelligence.js';
import { haptic } from '../lib/haptic.js';
import { defaultCats } from '../data/categories.js';
import { defaultWidgets } from '../data/widgets.js';

export const useStore = () => {
  const stored = useMemo(() => load(), []);
  const [booted, setBooted] = useState(!!stored);

  const [name, setName] = useState(stored?.name || '');
  const [salary, setSalary] = useState(stored?.salary || 0);
  const [resetDay, setResetDay] = useState(stored?.resetDay || 1);
  const [currentSavings, setCurrentSavings] = useState(stored?.currentSavings || 0);

  const [cats, setCats] = useState(stored?.cats || defaultCats);
  const [txs, setTxs] = useState(stored?.txs || []);
  const [fixed, setFixed] = useState(stored?.fixed || []);
  const [quickActions, setQuickActions] = useState(stored?.quickActions || []);
  const [dreams, setDreams] = useState(stored?.dreams || []);
  const [buffer, setBuffer] = useState(stored?.buffer ?? 10);
  const [widgets, setWidgets] = useState(stored?.widgets || defaultWidgets);
  const [subscriptions, setSubscriptions] = useState(stored?.subscriptions || []);
  const [extraIncomes, setExtraIncomes] = useState(stored?.extraIncomes || []);
  const [rolloverTarget, setRolloverTarget] = useState(stored?.rolloverTarget || 'none');
  const [rolloverHistory, setRolloverHistory] = useState(stored?.rolloverHistory || []);
  const [celebrated, setCelebrated] = useState(stored?.celebrated || {});

  const [theme, setTheme] = useState(stored?.theme || 'dark');
  const [themeId, setThemeId] = useState(stored?.themeId || 'aurora');
  const [privacy, setPrivacy] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(stored?.tutorialSeen || false);

  useEffect(() => {
    if (!booted) return;
    save({
      name, salary, resetDay, currentSavings, cats, txs, fixed, quickActions,
      dreams, buffer, widgets, theme, themeId, extraIncomes, subscriptions,
      rolloverTarget, rolloverHistory, celebrated, tutorialSeen,
    });
  }, [
    name, salary, resetDay, currentSavings, cats, txs, fixed, quickActions,
    dreams, buffer, widgets, booted, theme, themeId, extraIncomes, subscriptions,
    rolloverTarget, rolloverHistory, celebrated, tutorialSeen,
  ]);

  const now = new Date();
  const computePeriod = (offset = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), resetDay);
    if (d > now) d.setMonth(d.getMonth() - 1);
    d.setMonth(d.getMonth() - offset);
    const end = new Date(d);
    end.setMonth(end.getMonth() + 1);
    return { start: d, end };
  };

  const periodStart = useMemo(() => computePeriod(0).start, [resetDay, now.getMonth(), now.getDate()]);
  const periodEnd = useMemo(() => computePeriod(0).end, [resetDay, now.getMonth(), now.getDate()]);
  const daysInPeriod = useMemo(() => Math.max(1, Math.round((periodEnd - periodStart) / 864e5)), [periodStart, periodEnd]);
  const dayOfPeriod = useMemo(() => Math.max(1, Math.min(daysInPeriod, Math.ceil((now - periodStart) / 864e5))), [periodStart, daysInPeriod]);
  const daysLeft = useMemo(() => Math.max(1, daysInPeriod - dayOfPeriod + 1), [daysInPeriod, dayOfPeriod]);

  const fixedMonthly = useMemo(() => fixed.reduce((s, f) => s + (f.type === 'annual' ? f.amount / 12 : f.amount), 0), [fixed]);
  const subscriptionsMonthly = useMemo(() => subscriptions.reduce((a, s) => a + (s.active === false ? 0 : s.amount || 0), 0), [subscriptions]);
  const dreamAlloc = useMemo(() => dreams.reduce((a, d) => a + (d.alloc || 0), 0), [dreams]);
  const bufferAmt = useMemo(() => Math.max(0, (salary * buffer) / 100), [salary, buffer]);
  const extraThisPeriod = useMemo(() => extraIncomes.filter((e) => e.ts >= periodStart.getTime() && e.ts < periodEnd.getTime()).reduce((a, e) => a + (e.amount || 0), 0), [extraIncomes, periodStart, periodEnd]);
  const totalLocked = useMemo(() => fixedMonthly + subscriptionsMonthly + dreamAlloc + bufferAmt, [fixedMonthly, subscriptionsMonthly, dreamAlloc, bufferAmt]);
  const freeBudget = useMemo(() => Math.max(0, salary + extraThisPeriod - totalLocked), [salary, extraThisPeriod, totalLocked]);
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
    [...fixed, ...subscriptions.map((s) => ({ ...s, type: 'subscription' }))].forEach((item) => {
      if (item.active === false) return;
      if (item.type === 'annual' && item.deductMonth !== now.getMonth() + 1) return;
      const dDay = item.deductDay || 1;
      let daysUntil = dDay - nowDay;
      if (daysUntil < 0) daysUntil += 30;
      if (daysUntil <= 3 && daysUntil >= 0) all.push({ ...item, daysUntil });
    });
    return all.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [fixed, subscriptions, now]);

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
  }, [txs, resetDay, now.getMonth(), now.getDate()]);

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

  return {
    booted, setBooted,
    name, setName, salary, setSalary, resetDay, setResetDay,
    currentSavings, setCurrentSavings,
    cats, setCats, txs, setTxs, fixed, setFixed,
    quickActions, setQuickActions, dreams, setDreams,
    buffer, setBuffer, widgets, setWidgets,
    subscriptions, setSubscriptions, extraIncomes, setExtraIncomes,
    rolloverTarget, setRolloverTarget, rolloverHistory, setRolloverHistory,
    celebrated, setCelebrated,
    theme, setTheme, themeId, setThemeId, privacy, setPrivacy,
    tutorialSeen, setTutorialSeen,
    now, periodStart, periodEnd, daysInPeriod, dayOfPeriod, daysLeft,
    fixedMonthly, subscriptionsMonthly, dreamAlloc, bufferAmt,
    extraThisPeriod, totalLocked, freeBudget, pTxs, totalSpent, remaining,
    dailyBudget, isOver, burnPct, smartAlloc, smartSuggestions, insights,
    forecast, upcomingDeductions, weeklyInsight, streakData, monthsHistory,
    pendingCredits, totalPendingCredit, totalReceivedCredit,
    addTx, deleteTx, markCreditReceived,
    addExtraIncome, addSubscription, removeSubscription, toggleSubscription,
    importTxs, computePeriod,
  };
};
