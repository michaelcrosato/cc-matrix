import { fresh, steps } from '../tests/lib/util.mjs';
const { KC, game } = fresh(); game.go('bonus', { id: 'pots', auto: true, variant: { seed: 2 }, done: () => {} }); steps(game, 2);
const sc = game.scene; let last = '';
for (let i = 0; i < 120 * 40 && sc.state !== 'end'; i++) {
  steps(game, 1);
  const o = sc.objs.filter(o => !o.done && o.tele <= 0).sort((a, b) => Math.abs(a.x - sc.hero.x) - Math.abs(b.x - sc.hero.x))[0];
  const line = `${(i/120).toFixed(2)} hero ${sc.hero.st} ${sc.hero.tech||''} ${sc.hero.phase||''} x${sc.hero.x.toFixed(0)} z${sc.hero.z.toFixed(0)} face${sc.hero.face} | ${o ? o.kind + ' ' + o.lane + ' x' + o.x.toFixed(0) + ' v' + o.vx.toFixed(0) : '-'} | auto ${JSON.stringify(sc.autoCtl)} handled ${sc.handled}`;
  if (line.replace(/^[\d.]+ /, '') !== last) { console.log(line); last = line.replace(/^[\d.]+ /, ''); }
}
console.log('END', sc.state, sc.handled, sc.points, sc.msg);
