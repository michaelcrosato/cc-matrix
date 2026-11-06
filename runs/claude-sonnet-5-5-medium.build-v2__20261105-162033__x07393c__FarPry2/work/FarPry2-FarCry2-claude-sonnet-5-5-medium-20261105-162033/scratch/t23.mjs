import { freePlay, hold } from '../tests/lib/boot.mjs';
import { Bot } from '../tests/lib/bot.mjs';
import { THREE } from '../pixel-engine.js';
const { e, g } = await freePlay(); const b = new Bot(e, g);
const th = g.sitesSys.things.filter((q) => q.tag === 'fuel-tank')[0]; console.log('tank', th.x, th.z, th.y, th.hp);
g.weapons.give('tractor', 90); g.weapons.equipSlot('main', true); b.tp(th.x - 14, th.z + 6); b.aim(th.x, th.y + 2, th.z);
const o = new THREE.Vector3(), d = new THREE.Vector3(); g.ctx.camera.camera.getWorldPosition(o); g.ctx.camera.camera.getWorldDirection(d);
const h = g.castBullet(o, d, 60); console.log('hit', h && { dist: h.distance.toFixed(1), thing: !!h.thing, actor: !!h.actor, pt: h.point.toArray().map((v) => +v.toFixed(1)) });
for (let k = 0; k < 6; k++) { b.aim(th.x, th.y + 2, th.z); b.fire(7); b.step(4); } console.log('hp after', th.hp, th.dead, 'mag', g.weapons.gunState().mag, 'mode', g.mode, 'noFire', g.noFire());
