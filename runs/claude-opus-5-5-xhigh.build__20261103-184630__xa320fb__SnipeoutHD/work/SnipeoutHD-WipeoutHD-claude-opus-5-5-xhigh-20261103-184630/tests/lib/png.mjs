// A minimal PNG reader (8-bit RGB / RGBA, the five filters) for screenshots: { w, h, px(x, y) -> [r, g, b] }
import { inflateSync } from 'node:zlib';
export function readPNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = up ? up[i] : 0, c = up && i >= bpp ? up[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255;
    }
  }
  return { w, h, px: (x, y) => { const i = y * stride + x * bpp; return [out[i], out[i + 1], out[i + 2]]; } };
}
/** the share of pixels that are not near-black, and how many distinct colours (coarse) a region has */
export function stats(img, x0 = 0, y0 = 0, x1 = img.w, y1 = img.h, step = 3) {
  let n = 0, lit = 0; const cols = new Set();
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) { const [r, g, b] = img.px(x, y); n++; if (r + g + b > 40) lit++; cols.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4)); }
  return { lit: lit / n, colours: cols.size };
}
