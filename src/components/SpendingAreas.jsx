import { useMemo } from 'react';
import { iconForCategory } from '../lib/icons.jsx';
import { realCost, maskedMoney, round2 } from '../lib/format.js';
import { categoryHistoricalStats } from '../lib/analytics.js';
import { haptic } from '../lib/haptic.js';

/**
 * SpendingAreas — "Dove vanno i soldi": per ogni categoria mostra quanto hai
 * speso NEL PERIODO corrente, con una barra e il confronto sulla TUA media
 * storica (mesi passati). È la sezione che il tour di Soldi promette da sempre
 * ma che non era mai stata renderizzata (il CSS .area-* esisteva già).
 *
 * - now   = speso questo periodo nella categoria
 * - avg   = media storica mensile della categoria (categoryHistoricalStats)
 * - delta = quanto sei sopra/sotto la tua media (+ ambra = di più, − accent = di meno)
 * - tick  = tacca sulla barra che segna la posizione della media
 *
 * Tap su una riga → apre la categoria filtrata in Storia (onOpenCategory).
 * In privacy mode importi e delta sono mascherati (le barre restano relative).
 */
export const SpendingAreas = ({ store, onOpenCategory }) => {
  const { pTxs, cats, txs, monthKey, privacy } = store;

  const byCat = useMemo(() => {
    const m = {};
    for (const t of pTxs) m[t.cat] = round2((m[t.cat] || 0) + realCost(t));
    return m;
  }, [pTxs]);

  const hist = useMemo(() => categoryHistoricalStats(txs, monthKey), [txs, monthKey]);

  const total = useMemo(
    () => round2(Object.values(byCat).reduce((a, b) => a + b, 0)),
    [byCat]
  );

  const rows = useMemo(() => {
    return cats
      .map((c) => ({ cat: c, now: byCat[c.id] || 0, avg: round2(hist[c.id]?.mean || 0) }))
      .filter((r) => r.now > 0 || r.avg > 0)
      .sort((a, b) => b.now - a.now);
  }, [cats, byCat, hist]);

  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => Math.max(r.now, r.avg)), 1);

  return (
    <div style={{ marginTop: 32 }}>
      <div className="area-section-title">
        <span className="ttl">Dove vanno i soldi</span>
        <span className="meta">
          questo periodo · <strong>€{maskedMoney(total, { privacy })}</strong>
        </span>
      </div>

      <div>
        {rows.map((r) => {
          const Icon = iconForCategory(r.cat.id);
          // v0.9.6: ogni barra prende il colore della sua categoria → si legge
          // a colpo d'occhio dove vanno i soldi. In privacy resta neutra (.flat).
          const barColor = r.cat.color || 'var(--accent)';
          // delta % vs media (solo se c'è storia e scarto significativo)
          const pct = r.avg > 0 ? Math.round(((r.now - r.avg) / r.avg) * 100) : null;
          const dir = pct == null ? 'flat' : pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat';
          // v0.9.3: in privacy le barre sono uniformi (non rivelano le proporzioni
          // tra categorie), coerente con heatmap/pulse. Tick media nascosto.
          const nowPct = privacy ? 45 : Math.max(2, Math.round((r.now / max) * 100));
          const avgPct = (!privacy && r.avg > 0) ? Math.round((r.avg / max) * 100) : null;
          const tappable = typeof onOpenCategory === 'function';

          return (
            <div
              key={r.cat.id}
              className="area-row"
              role={tappable ? 'button' : undefined}
              tabIndex={tappable ? 0 : undefined}
              onClick={tappable ? () => { haptic('light'); onOpenCategory(r.cat.id); } : undefined}
              onKeyDown={tappable ? (e) => { if (e.key === 'Enter') { haptic('light'); onOpenCategory(r.cat.id); } } : undefined}
              style={tappable ? { cursor: 'pointer' } : undefined}
            >
              <div className="area-row-head">
                <span className="ic-mono" style={{ color: r.cat.color }}><Icon /></span>
                <span className="name">{r.cat.label}</span>
                <span className="now">€{maskedMoney(r.now, { privacy })}</span>
                {!privacy && pct != null && Math.abs(pct) >= 5 && (
                  <span className={`area-delta ${dir}`}>
                    {pct > 0 ? '+' : '−'}{Math.abs(pct)}%
                  </span>
                )}
              </div>
              <div className="area-prog">
                <div
                  className={`area-prog-fill${privacy ? ' flat' : ''}`}
                  style={privacy
                    ? { width: `${nowPct}%` }
                    : { width: `${nowPct}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${barColor} 76%, #fff), ${barColor})` }}
                />
                {avgPct != null && !privacy && (
                  <div className="area-prog-tick" style={{ left: `${avgPct}%` }} title="la tua media" />
                )}
              </div>
              {!privacy && r.avg > 0 && (
                <div className="area-meta">
                  <span className="item">media <strong>€{maskedMoney(r.avg, { privacy })}/mese</strong></span>
                  {pct != null && Math.abs(pct) >= 5 && (
                    <>
                      <span className="sep">·</span>
                      <span className="item">{pct > 0 ? 'sopra' : 'sotto'} la media</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
