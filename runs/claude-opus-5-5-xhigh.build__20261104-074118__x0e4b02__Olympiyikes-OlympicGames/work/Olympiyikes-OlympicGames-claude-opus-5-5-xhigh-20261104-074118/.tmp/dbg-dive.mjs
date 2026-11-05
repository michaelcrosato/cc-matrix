import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h;
O.flow = { quickMeet: e => ({ mode: 'single', seed: 1, events: [e], players: [], difficulty: 'Normal', medals: {}, yikes: {}, rival: 'TRB' }), eventDone() {} };
const def = O.EVENTS.diving; O.meet = O.flow.quickMeet('diving');
const ath = O.makeAthletes(def, O.meet); const a = ath[0]; a.cheat = process.argv[2] === 'p' ? 'perfect' : null; a.skill = +(process.argv[2]) || .9;
const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx);
for (let r = 0; r < 3; r++) { ctx.round = r; const res = O.simAttempt(ctx, a, { keepState: true }); const s = res.s; console.log(r, res.info.dive, 'score', res.perf, 'e', res.info.e.toFixed(1), 'cards', res.info.cards.join(','), 'th', s.th.toFixed(2), 'halves', s.halvesDone, 'q', s.q, 'tw', s.twists, 'air', s.airT.toFixed(2), 'in', s.inPos.toFixed(2), 'wrong', s.wrongPos.toFixed(2)); }
