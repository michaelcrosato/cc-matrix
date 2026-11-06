// The launch with no cheats: a bot with no god mode, a normal Standard run and a plain rifle/pistol loadout, from the boat's start to the credits.
import { Engine } from '../../pixel-engine.js';
import { Run, app } from './_helpers.mjs';
import { LaunchBot } from '../../src/game/bot.js';
import { Launch } from '../../src/game/launch.js';
import { TitleScene } from '../../src/screens/title.js';
import { resetTuning } from '../../src/data/tuning.js';
export const slow = true;
export async function run(T) {
  resetTuning(); Object.assign(app.dev, { god: false, ammo: false, oneHit: false });
  app.run = new Run('standard'); app.run.addWeapon('rifle'); app.run.addItem('ammo_rifle', 20); app.run.addItem('ammo_pistol', 60);
  app.screens = []; app.autoAdvance = true; app.noFade = true; app.TitleClass = TitleScene;
  const l = new Launch({ run: app.run }); new LaunchBot().attach(l);
  const e = await Engine.headless(l, {}); app.engine = e;
  let credits = false;
  for (let s = 0; s < 400 && !credits; s++) { for (let k = 0; k < 6; k++) { e.step(60); await new Promise((r) => setTimeout(r, 1)); } if (l.endCredits) credits = true; }
  T.check('launch played with no cheats reaches the credits', credits, l.status());
  T.eq('no engine errors', e.errors.length, 0, e.errors[0]);
}
