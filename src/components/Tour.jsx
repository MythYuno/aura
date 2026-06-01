import { motion, AnimatePresence } from 'framer-motion';
import { IcCheck, IcSpark } from '../lib/icons.jsx';
import { haptic } from '../lib/haptic.js';

/**
 * Static welcome card shown the first time the user lands on a screen.
 *
 * Previously this was an interactive spotlight tour that anchored tooltips
 * to `data-tut="..."` elements. It proved unreliable on iOS Safari
 * (tooltips clipped, spotlight landed on wrong elements after scroll,
 * blocking states). Replaced with a centered modal: one screenful of
 * plain text, dismissable. Simpler, works everywhere.
 */
const SCREENS = {
  today: {
    title: 'Oggi',
    intro: 'È la stanza che apri tutti i giorni.',
    bullets: [
      'Il numero grande è il tuo budget di oggi, si ricalcola dopo ogni spesa',
      'Le barre sotto sono i tuoi 30 giorni: quelle ambra/rosse sono spese fuori dal solito — tap per il dettaglio',
      'Più sotto, una previsione di fine mese (stima, non un giudizio)',
      'In fondo, registri una spesa o un\'entrata extra in due tap',
    ],
  },
  money: {
    title: 'Soldi',
    intro: 'Dove vivono i tuoi soldi prima di essere spesi.',
    bullets: [
      'In alto: quanto ti rimane davvero, dopo aver tolto fissi, abbonamenti, accantonamenti',
      'Stipendio del mese: tap per rettificare se hai ricevuto una cifra diversa',
      'Spese annuali (assicurazione, bollo): te le accantono 1/12 al mese, così non ti trovi col conto vuoto a settembre',
      'In fondo: le tue aree di spesa, confrontate con la TUA media storica',
    ],
  },
  history: {
    title: 'Storia',
    intro: 'Il passato in tre viste.',
    bullets: [
      'Mese corrente con totale e differenza rispetto al precedente',
      'Bar chart di tutti gli ultimi 12 mesi: vedi quali mesi pesano di più',
      'Lista giorno per giorno, con barra di ricerca se cerchi una transazione specifica',
      '"Da controllare": le spese più fuori dal tuo pattern del mese',
    ],
  },
};

export const Tour = ({ tourId, open, onClose }) => {
  const data = SCREENS[tourId];
  if (!data) return null;

  const close = (reason) => {
    haptic('light');
    onClose?.(reason || 'done');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => close('skip')}
        >
          <motion.div
            className="welcome-card"
            role="dialog"
            aria-modal="true"
            aria-label={`Benvenuto in ${data.title}`}
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="welcome-icon">
              <IcSpark />
            </div>
            <p className="welcome-eyebrow">Benvenuto in</p>
            <h2 className="welcome-title">{data.title}</h2>
            <p className="welcome-intro">{data.intro}</p>

            <ul className="welcome-bullets">
              {data.bullets.map((b, i) => (
                <li key={i}>
                  <span className="welcome-bullet-ic"><IcCheck /></span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="welcome-cta"
              onClick={() => close('done')}
            >
              Ho capito
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
