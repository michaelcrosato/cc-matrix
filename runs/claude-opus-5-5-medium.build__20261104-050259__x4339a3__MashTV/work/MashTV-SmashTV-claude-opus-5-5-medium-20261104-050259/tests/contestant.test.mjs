import { suite } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('contestant'), g = room(), MT = g.MT, I = g.I, W = g.W, c = g.c;
  c.x = 100; c.y = 120; I.hold('right'); g.adv(1); I.hold('right', false); g.adv(.05);
  S.check('speed ~95 u/s', Math.abs(c.x - 100 - 95) < 8, (c.x - 100).toFixed(1));
  c.x = 340; I.hold('right'); g.adv(1); I.hold('right', false); S.check('walls hold', c.x <= MT.AR.x1 - 5);
  c.x = 100; c.slideCd = 0; I.hold('right'); I.tap('slide'); g.adv(.4); I.hold('right', false);
  S.check('a slide covers more ground', c.x - 100 > 60, (c.x - 100).toFixed(1));
  S.check('slide cooldown', c.slideCd > 0);
  c.slideT = .2; S.check('slide i-frames', c.iframes); c.slideT = 0; c.invuln = 0;
  const hp = c.hp; c.hurt(1, { x: c.x - 5, y: c.y }, W); S.check('a hit costs 1 HP with invulnerability', c.hp === hp - 1 && c.invuln > 1);
  S.check('knockback', c.kvx > 50);
  c.invuln = 0; c.hp = 1; const lives = c.lives; c.hurt(1, null, W); S.check('death costs a life', c.state === 'dead' && c.lives === lives - 1);
  g.adv(2.1); S.check('the cable drop', c.state === 'drop' && c.z > 0); g.adv(.6); S.check('lands invulnerable with a bomb', c.state === 'play' && c.invuln > 1.5 && c.bombs >= 1);
  c.lives = 0; c.invuln = 0; c.hp = 1; c.hurt(1, null, W); g.adv(2.2);
  W.contestants.push(new MT.Contestant(1, { look: 1, ctl: 'bot' })); MT.Show.W.contestants[1].godMode = true;
  S.check('out of lives', c.state === 'out');
  c.cash = 1000; I.tap('start'); g.adv(.1); S.check('Start continues at half cash', c.state === 'drop' && c.cash === 500 && c.lives === MT.startLives());
  g.adv(1); c.invuln = 0; W.contestants.pop();
  for (let i = 0; i < 5; i++) { const e = W.spawnAt('goon', c.x + 20 + i * 4, c.y); e.stun = 99; }
  c.boatCd = 0; I.tap('showboat'); const R0 = W.ratings.R; g.adv(.8); S.check('a showboat near foes gains ratings', W.ratings.R > R0 + 10, R0 + ' -> ' + W.ratings.R);
  c.boatCd = 0; I.tap('showboat'); g.adv(.2); c.invuln = 0; c.hurt(1, null, W); const R1 = W.ratings.R; g.adv(.6); S.check('a hit cancels the showboat', W.ratings.R <= R1 + .5);
  W.fShots.fire({ kind: 'orb', x: 50, y: 50, vx: 0, vy: 0, life: 9 }); c.bombs = 2; I.tap('bomb'); g.adv(.1);
  S.check('a Showstopper clears foe bullets and uses stock', W.fShots.list.length === 0 && c.bombs === 1);
  S.check('and damages everything', W.enemies.filter(e => e.kind === 'goon').length === 0);
  const before = MT.run.contestants.length; g.game.addPlayer({ pad: 2 }); S.check('a drop-in adds a contestant', MT.run.contestants.length === before + 1);
  return S;
};
