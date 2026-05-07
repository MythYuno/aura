import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcCheck, IcX } from '../lib/icons.jsx';
import { haptic } from '../lib/haptic.js';

/**
 * Tiny rule explainer + editor. Given a label that triggered an auto-suggested
 * category, it shows which token matched and lets the user save a permanent rule.
 */
export const WhyCard = ({ open, label, suggestedCatId, cats, txs, onClose, onSaveRule }) => {
  const [editing, setEditing] = useState(false);
  const [token, setToken] = useState('');

  const explanation = useMemo(() => {
    if (!label || !suggestedCatId) return null;
    const norm = label.toLowerCase();
    const tokens = norm.split(/\s+/).filter((t) => t.length >= 3);
    // Find which token produced the most overlap with past txs in this cat
    const counts = {};
    for (let i = 0; i < txs.length; i++) {
      const t = txs[i];
      if (t.cat !== suggestedCatId || !t.label) continue;
      const tt = t.label.toLowerCase();
      tokens.forEach((tok) => {
        if (tt.includes(tok)) counts[tok] = (counts[tok] || 0) + 1;
      });
    }
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (sorted.length === 0) return null;
    return { match: sorted[0], occurrences: counts[sorted[0]] };
  }, [label, suggestedCatId, txs]);

  const cat = cats.find((c) => c.id === suggestedCatId);

  if (!open) return null;

  const startEdit = () => {
    setToken(explanation?.match || '');
    setEditing(true);
  };
  const save = () => {
    if (!token.trim()) return;
    haptic('success');
    onSaveRule(token.trim().toLowerCase(), suggestedCatId);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="why-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="why-modal"
          role="dialog"
          aria-label="Perché questa categoria"
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="why-card">
            <div className="ttl">Spiegazione</div>
            {explanation ? (
              <div className="answer">
                La descrizione contiene <span className="match">{explanation.match}</span>,
                {' '}e nelle tue spese passate questa parola va in
                {' '}<strong style={{ color: cat?.color || 'var(--accent)' }}>{cat?.label}</strong>
                {' '}({explanation.occurrences} {explanation.occurrences === 1 ? 'volta' : 'volte'}).
              </div>
            ) : (
              <div className="answer">
                AURA sta imparando: ha proposto <strong>{cat?.label}</strong> in base
                al contesto. Più spese registri, più migliora.
              </div>
            )}

            {explanation && !editing && (
              <button className="why-edit-btn" onClick={startEdit}>
                Modifica regola
              </button>
            )}
            {editing && (
              <>
                <div className="why-rule-lbl">Regola</div>
                <div className="rule-edit">
                  <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>se contiene</span>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    autoFocus
                  />
                  <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>→ {cat?.label}</span>
                </div>
                <div className="rule-actions">
                  <button className="b cancel" onClick={onClose}><IcX /> Annulla</button>
                  <button className="b save" onClick={save}><IcCheck /> Salva</button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
