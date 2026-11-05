// calibration: an event's CPU performance by skill (and the perfect bot), over seeds
import { boot } from './harness.mjs';
const id = process.argv[2] || 'sprint', skills = (process.argv[3] || 'perfect,.9,.5,.3').split(','), seeds = +(process.argv[4] || 6), field = process.argv[5];
const h = boot(); const { O, game } = h;
O.flow = { quickMeet: e => ({ mode: 'single', seed: 1, events: [e], players: [], difficulty: 'Normal', medals: {}, yikes: {}, rival: 'TRB' }), eventDone() {} };
const def = O.EVENTS[id];
for (const sk of skills) {
  const out = [];
  for (let seed = 1; seed <= seeds; seed++) {
    O.meet = O.flow.quickMeet(id); O.meet.seed = seed * 7919;
    const ath = O.makeAthletes(def, O.meet);
    for (const a of ath) { if (sk === 'perfect') a.cheat = 'perfect'; else a.skill = +sk; }
    if (sk === 'turbo') for (const a of ath) { a.cheat = 'perfect'; }
    const ctx = O.makeCtx(def, O.meet, ath); if (def.build) def.build(ctx);
    if (def.format.type === 'race') { O.sandbox = true; def.start(ctx); for (let i = 0; i < 60 * 120 && !def.done(ctx); i++) { for (const a of ath) O.pilot(ctx, a, 1 / 60); def.step(ctx, 1 / 60); ctx.t += 1 / 60; } O.sandbox = false; out.push(...ath.map(a => def.perf(ctx, a))); }
    else { const a = ath[0]; for (let r = 0; r < (def.format.attempts || 1); r++) { ctx.round = r; const res = O.simAttempt(ctx, a); a.attempts[r] = res; out.push(field ? (res.info ? res.info[field] : null) : res.perf); } }
  }
  const v = out.filter(x => x != null), avg = v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  console.log(id, sk.padEnd(8), 'avg', avg.toFixed(2), 'min', Math.min(...v).toFixed(2), 'max', Math.max(...v).toFixed(2), 'n', v.length, '/', out.length, h.errors().slice(0, 2).join(' '));
}
