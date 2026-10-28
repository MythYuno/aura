/**
 * Un importo. Cifre tabellari sempre, così una colonna di numeri non balla
 * mentre cambia.
 *
 * `title1` è 28 pt: è la misura della cifra del giorno. Non esiste una taglia
 * più grande, di proposito — l'hero gigante è stato buttato via.
 */

import { formatCents } from './format.js';

const SIZES = {
  title1: 'text-[28px] leading-[34px] font-semibold',
  body: 'text-[17px] leading-[22px]',
  foot: 'text-[13px] leading-[18px]',
};

export { formatCents };

export function Money({ cents, size = 'body', className = '', style }) {
  return (
    <span
      className={`tabular-nums ${SIZES[size] ?? SIZES.body} ${className}`}
      style={{ letterSpacing: size === 'title1' ? '-0.023em' : '-0.022em', ...style }}
    >
      {formatCents(cents)}
    </span>
  );
}
