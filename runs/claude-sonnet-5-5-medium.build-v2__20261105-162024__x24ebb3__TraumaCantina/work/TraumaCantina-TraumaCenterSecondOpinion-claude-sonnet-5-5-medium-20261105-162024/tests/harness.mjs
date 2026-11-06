import { createOp, step, drainEvents, result, hash } from '../src/sim/op.js';
import { newBot, botInput } from '../src/sim/bot.js';
import { BY_ID } from '../src/content/ops/index.js';
import { resetConfig } from '../src/core/config.js';

export function runBot(id, { skill = 1, seed = 1, difficulty = 'resident', maxSec = 700, seats, cheat, startStage, log = false, unlocked, quietOn } = {}) {
  resetConfig();
  const def = BY_ID[id];
  const seatDefs = seats || (def.partner ? [{ id: 0, doctor: 'ilya' }, { id: 1, doctor: 'sabine', bot: true }] : [{ id: 0, doctor: def.surgeon }]);
  const sim = createOp(def, { seed, difficulty, seats: seatDefs, cheat, startStage, unlocked, quietOn: quietOn ?? (def.gifts?.includes('quiet')) });
  const bots = sim.seats.map((s) => newBot(skill, { region: def.partner ? (s.bot ? 'left' : 'right') : null }));
  bots.forEach((b, i) => { b.x = sim.seats[i].x; b.z = sim.seats[i].z; });
  const evs = []; let steps = 0;
  while (!sim.over && sim.t < maxSec * 2 && steps < maxSec * 60 * 1.1) {
    const inputs = {};
    sim.seats.forEach((s, i) => { inputs[s.id] = botInput(sim, s, bots[i]); });
    step(sim, inputs); steps++;
    for (const e of drainEvents(sim)) { evs.push(e); if (log && e.e !== 'fx' && e.e !== 'rate' && e.e !== 'spawn') console.log(sim.t.toFixed(1), e.e, e.i ?? '', e.id ?? '', e.why ?? ''); }
  }
  return { sim, evs, res: sim.over === 'win' ? result(sim) : null, def };
}
