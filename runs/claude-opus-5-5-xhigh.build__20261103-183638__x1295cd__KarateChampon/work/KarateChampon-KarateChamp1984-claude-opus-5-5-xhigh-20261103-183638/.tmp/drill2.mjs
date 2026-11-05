import { fresh, steps } from '../tests/lib/util.mjs';
const { KC, game } = fresh(), I = game.input; game.go('practice', { lesson: 'lessonII' }); steps(game, 2);
const sc = game.scene, D = sc.drill; let last = '', pressed = false, rel;
const DIRS = { u: 'up', d: 'down', f: 'right', b: 'left' }, TK = { u: 'tUp', d: 'tDown', f: 'tRight', b: 'tLeft' };
for (let i = 0; i < 120 * 60 && !D.done; i++) {
  if (D.state === 'now' && sc.hero.free && D.t > .2 && !pressed) { pressed = true; const c = KC.cellOf(D.tech); if (c[0] !== 'n') I.hold(DIRS[c[0]]); I.tap(TK[c[1]]); rel = 3; }
  if (D.state !== 'now') pressed = false; if (rel !== undefined && --rel <= 0) { rel = undefined; for (const k of ['up','down','left','right']) I.hold(k, false); }
  steps(game, 1);
  const line = `${D.i} ${D.tech} ${D.state} misses${D.misses} hero ${sc.hero.st} ${sc.hero.tech||''} x${sc.hero.x.toFixed(0)} s${sc.senpai.x.toFixed(0)} gap ${sc.hero.gapTo(sc.senpai).toFixed(0)}`;
  if (line !== last) { console.log((i/120).toFixed(2), line); last = line; }
}
