import { botInput } from './bot.js';
import { snapshotOf } from './codec.js';
import { createOp, hashSim, step } from './op.js';

/** Play a shipped op with the bot. Skill 0 passes no input (idle). */
export function play(def, skill = 1, opts = {}) {
  const sim = createOp(def, {
    seed: opts.seed ?? 1,
    difficulty: opts.difficulty || 'resident',
    seats: opts.seats,
    consult: opts.consult,
    god: !!opts.god,
    config: opts.config,
  });
  const dt = opts.dt || 1 / 60;
  const limit = opts.frames || Math.ceil((sim.timeMax + 30) / dt);
  let peakFast = 0;
  let peakKey = 0;
  let frames = 0;
  while (sim.phase === 'play' || sim.phase === 'codeblue' || sim.phase === 'massage') {
    const inputs = {};
    if (skill > 0) {
      for (const seat of sim.seats) inputs[seat.id] = botInput(sim, seat.id, skill, dt);
    }
    step(sim, inputs, dt);
    frames += 1;
    if (opts.codec && frames % 30 === 0) {
      const snap = snapshotOf(sim);
      if (snap.fastBytes > peakFast) peakFast = snap.fastBytes;
      if (snap.keyBytes > peakKey) peakKey = snap.keyBytes;
    }
    if (opts.onFrame) opts.onFrame(sim);
    if (frames >= limit) break;
  }
  sim._frames = frames;
  sim._peakFast = peakFast;
  sim._peakKey = peakKey;
  return sim;
}

export function sameHash(def, frames = 90) {
  const run = () => {
    const sim = createOp(def, { seed: 3 });
    let h = '';
    for (let i = 0; i < frames; i++) {
      const inputs = { 0: { place: true, x: Math.sin(i / 9) * 0.4, z: 0.2, tool: 'drain', use: i % 5 < 3 } };
      step(sim, inputs, 1 / 60);
      h = hashSim(sim);
    }
    return h;
  };
  const a = run();
  const b = run();
  return a === b ? a : '';
}
