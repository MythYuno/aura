import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MonthBars } from '../components/MonthBars.jsx';
import { ForecastBox } from '../components/ForecastBox.jsx';
import { QuickAdd } from '../components/QuickAdd.jsx';
import { SpliceModal } from '../components/SpliceModal.jsx';
import { DayDetail } from '../components/DayDetail.jsx';
import { WhyCard } from '../components/WhyCard.jsx';
import { WeeklyDigest } from '../components/WeeklyDigest.jsx';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { monthlyForecast } from '../lib/forecast.js';
import { suggestCategory } from '../lib/intelligence.js';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { maskedMoney } from '../lib/format.js';

/**
 * Today: hero + month bar chart + forecast + quick-add + weekly digest (Sundays).
 * Tap a chart bar → DayDetail. Long-press the + → voice. Large income → splice.
 */
export const Today = ({ store, onSettingsTap }) => {
  const {
    name, txs, cats, homeCats, catRules, periodStart, periodEnd, dayOfPeriod, daysInPeriod,
    daysLeft, freeBudget, totalSpent, remaining, dailyBudget, privacy, isOver,
    addTx, addExtraIncome, addSplicedIncome, monthKey,
    fixed, subscriptions, addCatRule,
  } = store;

  const tour = useTour('today', store);
  const [dayTs, setDayTs] = useState(null);
  const [splice, setSplice] = useState(null);
  const [why, setWhy] = useState(null);

  // Forecast for the rest of the month
  const forecast = useMemo(
    () => monthlyForecast({
      periodTxs: txs.filter((t) => t.ts >= periodStart.getTime() && t.ts < periodEnd.getTime()),
      allTxs: txs,
      dayOfPeriod, daysInPeriod, currentMonthKey: monthKey,
    }),
    [txs, periodStart, periodEnd, dayOfPeriod, daysInPeriod, monthKey]
  );
  const projectedRemain = freeBudget - forecast.projectedSpend;

  const onQuickSubmit = ({ kind, amount, label, catId }) => {
    if (kind === 'income') {
      addExtraIncome(amount, label || 'Entrata extra');
      return;
    }
    addTx(amount, catId, label);
  };

  const onLargeIncome = ({ amount, label }) => {
    setSplice({ amount, label });
  };

  const confirmSplice = ({ kind, amount, label, months }) => {
    if (kind === 'splice') {
      addSplicedIncome(amount, label || 'Entrata extra', months);
    } else {
      addExtraIncome(amount, label || 'Entrata extra');
    }
    setSplice(null);
  };

  return (
    <div>
      {/* Hero */}
      <div className="breath-hero" data-tut="hero">
        <div className="lbl">Oggi puoi spendere</div>
        <div className="num tnum">
          <span className="currency">€</span>
          {privacy ? '***' : <NumberTicker value={Math.max(0, dailyBudget)} decimals={2} />}
        </div>
        <p className="one-liner" data-tut="sub">
          Ti restano <strong>€{maskedMoney(Math.max(0, remaining), { privacy })}</strong>
          {' '}per i prossimi <strong>{daysLeft}</strong> {daysLeft === 1 ? 'giorno' : 'giorni'}.
        </p>
      </div>

      {/* Bar chart 30gg */}
      <div data-tut="chart">
        <MonthBars
          txs={txs}
          periodStart={periodStart}
          periodEnd={periodEnd}
          dayOfPeriod={dayOfPeriod}
          privacy={privacy}
          onDayTap={(ts) => setDayTs(ts)}
        />
      </div>

      {/* Forecast box */}
      <div data-tut="forecast">
        <ForecastBox
          projectedSpend={forecast.projectedSpend}
          projectedRemain={projectedRemain}
          privacy={privacy}
          freeBudget={freeBudget}
        />
      </div>

      {/* Weekly digest (only on Sundays) */}
      <WeeklyDigest txs={txs} subscriptions={subscriptions} fixed={fixed} cats={cats} />

      {/* Quick add */}
      <QuickAdd
        homeCats={homeCats}
        cats={cats}
        txs={txs}
        catRules={catRules}
        onSubmit={onQuickSubmit}
        onLargeIncome={onLargeIncome}
        onWhy={(payload) => setWhy(payload)}
      />

      {/* Modals */}
      <DayDetail
        open={dayTs != null}
        dayTs={dayTs}
        allTxs={txs}
        cats={cats}
        privacy={privacy}
        onClose={() => setDayTs(null)}
      />
      <SpliceModal
        open={!!splice}
        amount={splice?.amount || 0}
        label={splice?.label}
        onConfirm={confirmSplice}
        onClose={() => setSplice(null)}
      />
      <WhyCard
        open={!!why}
        label={why?.label}
        suggestedCatId={why?.catId}
        cats={cats}
        txs={txs}
        onClose={() => setWhy(null)}
        onSaveRule={(token, catId) => addCatRule(token, catId)}
      />

      {/* Tutorial walkthrough */}
      <Tour tourId="today" open={tour.open} onClose={tour.close} />
    </div>
  );
};
