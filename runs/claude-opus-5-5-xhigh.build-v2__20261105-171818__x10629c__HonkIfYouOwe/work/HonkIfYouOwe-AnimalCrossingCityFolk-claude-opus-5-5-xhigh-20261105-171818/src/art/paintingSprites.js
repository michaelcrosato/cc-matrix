// Paintings as HUD sprites, baked from the same texture defs, scaled to 176×132.
import { PAINTINGS } from './paintings.js';
import { bakeTexture, PALETTE } from '../engine.js';

const NAMES = Object.keys(PALETTE);
const cache = new Map();
const HEX = Object.fromEntries(NAMES.map((n) => [PALETTE[n], n]));
function nearest(r, g, b) {
  let best = 'ink', bd = 1e9;
  for (const n of NAMES) { const h = PALETTE[n]; const d = (((h >> 16) & 255) - r) ** 2 + (((h >> 8) & 255) - g) ** 2 + ((h & 255) - b) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
export function paintingSprite(id) {
  if (cache.has(id)) return cache.get(id);
  const def = PAINTINGS.find((p) => p.id === `art-${id}`);
  const baked = bakeTexture(def);
  const w = baked.width, h = baked.height;
  const data = baked.rgba;
  const chars = 'abcdefghijklmnop';
  const colors = {};
  NAMES.forEach((n, i) => { colors[chars[i]] = n; });
  const S = 5;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const name = nearest(data[o], data[o + 1], data[o + 2]);
      line += chars[NAMES.indexOf(name)].repeat(S);
    }
    for (let k = 0; k < S; k++) rows.push(line);
  }
  const out = { rows, colors };
  cache.set(id, out);
  return out;
}
export { HEX };
