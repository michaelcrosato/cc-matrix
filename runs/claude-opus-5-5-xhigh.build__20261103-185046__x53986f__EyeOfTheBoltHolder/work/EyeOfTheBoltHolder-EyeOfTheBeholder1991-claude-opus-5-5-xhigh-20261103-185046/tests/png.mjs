// A small PNG reader (8-bit RGB/RGBA, not interlaced) for counting colours in screenshots.
import { inflateSync } from 'node:zlib';
export function decode(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; } else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break; p += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * bpp), stride = w * bpp;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride), up = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? row[i - bpp] : 0, b = up ? up[i] : 0, c = up && i >= bpp ? up[i - bpp] : 0; let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      row[i] = v & 255; }
  }
  return { w, h, bpp, data: out };
}
export function colors(png, region) { const { w, h, bpp, data } = png, [x0, y0, x1, y1] = region || [0, 0, w, h], set = new Set(); for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = (y * w + x) * bpp; set.add((data[i] >> 3) << 10 | (data[i + 1] >> 3) << 5 | (data[i + 2] >> 3)); } return set.size; }
