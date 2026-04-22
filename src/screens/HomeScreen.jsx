import { BalanceHero } from '../components/widgets/BalanceHero.jsx';
import { ForecastCard } from '../components/widgets/ForecastCard.jsx';
import { CategoriesRing } from '../components/widgets/CategoriesRing.jsx';
import { StreakCard } from '../components/widgets/StreakCard.jsx';
import { HeatmapCard, UpcomingCard, InsightsCard } from '../components/widgets/MiscCards.jsx';
import { CreditsCard, DreamsCard, ExtraCard, VicesCard, QuickActionsBar } from '../components/widgets/OtherCards.jsx';
import { realCost } from '../lib/format.js';

export const HomeScreen = ({ store }) => {
  const {
    widgets, privacy, freeBudget, totalSpent, dailyBudget, remaining, daysLeft,
    isOver, burnPct, bufferAmt, dreamAlloc, pTxs, cats, txs, dreams,
    forecast, weeklyInsight, streakData, upcomingDeductions, extraThisPeriod,
    pendingCredits, totalPendingCredit, totalReceivedCredit, markCreditReceived,
    quickActions, addTx, periodStart, dayOfPeriod, daysInPeriod, insights,
  } = store;

  const viceSpend = pTxs.filter((t) => t.cat === 'vices').reduce((a, t) => a + realCost(t), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger" data-tut="home-grid">
      {widgets.includes('balance') && (
        <div data-tut="hero">
          <BalanceHero
            dailyBudget={dailyBudget}
            remaining={remaining}
            daysLeft={daysLeft}
            totalSpent={totalSpent}
            freeBudget={freeBudget}
            bufferAmt={bufferAmt}
            dreamAlloc={dreamAlloc}
            isOver={isOver}
            privacy={privacy}
          />
        </div>
      )}

      {widgets.includes('quickactions') && <QuickActionsBar quickActions={quickActions} cats={cats} addTx={addTx} />}

      {widgets.includes('forecast') && forecast && (
        <ForecastCard
          forecast={forecast}
          txs={txs}
          periodStart={periodStart}
          dayOfPeriod={dayOfPeriod}
          daysInPeriod={daysInPeriod}
          freeBudget={freeBudget}
          privacy={privacy}
          burnPct={burnPct}
          isOver={isOver}
        />
      )}

      {widgets.includes('insights') && <InsightsCard insights={insights} weeklyInsight={weeklyInsight} privacy={privacy} />}

      {widgets.includes('categories-ring') && (
        <CategoriesRing pTxs={pTxs} cats={cats} freeBudget={freeBudget} totalSpent={totalSpent} privacy={privacy} />
      )}

      {widgets.includes('streak') && <StreakCard streakData={streakData} />}
      {widgets.includes('extra') && <ExtraCard extraThisPeriod={extraThisPeriod} privacy={privacy} />}
      {widgets.includes('vices') && <VicesCard viceSpend={viceSpend} privacy={privacy} />}

      {widgets.includes('upcoming') && <UpcomingCard upcoming={upcomingDeductions} privacy={privacy} />}

      {widgets.includes('heatmap') && <HeatmapCard txs={txs} privacy={privacy} />}

      {widgets.includes('credits') && (
        <CreditsCard
          pendingCredits={pendingCredits}
          totalPendingCredit={totalPendingCredit}
          totalReceivedCredit={totalReceivedCredit}
          markCreditReceived={markCreditReceived}
          cats={cats}
          privacy={privacy}
        />
      )}

      {widgets.includes('dreams') && <DreamsCard dreams={dreams} privacy={privacy} />}
    </div>
  );
};
