import { load, mkSim, run, STEP, aimAtPoint } from '../tests/harness.mjs';
const { dbg } = await load(); const sim = mkSim(dbg, '2-2'); const e = sim.spawnEnemy('shield', 'st', { from: [300, 0, 0], advance: [250] }); run(sim, .5, [{ coverDown: true }]);
const sh = sim.volumes(e).find(q => q.part === 'shield'); const c = [(sh.box.x0 + sh.box.x1) / 2, (sh.box.y0 + sh.box.y1) / 2, (sh.box.z0 + sh.box.z1) / 2]; const p = sim.players[0]; p.ammo[2] = 5; p.weapon = 2; p.c = 0;
console.log('shield box', sh.box, 'e', e.x, e.y, e.foot, e.st, 'shieldUp', e.shieldUp);
const a = aimAtPoint(dbg, sim, 0, c); const r = dbg.R3.ray(sim.pose(0), a[0], a[1]); const h = sim.castRay(r.o, r.d, { skip: 0 }); console.log('cast', h.kind, h.t);
for (let k = 0; k < 5; k++) { p.cool = 0; p.switchT = 0; sim.step(STEP, [{ aim: a, firePressed: true, fireDown: true }]); console.log('shieldDown', e.shieldDown, 'ammo', p.ammo[2], 'weapon', p.weapon, 'c', p.c); }
