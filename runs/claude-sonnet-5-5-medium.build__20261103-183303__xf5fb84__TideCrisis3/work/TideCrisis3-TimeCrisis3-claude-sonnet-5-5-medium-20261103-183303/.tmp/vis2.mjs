import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, dbg = game.debug; await new Promise(r => setTimeout(r, 100));
const { Sim, R3 } = dbg; const sim = new Sim({ scene: '1-1', stage: 1, players: [{}, {}] });
const c = sim.covers[0]; const e = sim.spawnEnemy('deckhand', c.id, { peek: 'up' }); e.p = 1; e.st = 'aim'; e.foot = e.bz; e.x = e.bx; e.y = e.by;
console.log('cover', c.x, c.y, c.h, 'enemy', e.x, e.y, e.foot); const v = sim.volumes(e); console.log(v.map(q => q.part + ':' + (q.c || q.a)));
const pose = sim.pose(0); console.log(pose);
for (const q of v) { const pt = q.k === 's' ? q.c : [(q.a[0]+q.b[0])/2,(q.a[1]+q.b[1])/2,(q.a[2]+q.b[2])/2]; const a = R3.aimOf(pose, pt); const ray = R3.ray(pose, a[0], a[1]); const h = sim.castRay(ray.o, ray.d, { skip: 0 }); console.log(q.part, a, h.kind, h.t, h.ent === e); }
