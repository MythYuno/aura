import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
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
          className="fixed left-1/2 -translate-x-1/2 z-[200] max-w-[calc(100%-32px)]"
          style={{ bottom: 'calc(90px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <Check size={16} className="text-ok flex-shrink-0" />
            <p className="text-sm text-white font-medium truncate">{toast.message}</p>
            {toast.onUndo && (
              <button
                onClick={() => { haptic('light'); onUndo(); }}
                className="px-3.5 py-1.5 rounded-lg bg-ok/15 text-ok text-xs font-bold uppercase tracking-wider hover:bg-ok/25 transition-colors"
              >
                Annulla
              </button>
            )}
            <button
              onClick={onDismiss}
              className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
