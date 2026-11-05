import { suite } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('enemies'), g = room(), MT = g.MT, W = g.W, c = g.c;
  c.godMode = true; const clear = () => { for (const e of W.enemies) e.dead = true; W.enemies.length = 0; W.fShots.clear(); };
  for (const k of ['goon', 'clapbot', 'popper', 'disco', 'tank', 'brute']) { const e = W.spawnAtDoor(k, 'N'); g.adv(2.5); S.check(k + ' enters through its door', MT.inInterior(e.x, e.y) && !e.entering); clear(); }
  const h = W.spawnAudience('heckler', 'W'); g.adv(1); S.check('a heckler leaps in over the wall', !h.leap && MT.inInterior(h.x, h.y)); clear();
  const d = W.spawnDrop('goon'); S.check('a drop telegraphs', d.dropT > .5); g.adv(1); S.check('then lands', d.dropT <= 0 && d.z === 0); clear();
  // behaviours
  c.x = 184; c.y = 180; let e = W.spawnAt('goon', 184, 60); const d0 = MT.dist(e, c); g.adv(1); S.check('the goon closes in', MT.dist(e, c) < d0 - 30); clear();
  e = W.spawnAt('popper', c.x + 14, c.y); g.adv(.3); S.check('the popper lights its fuse', e.state === 'fuse'); const t0 = W.t; g.adv(.5); S.check('fuse >= 0.3 s, then 8 shards', W.fShots.list.filter(b => b.kind === 'shard').length === 8); clear();
  e = W.spawnAt('mime', c.x + 20, c.y); g.adv(.1); S.check('the mime telegraphs when close', e.state === 'tele'); c.godMode = false; c.invuln = 0; const hp = c.hp; g.adv(.5); S.check('no blast before 0.7 s', c.hp === hp); g.adv(.4); S.check('then it blasts', c.hp < hp && e.dead); c.godMode = true; clear();
  e = W.spawnAt('disco', 100, 100); const x0 = e.x; g.adv(1); S.check('the disco ball bounces about', Math.abs(e.x - x0) > 30); let zaps = 0; const offz = MT.on('world:zap', () => zaps++); e.shotT = .5; g.adv(.6); offz(); S.check('and fires 4 beams after a flare', zaps === 1); clear();
  e = W.spawnAt('disco', 30, 30); e.dx = -.707; e.dy = -.707; g.adv(3); S.check('a disco ball never sticks in a corner', e.x > 60 && e.y > 60, e.x.toFixed(0) + ',' + e.y.toFixed(0)); clear();
  e = W.spawnAt('discoBig', 100, 100); W.damage(e, 99, c); S.check('a big disco splits in two', W.enemies.filter(o => o.kind === 'disco' && !o.dead).length === 2); clear();
  e = W.spawnAt('heckler', 184, 60); e.throwT = .01; g.adv(.1); S.check('the heckler lobs a tomato with a landing ring', W.fShots.list.some(b => b.kind === 'tomato' && b.tx !== undefined)); g.adv(1.2); S.check('the splat leaves a slow puddle', W.arena.splats.length > 0); clear(); W.arena.splats.length = 0;
  e = W.spawnAt('tank', 184, 60); e.shotT = .45; g.adv(.1); S.check('the tank telegraphs (aim)', e.state === 'aim'); g.adv(.45); S.check('then fires a shell', W.fShots.list.some(b => b.kind === 'shell')); clear();
  e = W.spawnAt('snake', 184, 60); g.adv(1); const segs = W.enemies.filter(o => o.kind === 'seg' && !o.dead); S.check('the snake trails 10 segments', segs.length === 10); W.damage(segs[3], 5, c); g.adv(.1); S.check('segments shoot off', W.enemies.filter(o => o.kind === 'seg' && !o.dead).length === 9); clear();
  e = W.spawnAt('brute', 184, 100); e.chargeT = .01; c.x = 184; c.y = 200; g.adv(.1); S.check('the brute telegraphs its charge', e.state === 'tele'); g.adv(.6); S.check('the telegraph lasts at least 0.3 s', e.state === 'tele'); g.adv(1.4);
  S.check('a wall stuns it', e.state === 'stun', e.state); const bh = e.hp; W.damage(e, 1, c); S.check('stunned: double damage', Math.abs(bh - e.hp - 2) < .01); clear();
  let conf = 0; const off = MT.on('world:die', () => conf++); for (const k of MT.KIND_LIST) { const o = W.spawnAt(k, 200, 100); W.damage(o, 999, c); } off();
  S.check('every kind dies with its confetti event', conf >= MT.KIND_LIST.length, conf);
  return S;
};
