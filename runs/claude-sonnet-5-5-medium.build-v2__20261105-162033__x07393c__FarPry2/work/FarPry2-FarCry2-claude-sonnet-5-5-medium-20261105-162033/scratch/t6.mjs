import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); game.mode = 'play'; e.step(30);
const p = game.player.feet;
const s = game.spawnSoldier({ faction: 'concord', at: [p.x + 2, p.z - 30], role: 'rifle', yaw: Math.PI });
e.step(240);
console.log('after 4s', s.state, s.suspicion.toFixed(2), 'hp', Math.round(game.body.hp), 'visible', s.visible);
e.step(600);
console.log('after 14s', s.state, 'hp', Math.round(game.body.hp), e.errors);
// player shoots back: aim camera at soldier
const cam = game.ctx.camera; const dx = s.pos.x - p.x, dz = s.pos.z - p.z;
cam.yaw = Math.atan2(-dx, -dz); cam.pitch = 0; e.step(2);
game.body.hp = 100; game.godMode = true;
for (let i = 0; i < 12; i++) { e.input.setKey('MouseLeft', true); e.step(8); e.input.setKey('MouseLeft', false); e.step(10); }
console.log('shot', JSON.stringify(game.weapons.state().weapon), 'soldier alive', s.alive, Math.round(s.hp));
