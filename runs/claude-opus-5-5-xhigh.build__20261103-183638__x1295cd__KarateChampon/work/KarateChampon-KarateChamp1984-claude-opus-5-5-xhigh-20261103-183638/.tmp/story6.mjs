import { fresh, steps } from '../tests/lib/util.mjs';
const { KC, game } = fresh(), I = game.input;
KC.Story.newGame(); KC.Story.node = 6; KC.Story.run(); steps(game, 2);
let last = '';
const DIRS = { u: 'up', d: 'down', f: 'right', b: 'left' }, TK = { u: 'tUp', d: 'tDown', f: 'tRight', b: 'tLeft' }, o = {};
for (let i = 0; i < 120 * 60; i++) {
  const sc = game.scene, n = game.sceneName; o.sceneT = (o.last === n ? o.sceneT : 0) + 1/120; o.last = n; const every = Math.floor(o.sceneT * 120) % 40 === 20;
  if (['cutscene','road','vscard','promotion'].includes(n) && every && o.sceneT > .5) I.tap('confirm');
  if (n === 'practice') { const D = sc.drill; if (D.state === 'now' && sc.hero.free && D.t > .2 && !o.pressed) { o.pressed = true; const c = KC.cellOf(D.tech); if (c[0] !== 'n') I.hold(DIRS[c[0]]); I.tap(TK[c[1]]); o.release = 3; } if (D.state !== 'now') o.pressed = false; if (o.release !== undefined && --o.release <= 0) { o.release = undefined; for (const k of ['up','down','left','right']) I.hold(k, false); }
    const line = `${n} ${D.i} ${D.tech} ${D.state} m${D.misses} ${sc.hero.st} ${sc.hero.tech||''} talk:${sc.talk && !sc.talk.done}`; if (line !== last) { console.log((i/120).toFixed(2), line); last = line; } }
  else { const line = n + ' node ' + KC.Story.node; if (line !== last) { console.log((i/120).toFixed(2), line); last = line; } }
  steps(game, 1);
}
