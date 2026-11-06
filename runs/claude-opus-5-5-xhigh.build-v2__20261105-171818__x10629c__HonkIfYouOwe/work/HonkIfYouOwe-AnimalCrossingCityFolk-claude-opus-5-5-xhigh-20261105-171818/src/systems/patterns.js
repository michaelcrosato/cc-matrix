// Pixel patterns: 16×16 of palette indices, drawn in the studio, worn on shirts, shown on tiles.
import { THREE, PALETTE, pixelTexture, toonMaterial } from '../engine.js';

export const PATTERN_COLORS = ['ink', 'plum', 'red', 'orange', 'sand', 'lime', 'green', 'teal', 'navy', 'blue', 'sky', 'cyan', 'white', 'mist', 'slate', 'night'];
const cache = new Map();
export function blankPattern() { return Array(256).fill(12); }
/** A texture from a pattern's data. Same data, same texture. */
export function makePatternTexture(data) {
  if (!data) return null;
  const k = data.join(',');
  let t = cache.get(k);
  if (t) return t;
  const px = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const hex = PALETTE[PATTERN_COLORS[data[i]]] ?? 0xffffff;
    // DataTexture rows run bottom-up; flip so what you drew is what you get.
    const y = 15 - Math.floor(i / 16), x = i % 16;
    const o = (y * 16 + x) * 4;
    px[o] = (hex >> 16) & 255; px[o + 1] = (hex >> 8) & 255; px[o + 2] = hex & 255; px[o + 3] = 255;
  }
  t = new THREE.DataTexture(px, 16, 16);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  pixelTexture(t);
  cache.set(k, t);
  return t;
}
export function patternMaterial(data) { const t = makePatternTexture(data); return t ? toonMaterial(PALETTE.white, { map: t }) : null; }
