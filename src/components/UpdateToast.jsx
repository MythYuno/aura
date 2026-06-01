import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IcSparkle, IcCheck } from '../lib/icons.jsx';
import { CURRENT_VERSION, IS_BETA, CHANGELOG } from '../data/changelog.js';
import { haptic } from '../lib/haptic.js';

const SEEN_KEY = 'aura_changelog_seen_v1';

/**
 * UpdateModal — popup centrale che annuncia una nuova versione.
 *
 * Trigger:
 *  1. Service worker rileva un update → dispatch evento 'aura:update'
 *     (gestito dal vecchio sistema). Quando arriva l'evento, mostriamo
 *     il popup.
 *  2. Anche all'avvio: se CURRENT_VERSION è diversa dall'ultima vista
 *     dall'utente, mostriamo il popup col changelog (utile dopo refresh
 *     manuali in cui il SW si è già aggiornato).
 *
 * Tasto "OK" semplicemente chiude il popup, marca la versione come vista
 * in localStorage, e applica il SW skipWaiting in background (l'utente
 * vedrà i cambi al prossimo reload, non forziamo niente).
 *
 * Il nome del file (UpdateToast.jsx) è mantenuto per non rompere import,
 * ma il componente è esportato anche come UpdateModal.
 */
export const UpdateToast = () => {
  const [open, setOpen] = useState(false);
  const [apply, setApply] = useState(null); // funzione opzionale per skipWaiting SW

  useEffect(() => {
    // Check on mount: se l'utente non ha mai visto la versione corrente, mostra.
    // MA: al primissimo avvio (nessun dato salvato) marchiamo la versione come
    // vista senza mostrare niente — non ha senso annunciare un changelog a chi
    // ha appena finito l'onboarding.
    let seen = '';
    let hasData = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) || '';
      hasData = !!localStorage.getItem('aura_v4') || !!localStorage.getItem('aura_v3');
    } catch {}

    if (!hasData) {
      // First boot — segna come vista, nessun popup
      try { localStorage.setItem(SEEN_KEY, CURRENT_VERSION); } catch {}
      return;
    }
    if (seen !== CURRENT_VERSION) {
      // Piccolo delay per non sovrapporsi all'animazione di entrata dell'app
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    // Quando il SW rileva un update via 'aura:update', apri subito il popup.
    const onUpdate = (e) => {
      setApply(() => e.detail?.apply);
      setOpen(true);
      haptic('light');
    };
    window.addEventListener('aura:update', onUpdate);
    return () => window.removeEventListener('aura:update', onUpdate);
  }, []);

  const close = () => {
    haptic('success');
    setOpen(false);
    // Marca come visto
    try { localStorage.setItem(SEEN_KEY, CURRENT_VERSION); } catch {}
    // Se c'è un SW in attesa, applica skipWaiting in background.
    // L'utente vedrà i cambi al prossimo refresh manuale, ma noi non
    // ricarichiamo: solo info, niente reload obbligatorio (come richiesto).
    if (apply) {
      try { apply(); } catch {}
    }
  };

  // Trova le voci del changelog per la versione corrente
  const current = CHANGELOG.find((c) => c.version === CURRENT_VERSION);
  if (!current) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1001,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingTop: 'max(20px, env(safe-area-inset-top))',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              paddingLeft: 'max(16px, env(safe-area-inset-left))',
              paddingRight: 'max(16px, env(safe-area-inset-right))',
              pointerEvents: 'none',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="update-modal-title"
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(100%, 400px)',
                maxHeight: 'var(--vh-85)',
                overflowY: 'auto',
                background: 'var(--bg-2, var(--bg))',
                border: '1px solid var(--accent-20)',
                borderRadius: 22,
                padding: 24,
                boxShadow: '0 30px 80px rgba(0,0,0,.55), 0 0 60px var(--accent-glow)',
                pointerEvents: 'auto',
                boxSizing: 'border-box',
              }}
            >
              {/* Header con badge "nuova versione" */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                  color: 'var(--accent-on-solid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <IcSparkle width="20" height="20" />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Versione {current.version}
                    {IS_BETA && (
                      <span style={{
                        background: 'var(--accent)', color: 'var(--accent-on-solid)',
                        padding: '1px 6px', borderRadius: 4,
                        fontSize: 9, letterSpacing: '.18em', fontWeight: 800,
                      }}>BETA</span>
                    )}
                  </div>
                  <h2 id="update-modal-title" style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 20, fontWeight: 500, letterSpacing: '-.01em',
                    color: 'var(--fg)', margin: 0,
                  }}>
                    {current.title}
                  </h2>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 14 }}>
                {apply
                  ? "Una nuova versione di AURA è pronta. Ecco cosa è cambiato:"
                  : "AURA si è aggiornata. Ecco le novità di questa versione:"}
              </p>

              <ul style={{
                listStyle: 'none', padding: 0, margin: '0 0 22px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {current.items.map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                    <span style={{
                      flexShrink: 0,
                      width: 18, height: 18,
                      borderRadius: '50%',
                      background: 'var(--accent-10)',
                      color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1,
                    }}>
                      <IcCheck width="10" height="10" strokeWidth="2.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={close}
                style={{
                  display: 'block', width: '100%',
                  padding: 14,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                  color: 'var(--accent-on-solid)',
                  fontSize: 14, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 8px 20px var(--accent-glow)',
                  fontFamily: 'inherit',
                }}
              >
                OK, ho capito
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Esportato anche col nome semantico, per riferimenti futuri
export { UpdateToast as UpdateModal };
