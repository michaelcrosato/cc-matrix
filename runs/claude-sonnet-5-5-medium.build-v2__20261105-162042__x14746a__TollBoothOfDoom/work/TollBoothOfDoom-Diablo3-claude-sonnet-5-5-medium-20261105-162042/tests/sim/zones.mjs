import { Rng } from '../../pixel-engine.js';
import { generateZone } from '../../src/sim/zonegen.js';
import { ZONES } from '../../src/data/zones.js';
export const name = 'zones';
export async function run(t) {
  for (const id of Object.keys(ZONES)) {
    const n = ZONES[id].authored ? 2 : 40;
    for (let s = 1; s <= n; s++) {
      const z = generateZone(new Rng(s * 7919), id);
      if (z.exit && !z.nav.path([z.entrance.x, 0, z.entrance.z], [z.exit.x, 0, z.exit.z])) t.fail(`${id} seed ${s}: no path`);
      if (!z.entrance) t.fail(`${id}: no entrance`);
      const a = generateZone(new Rng(s * 7919), id); const r2 = new Rng(s * 7919); r2.fork('x'); 
      if (a.cells.join('') !== generateZone(r2, id).cells.join('')) t.fail(`${id} seed ${s}: not stable`);
    }
  }
}
