import { FireGrid, FN } from '../src/world/fire.js';
import { Rng } from '../pixel-engine.js';
export function measure(wind, seed, T = 30) {
  const f = new FireGrid(new Rng(seed)); f.fuel.fill(1); f.baseFuel.fill(1);
  f.wind = { dir: [1, 0], speed: wind };
  const cx = 60, cz = 128; for (let dz=-1;dz<=1;dz++) f.lightCell(cx, cz+dz);
  for (let t = 0; t < T * 4; t++) f.step();
  let head = 0, back = 0, flank = 0;
  for (let i = 0; i < FN*FN; i++) if (f.state[i] !== 0) { const x = i % FN, z = (i / FN) | 0; head = Math.max(head, x - cx); back = Math.max(back, cx - x); flank = Math.max(flank, Math.abs(z - cz)); }
  return { head: head * 5 / T, back: back * 5 / T, flank: flank * 5 / T };
}
if (process.argv[1].endsWith('t4.mjs')) for (const w of [0, 5, 8]) { const r = [1,2,3,4,5].map((s) => measure(w, s)); const avg = (k) => (r.reduce((a, b) => a + b[k], 0) / r.length).toFixed(2); console.log(w, 'head', avg('head'), 'back', avg('back'), 'flank', avg('flank')); }
