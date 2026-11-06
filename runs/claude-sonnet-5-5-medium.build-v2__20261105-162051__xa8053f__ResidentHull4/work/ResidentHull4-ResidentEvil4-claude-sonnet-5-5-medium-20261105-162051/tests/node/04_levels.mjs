import { boot, Area, S } from './_helpers.mjs';
import { LEVELS } from '../../src/data/levels/index.js';
import { Launch } from '../../src/game/launch.js';
import { Engine } from '../../pixel-engine.js';
import { app } from '../../src/core/app.js';
import { Run } from '../../src/core/run.js';

export const slow = true;
export async function run(T) {
  let tannoys = 0;
  for (const def of LEVELS) {
    if (def.launch) continue;
    const { e, a } = await boot(def, { warm: 3 });
    T.eq(def.id + ': setup errors', e.errors.length, 0);
    a.dev.god = true;
    for (let i = 0; i < 4; i++) { e.step(60); }
    T.eq(def.id + ': no errors after 4 s', e.errors.length, 0, e.errors.join(' | '));
    T.check(def.id + ': script errors', !a.errors || a.errors.length === 0, a.errors && a.errors[0]);
    T.check(def.id + ': has a start and a player', !!a.player && isFinite(a.player.x));
    tannoys += a.tannoys.length;
  }
  T.eq('15 tannoys placed across the island', tannoys, 15);
  // the launch runs
  app.run = new Run('standard'); app.run.addWeapon('rifle'); app.run.addItem('ammo_rifle', 20);
  const l = new Launch({ run: app.run }); app.screens = [];
  const e = await Engine.headless(l, {}); app.engine = e; e.step(10);
  for (let s = 0; s < 14; s++) e.step(60);
  T.eq('launch: no errors', e.errors.length, 0, e.errors.join(' | '));
  T.check('launch: boat travels', l.z > 100, l.z);
}
