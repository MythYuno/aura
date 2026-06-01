import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button.jsx';

/**
 * Confirm dialog — sostituisce l'approccio top/left:50% (che su iOS Safari
 * con la barra browser non centra al pixel) con un overlay flex full-viewport
 * con padding safe-area. Sempre dentro lo schermo, su ogni device.
 */
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
                className="fixed inset-0 z-[1000]"
                style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[1001] flex items-center justify-center"
                style={{
                  paddingTop: 'max(20px, env(safe-area-inset-top))',
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                  paddingLeft: 'max(16px, env(safe-area-inset-left))',
                  paddingRight: 'max(16px, env(safe-area-inset-right))',
                }}
              >
                <motion.div
                  initial={{ scale: 0.92, y: 8 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                  style={{
                    width: 'min(100%, 380px)',
                    maxHeight: 'var(--vh-85)',
                    overflowY: 'auto',
                    background: 'var(--bg-2, var(--bg))',
                    border: '1px solid var(--glass-bd-2)',
                    borderRadius: 22,
                    padding: 22,
                    boxShadow: '0 30px 80px rgba(0,0,0,.5)',
                    boxSizing: 'border-box',
                  }}
                >
                  <Dialog.Title style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 19, fontWeight: 500,
                    letterSpacing: '-.01em',
                    marginBottom: 8, color: 'var(--fg)',
                  }}>
                    {title}
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p style={{
                      fontSize: 13, color: 'var(--fg-2)',
                      lineHeight: 1.55, marginBottom: 20,
                    }}>{msg}</p>
                  </Dialog.Description>
                  <div style={{ display: 'flex', gap: 8 }}>
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
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};
