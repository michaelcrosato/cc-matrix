// Plays the real game object in Engine.headless: real menus by key codes, real frames, no GPU.
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../game.js';

export async function boot(o = {}) {
  const game = createGame({ fixedSeed: o.seed ?? 12345, noAttract: o.noAttract ?? true, ...o });
  game.evCounts = {};
  const engine = await Engine.headless(game, { viewport: { width: o.width ?? 1920, height: o.height ?? 1080, dpr: 1 } });
  engine.step(3);
  return { game, engine };
}

export function tap(engine, code, frames = 1) {
  engine.input.setKey(code, true);
  engine.step(frames);
  engine.input.setKey(code, false);
  engine.step(1);
}

export const texts = (game) => game.ui.drawnText.map((t) => t.text).join(' | ');

/** Title to a new hero, through the same screens a player sees. */
export function makeHero(engine, game, cls = 0, start = 0) {
  tap(engine, 'Enter'); // the title's any button
  engine.step(2);
  tap(engine, 'Enter'); // NEW HERO
  engine.step(2);
  for (let i = 0; i < cls; i++) { tap(engine, 'ArrowRight'); engine.step(1); }
  tap(engine, 'Enter'); // this class
  engine.step(2);
  if (start === 1) tap(engine, 'ArrowRight');
  tap(engine, 'Enter'); // begin
  engine.step(2);
  // Opening: hold to skip.
  if (game.topScreen()?.tag === 'cutscene') {
    engine.input.setKey('Enter', true);
    engine.step(45);
    engine.input.setKey('Enter', false);
    engine.step(2);
  }
}
