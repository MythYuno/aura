import { useMemo } from 'react';
import { realCost } from '../lib/format.js';
import { iconForCategory } from '../lib/icons.jsx';

/**
 * Anxiety-aware weekly digest — appears only on Sundays as a small card on Today.
 * Language is intentionally neutral: "una settimana tranquilla", not "OVER BUDGET!".
 */
export const WeeklyDigest = ({ txs, subscriptions, fixed, cats }) => {
  const today = new Date();
  const isSunday = today.getDay() === 0;

  const stats = useMemo(() => {
    // Last 7 days
    const startWeek = new Date(today);
    startWeek.setHours(0, 0, 0, 0);
    startWeek.setDate(startWeek.getDate() - 6);
    const weekStart = startWeek.getTime();
    const weekTxs = txs.filter((t) => t.ts >= weekStart && t.ts <= today.getTime());
    const weekTotal = weekTxs.reduce((s, t) => s + realCost(t), 0);

    // Previous 4 weeks for baseline
    const baselineWeeks = [];
    for (let i = 1; i <= 4; i++) {
      const ws = new Date(startWeek);
      ws.setDate(ws.getDate() - 7 * i);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const ts = txs.filter((t) => t.ts >= ws.getTime() && t.ts < we.getTime()).reduce((s, t) => s + realCost(t), 0);
      if (ts > 0) baselineWeeks.push(ts);
    }
    const baseline =
      baselineWeeks.length > 0
        ? baselineWeeks.reduce((a, b) => a + b, 0) / baselineWeeks.length
        : 0;

    // Top category of the week
    const byCat = {};
    weekTxs.forEach((t) => {
      byCat[t.cat] = (byCat[t.cat] || 0) + realCost(t);
    });
    const topCatId = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a])[0];
    const topCat = topCatId ? cats.find((c) => c.id === topCatId) : null;
    const topCount = weekTxs.filter((t) => t.cat === topCatId).length;

    // Next week scheduled
    const nextWeekStart = today.getTime() + 864e5; // tomorrow
    const nextWeekEnd = nextWeekStart + 6 * 864e5;
    const upcoming = [];
    const todayDay = today.getDate();
    [...subscriptions, ...fixed.filter((f) => f.type !== 'annual')].forEach((item) => {
      if (item.active === false) return;
      const dDay = item.deductDay || 1;
      let daysUntil = dDay - todayDay;
      if (daysUntil < 0) daysUntil += 30;
      if (daysUntil >= 1 && daysUntil <= 7) {
        upcoming.push({ label: item.label, amount: item.amount, daysUntil });
      }
    });
    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    return { weekTotal, baseline, topCat, topCount, upcoming };
  }, [txs, subscriptions, fixed, cats]);

  if (!isSunday) return null;
  if (stats.weekTotal === 0 && stats.upcoming.length === 0) return null;

  // Compose the headline + body in neutral language
  let headline, body;
  const delta = stats.baseline > 0 ? (stats.weekTotal - stats.baseline) / stats.baseline : 0;
  if (Math.abs(delta) < 0.15) {
    headline = (
      <>Una settimana <strong>tranquilla</strong>, simile alle altre.</>
    );
  } else if (delta > 0) {
    headline = (
      <>Settimana <strong>più piena</strong> del solito.</>
    );
  } else {
    headline = (
      <>Settimana <strong>leggera</strong>.</>
    );
  }

  body = (
    <>
      Hai speso <span className="num">€{Math.round(stats.weekTotal)}</span>
      {stats.baseline > 0 && (
        <>, {Math.abs(delta) < 0.15 ? 'in linea' : delta > 0 ? `+${Math.round(delta * 100)}%` : `${Math.round(delta * 100)}%`} {stats.baseline > 0 ? 'rispetto alle scorse settimane' : ''}</>
      )}
      {stats.topCat && stats.topCount > 0 && (
        <>. La maggior parte è andata in <strong>{stats.topCat.label}</strong>{' '}({stats.topCount} {stats.topCount === 1 ? 'spesa' : 'spese'}).</>
      )}
    </>
  );

  return (
    <div className="weekly-card-wrap">
      <div className="weekly-card">
        <span className="badge">La tua settimana</span>
        <h3>{headline}</h3>
        <p className="body">{body}</p>
      </div>
      {stats.upcoming.length > 0 && (
        <div className="weekly-card upcoming">
          <span className="badge upcoming-badge">La prossima settimana</span>
          <h3>
            {stats.upcoming.length === 1 ? (
              <>Tra {stats.upcoming[0].daysUntil}gg arriva <strong>{stats.upcoming[0].label}</strong> (€{stats.upcoming[0].amount}).</>
            ) : (
              <>{stats.upcoming.length} addebiti programmati.</>
            )}
          </h3>
          {stats.upcoming.length > 1 && (
            <p className="body">
              {stats.upcoming.slice(0, 3).map((u) => `${u.label} (€${u.amount})`).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
