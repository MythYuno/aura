import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button.jsx';

export const Confirm = ({ open, onClose, onConfirm, title, msg, danger = true }) => {
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
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1000]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] w-[90vw] max-w-sm bg-glass backdrop-blur-2xl border border-glass-bd-2 rounded-3xl p-6 shadow-2xl"
              >
                <Dialog.Title className="text-lg font-semibold mb-2">{title}</Dialog.Title>
                <p className="text-sm text-fg-3 mb-5 leading-relaxed">{msg}</p>
                <div className="flex gap-2">
                  <Button variant="default" size="lg" className="flex-1" onClick={onClose}>
                    Annulla
                  </Button>
                  <Button
                    variant={danger ? 'danger' : 'primary'}
                    size="lg"
                    className="flex-1"
                    onClick={() => { onConfirm?.(); onClose?.(); }}
                    haptic="warning"
                  >
                    Conferma
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
