// Every site at seeds 1-2: the cheat bot bags its bucks and the site ends; with no shots it ends with escapes; a doe
// benches its shooter; a protected critter costs points; the bucks scheduled equal the bucks spawned.
import { load } from '../lib/load.mjs';
import { check, done } from '../lib/check.mjs';
const { B, game } = load();
const run = (id, seed, o = {}) => {
  B.reseed(seed); B.resetIds();
  const p = new B.Player(0, null); if (o.bot) p.bot = new B.Bot(p, { skill: 'expert', cheat: true });
  const play = new B.Play({ players: [p] }), site = play.startSite(id);
  let n = 0; while (!site.ended && n < 120 * 200) { play.update(1 / 120); n++; if (o.each) o.each(play, site, p); }
  return { play, site, p };
};
const SITES = ['hollow-1', 'hollow-2', 'hollow-3', 'bugle-1', 'bugle-2', 'bugle-3', 'muskeg-1', 'muskeg-2', 'muskeg-3'];
for (const id of SITES) for (const seed of [1, 2]) {
  const { site, p } = run(id, seed, { bot: true });
  const legal = site.herd.list.filter(a => a.cat === 'animal' && a.legal);
  const bagged = legal.filter(a => a.dead).length;
  check(id + '@' + seed + ': the cheat bot bags most bucks', bagged >= legal.length * .6, bagged + '/' + legal.length + ' ' + site.endReason);
  check(id + '@' + seed + ': the bucks spawned match the schedule', site.spawnedLegal >= site.def.bucks, site.spawnedLegal + ' vs ' + site.def.bucks);
  check(id + '@' + seed + ': never shot a doe', !p.benched && p.stats.does === 0);
  check(id + '@' + seed + ': ends', site.ended && site.t < site.timeLimit + .1, site.endReason + ' ' + site.t.toFixed(1));
}
for (const id of SITES) {
  const { site } = run(id, 3);
  check(id + ': with no shots it ends and the bucks get away', site.ended && site.herd.list.filter(a => a.legal && a.cat === 'animal').every(a => !a.dead), site.endReason);
}
// a doe benches its shooter (classic) and ends a single-player site
{
  let shot = false;
  const { site, p } = run('hollow-1', 1, { each: (play, site, p) => { if (shot) return; const d = site.herd.list.find(a => a.cat === 'animal' && !a.legal && a.live && a.entered); if (!d) return; const pt = B.aimPointOf(d, 'heart'), P = site.lens.project(...pt); if (!P) return; const r = B.castShot(site, site.lens, P[0], P[1]); if (r.actor === d) { shot = true; play.fire(p, P[0], P[1]); } } });
  check('a doe benches the shooter', shot && p.benched && p.stats.does === 1, shot + ' ' + p.benched);
  check('benching the only player ends the site', site.endReason === 'benched', site.endReason);
}
// a protected critter (the skunk) costs points; god mode spares the bench
{
  B.reseed(1); const p = new B.Player(0, null), play = new B.Play({ players: [p] }), site = play.startSite('hollow-2');
  for (let k = 0; k < 120 * 2; k++) play.update(1 / 120);
  p.site.score = 500; const sk = site.S.pattern('critter', { kind: 'skunk', path: [[0, 15], [2, 15]], orders: [['stand', 30]] });
  for (let k = 0; k < 10; k++) play.update(1 / 120);
  const pt = B.aimPointOf(sk), P = site.lens.project(...pt); play.fire(p, P[0], P[1]);
  check('the skunk costs 100 and stinks', p.site.score === 400 && play.stink > 0, p.site.score + ' ' + play.stink);
  B.CHEAT.god = true; const d = site.S.pattern('stand', { kind: 'doe', from: [-1, 40], at: [0, 40], to: [1, 40], secs: 30 }); d.orders = [['stand', 30]];
  for (let k = 0; k < 10; k++) play.update(1 / 120);
  const pd = site.lens.project(...B.aimPointOf(d, 'heart')); play.fire(p, pd[0], pd[1]);
  check('god mode prevents benching', !p.benched); B.CHEAT.god = false;
}
// calls freeze calm animals, at most twice each
{
  B.reseed(1); const p = new B.Player(0, null), play = new B.Play({ players: [p] }), site = play.startSite('hollow-1');
  site.co = { step() {}, done: false }; site.critCo = null;
  const a = site.S.pattern('cross', { kind: 'buck', path: [[-20, 45], [0, 45], [30, 45]], gait: 'walk' });
  for (let k = 0; k < 60; k++) play.update(1 / 120);
  play.onCall(p); for (let k = 0; k < 30; k++) play.update(1 / 120);
  check('a call stops a calm buck', a.frozen > 0 && a.speed < .5, a.frozen + ' ' + a.speed);
  play.onCall(p); play.onCall(p); check('an animal answers at most two calls', a.callCount === 2, a.callCount);
  // a shot nearby makes it flee
  site.herd.noise(site.lens.x, site.lens.y, 1, 400); for (let k = 0; k < 120; k++) play.update(1 / 120);
  check('a gunshot makes calm animals flee', a.flee, a.state);
}
check('no errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
done();
