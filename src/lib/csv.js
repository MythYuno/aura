import { realCost } from './format.js';

const esc = (s) => {
  const v = String(s ?? '').replace(/"/g, '""');
  return /[;"\n,]/.test(v) ? `"${v}"` : v;
};

export const exportCSV = (txs, cats) => {
  const rows = [['Data', 'Ora', 'Descrizione', 'Categoria', 'Importo', 'Credito', 'Credito Ricevuto', 'Costo Reale', 'Tag']];
  [...txs].sort((a, b) => a.ts - b.ts).forEach((t) => {
    const d = new Date(t.ts);
    const cat = cats.find((c) => c.id === t.cat);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    rows.push([
      dateStr, timeStr, esc(t.label || ''), esc(cat?.label || ''),
      (t.amount || 0).toFixed(2).replace('.', ','),
      (t.credit || 0).toFixed(2).replace('.', ','),
      t.credit > 0 ? (t.creditReceived ? 'Sì' : 'In attesa') : '—',
      realCost(t).toFixed(2).replace('.', ','),
      esc((t.tags || []).join(' ')),
    ]);
  });
  const csv = rows.map((r) => r.join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aura_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const parseCsvRow = (line, sep) => {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === sep && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

export const parseCSVImport = (text, cats) => {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const firstLine = lines[0];
  const sep = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const header = parseCsvRow(lines[0], sep).map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => /data|date/.test(h));
  const descIdx = header.findIndex((h) => /descr|note|causale/.test(h));
  const catIdx = header.findIndex((h) => /categ/.test(h));
  const amtIdx = header.findIndex((h) => /importo|amount|valore|ammont/.test(h));
  if (dateIdx < 0 || amtIdx < 0) return [];
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i], sep);
    const dateStr = row[dateIdx] || '';
    const amtStr = (row[amtIdx] || '').replace(/[€\s]/g, '').replace(',', '.').replace(/^-/, '');
    const amt = parseFloat(amtStr);
    if (!amt || isNaN(amt)) continue;
    let ts = Date.now();
    const slashMatch = dateStr.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    const dashMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dashMatch) ts = new Date(+dashMatch[1], +dashMatch[2] - 1, +dashMatch[3]).getTime();
    else if (slashMatch) {
      const y = +slashMatch[3];
      ts = new Date(y < 100 ? 2000 + y : y, +slashMatch[2] - 1, +slashMatch[1]).getTime();
    }
    const catLabel = (row[catIdx] || '').toLowerCase();
    const matchedCat = cats.find((c) => c.label.toLowerCase() === catLabel) || cats.find((c) => catLabel.includes(c.label.toLowerCase()));
    txs.push({
      id: Date.now() + Math.floor(Math.random() * 1e6) + i,
      amount: amt, cat: matchedCat?.id || cats[0]?.id || '',
      label: row[descIdx] || '', type: 'expense', ts,
      credit: 0, creditReceived: false, tags: [],
    });
  }
  return txs;
};
