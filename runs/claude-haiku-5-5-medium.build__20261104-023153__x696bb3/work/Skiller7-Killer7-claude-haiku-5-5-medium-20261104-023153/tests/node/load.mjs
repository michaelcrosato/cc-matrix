// Loads the game's sim (the bundle without the page) into Node, with a stub for the engine: the sim never touches the
// engine's drawing, so every rule can be tested here quickly and deterministically.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export function loadSim() {
  if (!globalThis.S7) {
    // a seeded generator like the engine's E.rng (mulberry32): the same seed, the same numbers
    const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    globalThis.My3D2dge = { Input: { DEFAULT: {} }, rng, Game: class {} };
    const code = fs.readFileSync(path.join(dev, 'out', 'bundle.js'), 'utf8');
    vm.runInThisContext(code, { filename: 'bundle.js' });
  }
  return globalThis.S7;
}
