import { boot } from '../tests/lib/boot.mjs';
import { THREE } from '../pixel-engine.js';
const { e, game } = await boot(); game.mode = 'play'; game.godMode = true; e.step(30);
const p = game.player.feet;
const s = game.spawnSoldier({ faction: 'concord', at: [p.x, p.z - 20], role: 'rifle', yaw: 0, duty: 'guard' }); s.suspicion = -99;
e.step(30);
const cam = game.ctx.camera; cam.yaw = 0; cam.pitch = 0; e.step(3);
const o = new THREE.Vector3(), d = new THREE.Vector3(); cam.camera.getWorldPosition(o); cam.camera.getWorldDirection(d);
console.log('eye', o.toArray().map(v=>+v.toFixed(1)), 'dir', d.toArray().map(v=>+v.toFixed(2)), 'sold', s.pos.toArray().map(v=>+v.toFixed(1)));
const h = game.castBullet(o, d, 100); console.log('hit', h && { dist: h.distance, actor: !!h.actor, pt: h.point.toArray().map(v=>+v.toFixed(1)) });
for (let i = 0; i < 4; i++) { e.input.setKey('MouseLeft', true); e.step(6); e.input.setKey('MouseLeft', false); e.step(20); }
console.log('weapon', JSON.stringify(game.weapons.state().weapon), 'soldier', s.alive, Math.round(s.hp), s.state, 'ragdolls', game.soldierSys.ragdollCount, e.errors);
