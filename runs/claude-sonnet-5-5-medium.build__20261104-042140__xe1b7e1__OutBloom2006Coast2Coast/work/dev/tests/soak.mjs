// long-session soak: 20 full AI runs (about 1 hour of game time) across every stage, car and passenger; errors and growth checked
import { boot } from './load.mjs';
const ctx = boot(); const game = ctx.My3D2dge.current, OB = ctx.OB; game.advance(.3);
let sim = 0, runs = 0;
for (let i = 0; i < 20; i++) {
  game.go('race', { mode: 'drive', car: OB.CARS[i % 5].id, color: i % 7, pass: i % 3, station: i % 7, stage: 0, seed: 50 + i }, { fade: 0 }); game.advance(.2);
  const R = game.scene.race; R.god = true; R.ai = true; R.o.fork = i % 2;
  const I = game.input;
  while (game.sceneName === 'race') { const c = R.aiControl(); I.hold('gas', c.gas); I.hold('left', c.steer < -.25); I.hold('right', c.steer > .25); I.hold('drift', c.drift); game.advance(1 / 30); sim += 1 / 30; }
  for (const a of ['gas', 'left', 'right', 'drift']) I.hold(a, false);
  runs++; game.advance(.5); if (game.sceneName === 'results') { for (let k = 0; k < 6 && game.sceneName === 'results'; k++) { game.advance(2); I.tap('confirm'); game.advance(.2); } }
}
console.log('runs', runs, 'sim minutes', (sim / 60).toFixed(1), 'errors', game.errors.length, 'fx particles', OB.fx.list.length, 'scene', game.sceneName, 'seeds', OB.save.seeds, 'endings', Object.keys(OB.save.endings).length);
process.exit(0);
