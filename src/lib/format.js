export const $n = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('it-IT');
};

export const $d = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '0,00';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseNum = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (!v) return 0;
  const cleaned = String(v).replace(/[€\s]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

export const uid = () => Date.now() + Math.floor(Math.random() * 1e6);

export const realCost = (t) => {
  const amount = t?.amount || 0;
  const credit = t?.credit || 0;
  return Math.max(0, amount - credit);
};

export const cn = (...classes) => classes.filter(Boolean).join(' ');
