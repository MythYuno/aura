import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { IcX } from '../../lib/icons.jsx';
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
                transition={{ duration: 0.25 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[999]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%', transition: { type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
                transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.9 }}
                className={`fixed bottom-0 left-0 right-0 z-[1000] overflow-auto rounded-t-3xl ${className}`}
                style={{
                  background: 'var(--bg)',
                  borderTop: '1px solid var(--glass-bd-2)',
                  paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                  paddingLeft: 'env(safe-area-inset-left)',
                  paddingRight: 'env(safe-area-inset-right)',
                  boxShadow: '0 -30px 80px rgba(0, 0, 0, 0.5)',
                  maxHeight: 'var(--vh-88)',
                  width: 'min(100vw, 540px)',
                  marginInline: 'auto',
                  boxSizing: 'border-box',
                }}
              >
                {/* Mesh tint at top */}
                <div className="sticky top-0 z-10 pointer-events-none" style={{ height: 0 }}>
                  <div
                    className="absolute inset-x-0 top-0 h-32 pointer-events-none"
                    style={{ background: 'var(--mesh)', opacity: 0.35, filter: 'blur(30px)' }}
                  />
                </div>

                <div className="sticky top-0 z-20 flex flex-col items-center pt-3 pb-2 backdrop-blur-xl"
                     style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)' }}>
                  <div className="w-10 h-1 rounded-full" style={{ background: 'var(--fg-5)' }} />
                </div>
                <div className="px-5 pb-6 relative">
                  {title && (
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="text-xl font-semibold tracking-tight">{title}</Dialog.Title>
                      <Dialog.Description className="sr-only">Pannello {title}</Dialog.Description>
                      <button
                        onClick={() => { haptic('light'); onClose?.(); }}
                        aria-label="Chiudi"
                        className="glass w-11 h-11 rounded-xl flex items-center justify-center hover:bg-glass-2 transition-colors active:scale-95"
                      >
                        <IcX width="18" height="18" style={{ color: 'var(--fg-3)' }} aria-hidden="true" />
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
