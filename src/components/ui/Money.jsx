/**
 * Money display with optional privacy mask. When `privacy` is on, shows
 * a clean •••• placeholder instead of blurring the value (which looked broken).
 *
 * Usage:
 *   <Money value={123.45} decimals={2} privacy={privacy} />
 *   <Money value={123} decimals={0} privacy={privacy} prefix="€" />
 */
export const Money = ({ value, decimals = 0, privacy, prefix = '', className = '', style }) => {
  if (privacy) {
    return <span className={className} style={style}>{prefix}•••</span>;
  }
  const v = Number(value || 0);
  const formatted = decimals === 0
    ? Math.round(v).toLocaleString('it-IT')
    : v.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={className} style={style}>{prefix}{formatted}</span>;
};
