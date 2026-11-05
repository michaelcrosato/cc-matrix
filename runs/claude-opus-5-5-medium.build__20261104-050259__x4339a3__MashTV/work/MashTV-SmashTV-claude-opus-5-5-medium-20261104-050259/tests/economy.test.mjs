import { suite } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('economy'), g = room({ players: undefined }), MT = g.MT, W = g.W, c = g.c;
  W.ratings.R = 45; W.addPickup('stack', c.x, c.y); g.adv(.05); S.check('cash x the multiplier to the collector', c.cash === 500 * 3, c.cash);
  const names = new Set(); for (let i = 0; i < 6; i++) { const p = MT.nextPrize(1); names.add(p.name); } S.check('prizes never repeat in a bag', names.size === 6);
  const k0 = MT.run.keys; W.addPickup('key', c.x, c.y, { placed: true }); g.adv(.05); S.check('keys are shared by the team', MT.run.keys === k0 + 1);
  const p = W.addPickup('bill', 300, 200); g.adv(7); S.check('pickups blink near the end', p.ttl < 2.5 && !p.dead); g.adv(2.5); S.check('pickups expire after 9 s', p.dead);
  for (let i = 0; i < 40; i++) { const e = W.spawnAt('goon', 300, 60); e.A = Object.assign({}, e.A, { drops: [['bill', 1]] }); W.kill(e, c); }
  g.adv(.05); S.check('at most 25 cash pickups at once', W.pickups.filter(p => MT.PICKUPS[p.kind].cash).length <= 25);
  const cr = W.spawnAt('crate', 200, 60); W.damage(cr, 5, c); S.check('crates break and spill', cr.dead && W.pickups.length > 0);
  W.cleared = true; const q = W.addPickup('bill', c.x + 40, c.y); const d0 = Math.hypot(q.x - c.x, q.y - c.y); g.adv(.2); S.check('the magnet after a clear', Math.hypot(q.x - c.x, q.y - c.y) < d0 - 5 || q.dead);
  const L = c.lives; c.cash = 249000; c.addCash(2000, W); S.check('an extra life at $250,000', c.lives === L + 1);
  return S;
};
