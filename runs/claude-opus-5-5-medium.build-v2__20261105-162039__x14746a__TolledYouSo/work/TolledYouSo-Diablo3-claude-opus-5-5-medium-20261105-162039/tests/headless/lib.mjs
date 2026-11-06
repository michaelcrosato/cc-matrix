// Plays the real game object in Node with Engine.headless.
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../game.js';
export async function start(opts = {}) {
  const game = createGame({ noPersist: true, noSaveBoot: true, ...opts });
  const engine = await Engine.headless(game, { viewport: opts.viewport ?? { width: 1920, height: 1080 } });
  engine.step(2);
  return { game, engine };
}
export const texts = (g) => g.ui.drawnText.map((t) => t.text).join('|');
export const press = (e, code, hold = 2) => { e.input.setKey(code, true); e.step(hold); e.input.setKey(code, false); e.step(2); };
export const toMenu = (e) => { e.step(25); press(e, 'Enter'); e.step(3); };
export const newHero = (g, e, clsIdx = 0, last = false) => {
  toMenu(e); press(e, 'Enter'); e.step(3); // NEW HERO, focus starts there on a blank save.
  for (let i = 0; i < clsIdx; i++) press(e, 'ArrowRight');
  press(e, 'Enter'); e.step(3);
  g.ui.focus = last ? 'n:last' : 'n:begin'; e.step(2); press(e, 'Enter'); e.step(2);
};
