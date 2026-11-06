import { boot, newGame, hold, press, T, walkTo } from './lib.mjs';
const { e, g } = await boot(); e.step(10);
T.eq(g.mode, 'title', 'starts on title');
const w = await newGame(g, e); w.min = 480; g.sys.time.visual(g, 0, true); e.step(30);
T.eq(g.mode, 'play', 'play mode');
const x0 = g.player.pos.x; g.player.reset([12, 24]); hold(e, ['KeyD'], 60); T.ok(Math.hypot(g.player.pos.x - 12, g.player.pos.z - 24) > 1, 'player moves with keyboard');
const d = await walkTo(e, g, 21, 23); T.ok(d < 1, 'walks across the plaza by mouse-target ' + d.toFixed(2));
console.log(g.status(), e.errors.length ? e.errors : ''); console.log('count', T.count, 'fails', T.fails);
