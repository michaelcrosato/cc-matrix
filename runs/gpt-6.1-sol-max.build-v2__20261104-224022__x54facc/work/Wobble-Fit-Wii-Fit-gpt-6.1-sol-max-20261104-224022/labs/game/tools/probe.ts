/** @file Prints objective activity pilot measurements while balancing the demo. */
import { ACTIVITIES } from '../scenes/data/days';
import { createRun, botFor, stepEvent } from '../scenes/events/registry';
import { makeWobble, DEFAULT_WOBBLE } from '../scenes/wobble';
import { TUNING } from '../scenes/settings';
const get = (key: string) => TUNING.find(([k]) => k === key)?.[1] ?? 1;
for (const a of ACTIVITIES) {
  const results = [];
  for (const kind of ['perfect', 'human', 'sloppy', 'idle']) {
    let sum = 0,
      min = 10000,
      max = 0;
    for (let seed = 1; seed <= 3; seed++) {
      const r = createRun(a.id, seed),
        w = makeWobble([seed * 0.4, seed * 0.7, 1, 2, 3, 4]),
        c = { wobble: { ...DEFAULT_WOBBLE }, get, auto: true, day: 1, expert: false };
      while (r.tick < r.length) stepEvent(r, w, botFor(r, w, c, kind), c);
      const score = r.id === 'group' ? r.score / 3 : r.score;
      sum += score;
      min = Math.min(min, score);
      max = Math.max(max, score);
    }
    results.push(`${kind}:${Math.round(sum / 3)} [${Math.round(min)}-${Math.round(max)}]`);
  }
  console.log(a.id, results.join(' | '));
}
