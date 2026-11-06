import { createOp, step, drainEvents } from '../src/sim/op.js';
import { newBot, botInput } from '../src/sim/bot.js';
import { BY_ID, SESSION_ROUNDS } from '../src/content/ops/index.js';
import { encodeKey, decodeKey, encodeSnap, applySnap, jsonSize } from '../src/net/codec.js';
import { resetConfig } from '../src/core/config.js';
export async function run(T) {
  for (const def of [...SESSION_ROUNDS, BY_ID.op9, BY_ID.op3]) {
    resetConfig(); const seats = [0, 1, 2, 3].map((i) => ({ id: i, doctor: i % 2 ? 'sabine' : 'ilya' })); const sim = createOp(def, { seed: 2, seats, quietOn: true, humans: 4 });
    const bots = seats.map(() => newBot(0.8)); let maxK = 0, maxS = 0, last = new Map();
    for (let i = 0; i < 60 * 70 && !sim.over; i++) { const inp = {}; sim.seats.forEach((s, k) => (inp[s.id] = botInput(sim, s, bots[k]))); step(sim, inp); drainEvents(sim); if (i % 30 === 0) { maxK = Math.max(maxK, jsonSize(encodeKey(sim, []))); maxS = Math.max(maxS, jsonSize(encodeSnap(sim, i, last))); } }
    T.ok(maxK <= 16000, `${def.id}: keyframe <= 16 KB (${maxK})`); T.ok(maxS <= 1100, `${def.id}: snapshot <= 1,100 bytes (${maxS})`);
    const k = JSON.parse(JSON.stringify(encodeKey(sim, []))); const sim2 = createOp(def, { seed: 2, seats, quietOn: true, humans: 4 }); decodeKey(k, sim2);
    T.ok(sim2.ents.length === sim.ents.length && Math.abs(sim2.t - sim.t) < 0.02 && sim2.stage === sim.stage, `${def.id}: keyframe round trip`);
    const sn = JSON.parse(JSON.stringify(encodeSnap(sim, 1, new Map()))); applySnap(sim2, sn); T.ok(Math.abs(sim2.tables[0].vitals - sim.tables[0].vitals) <= 1, `${def.id}: snapshot round trip`);
  }
}
