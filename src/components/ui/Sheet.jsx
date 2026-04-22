import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { haptic } from '../../lib/haptic.js';

export const Sheet = ({ open, onClose, title, children, className = '' }) => {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose?.()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[999]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={`fixed bottom-0 left-0 right-0 z-[1000] max-h-[88vh] bg-bg-1 backdrop-blur-2xl border-t border-bd-2 rounded-t-3xl overflow-auto ${className}`}
                style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
              >
                <div className="sticky top-0 z-10 flex flex-col items-center pt-3 pb-2 bg-bg-1/90 backdrop-blur-xl">
                  <div className="w-10 h-1 rounded-full bg-fg-5" />
                </div>
                <div className="px-5 pb-5">
                  {title && (
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="text-xl font-medium tracking-tight">{title}</Dialog.Title>
                      <button
                        onClick={() => { haptic('light'); onClose?.(); }}
                        className="w-9 h-9 rounded-xl bg-bg-2 border border-bd-1 flex items-center justify-center hover:bg-bg-3 transition-colors"
                      >
                        <X size={16} className="text-fg-3" />
                      </button>
                    </div>
                  )}
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
