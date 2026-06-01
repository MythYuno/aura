import { AnimatePresence, motion } from 'framer-motion';
import { IcCheck, IcX } from '../../lib/icons.jsx';
import { haptic } from '../../lib/haptic.js';

export const UndoToast = ({ toast, onUndo, onDismiss }) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="fixed left-1/2 -translate-x-1/2 z-[200] undo-toast-wrap"
          style={{ bottom: 'calc(116px + env(safe-area-inset-bottom))', width: 'min(calc(100vw - 24px), 420px)' }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl undo-toast-card">
            <IcCheck width="16" height="16" className="text-accent flex-shrink-0" />
            {/* v0.9.2: niente truncate — i messaggi lunghi vanno a capo, leggibili */}
            <p className="text-sm text-white font-medium" style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>{toast.message}</p>
            {toast.onUndo && (
              <button
                onClick={() => { haptic('light'); onUndo(); }}
                className="px-3.5 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider hover:bg-accent/25 transition-colors"
              >
                Annulla
              </button>
            )}
            <button
              onClick={onDismiss}
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            >
              <IcX width="14" height="14" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
