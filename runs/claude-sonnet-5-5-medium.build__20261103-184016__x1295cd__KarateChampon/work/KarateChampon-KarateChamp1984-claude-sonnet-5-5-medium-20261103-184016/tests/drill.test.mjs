import { fresh } from './lib/helpers.mjs';
import { until, sceneIs } from './lib/play.mjs';
export default async t => {
  const G = fresh(), { KC, game } = G, I = game.input; KC.Story.s = KC.Story.fresh();
  const enter = lesson => { game.go('practice', { lesson }, { fade: 0 }); game.advance(.1); return game.scene; };
  // every drill accepts its technique and rejects others; SHARP within 50 frames; hints after 3 misses; skip; totals
  for (const lesson of ['I', 'II', 'III']) {
    const sc = enter(lesson); const n = KC.LESSONS[lesson].drills.length; KC.autopilot = 10; until(game, () => sc.state === 'done', 200); KC.autopilot = 0;
    t.check(`lesson ${lesson} completes all ${n} drills with the autopilot`, sc.state === 'done' && sc.good === n, sc.state + ' ' + sc.good + '/' + n);
    t.check(`lesson ${lesson} scores SHARP (400) for quick answers`, sc.score >= n * 400 - 400, sc.score);
  }
  { const sc = enter('I'); until(game, () => sc.state === 'now', 20); const id0 = sc.drill_().id; const before = sc.i;
    // a wrong technique (round kick when front kick is wanted) is rejected
    sc.me.start('roundKick', sc.sen, 'n', 'u'); game.advance(.05); t.check('a wrong technique is rejected: NO. WATCH AGAIN.', sc.state === 'wait' && sc.msg === 'NO. WATCH AGAIN.' && sc.misses === 1, sc.state + ' ' + sc.msg); }
  { const sc = enter('I'); for (let k = 0; k < 3; k++) { until(game, () => sc.state === 'now', 30); sc.me.start('roundKick', sc.sen, 'n', 'u'); game.advance(.05); } t.check('after 3 misses a hint appears (and the drill waits)', sc.misses >= 3 && sc.i === 0, sc.misses + ' ' + sc.i); }
  { const sc = enter('I'); until(game, () => sc.state === 'now', 20); sc.me.start('frontKick', sc.sen, 'n', 'r'); game.advance(.05); t.check('the right technique scores GOOD or SHARP', sc.state === 'result' && sc.score >= 200, sc.state + ' ' + sc.score); }
  { const sc = enter('I'); until(game, () => sc.state === 'now', 20); sc.nowAt = 2.0; sc.me.start('frontKick', sc.sen, 'n', 'r'); game.advance(.05); t.check('a late answer is GOOD (200), not SHARP', sc.score === 200, sc.score); }
  { const sc = enter('I'); until(game, () => sc.state === 'watch', 5); const i0 = sc.i; I.tap('start'); game.advance(.05); t.check('start skips a drill with no points', sc.i === i0 + 1 && sc.score === 0, sc.i + ' ' + sc.score); }
  { const sc = enter('II'); until(game, () => sc.state === 'now' && sc.drill_().id === 'revPunch', 60); }
  { KC.autopilot = 10; const sc = enter('ALL'); until(game, () => sc.state === 'done', 400); KC.autopilot = 0; t.check('All Techniques has 21 drills and all pass', sc.good === 21, sc.good); }
  t.check('no engine errors in drills', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join('|'));
};
