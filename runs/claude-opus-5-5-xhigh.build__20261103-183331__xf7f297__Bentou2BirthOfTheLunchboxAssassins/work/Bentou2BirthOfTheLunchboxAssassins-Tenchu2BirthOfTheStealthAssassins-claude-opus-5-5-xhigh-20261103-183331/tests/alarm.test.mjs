// alarm: the bell rings after the runner reaches it; reinforcements after the delay; killing the runner keeps it silent;
// the music's layers come in on an alert and go out after it
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const spec = { guards: [{ id: 'r', type: 'samurai', at: [20, 12], facing: 180, mode: 'post' }], bells: [[25, 12]], barracks: [[27, 20]] };
  let M = loadYard(t, spec), g = M.guards[0]; g.mode = 'stand'; game.debug.tune('reinforceDelay', 5); M.cheats.god = true;
  M.world.light.fill(1); game.debug.teleport(g.x - 50, g.y, 0, 0); t.step(2.2);
  check('an alert samurai runs for the bell', g.bellRun || M.alarm.rung, g.mind.state);
  M.cheats.invisible = true; game.debug.teleport(C(2), C(21), 0); t.step(4);
  check('the bell rings', M.alarm.rung === 1 && M.heightened === Infinity, M.alarm.rung);
  const n0 = M.guards.length; t.step(5.5); check('reinforcements after the delay', M.guards.length === n0 + 2, M.guards.length - n0);
  M = loadYard(t, spec); g = M.guards[0]; g.mode = 'stand'; M.cheats.god = true; M.world.light.fill(1); game.debug.teleport(g.x - 50, g.y, 0, 0); t.step(2.2);
  game.debug.kill('r'); M.cheats.invisible = true; t.step(4); check('killing the runner keeps the bell silent', M.alarm.rung === 0, M.alarm.rung);
  M = loadYard(t, { guards: [{ id: 'x', type: 'ashigaru', at: [20, 12], facing: 180, mode: 'post' }] }); M.cheats.god = true; game.debug.alert('x'); t.step(.5);
  check('an alert brings the alert layers', B.Music.level === 2, B.Music.level);
  game.debug.calm(); M.cheats.invisible = true; game.debug.teleport(C(2), C(21), 0); t.step(9); check('they fade out after it', B.Music.level < 2, B.Music.level);
  game.debug.resetTune();
}
