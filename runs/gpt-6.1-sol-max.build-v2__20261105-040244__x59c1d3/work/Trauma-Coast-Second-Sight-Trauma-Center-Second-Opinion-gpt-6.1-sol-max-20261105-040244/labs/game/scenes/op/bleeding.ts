/** @file Open wounds produce physical pools; an unseen site can hide its own work beneath blood. */
import type { Operation, Rules } from '../../data/types';
import { spawn } from './state';
export function bleed(s: Operation, r: Rules, delta: number): void {
  const dt = delta / 6000;
  for (const wound of [...s.targets]) {
    if (wound.done || wound.kind !== 'wound') continue;
    let pool = s.targets.find((t) => t.kind === 'pool' && !t.done && t.dose === wound.id);
    if (!pool && s.fieldTicks - wound.born > 60000 && wound.clip < s.fieldTicks) {
      pool = spawn(s, {
        kind: 'pool',
        at: [wound.x, wound.z + 0.12],
        site: wound.site,
        radius: 0.8,
        required: false,
        hp: 0.25,
      });
      pool.dose = wound.id;
      wound.clip = s.fieldTicks + 60000;
    }
    if (pool) pool.hp = Math.min(1.8, pool.hp + dt * 0.04 * r.balance.bleedRate * (wound.deep ? 1.7 : 1));
  }
}
