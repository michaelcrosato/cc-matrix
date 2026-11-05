// ai: patrols follow their routes; posts sweep their gaze; sleepers wake on a loud noise; eaters take bait; hounds smell and
// bark; archers shoot only with a clear line; ninja climb onto roofs; civilians scream and flee
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  let M = loadYard(t, { guards: [{ id: 'p', type: 'ashigaru', at: [20, 12], mode: 'patrol', route: [[20, 12, 0], [26, 12, 0]], loop: false }] }), g = M.guards[0];
  game.debug.teleport(C(2), C(21), 0); M.cheats.invisible = true; t.step(3.3); check('a patrol walks its route', g.x > C(25), g.x / 16); t.step(3.5); check('and back again', g.x < C(23), g.x / 16);
  M = loadYard(t, { guards: [{ id: 'p', type: 'ashigaru', at: [20, 12], facing: 90, mode: 'post' }] }); g = M.guards[0]; M.cheats.invisible = true; game.debug.teleport(C(2), C(21), 0);
  let lo = 9, hi = -9; for (let i = 0; i < 40; i++) { t.step(.2); lo = Math.min(lo, g.facing); hi = Math.max(hi, g.facing); } check('a post sweeps its gaze', hi - lo > 1.2, (hi - lo).toFixed(2));
  M = loadYard(t, { guards: [{ id: 's', type: 'ashigaru', at: [20, 12], facing: 90, mode: 'sleep' }] }); g = M.guards[0]; game.debug.teleport(C(2), C(21), 0); M.cheats.invisible = true; t.step(1);
  check('a sleeper sleeps', g.asleep, g.asleep); B.noise(g.x + 20, g.y, 0, 140, 'firecracker'); t.step(.5); check('a loud noise wakes it', !g.asleep, g.asleep);
  M = loadYard(t, { guards: [{ id: 'h', type: 'hound', at: [20, 12], facing: 180, mode: 'post' }] }); g = M.guards[0]; game.debug.teleport(g.x - 40, g.y + 30, 0); t.step(1.2);
  check('a hound smells the hero and barks', g.mind.state !== 'calm' && g.barkHT > -1, g.mind.state + ' ' + g.barkHT);
  M = loadYard(t, { guards: [{ id: 'a', type: 'archer', at: [15, 5], z: 48, facing: 90, mode: 'post' }] }); g = M.guards[0]; M.world.light.fill(1); game.debug.teleport(C(15), C(12), 0); M.cheats.god = true; g.mode = 'stand'; t.step(6);
  check('an archer with a clear line looses arrows', M.shots.list.some(s => s.team === 'enemy') || M.stats.damageTaken > 0 || g.drawing, g.mind.state);
  M = loadYard(t, { guards: [{ id: 'a', type: 'archer', at: [15, 5], z: 48, facing: 270, mode: 'post' }] }); g = M.guards[0]; M.world.light.fill(1); game.debug.teleport(C(15), C(1), 0); M.cheats.god = true; g.mind.level = 1.2; g.mind.update(.01, false, M.hero); g.target = M.hero; t.step(3);
  check('no clear line (behind the storehouse): no arrows', !M.shots.list.some(s => s.team === 'enemy') && M.stats.damageTaken === 0, M.stats.damageTaken);
  M = loadYard(t, { guards: [{ id: 'n', type: 'ninja', at: [12, 11], facing: 270, mode: 'post' }] }); g = M.guards[0]; game.debug.teleport(C(9), C(5), 40); M.cheats.god = true; g.mind.level = 1.2; g.mind.update(.01, false, M.hero); g.target = M.hero; t.step(6);
  check('a Red Lantern ninja climbs onto the roof', g.z >= 39, g.z);
  M = loadYard(t, { civilians: [{ id: 'c', type: 'maid', at: [12, 11], facing: 180 }], guards: [{ id: 'gg', type: 'ashigaru', at: [26, 20], mode: 'post' }] }); const c = M.civs[0]; M.world.light.fill(1); game.debug.teleport(c.x - 40, c.y, 0, 0); t.step(3);
  check('a civilian who sees the hero screams and flees', c.status.flee > 0, c.mind.state);
}
