import { suite, until } from './lib.mjs';
import { room } from './units.mjs';
export default async () => {
  const S = suite('dev'), g = room(), MT = g.MT, I = g.I; let W = g.W, c = g.c;
  g.game.pause(); g.adv(.05); g.game.o.menu.items[0][1](); g.adv(.05);
  S.check('opens from the pause item', MT.overlay.kind === 'dev' && !g.game.paused);
  const t0 = W.t; g.adv(.5); S.check('FREEZE stops world time', W.t === t0);
  I.tap('reset'); g.adv(.05);
  const D = MT.dev; D.tab = 0; D.i = 0; I.tap('right'); g.adv(.05); S.check('a slider changes MT.T live', MT.T.playerSpeed === 100, MT.T.playerSpeed);
  I.tap('reset'); g.adv(.05); S.check('per-row reset', MT.T.playerSpeed === 95);
  MT.setTune('playerSpeed', 160, false); D.freeze = false; I.tap('cancel'); g.adv(.05); S.check('it closes', !MT.overlay.open);
  c.x = 40; c.y = 120; MT.intentFrom = () => Object.assign(MT.NOINTENT(), { move: [1, 0] }); g.adv(1); S.check('playerSpeed x~1.7 moves farther', c.x - 40 > 150, (c.x - 40).toFixed(0)); MT.intentFrom = () => MT.NOINTENT();
  MT.setTune('enemyHp', 4, false); const e = W.spawnAt('goon', 300, 200); S.check('enemyHp changes new goons', e.hp === 4); MT.resetTunes();
  S.check('RESET ALL restores defaults', MT.tunesChanged().length === 0);
  for (const k of ['god', 'oneHit', 'freeze', 'noclip']) { MT.dev.cheat(k, true); S.check('cheat ' + k + ' on', MT.CHEATS[k]); }
  c.invuln = 0; const hp = c.hp; c.hurt(1, null, W); S.check('god mode holds', c.hp === hp);
  const t = W.spawnAt('tank', 200, 100); W.damage(t, 1, c); S.check('one-hit kills', t.dead);
  const gz = W.spawnAt('goon', 200, 150), gx = gz.x; g.adv(.5); S.check('freeze enemies', gz.x === gx);
  S.check('the DEV badge shows', MT.devActive());
  MT.cfg.allowScores = false; MT.run.mode = 'arcade'; g.game.go('initials', {}); g.adv(1); S.check('high-score entry is blocked while it shows', g.snap().scene === 'scores');
  for (const k in MT.CHEATS) MT.CHEATS[k] = false;
  MT.newRun({ mode: 'test', seed: 4, players: [{ slot: 0, look: 0, ctl: 'bot' }] });
  for (const id of Object.keys(MT.ROOMS).filter(i => i !== 'TEST')) { g.game.debug.warp(id); g.adv(.6); if (!S.check('warp ' + id, g.snap().room === id, g.snap().room)) break; }
  for (const s of ['cold', 'card2', 'recap1', 'gameover', 'initials', 'endingA', 'endingB', 'credits', 'sessionCard']) { g.game.debug.warp(s); g.adv(.6); S.check('warp scene ' + s, g.game.errors.length === 0 && g.snap().scene !== 'title', g.snap().scene); }
  g.game.debug.warp('1-1'); g.adv(1); W = MT.Show.W; const n0 = W.enemies.length; MT.dev.spawn('clapbot', 5, 'drop'); S.check('spawning spawns', W.enemies.length === n0 + 5);
  MT.run.mode = 'attract'; S.check('not reachable in the attract mode', !MT.dev.allowed()); MT.run.mode = 'session'; S.check('not reachable in sessions', !MT.dev.allowed()); MT.run.mode = 'test';
  return S;
};
