// a minimal PNG decoder (8-bit RGB/RGBA, non-interlaced: what Playwright's screenshots are) for pixel checks
import { inflateSync } from 'node:zlib';
export function decode(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break; p += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 4), stride = w * bpp, prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0; let v = cur[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } cur[x] = v & 255; }
    for (let x = 0; x < w; x++) { out[(y * w + x) * 4] = cur[x * bpp]; out[(y * w + x) * 4 + 1] = cur[x * bpp + 1]; out[(y * w + x) * 4 + 2] = cur[x * bpp + 2]; out[(y * w + x) * 4 + 3] = 255; }
    cur.copy(prev);
  }
  return { w, h, data: out };
}
/** share of non-black pixels and the number of distinct colours (quantised) in a region */
export function stats(img, x0 = 0, y0 = 0, x1 = img.w, y1 = img.h) {
  let lit = 0, n = 0; const cols = new Set();
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * img.w + x) * 4, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]; n++; if (r + g + b > 30) lit++; cols.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4)); }
  return { lit: lit / n, colors: cols.size };
}
