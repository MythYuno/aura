import { useMemo } from 'react';

/**
 * Tiny inline sparkline SVG.
 * @param {Array} data - array of numbers
 * @param {string} color - stroke color
 */
export const Sparkline = ({ data = [], color = 'var(--ok)', width = 80, height = 24, fill = true }) => {
  const { path, areaPath } = useMemo(() => {
    if (data.length < 2) return { path: '', areaPath: '' };
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));
    const p = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const a = p + ` L${width},${height} L0,${height} Z`;
    return { path: p, areaPath: a };
  }, [data, width, height]);

  if (!path) return null;

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {fill && (
        <>
          <defs>
            <linearGradient id={`spark-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#spark-${color.replace(/[^a-z]/gi, '')})`} />
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
