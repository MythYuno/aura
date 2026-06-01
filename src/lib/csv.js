import { realCost, uid, round2 } from './format.js';

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

/**
 * Tokenizer CSV RFC 4180-compliant: produce un array di righe (ognuna come
 * stringa testo) gestendo correttamente i newline DENTRO i campi quotati.
 *
 * Esempio: `"Cena\ncon amici",50` resta UNA riga, non due come farebbe
 * un naive `text.split('\n')`. Risolve il bug audit #5.
 *
 * Rimuove anche il BOM in testa (alcuni export Excel/Numbers lo includono).
 */
const splitCsvRows = (text) => {
  let t = text || '';
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1); // strip BOM
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // normalizza newline
  const rows = [];
  let cur = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '"') {
      cur += c;
      // se siamo già in quote e il prossimo è ancora ", è un escape: skip
      if (inQ && t[i + 1] === '"') { cur += t[i + 1]; i++; }
      else inQ = !inQ;
    } else if (c === '\n' && !inQ) {
      if (cur.trim()) rows.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) rows.push(cur);
  // Guardia: se le quote sono sbilanciate (`"` aperto e mai chiuso), `inQ`
  // resta true e abbiamo accumulato l'intero file in una sola riga gigante.
  // Detect e cap: fallback a split('\n') naive che almeno produce righe usabili.
  if (inQ && rows.length === 1 && rows[0].length > 5000) {
    return t.split('\n').filter((l) => l.trim());
  }
  return rows;
};

export const parseCSVImport = (text, cats) => {
  const lines = splitCsvRows(text);
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
      // v0.8.1: uso uid() centralizzato (era pattern Date.now()+random
      // collision-prone — su import multipli ravvicinati potevano collidere).
      id: uid(),
      amount: round2(amt), cat: matchedCat?.id || cats[0]?.id || '',
      label: row[descIdx] || '', type: 'expense', ts,
      credit: 0, creditReceived: false, tags: [],
    });
  }
  return txs;
};
