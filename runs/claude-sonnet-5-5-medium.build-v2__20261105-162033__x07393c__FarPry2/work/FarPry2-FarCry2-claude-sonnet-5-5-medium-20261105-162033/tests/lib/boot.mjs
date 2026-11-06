// Shared test helper: boots the game headless in Node.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const { Engine } = await import(ROOT + '/pixel-engine.js');
export const assets = async (p) => new Uint8Array(await readFile(resolve(ROOT, p))).buffer;
export async function boot(options = {}, gameOptions = {}) {
  const { createGame } = await import(ROOT + '/src/game.js');
  const game = createGame(gameOptions);
  const e = await Engine.headless(game, { assets, camera: { preset: 'first' }, viewport: { width: 1920, height: 1080, dpr: 1 }, ...options });
  return { e, game };
}
/** a started game in free play: no mission, on the ground at (x, z), ready to be poked */
export async function freePlay(x = 30, z = 200, opts = {}) {
  const { e, game: g } = await boot(opts.engine || {});
  g.flow.newGame(); g.missions.abort(); g.dialogue.skipAll(); g.train.stop(); g.player.seated = false; g.player.ctrl.body.setEnabled(true); g.cutscene = false; g.mode = 'play'; g.camState.override = null; g.noFever = true; g.hudHidden = false; g.mapSys.raise(false);
  g.world.hour = 12; g.world.wind.pin = true; g.world.wind.speed = 3; g.device = 'kbm';
  g.player.teleport(x, z, 0); e.step(30);
  return { e, g };
}
export const press = (e, code, frames = 3) => { e.input.setKey(code, true); e.step(frames); e.input.setKey(code, false); e.step(2); };
export const hold = (e, code, frames) => { e.input.setKey(code, true); e.step(frames); e.input.setKey(code, false); e.step(1); };
