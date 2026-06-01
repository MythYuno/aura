import { useMemo } from 'react';
import { useStore } from './useStore.js';
import { computeFinance, copilotExtras, recurringSuggestions, monthlyCashflow } from '../lib/engine/prediction.js';
import { buildInsightFeed } from '../lib/engine/intelligence.js';

// ─────────────────────────────────────────────────────────────────────────
// useFinance — API UNICA di lettura del modello finanziario.
//
// Separa nettamente i due mondi:
//   • `store`   = Data Engine (stato grezzo + azioni)  →  da useStore
//   • `finance` = Prediction Engine (modello calcolato) →  da computeFinance
//
// Le schermate del Financial Copilot (Home/Assistente, Copilot) leggeranno il
// "calcolato" SOLO da `finance`, così c'è una sola fonte di verità e nessun
// componente ricalcola i numeri per conto suo. Le schermate attuali continuano
// a usare useStore finché non migrano (Tappa 3).
//
// Nota: `computeFinance` usa le stesse primitive (analytics) che useStore già
// usa internamente → i valori coincidono al centesimo.
// ─────────────────────────────────────────────────────────────────────────
export function useFinance() {
  const store = useStore();
  const finance = useMemo(
    () => computeFinance(store, store.now),
    [
      store.currentBalance, store.cushion, store.goals, store.fixed,
      store.subscriptions, store.incomes, store.recurringPaid, store.recurringSkipped, store.txs,
      store.todayKey, store.daysInPeriod, store.dayOfPeriod, store.now,
    ],
  );

  // Intelligence Engine: feed di insight prioritizzato dal modello calcolato.
  // (additivo — la Home/Assistente lo consumerà in Tappa 3)
  const feed = useMemo(
    () => buildInsightFeed({
      txs: store.txs, cats: store.cats, fixed: store.fixed,
      subscriptions: store.subscriptions, goals: store.goals,
      cushion: store.cushion, savingsTarget: store.monthlySavingsTarget,
      currentBalance: store.currentBalance,
      model: finance, now: store.now,
    }),
    [store.txs, store.cats, store.fixed, store.subscriptions, store.goals, store.cushion, store.monthlySavingsTarget, store.currentBalance, finance, store.now],
  );

  // Contesto extra per il Copilot (spese del mese per categoria, prossime uscite).
  // Pronto all'uso: il Copilot legge questi numeri, non li ricalcola.
  const copilot = useMemo(
    () => copilotExtras(store, store.now),
    [store.txs, store.cats, store.fixed, store.subscriptions, store.recurringPaid, store.recurringSkipped, store.now],
  );

  // Ricorrenze rilevate non ancora registrate (proposte con un tap in home).
  const recurringSuggest = useMemo(
    () => recurringSuggestions(store),
    [store.txs, store.subscriptions, store.fixed, store.dismissedRecurring],
  );

  // Flusso di cassa mensile (entrate − ricorrenti − spesa media) → previsioni Copilot.
  const cashflow = useMemo(
    () => monthlyCashflow(store, finance),
    [store.incomes, store.fixed, store.subscriptions, store.annualExpenses, finance],
  );

  return { ...store, finance, feed, copilot, recurringSuggest, cashflow };
}
