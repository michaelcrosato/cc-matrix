import { load, checker } from './harness.mjs';
const { game, I, snap } = load(); const { check, done } = checker();
const errs = () => game.errors.map(e => (e.message || e) + '').join(' | ');
game.advance(1);
check('boots to the title', snap().scene === 'title', JSON.stringify(snap()) + errs());
for (const [scene, data] of [['street', { mode: 'coldopen' }], ['street', { mode: 'corner' }], ['street', { mode: 'shift', seconds: 30 }], ['street', { mode: 'reup' }], ['office', {}], ['wire', {}], ['stash', {}], ['office', { mode: 'ending' }], ['montage', {}], ['about', {}], ['results', { chapter: 1 }], ['gameover', { why: 'blown' }], ['card', { chapter: 2 }], ['street', { mode: 'demo', demo: true }], ['street', { mode: 'chasedemo', demo: true }]]) {
  game.go(scene, data, { fade: 0 }); game.advance(3);
  check('runs ' + scene + ' ' + JSON.stringify(data), !game.errors.length, errs());
  game.errors.length = 0;
}
done();
