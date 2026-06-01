/**
 * Genera i PNG dell'icona AURA da un disegno vettoriale definito qui sotto,
 * senza dipendenze esterne (niente sharp/canvas): flatten delle bezier →
 * riempimento scanline con 4x supersampling → PNG scritto a mano con zlib.
 *
 *   node scripts/gen-icons.mjs
 *
 * Le forme sono le stesse di public/icon.svg (viewBox 512): se cambi l'SVG,
 * aggiorna anche qui, poi rilancia lo script.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// ── palette (v0.16 "Prugna") ──
const PRUGNA = [0x3b, 0x2a, 0x55];
const BIANCO = [0xff, 0xff, 0xff];
const ALBICOCCA = [0xe8, 0x92, 0x5a];

// ── geometria (spazio 512, come il viewBox dell'SVG) ──
const R_TILE = 112; // raggio degli angoli della piastrella

// Scintilla grande e piccola: stesse coordinate dei path SVG, come sequenze
// di cubiche [x0,y0, c1x,c1y, c2x,c2y, x1,y1].
const SPARK_BIG = [
  [224, 128, 251, 249, 251, 249, 372, 276],
  [372, 276, 251, 303, 251, 303, 224, 424],
  [224, 424, 197, 303, 197, 303, 76, 276],
  [76, 276, 197, 249, 197, 249, 224, 128],
];
const SPARK_SMALL = [
  [388, 92, 398, 140, 398, 140, 446, 150],
  [446, 150, 398, 160, 398, 160, 388, 208],
  [388, 208, 378, 160, 378, 160, 330, 150],
  [330, 150, 378, 140, 378, 140, 388, 92],
];

// Bezier cubica → spezzata (32 segmenti: a 512px l'errore è sotto il pixel).
const flatten = (curves, steps = 32) => {
  const pts = [];
  for (const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] of curves) {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      pts.push([
        u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1,
        u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1,
      ]);
    }
  }
  return pts;
};

// Test even-odd: il punto è dentro il poligono chiuso?
const inPoly = (poly, x, y) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// Il punto è dentro il rettangolo arrotondato 0..512?
const inTile = (x, y) => {
  const S = 512;
  if (x < 0 || y < 0 || x > S || y > S) return false;
  const cx = Math.min(Math.max(x, R_TILE), S - R_TILE);
  const cy = Math.min(Math.max(y, R_TILE), S - R_TILE);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= R_TILE * R_TILE;
};

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const png = (size, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro "None"
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const render = (size) => {
  const big = flatten(SPARK_BIG);
  const small = flatten(SPARK_SMALL);
  const px = Buffer.alloc(size * size * 4);
  const SS = 4;            // supersampling 4x4 = 16 campioni per pixel
  const scale = 512 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let tile = 0, ink = 0, lime = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px512 = (x + (sx + 0.5) / SS) * scale;
          const py512 = (y + (sy + 0.5) / SS) * scale;
          if (!inTile(px512, py512)) continue;
          tile++;
          if (inPoly(small, px512, py512)) lime++;
          else if (inPoly(big, px512, py512)) ink++;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      if (tile === 0) { px[i + 3] = 0; continue; }
      // Mescolo i tre strati in base a quanti campioni ha vinto ciascuno.
      const wLime = lime / n, wInk = ink / n, wBase = (tile - lime - ink) / n;
      const tot = wLime + wInk + wBase;
      for (let c = 0; c < 3; c++) {
        px[i + c] = Math.round((ALBICOCCA[c] * wLime + BIANCO[c] * wInk + PRUGNA[c] * wBase) / tot);
      }
      px[i + 3] = Math.round((tile / n) * 255);
    }
  }
  return px;
};

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(join(OUT, name), png(size, render(size)));
  console.log('scritto', name, size + 'px');
}
