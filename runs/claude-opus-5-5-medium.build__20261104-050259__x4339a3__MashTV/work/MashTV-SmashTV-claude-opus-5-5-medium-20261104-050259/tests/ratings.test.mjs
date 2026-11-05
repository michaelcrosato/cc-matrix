import { suite } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('ratings'), g = room({ waves: [{ at: 0, spawn: [] }, { at: 999, spawn: [['N', 'goon', 1]] }] }), MT = g.MT, W = g.W, c = g.c, R = W.ratings;
  R.R = 10; R.gain(5, W); S.check('gains', R.R === 15);
  S.check('tiers', [[10, 1], [30, 2], [50, 3], [70, 4], [90, 5]].every(([v, x]) => { R.R = v; return R.X === x; }));
  R.R = 50; R.since = 0; g.adv(3.5); S.check('decay after 2.5 s', R.R < 50 && R.R > 45, R.R);
  R.R = 50; c.invuln = 0; c.hurt(1, null, W); S.check('a hit costs 12', Math.abs(R.R - 38) < .5, R.R);
  let caps = W.pickups.filter(p => p.kind === 'cap').length; R.R = 99; R.gain(5, W);
  S.check('Prime Time at 100', R.prime > 11 && R.X === 5); S.check('the audience throws 3 capsules', W.pickups.filter(p => p.kind === 'cap').length === caps + 3);
  g.adv(12.2); S.check('after Prime Time: back to 60 with a cooldown', Math.abs(R.R - 60) < 3 && R.primeCd > 15, R.R + ' ' + R.primeCd);
  W.phase = 'waves'; R.R = 0; R.since = 0; let stunts = 0; const off = MT.on('world:stunt', () => stunts++);
  c.godMode = true; g.adv(10.5); S.check('the stunt after 10 s under 5', stunts === 1); R.R = 0; g.adv(11); S.check('once per room', stunts === 1); off();
  return S;
};
