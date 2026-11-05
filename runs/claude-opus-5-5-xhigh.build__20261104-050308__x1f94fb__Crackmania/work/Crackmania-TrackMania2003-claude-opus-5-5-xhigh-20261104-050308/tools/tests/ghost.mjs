// covers: src/race/ghost.js
import { E } from '../node-env.mjs';
import { compile } from '../../src/track/track.js';
import { TRACKS } from '../../src/data/tracks.js';
import { Course } from '../../src/race/course.js';
import { Run } from '../../src/race/run.js';
import { Plan, Bot } from '../../src/race/bot.js';
import { Ghost } from '../../src/race/ghost.js';
import { len, sub, dot } from '../../src/lib/v3.js';
export default T => {
  const tr = compile(TRACKS.find(t => t.id === 'D3')), c = new Course(tr, E.RAPIER), run = new Run(c, 'coyote', { countdown: 0 }), bot = new Bot(new Plan(c, 'coyote', 1));
  const live = [];
  for (let i = 0; i < 120 * 40 && !run.finished; i++) { const k = bot.drive(run.car, 1 / 120, true); run.step(k); run.ev.length = 0; if (run.steps % 4 === 0 && run.steps > 0) live.push({ s: run.steps, p: run.car.p.slice(), f: run.car.f.slice(), u: run.car.u.slice() }); }
  T.check('bot finished D3', run.finished);
  const enc = run.rec.encode({ model: 'coyote' }), g = Ghost.decode(enc);
  let dp = 0, da = 0; for (const L of live) { const a = g.at(L.s); dp = Math.max(dp, len(sub(a.p, L.p))); da = Math.max(da, Math.acos(Math.min(1, dot(a.f, L.f))) * 180 / Math.PI, Math.acos(Math.min(1, dot(a.u, L.u))) * 180 / Math.PI); }
  T.check('playback within 2 cm', dp < .02, dp.toFixed(4) + ' m'); T.check('playback within 1 degree', da < 1, da.toFixed(3) + ' deg');
  const g2 = Ghost.decode(JSON.parse(JSON.stringify(enc))); T.check('encode/decode round trip exact', g2.n === g.n && g2.P.every((v, i) => v === g.P[i]));
  const kbPerMin = g.bytes / 1024 / (run.steps / 120 / 60); T.check('size < 25 KB a minute', kbPerMin < 25, kbPerMin.toFixed(1) + ' KB/min');
  T.check('finish marked', g.finishSteps === run.finishSteps);
};
