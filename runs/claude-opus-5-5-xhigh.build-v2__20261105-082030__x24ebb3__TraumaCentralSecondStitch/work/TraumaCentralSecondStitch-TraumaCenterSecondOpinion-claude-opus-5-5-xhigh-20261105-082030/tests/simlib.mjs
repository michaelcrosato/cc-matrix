// Helpers for sim tests.
import { createConfig } from '../src/core/config.js';
import { OPS } from '../src/content/ops/index.js';
import { createOp, drainEvents, step } from '../src/sim/op.js';

export function runBot(id, { skill = 0.7, seed = 7, difficulty = 'resident', maxTicks = 60 * 900, config, seats, cheats, onTick } = {}) {
  const def = OPS[id];
  const base = def.seatDefaults ?? {};
  const sim = createOp(def, { seed, difficulty, config: config ?? createConfig(), seats: seats ?? [{ id: 0, ...base, bot: { skill } }], cheats });
  let ticks = 0;
  while (sim.status === 'playing' && ticks < maxTicks) {
    step(sim, {});
    drainEvents(sim);
    onTick?.(sim, ticks);
    ticks++;
  }
  return { sim, ticks };
}
