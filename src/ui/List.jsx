/**
 * Lista raggruppata, come la fa iOS: carta bianca su fondo grigio, raggio 11,
 * separatori che partono dal testo e non dal bordo. Il rientro del separatore
 * cambia con l'icona (56 px) o senza (16 px): è un dettaglio che si nota solo
 * quando è sbagliato.
 */

import { CaretRight } from '@phosphor-icons/react';

export function Group({ header, footer, children }) {
  return (
    <section>
      {header && (
        <h2 className="px-5 pb-[7px] pt-6 text-[13px] leading-[18px]" style={{ color: 'var(--label-2)', paddingLeft: 36 }}>
          {header}
        </h2>
      )}
      <div className="ios-group mx-4 overflow-hidden" style={{ background: 'var(--card)', borderRadius: 'var(--radius-group)' }}>
        {children}
      </div>
      {footer && (
        <p className="px-9 pt-[7px] text-[13px] leading-[18px]" style={{ color: 'var(--label-2)' }}>
          {footer}
        </p>
      )}
    </section>
  );
}

export function Cell({ icon, title, subtitle, value, chevron = false, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`ios-cell relative flex min-h-[44px] w-full items-center gap-3 px-4 py-[11px] text-left ${icon ? 'has-icon' : ''}`}
    >
      {icon}
      <span className="flex-1 text-[17px] leading-[22px]" style={{ letterSpacing: '-0.022em' }}>
        {title}
        {subtitle && (
          <small className="block text-[13px] leading-[17px]" style={{ color: 'var(--label-2)', letterSpacing: 0 }}>
            {subtitle}
          </small>
        )}
      </span>
      {value != null && (
        <span className="text-[17px] tabular-nums" style={{ color: 'var(--label-2)', letterSpacing: '-0.022em' }}>
          {value}
        </span>
      )}
      {chevron && <CaretRight size={13} weight="bold" style={{ color: 'var(--label-3)' }} />}
    </Tag>
  );
}
