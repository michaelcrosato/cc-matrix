// A test driver: plays TollGame inside Engine.headless by menu keys, then bot intents. Shared by the playthrough tests.
import { readFile } from 'node:fs/promises';
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../game.js';
import { QUESTS } from '../../src/data/quests.js';
import { ZONES } from '../../src/data/zones.js';
import { livingHeroes } from '../../src/sim/core.js';
import { curStep } from '../../src/sim/campaign.js';

export const assets = async (path) => new Uint8Array(await readFile(new URL('../../' + path, import.meta.url))).buffer;
export async function boot(opts = {}) {
  const game = createGame({ fast: true, noSave: true, seed: 4321, ...opts });
  const engine = await Engine.headless(game, { assets });
  return { game, engine };
}
export function press(engine, code, frames = 2) { engine.input.setKey(code, true); engine.step(frames); engine.input.setKey(code, false); engine.step(2); }
export function focusLabel(game) { return game.ui.focus; }
/** Make a hero through the real menus by keys: title -> menu -> new hero -> class -> name -> begin. */
export async function newHeroByKeys(g, clsIndex = 0, lastBell = false) {
  const { game, engine } = g;
  engine.step(30); press(engine, 'Enter'); engine.step(5);   // title -> menu
  if (game.mode !== 'menu') throw new Error('did not reach menu: ' + game.mode);
  engine.step(3); press(engine, 'ArrowDown'); engine.step(3); press(engine, 'Enter'); engine.step(5); // New Hero
  if (game.mode !== 'create') throw new Error('did not reach create: ' + game.mode);
  press(engine, 'Enter'); engine.step(5);   // slot 0 (focus starts on first slot)
  if (game.createState.step !== 'class') throw new Error('did not reach class step: ' + JSON.stringify(game.createState));
  for (let i = 0; i < clsIndex; i++) { press(engine, 'ArrowRight'); engine.step(3); }
  press(engine, 'Enter'); engine.step(5);   // choose class
  if (game.createState.step !== 'name') throw new Error('did not reach name step');
  if (lastBell) { press(engine, 'ArrowDown'); engine.step(3); press(engine, 'ArrowDown'); engine.step(3); press(engine, 'Enter'); engine.step(3); press(engine, 'ArrowDown'); press(engine, 'Enter'); }
  else { press(engine, 'ArrowDown'); press(engine, 'ArrowDown'); press(engine, 'ArrowDown'); press(engine, 'Enter'); }
  for (let i = 0; i < 40 && game.mode !== 'play'; i++) { engine.step(5); await new Promise((r) => setTimeout(r, 5)); }
  if (game.mode !== 'play') throw new Error('did not reach play: ' + game.mode);
}
export const hero = (game) => game.world.heroes[0];
