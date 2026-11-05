// Every floor: bordered, in the legend, its counts matching its meta, solvable with its own keys, no dead content.
import { boot } from './lib.mjs';
export default async function (check) {
  const t = boot({ quiet: true });
  for (const fd of t.D.floors()) {
    const e = t.D.validateFloor(fd);
    check(fd.id + ' validates', !e.length, e.join('; '));
    const dead = t.D.deadContent(fd);
    check(fd.id + ' no dead content', !dead.length, dead.join(' '));
  }
  check('nine floors and two treasure rooms', t.D.floors().length === 11);
}
