import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, dbg = game.debug; await new Promise(r => setTimeout(r, 100));
const { Sim, R3 } = dbg; const bad = [];
for (const sid of [1, 2, 3, 0]) for (const id of dbg.Run.constructor === Object ? ctx.My3D2dge && dbg.game && Object.values({}) : []) {}
const stages = [1, 2, 3, 0];
for (const st of stages) {
  const names = dbg.game && null; 
}
const scenes = ['1-1','1-2','1-3','1-4','1-B','2-1','2-2','2-3','2-4','2-B','3-1','3-2','3-3','3-4','3-B','T-1','T-2','T-3','T-4'];
for (const id of scenes) {
  const stage = id[0] === 'T' ? 0 : +id[0]; const sim = new Sim({ scene: id, stage, players: [{}, {}] }); sim.travelDone = true; sim.phase = 'action';
  for (const c of sim.covers) { if (c.perch) { } 
    for (const pk of (c.peek || ['up'])) {
      if (pk === 'none') continue;
      const e = sim.spawnEnemy('deckhand', c.id, { peek: pk }); if (pk === 'side') { } e.p = 1; e.st = 'aim'; e.expLeft = 9;
      sim.stepPeek(e, ctx.My3D2dge && sim.constructor && null || { ai: 'peek', exposed: [9, 9], burst: 1, gap: 0, chance: [0, 0, 0], tel: 1, peeks: ['up'] }, 0.0001, false);
      e.p = 1; sim.stepPeek(e, { ai: 'peek', exposed: [9,9], burst: 1, gap: 0, chance:[0,0,0], tel:1, peeks:['up'] }, 0, false);
      const wv = sim.scene.waves.find(w => (w.spawn || []).some(sp => sp[1] === c.id)); sim.rail = wv && wv.atD ? wv.atD : (c.perch ? 210 : 0);
      for (let slot = 0; slot < 2; slot++) {
        const pose = { ...sim.pose(slot) }; const v = sim.volumes(e); let ok = false;
        for (const part of ['head', 'torso']) { const vv = v.find(q => q.part === part); if (!vv) continue; const pt = vv.k === 's' ? vv.c : [(vv.a[0]+vv.b[0])/2,(vv.a[1]+vv.b[1])/2,(vv.a[2]+vv.b[2])/2]; const a = R3.aimOf(pose, pt); if (!a) continue; const ray = R3.ray(pose, a[0], a[1]); const h = sim.castRay(ray.o, ray.d, { skip: slot }); if (h.ent === e && Math.abs(a[0]) < 16/9*.97 && Math.abs(a[1]) < .97) ok = true; }
        if (!ok) { let why = ''; const vv = v.find(q => q.part === 'head'); if (vv) { const a = R3.aimOf(pose, vv.c); if (a) { const ray = R3.ray(pose, a[0], a[1]); const h = sim.castRay(ray.o, ray.d, { skip: slot }); why = h.kind + (h.ent && h.ent.x0 !== undefined ? ' box[' + [h.ent.x0, h.ent.y0, h.ent.z0, h.ent.x1, h.ent.y1, h.ent.z1].map(Math.round) + '] ' + h.ent.mat : '') + ' aim=' + a[0].toFixed(2) + ',' + a[1].toFixed(2); } } bad.push(id + ':' + c.id + ':' + pk + ' slot' + slot + ' ' + why); }
      }
      e.dead = true; e.gone = true;
    }
  }
}
console.log(bad.length ? bad.join('\n') : 'all covers visible', '\nerrors', game.errors.map(e => e.message));
