// Test 1: the Dot and the bots reproduce the plan's measured time-in-ring table.
import { Dot } from '../../src/core/dot.js';
import { BotDriver, blank } from '../../src/core/drivers.js';
import { T } from '../../src/core/tunables.js';
export const name = 'dot';
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function measure(skill, ring, seconds = 35, seeds = 40) {
  let tot = 0;
  for (let k = 1; k <= seeds; k++) {
    const r = seeded(k * 7919), dot = new Dot(r), bot = new BotDriver(skill, seeded(k * 104729)), out = blank();
    let inN = 0, n = 0;
    for (let i = 0; i < seconds * 60; i++) {
      const t = i / 60;
      bot.observe(dot, t); bot.read(out, null, 1 / 60, t);
      dot.step(1 / 60, out.x, out.y, T);
      if (t >= 2) { n++; if (Math.hypot(dot.x, dot.y) <= ring) inN++; }
    }
    tot += inN / n;
  }
  return tot / seeds;
}
export default function (t) {
  const m = (s) => measure(s, 0.3);
  const idle = m('idle'), avg = m('average'), good = m('good'), exp = m('expert'), sloppy = m('sloppy');
  t.ok(idle < 0.2, `idle bot ${idle.toFixed(2)} < .20 at ring .30`);
  t.ok(avg > 0.35 && avg < 0.65, `average bot ${avg.toFixed(2)} in 35-65%`);
  t.ok(good > 0.8, `good bot ${good.toFixed(2)} > 80%`);
  t.ok(exp > 0.95, `expert bot ${exp.toFixed(2)} > 95%`);
  t.ok(sloppy < avg, 'sloppy < average');
  t.info(`dot table @.30: idle ${idle.toFixed(2)} sloppy ${sloppy.toFixed(2)} avg ${avg.toFixed(2)} good ${good.toFixed(2)} expert ${exp.toFixed(2)}`);
}
