import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tour } from '../components/Tour.jsx';
import { useTour } from '../hooks/useTour.js';
import { DayDetail } from '../components/DayDetail.jsx';
import { Sheet } from '../components/ui/Sheet.jsx';
import { IcChevR, IcChevL, IcX, IcCheck, IcTrendUp, IcTrendDown, IcList } from '../lib/icons.jsx';
import { iconForCategory } from '../lib/icons.jsx';
import { findAnomalies } from '../lib/anomaly.js';
import { realCost, maskedMoney } from '../lib/format.js';
import { haptic } from '../lib/haptic.js';

/**
 * History (v5 · Headspace style):
 *  - archive header: ◀ Aprile 2026 ▶
 *  - hero serif number "€1.247"
 *  - delta pill vs mese precedente
 *  - ribbon 12 mesi compatto
 *  - day-list pill compatti (i 5 piu salienti)
 *  - tap card "Vedi tutti i giorni" (apre sheet con search + lista completa)
 *  - footnote narrativa in fondo
 */
export const History = ({ store, focusCategory, onFocusConsumed }) => {
  const { txs, cats, computePeriod, monthsHistory, privacy, updateTx, deleteTx } = store;
  const tour = useTour('history', store);

  const [offset, setOffset] = useState(0);
  const [dayTs, setDayTs] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  // v0.9: filtri avanzati nella sheet "tutte le spese".
  const [filterCat, setFilterCat] = useState(null); // catId | null = tutte
  const [filterMin, setFilterMin] = useState(0);     // importo minimo
  // Bulk edit: lista di tx id selezionate + sheet target per cambio cat.
  // La selezione viene pulita quando l'utente filtra (search/categoria/importo)
  // o cambia mese, così non restano tx selezionate non più visibili.
  const [selected, setSelected] = useState(new Set());
  const [showBulkCatPicker, setShowBulkCatPicker] = useState(false);
  useEffect(() => { setSelected(new Set()); }, [search, offset, filterCat, filterMin]);

  // v0.9: apertura da "aree di spesa" (Soldi) con categoria pre-filtrata.
  useEffect(() => {
    if (focusCategory) {
      setShowAll(true);
      setFilterCat(focusCategory);
      setOffset(0);
      onFocusConsumed?.();
    }
  }, [focusCategory]);
  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const bulkChangeCategory = (newCatId) => {
    for (const id of selected) updateTx(id, { cat: newCatId });
    clearSelection();
    setShowBulkCatPicker(false);
  };

  const period = useMemo(() => computePeriod(offset), [computePeriod, offset]);
  const monthTxs = useMemo(
    () => txs.filter((t) => t.ts >= period.start.getTime() && t.ts < period.end.getTime()),
    [txs, period]
  );
  const monthTotal = monthTxs.reduce((s, t) => s + realCost(t), 0);

  // Mese precedente per delta
  const prevPeriod = useMemo(() => computePeriod(offset + 1), [computePeriod, offset]);
  const prevTotal = useMemo(() => {
    return txs.filter((t) => t.ts >= prevPeriod.start.getTime() && t.ts < prevPeriod.end.getTime())
      .reduce((s, t) => s + realCost(t), 0);
  }, [txs, prevPeriod]);
  const delta = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal) * 100 : 0;

  // Anomalie (giorni con spese fuori pattern)
  const anomalies = useMemo(() => findAnomalies(monthTxs), [monthTxs]);

  // v0.9.6: rimossa la heatmap "Ultimo anno" (calendario a quadratini stile
  // GitHub). Il nastro 12 mesi sopra dà già la visione longitudinale, in modo
  // più pulito e leggibile.

  // Raggruppamento per giorno: per la lista compatta in homepage
  const byDay = useMemo(() => {
    const m = {};
    monthTxs.forEach((t) => {
      const d = new Date(t.ts);
      d.setHours(0, 0, 0, 0);
      const k = d.getTime();
      if (!m[k]) m[k] = { ts: k, txs: [], total: 0, hasAnomaly: false };
      m[k].txs.push(t);
      m[k].total += realCost(t);
    });
    anomalies.forEach((a) => {
      const d = new Date(a.ts); d.setHours(0, 0, 0, 0);
      if (m[d.getTime()]) m[d.getTime()].hasAnomaly = true;
    });
    return Object.values(m).sort((a, b) => b.ts - a.ts);
  }, [monthTxs, anomalies]);

  const topDays = useMemo(() => [...byDay].sort((a, b) => b.total - a.total).slice(0, 5), [byDay]);

  // Filtraggio per la sheet "tutti i giorni" — testo + categoria + importo min.
  const filteredTxs = useMemo(() => {
    let list = monthTxs;
    if (filterCat) list = list.filter((t) => t.cat === filterCat);
    if (filterMin > 0) list = list.filter((t) => realCost(t) >= filterMin);
    const q = search.toLowerCase().trim();
    if (q) {
      const qNum = parseFloat(q.replace(',', '.'));
      list = list.filter((t) => {
        const cat = cats.find((c) => c.id === t.cat);
        const label = (t.label || '').toLowerCase();
        const catName = (cat?.label || '').toLowerCase();
        if (label.includes(q) || catName.includes(q)) return true;
        if (!isNaN(qNum) && Math.abs(realCost(t) - qNum) < 0.5) return true;
        return false;
      });
    }
    return list;
  }, [monthTxs, search, cats, filterCat, filterMin]);
  const filtersActive = !!filterCat || filterMin > 0 || !!search.trim();

  const monthLabel = period.start.toLocaleDateString('it-IT', { month: 'long' });
  const yearLabel = period.start.getFullYear();

  // ─── Ribbon 12 mesi ─────
  const ribbonMax = Math.max(1, ...monthsHistory.map((m) => m.total));

  // ─── Footnote narrativa ─────
  const footnote = useMemo(() => {
    // Mese senza spese: skip footnote per non mostrare "0 in 0 giorni" deprimente.
    if (byDay.length === 0) return null;
    if (offset === 0) return <>Sei a metà mese. Per ora hai speso <b>€{maskedMoney(monthTotal, { privacy, decimals: 0 })}</b> in <b>{byDay.length} {byDay.length === 1 ? 'giorno' : 'giorni'}</b>.</>;
    if (prevTotal > 0 && Math.abs(delta) >= 5) {
      const direction = delta < 0 ? 'meno' : 'più';
      const pctAbs = Math.abs(Math.round(delta));
      return <>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} è stato <b>{delta < 0 ? 'calmo' : 'pieno'}</b>: hai speso il <b>{pctAbs}% in {direction}</b> rispetto al mese precedente.</>;
    }
    return <>Hai speso <b>€{maskedMoney(monthTotal, { privacy, decimals: 0 })}</b> in <b>{byDay.length} {byDay.length === 1 ? 'giorno' : 'giorni'}</b>.</>;
  }, [offset, byDay, monthTotal, prevTotal, delta, monthLabel, privacy]);

  return (
    <div>
      <Tour {...tour} />

      <div className="hs-archive">
        <button
          aria-label="Mese precedente"
          onClick={() => { haptic('light'); setOffset(offset + 1); }}
        >
          <IcChevL />
        </button>
        <div className="ml">
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          <span className="y">{yearLabel}</span>
        </div>
        <button
          aria-label="Mese successivo"
          onClick={() => { haptic('light'); if (offset > 0) setOffset(offset - 1); }}
          disabled={offset === 0}
          style={{ opacity: offset === 0 ? 0.3 : 1 }}
        >
          <IcChevR />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48, fontWeight: 300, letterSpacing: '-.035em', lineHeight: 1,
          color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', marginBottom: 6,
        }}
      >
        <span style={{ fontSize: '.42em', color: 'var(--accent)', verticalAlign: '.55em', marginRight: 6, fontWeight: 300 }}>€</span>
        {maskedMoney(monthTotal, { privacy, decimals: 0 })}
      </motion.div>

      {prevTotal > 0 && Math.abs(delta) >= 2 && (
        <span className={`hs-delta ${delta > 5 ? 'warn' : ''}`}>
          {delta < 0 ? <IcTrendDown /> : <IcTrendUp />}
          {Math.abs(Math.round(delta))}% {delta < 0 ? 'meno' : 'più'} di {prevPeriod.start.toLocaleDateString('it-IT', { month: 'long' })}
        </span>
      )}

      {/* Ribbon 12 mesi */}
      <div className="hs-ribbon">
        {monthsHistory.map((m, i) => {
          const isNow = m.offset === offset;
          const h = Math.max(6, Math.round((m.total / ribbonMax) * 100));
          return (
            <button
              key={i}
              type="button"
              className={`b ${isNow ? 'now' : ''}`}
              style={{ height: `${h}%`, border: 'none', padding: 0 }}
              onClick={() => { haptic('light'); setOffset(m.offset); }}
              aria-label={`${m.label} ${m.total}€`}
            />
          );
        })}
      </div>
      <div className="hs-ribbon-labs">
        <span>{monthsHistory[0]?.label?.toUpperCase() || ''}</span>
        <span>{monthsHistory[monthsHistory.length - 1]?.label?.toUpperCase() || ''}</span>
      </div>

      {byDay.length === 0 ? (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          background: 'var(--glass)', borderRadius: 16,
          color: 'var(--fg-3)', fontSize: 13, marginBottom: 10,
        }}>
          Nessuna spesa registrata in {monthLabel}.
        </div>
      ) : (
        <>
          {anomalies.length > 0 && (
            <div className="hs-sec" style={{ color: 'var(--warn)' }}>
              Da controllare · {anomalies.length} {anomalies.length === 1 ? 'spesa fuori pattern' : 'spese fuori pattern'}
            </div>
          )}

          <div className="hs-sec">Giorni con più spese</div>
          {topDays.map((d) => {
            const date = new Date(d.ts);
            return (
              <button
                key={d.ts}
                type="button"
                className="hs-day"
                onClick={() => { haptic('light'); setDayTs(d.ts); }}
              >
                <div className="dt">
                  {date.getDate()}
                  <span className="m">{date.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')}</span>
                </div>
                <div className="body">
                  <div className="t">
                    {d.txs.slice(0, 2).map((t) => t.label || cats.find((c) => c.id === t.cat)?.label || 'Spesa').join(', ')}
                  </div>
                  <div className="s">{d.txs.length} {d.txs.length === 1 ? 'spesa' : 'spese'}{d.hasAnomaly ? ' · fuori pattern' : ''}</div>
                </div>
                <div className={`a out ${d.hasAnomaly ? 'warn' : ''}`}>€{maskedMoney(d.total, { privacy, decimals: 0 })}</div>
              </button>
            );
          })}

          <button
            type="button"
            className="hs-tap"
            style={{ marginTop: 10 }}
            onClick={() => { haptic('light'); setShowAll(true); }}
          >
            <span className="ic">
              <IcList />
            </span>
            <div className="body">
              <div className="t">Vedi tutti i giorni</div>
              <div className="s">Lista completa con ricerca · {monthTxs.length} {monthTxs.length === 1 ? 'spesa' : 'spese'}</div>
            </div>
            <span className="chev"><IcChevR /></span>
          </button>
        </>
      )}

      {footnote && <div className="hs-foot">{footnote}</div>}

      <DayDetail
        open={dayTs != null}
        dayTs={dayTs}
        allTxs={txs}
        cats={cats}
        privacy={privacy}
        onClose={() => setDayTs(null)}
        onUpdateTx={updateTx}
        onDeleteTx={deleteTx}
      />

      <Sheet open={showAll} onClose={() => { setShowAll(false); setSearch(''); setFilterCat(null); setFilterMin(0); clearSelection(); }} title="Tutte le spese">
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <input
            className="qa-input"
            placeholder="Cerca descrizione, categoria o importo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Pulisci"
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: 'var(--fg-3)', cursor: 'pointer',
              }}
            >
              <IcX width="14" height="14" />
            </button>
          )}
        </div>

        {/* v0.9: filtro categoria */}
        <div className="qa-cats" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={`qa-cat ${!filterCat ? 'active' : ''}`}
            onClick={() => { haptic('light'); setFilterCat(null); }}
            style={!filterCat ? { background: 'var(--accent-10)', borderColor: 'var(--accent-20)', color: 'var(--accent)' } : undefined}
          >
            Tutte
          </button>
          {cats.map((c) => {
            const Icon = iconForCategory(c.id);
            const sel = filterCat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`qa-cat ${sel ? 'active' : ''}`}
                onClick={() => { haptic('light'); setFilterCat(sel ? null : c.id); }}
                style={sel ? { background: `${c.color}1F`, borderColor: `${c.color}40`, color: c.color } : undefined}
              >
                <Icon /><span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* v0.9: filtro importo minimo */}
        <div className="qa-cats" style={{ marginBottom: 12 }}>
          {[0, 20, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              className={`qa-cat ${filterMin === v ? 'active' : ''}`}
              onClick={() => { haptic('light'); setFilterMin(v); }}
              style={filterMin === v ? { background: 'var(--accent-10)', borderColor: 'var(--accent-20)', color: 'var(--accent)' } : undefined}
            >
              {v === 0 ? 'Ogni importo' : `≥ €${v}`}
            </button>
          ))}
        </div>

        {filtersActive && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 11, color: 'var(--fg-3)' }}>
            <span>{filteredTxs.length} {filteredTxs.length === 1 ? 'risultato' : 'risultati'} · €{maskedMoney(filteredTxs.reduce((s, t) => s + realCost(t), 0), { privacy })}</span>
            <button
              type="button"
              onClick={() => { haptic('light'); setSearch(''); setFilterCat(null); setFilterMin(0); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Azzera filtri
            </button>
          </div>
        )}
        {filteredTxs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fg-3)', textAlign: 'center', padding: '24px 0' }}>
            Nessuna spesa corrisponde.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: selected.size > 0 ? 80 : 0 }}>
            {filteredTxs.sort((a, b) => b.ts - a.ts).map((t) => {
              const cat = cats.find((c) => c.id === t.cat);
              const date = new Date(t.ts);
              const isSel = selected.has(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleSelected(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '11px 13px',
                    background: isSel ? 'var(--accent-10)' : 'var(--glass)',
                    borderRadius: 12,
                    border: `1px solid ${isSel ? 'var(--accent-20)' : 'var(--glass-bd)'}`,
                    cursor: 'pointer',
                    transition: 'background .15s var(--ease)',
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--fg-4)'}`,
                    background: isSel ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isSel && <IcCheck width="12" height="12" style={{ color: 'var(--accent-on-solid)' }} />}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', width: 42, textAlign: 'center', letterSpacing: '.04em' }}>
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.label || cat?.label || 'Spesa'}
                    </div>
                    {cat?.label && t.label && (
                      <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 1 }}>{cat.label}</div>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                    €{maskedMoney(realCost(t), { privacy, decimals: 0 })}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Barra azione bulk: appare quando ≥1 tx selezionata */}
        {selected.size > 0 && (
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0,
            margin: '8px -20px -16px',
            padding: '12px 16px',
            background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--glass-bd)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>
              {selected.size} selezionate
            </span>
            <button
              onClick={clearSelection}
              style={{
                padding: '8px 12px', borderRadius: 9,
                background: 'transparent', color: 'var(--fg-2)',
                border: '1px solid var(--glass-bd)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Annulla</button>
            <button
              onClick={() => setShowBulkCatPicker(true)}
              style={{
                padding: '8px 14px', borderRadius: 9,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                color: 'var(--accent-on-solid)',
                border: 'none', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 6px 16px var(--accent-glow)',
              }}
            >Cambia categoria</button>
          </div>
        )}
      </Sheet>

      {/* Bulk cat picker: lista categorie, tap → riassegna tutte */}
      <Sheet open={showBulkCatPicker} onClose={() => setShowBulkCatPicker(false)} title={`Cambia categoria (${selected.size})`}>
        <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Le {selected.size} spese selezionate verranno tutte spostate nella categoria che scegli.
        </p>
        <div className="qa-cats" role="radiogroup" style={{ gap: 8 }}>
          {cats.map((c) => {
            const Icon = iconForCategory(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="qa-cat"
                onClick={() => bulkChangeCategory(c.id)}
                style={{
                  background: `${c.color}1F`,
                  borderColor: `${c.color}40`,
                  color: c.color,
                }}
              >
                <Icon />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
};
