import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h;
O.flow = { quickMeet: e => ({ mode: 'single', seed: 1, events: [e], players: [], difficulty: 'Normal', medals: {}, yikes: {}, rival: 'TRB' }), eventDone() {} };
const def = O.EVENTS.swim; O.meet = O.flow.quickMeet('swim'); O.meet.seed = 7919 * 2;
const ath = O.makeAthletes(def, O.meet); for (const a of ath) a.cheat = 'perfect';
const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); O.sandbox = true; def.start(ctx);
let gasps = 0; O.bus.on('yikes', e => console.log('yikes', e.kind, e.a.nation));
for (let i = 0; i < 7200 && !def.done(ctx); i++) { for (const a of ath) O.pilot(ctx, a, 1 / 60); def.step(ctx, 1 / 60); ctx.t += 1 / 60; }
for (const L of ctx.s.lanes) console.log(L.a.nation, L.fin, 'react', L.react && L.react.toFixed(3), 'dive', L.diveQ, 'turn', L.turnQ, 'strokes', L.strokes, 'perf', L.perfects, 'q', L.q.toFixed(2), 'o2', L.o2.toFixed(2));
