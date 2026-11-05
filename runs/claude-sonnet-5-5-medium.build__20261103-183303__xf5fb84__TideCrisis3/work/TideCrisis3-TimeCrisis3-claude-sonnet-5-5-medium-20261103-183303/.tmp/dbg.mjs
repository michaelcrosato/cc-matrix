import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval }; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('build/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, dbg = game.debug; await new Promise(r => setTimeout(r, 100)); game.advance(.2);
const [stage, scene, secs] = [+process.argv[2], process.argv[3], +process.argv[4]];
dbg.start('stage', stage, 'normal', 1); dbg.jump(stage, scene); game.advance(.1); dbg.cheat('god', 1); dbg.bot(true, 'fair'); game.advance(secs);
const s = dbg.sim; console.log(s.phase, s.timer, 'waves', s.waves.map(w => [w.started, w.done]));
for (const e of s.enemies) if (!e.dead) console.log(e.type, e.st, 'p=' + e.p.toFixed(2), 'xyz', e.x | 0, e.y | 0, e.foot | 0, 'hp', e.hp, 'anim', e.anim, 'cover', e.cover && e.cover.id, 'vols', s.volumes(e).length, 'gone', e.gone);
const pose = s.pose(0); console.log(pose);
for (const e of s.enemies) if (!e.dead) console.log('t', e.t, 'exposures', e.exposures, 'cycles', e.cycles, 'hurtT', e.hurtT, 'landT', e.landT, 'expLeft', e.expLeft, 'aimT', e.aimT);
if (s.boss) { console.log('boss', s.boss.id, s.boss.pos, Object.entries(s.boss.parts).map(([k, p]) => k + ':' + p.hp + ':' + p.dead + ':' + p.vulnerable)); console.log(s.bossVolumes().map(v => v.key + JSON.stringify(v.c || v.box))); }
console.log('p', s.players[0].aim, s.players[0].weapon, s.players[0].ammo, s.players[0].c, 'threats', s.threats.length);
const pl = s.players[0]; const B = s.boss; if (B) { const v = s.bossVolumes()[0]; const a = dbg.R3.aimOf(s.pose(0), v.c); const ray = dbg.R3.ray(s.pose(0), a[0], a[1]); const h = s.castRay(ray.o, ray.d, { skip: 0 }); console.log('cast', h.kind, h.t, h.ent && h.ent.mat, h.ent && h.ent.x0, h.ent && h.ent.z1, 'vol t', dbg.R3.raySphere(ray.o, ray.d, v.c, v.r)); }
