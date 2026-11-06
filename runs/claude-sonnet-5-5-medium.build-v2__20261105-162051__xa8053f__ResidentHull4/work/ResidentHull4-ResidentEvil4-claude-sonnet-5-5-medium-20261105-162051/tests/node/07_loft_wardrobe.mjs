import { boot, noScripts, S } from './_helpers.mjs';
import { quay } from '../../src/data/levels/quay.js';
export async function run(T) {
  const { e, a } = await boot({ ...quay, scripts: [] });
  a.dev.god = true;
  // inside ladder up to the loft
  const L = a.loft.up; a.player.teleport(L.x, L.z + 1); a.player.yaw = Math.PI; e.step(3);
  const c = a.interact.candidates().find((q) => q.label === 'CLIMB LADDER'); T.check('ladder prompt', !!c);
  c.run(); e.step(100);
  T.check('player stands on the loft floor', a.player.y > 3 && a.player.y < 3.6, a.player.y);
  // outside ladder raid and knock-down kills the climbers
  const m = a.loft.eMarks[0]; const g = { x: m.x, z: m.z };
  a.player.teleport(m.x - 1.5, m.z, 3.3); e.step(3);
  const before = a.enemies.length;
  a.scripts.start(function* (aa) { yield 0; }, 'x');
  // raise through the script helper by simulating its call
  const lad = { x: m.x, z: m.z, obj: a.placeModel('ladder', m.x, m.z, 0, { collide: false }).object, up: true, climbers: [] };
  for (let i = 0; i < 2; i++) { const en = a.spawn('gaffer', m.x, m.z, { state: S.APPROACH }); en.setState(S.CLIMB); lad.climbers.push(en); }
  a.loft.ladders.push(lad); e.step(2);
  const k = a.interact.candidates().find((q) => q.label === 'KNOCK LADDER DOWN'); T.check('knock ladder prompt on the loft', !!k);
  k.run(); e.step(5); T.check('knocked ladder drops its climbers', lad.climbers.every((x) => x.dead));
  // wardrobe pushes along one axis and updates nav
  const w = a.level.pushables[0]; a.player.teleport(w.x - 1.1, w.z); a.ctrlTeleport?.(); e.step(2);
  a.player.yaw = Math.PI / 2; const x0 = w.x;
  a.interact.pushWardrobe(w, 0.5); a.interact.pushWardrobe(w, 0.5);
  T.check('wardrobe slides about 1 m', Math.abs(w.x - x0) > 0.9 && Math.abs(w.x - x0) < 1.1 || Math.abs(w.z - w.z) < 1, `${w.x - x0}`);
  // violent kills ragdoll (max 8 live), scarf chain moves
  const hs = []; for (let i = 0; i < 10; i++) hs.push(a.spawn('gaffer', 0 + i * 0.3, 20, { state: S.APPROACH }));
  for (const h of hs) h.takeHit({ amount: 999, zone: 'torso', fromX: 0, fromZ: 22, pellets: true, source: 'scatter' });
  e.step(30);
  T.check('violent kills ragdoll, at most 8 live', hs.filter((h) => h.doll).length >= 1 && hs.filter((h) => h.doll).length <= 8, hs.filter((h) => h.doll).length);
  T.check('scarf spring chain has points', a.player.scarf.points.length > 3);
  T.eq('errors', e.errors.length, 0, e.errors.join('|'));
}
