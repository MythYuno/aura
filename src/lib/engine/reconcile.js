// ─────────────────────────────────────────────────────────────────────────
// RICONCILIAZIONE — allineare l'app alla banca senza barare.
//
// Il saldo in app scende solo per le spese che registri. Se ne dimentichi
// qualcuna (e capita a tutti), i numeri si sfalsano: a quel punto non ti fidi
// più e smetti di usare l'app. Qui decidiamo COSA registrare quando l'utente
// scrive il saldo vero letto dalla banca.
//
// Funzione PURA: nessun side-effect, testabile. Lo store la usa e poi esegue.
// ─────────────────────────────────────────────────────────────────────────

import { round2 } from '../format.js';

// Sotto questa soglia consideriamo i due saldi uguali (arrotondamenti banca).
const EPS = 0.01;

/**
 * planReconciliation — cosa fare per allineare l'app al saldo reale.
 *
 * @param {number} current  saldo secondo l'app
 * @param {number} target   saldo letto dalla banca
 * @returns {{ delta:number, kind:'none'|'expense'|'income', amount:number }}
 *   kind 'expense' → mancano soldi: spese non registrate, da segnare come uscita
 *   kind 'income'  → ce ne sono di più: entrata non registrata
 *   kind 'none'    → già allineati (o input non valido)
 */
export function planReconciliation(current, target) {
  const c = Number(current);
  const t = Number(target);
  if (!Number.isFinite(c) || !Number.isFinite(t)) {
    return { delta: 0, kind: 'none', amount: 0 };
  }
  const delta = round2(t - c);
  if (Math.abs(delta) < EPS) return { delta: 0, kind: 'none', amount: 0 };
  return {
    delta,
    kind: delta < 0 ? 'expense' : 'income',
    amount: round2(Math.abs(delta)),
  };
}

/** Etichetta con cui finiscono nello storico i movimenti di riconciliazione. */
export const UNTRACKED_LABEL = 'Non tracciato';

/** Tag applicato ai movimenti di riconciliazione (per filtrarli/riconoscerli). */
export const UNTRACKED_TAG = 'non-tracciato';
