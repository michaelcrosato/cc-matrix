import { suite } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('weapons'), g = room(), MT = g.MT, I = g.I, W = g.W, c = g.c;
  const fireFor = (sec) => { let n = 0; const off = MT.on('world:shot', () => n++); c.aim = 0; I.hold('aimRight'); g.adv(sec); I.hold('aimRight', false); off(); return n; };
  c.x = 60; c.y = 120; let n = fireFor(1); S.check('blaster ~9 shots a second', Math.abs(n - 9) <= 1, n);
  for (const w of ['spread', 'rockets', 'popcorn', 'laser']) { W.addPickup('cap', c.x, c.y, { w }); g.adv(.05); S.check('the pickup equips ' + w, c.wpn === w, c.wpn); }
  W.equip(c, 'spread'); W.pShots.clear(); c.fireCd = 0; c.aim = 0; I.hold('aimRight'); g.adv(1 / 120 * 2); I.hold('aimRight', false);
  const ang = W.pShots.list.slice(-3).map(b => Math.atan2(b.vy, b.vx)).sort((a, b) => a - b);
  S.check('spread: 3 bolts at -13/0/+13 degrees', ang.length === 3 && Math.abs(ang[2] - .227) < .02 && Math.abs(ang[0] + .227) < .02, ang.map(a => a.toFixed(2)).join(','));
  n = fireFor(1); S.check('spread ~8 a second', Math.abs(n - 8) <= 1, n);
  W.equip(c, 'rockets'); const g1 = W.spawnAt('goon', 140, 120), g2 = W.spawnAt('goon', 140, 135); g1.stun = g2.stun = 99; W.pShots.clear(); c.fireCd = 0; fireFor(.6); g.adv(.6);
  S.check('rocket splash kills two goons', g1.dead && g2.dead);
  W.equip(c, 'popcorn'); const g3 = W.spawnAt('goon', c.x + 80, c.y); g3.stun = 99; let pops = 0; const offp = MT.on('world:popcorn', () => pops++); c.fireCd = 0; fireFor(.3); g.adv(1); offp();
  S.check('the popcorn bag lands and bursts', pops > 0 && g3.dead);
  W.equip(c, 'laser'); const L = [0, 1, 2].map(i => { const e = W.spawnAt('goon', 120 + i * 40, c.y); e.stun = 99; e.hp = 3; return e; }); fireFor(1);
  S.check('the laser pierces 3 goons in a line', L.every(e => e.dead), L.map(e => e.hp.toFixed(1)).join(','));
  c.wpnT = .05; g.adv(.2); S.check('expiry: back to the blaster', c.wpn === 'blaster');
  W.equip(c, 'spread'); c.wpnT = 2; W.equip(c, 'spread'); S.check('the same primary refreshes its timer', c.wpnT > 13);
  W.equip(c, 'records'); W.fShots.fire({ kind: 'orb', x: c.x + 26, y: c.y, vx: 0, vy: 0, life: 9 }); const gr = W.spawnAt('goon', c.x + 26, c.y); gr.stun = 99; gr.hp = 2;
  g.adv(1); S.check('gold records block bullets and damage foes', W.fShots.list.length === 0 && gr.dead);
  W.equip(c, 'shield'); c.invuln = 0; const hp = c.hp; W.fShots.fire({ kind: 'orb', x: c.x, y: c.y, vx: 0, vy: 0, life: 1 }); g.adv(.1); S.check('the shield blocks damage', c.hp === hp);
  c.addons.shield = 0; W.equip(c, 'speed'); c.x = 60; I.hold('right'); g.adv(1); I.hold('right', false); S.check('sneakers: x1.45 speed', Math.abs(c.x - 60 - 95 * 1.45) < 10, (c.x - 60).toFixed(0));
  return S;
};
