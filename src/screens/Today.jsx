import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MonthBars } from '../components/MonthBars.jsx';
import { ForecastBox } from '../components/ForecastBox.jsx';
import { QuickAdd } from '../components/QuickAdd.jsx';
import { SpliceModal } from '../components/SpliceModal.jsx';
import { DayDetail } from '../components/DayDetail.jsx';
import { VoiceCapture } from '../components/VoiceCapture.jsx';
import { WhyCard } from '../components/WhyCard.jsx';
import { WeeklyDigest } from '../components/WeeklyDigest.jsx';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { monthlyForecast } from '../lib/forecast.js';
import { isVoiceSupported } from '../lib/voice.js';
import { suggestCategory } from '../lib/intelligence.js';
import { NumberTicker } from '../components/ui/NumberTicker.jsx';
import { cn } from '../lib/format.js';

/**
 * Today: hero + month bar chart + forecast + quick-add + weekly digest (Sundays).
 * Tap a chart bar → DayDetail. Long-press the + → voice. Large income → splice.
 */
export const Today = ({ store, onSettingsTap }) => {
  const {
    name, txs, cats, homeCats, periodStart, periodEnd, dayOfPeriod, daysInPeriod,
    daysLeft, freeBudget, totalSpent, remaining, dailyBudget, privacy, isOver,
    addTx, addExtraIncome, addSplicedIncome, monthKey,
    fixed, subscriptions, addCatRule,
  } = store;

  const tour = useTour('today', store);
  const [dayTs, setDayTs] = useState(null);
  const [splice, setSplice] = useState(null);
  const [voiceMode, setVoiceMode] = useState(null); // 'spend' | 'income' | null
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
    // spese: prima check se applichiamo una regola utente
    addTx(amount, catId, label);
    // Offer "why?" for the just-added expense if smart-cat picked the category
    if (label) {
      const suggested = suggestCategory(label, txs, cats);
      if (suggested === catId) {
        // skip showing modal automatically — user can review from Storia later
      }
    }
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

  const onVoiceResult = ({ amount, label }) => {
    if (voiceMode === 'income') {
      if (amount >= 500) {
        setSplice({ amount, label });
      } else {
        addExtraIncome(amount, label || 'Entrata extra');
      }
    } else {
      const cat = suggestCategory(label, txs, cats) || homeCats[0] || cats[0]?.id;
      addTx(amount, cat, label);
    }
    setVoiceMode(null);
  };

  return (
    <div>
      {/* Hero */}
      <div className="breath-hero" data-tut="hero">
        <div className="lbl">Oggi puoi spendere</div>
        <div className={cn('num tnum', privacy && 'privacy-blur')}>
          <span className="currency">€</span>
          <NumberTicker value={Math.max(0, dailyBudget)} decimals={2} />
        </div>
        <p className="one-liner" data-tut="sub">
          Ti restano <strong className={privacy ? 'privacy-blur' : ''}>€<NumberTicker value={Math.max(0, remaining)} decimals={0} /></strong>
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
        onSubmit={onQuickSubmit}
        onLargeIncome={onLargeIncome}
        onVoice={(mode) => setVoiceMode(mode)}
        voiceSupported={isVoiceSupported()}
      />

      {/* Modals */}
      <DayDetail
        open={dayTs != null}
        dayTs={dayTs}
        allTxs={txs}
        cats={cats}
        onClose={() => setDayTs(null)}
      />
      <SpliceModal
        open={!!splice}
        amount={splice?.amount || 0}
        label={splice?.label}
        onConfirm={confirmSplice}
        onClose={() => setSplice(null)}
      />
      <VoiceCapture
        open={!!voiceMode}
        onClose={() => setVoiceMode(null)}
        onResult={onVoiceResult}
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
