/**
 * Foglio dal basso, con maniglia. Il fondo si oscura e si può toccare per
 * chiudere, come si aspetta chiunque abbia usato un iPhone.
 */

import { useEffect } from 'react';

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.28)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[86%] overflow-y-auto"
        style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(34px)',
          WebkitBackdropFilter: 'blur(34px)',
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderTop: '1px solid var(--glass-border)',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto mt-[6px] h-[5px] w-9 rounded-full" style={{ background: 'var(--label-3)' }} />
        {title && (
          <h2 className="px-5 pb-1 pt-3 text-[17px] font-semibold" style={{ letterSpacing: '-0.022em' }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
