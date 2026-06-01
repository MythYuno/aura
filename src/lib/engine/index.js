// ─────────────────────────────────────────────────────────────────────────
// FINANCIAL COPILOT — gli strati del motore (un solo verso, deterministico).
//
//   Data Engine    → hooks/useStore.js (+ lib/storage.js)
//                    stato grezzo + CRUD deterministico. Nessuna AI, nessun derivato.
//   Prediction     → lib/engine/prediction.js
//                    numeri & previsioni (puro): freeUntilNext, dailyQuota,
//                    forecast, ricorrenze, …  + computeFinance()
//   Intelligence   → lib/engine/intelligence.js
//                    insight dai numeri (anomalie, trend, ritmo, rischi)
//   Copilot        → lib/engine/copilot.js
//                    risposte in linguaggio naturale (locale, zero cloud).
//                    Prende i numeri SOLO dai motori, non calcola mai da sé.
//
//   Flusso:  Data → Prediction → Intelligence → UI / Copilot
//
// La UI legge il modello calcolato da hooks/useFinance.js (fonte unica).
// ─────────────────────────────────────────────────────────────────────────

export * from './prediction.js';
export * as intelligence from './intelligence.js';
export * as copilot from './copilot.js';
