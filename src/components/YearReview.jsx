import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sheet } from './ui/Sheet.jsx';
import { realCost, maskedMoney, dayKeyLocal } from '../lib/format.js';

/**
 * Year-in-review — stile Spotify Wrapped. Statistiche annuali condensate
 * in una serie di "slide" verticali scrollabili dentro uno Sheet.
 *
 * Calcola tutto al volo dalle txs dell'anno scelto. Niente storage extra.
 *
 * v0.8.1: rimosso il <style> inline (re-iniettato ogni render, classi
 * troppo generiche .lbl/.big/.sub che collidevano con il resto dell'app).
 * Le classi sono ora .yr-lbl/.yr-big/.yr-sub dichiarate in globals.css.
 * Aggiunto stagger entrance via framer-motion per il wow-factor.
 */
export const YearReview = ({ open, onClose, txs = [], cats = [], year, privacy = false }) => {
  const stats = useMemo(() => {
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime();
    const yearTxs = txs.filter((t) => t.ts >= yearStart && t.ts < yearEnd);
    if (yearTxs.length === 0) return null;

    let total = 0;
    const byMonth = new Array(12).fill(0);
    const byCat = {};
    const byDay = {};
    const byDOW = new Array(7).fill(0); // 0=Dom .. 6=Sab
    let topTx = null;

    for (const t of yearTxs) {
      const cost = realCost(t);
      total += cost;
      const d = new Date(t.ts);
      byMonth[d.getMonth()] += cost;
      byCat[t.cat] = (byCat[t.cat] || 0) + cost;
      // v0.8.1: dayKeyLocal per coerenza timezone (vedi format.js)
      const dKey = dayKeyLocal(t.ts);
      byDay[dKey] = (byDay[dKey] || 0) + cost;
      const dow = d.getDay();
      byDOW[dow] += cost;
      if (!topTx || cost > realCost(topTx)) topTx = t;
    }

    // Top categoria
    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const topCatId = catEntries[0]?.[0];
    const topCat = cats.find((c) => c.id === topCatId);
    const topCatTotal = catEntries[0]?.[1] || 0;

    // Mese più caro — guard contro 'gennaio sempre' se byMonth è tutto zeri
    // (Math.max([0,0,...]).indexOf(0) ritornerebbe 0 = gennaio, errato).
    const maxMonthValue = Math.max(...byMonth);
    const maxMonth = maxMonthValue > 0 ? byMonth.indexOf(maxMonthValue) : -1;
    const maxMonthName = maxMonth >= 0
      ? ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
         'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][maxMonth]
      : null;

    // Giorno settimana più speso
    const maxDOW = byDOW.indexOf(Math.max(...byDOW));
    const dowName = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'][maxDOW];

    // Giorno più caro singolo
    const topDayKey = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topDayTotal = topDayKey ? byDay[topDayKey] : 0;
    const topDayDate = topDayKey ? new Date(Number(topDayKey) * 864e5) : null;

    const daysWithSpend = Object.keys(byDay).length;
    const avgPerDay = daysWithSpend > 0 ? total / daysWithSpend : 0;
    const avgPerMonth = total / 12;

    return {
      total, count: yearTxs.length,
      byMonth, byCat, byDOW,
      topCat, topCatTotal,
      maxMonthName, maxMonthTotal: byMonth[maxMonth],
      dowName, dowTotal: byDOW[maxDOW],
      topTx, topDayDate, topDayTotal,
      avgPerDay, avgPerMonth, daysWithSpend,
    };
  }, [txs, cats, year]);

  if (!open) return null;

  return (
    <Sheet open={open} onClose={onClose} title={`Il tuo ${year}`}>
      {!stats ? (
        <p style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'center', padding: '40px 0' }}>
          Nessuna spesa registrata nel {year}.
        </p>
      ) : (
        <motion.div
          className="yr-list"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >

          {/* Slide 1: Totale dell'anno */}
          <YRCard tone="accent">
            <div className="yr-lbl">In tutto il {year}</div>
            <div className="yr-big">€{maskedMoney(stats.total, { privacy, decimals: 0 })}</div>
            <div className="yr-sub">{stats.count} transazioni · {stats.daysWithSpend} giorni con spese</div>
          </YRCard>

          {/* Slide 2: Top categoria */}
          {stats.topCat && (
            <YRCard>
              <div className="yr-lbl">Dove sono finiti</div>
              <div className="yr-big" style={{ color: stats.topCat.color }}>
                {stats.topCat.label}
              </div>
              <div className="yr-sub">
                €{maskedMoney(stats.topCatTotal, { privacy, decimals: 0 })} — {Math.round((stats.topCatTotal / stats.total) * 100)}% del totale
              </div>
            </YRCard>
          )}

          {/* Slide 3: Mese più caro (skip se nessun mese ha spese) */}
          {stats.maxMonthName && stats.maxMonthTotal > 0 && stats.avgPerMonth > 0 && (
            <YRCard>
              <div className="yr-lbl">Il mese più caro</div>
              <div className="yr-big">{stats.maxMonthName.charAt(0).toUpperCase() + stats.maxMonthName.slice(1)}</div>
              <div className="yr-sub">€{maskedMoney(stats.maxMonthTotal, { privacy, decimals: 0 })} — {Math.round(((stats.maxMonthTotal - stats.avgPerMonth) / stats.avgPerMonth) * 100)}% sopra la media mensile</div>
            </YRCard>
          )}

          {/* Slide 4: Giorno settimana */}
          <YRCard>
            <div className="yr-lbl">Spendi di più</div>
            <div className="yr-big">di {stats.dowName}</div>
            <div className="yr-sub">€{maskedMoney(stats.dowTotal, { privacy, decimals: 0 })} totali · una media di €{maskedMoney(stats.dowTotal / 52, { privacy, decimals: 0 })} a settimana</div>
          </YRCard>

          {/* Slide 5: Giorno più caro */}
          {stats.topDayDate && (
            <YRCard>
              <div className="yr-lbl">Il giorno record</div>
              <div className="yr-big">{stats.topDayDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</div>
              <div className="yr-sub">€{maskedMoney(stats.topDayTotal, { privacy, decimals: 0 })} spesi in un giorno</div>
            </YRCard>
          )}

          {/* Slide 6: Media giornaliera */}
          <YRCard tone="accent">
            <div className="yr-lbl">In media al giorno</div>
            <div className="yr-big">€{maskedMoney(stats.avgPerDay, { privacy, decimals: 2 })}</div>
            <div className="yr-sub">solo nei giorni in cui hai speso · €{maskedMoney(stats.total / 365, { privacy, decimals: 2 })} su tutto l'anno</div>
          </YRCard>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="yr-foot"
          >
            I tuoi numeri — niente di più, niente di meno.<br/>
            Pronto per il {year + 1}?
          </motion.p>
        </motion.div>
      )}
    </Sheet>
  );
};

const YRCard = ({ tone, children }) => (
  <motion.div
    className={`yr-card ${tone === 'accent' ? 'yr-card-accent' : ''}`}
    variants={{
      hidden: { opacity: 0, y: 20, scale: 0.96 },
      show: {
        opacity: 1, y: 0, scale: 1,
        transition: { type: 'spring', damping: 22, stiffness: 280 },
      },
    }}
  >
    {children}
  </motion.div>
);
