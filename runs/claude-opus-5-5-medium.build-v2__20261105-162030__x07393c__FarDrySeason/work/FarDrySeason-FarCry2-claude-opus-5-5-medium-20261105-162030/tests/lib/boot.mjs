import { readFile } from 'node:fs/promises';
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../src/game.js';
export const assets = async (path) => new Uint8Array(await readFile(new URL(`../../${path}`, import.meta.url))).buffer;
/** Node has no localStorage: a small one, per test run. */
export function fakeStorage() { const m = new Map(); globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() }; return m; }
export async function boot(options = {}) {
  const game = createGame(options);
  const e = await Engine.headless(game, { assets, camera: { preset: 'first', fov: 62 }, viewport: { width: 1920, height: 1080, dpr: 1 }, seed: options.seed ?? 3, look: undefined });
  return { e, game };
}
