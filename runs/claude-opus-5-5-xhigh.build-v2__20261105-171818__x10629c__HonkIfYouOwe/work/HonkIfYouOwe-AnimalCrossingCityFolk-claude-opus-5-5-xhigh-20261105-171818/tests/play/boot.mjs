// Shared: boot the real game on Engine.headless in Node, with the kit's packs as assets.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Engine } from '../../src/engine.js';
import { createGame } from '../../src/game.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const assets = async (path) => new Uint8Array(await readFile(join(root, 'kit', path))).buffer;
export async function bootGame(opts = {}) {
  const game = createGame({ realNow: 1790000000000, ...opts });
  const engine = await Engine.headless(game, { assets, camera: { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 }, seed: opts.engineSeed ?? 1 });
  return { game, engine };
}
