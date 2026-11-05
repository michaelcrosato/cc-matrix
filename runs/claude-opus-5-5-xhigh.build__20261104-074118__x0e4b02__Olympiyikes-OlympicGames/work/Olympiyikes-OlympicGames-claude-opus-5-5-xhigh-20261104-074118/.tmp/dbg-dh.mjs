import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h;
O.flow = { quickMeet: e => ({ mode: 'single', seed: 1, events: [e], players: [], difficulty: 'Normal', medals: {}, yikes: {}, rival: 'TRB' }), eventDone() {} };
const def = O.EVENTS.downhill; O.meet = O.flow.quickMeet('downhill');
const ath = O.makeAthletes(def, O.meet); const a = ath[0]; a.cheat = 'perfect'; const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx);
O.sandbox = true; ctx.cur = a; def.start(ctx, a); const c = O.downhillCourse(); let lastGate = 0;
O.bus.on('yikes', e => console.log('YIKES', e.kind, ctx.s.m.toFixed(0)));
for (let i = 0; i < 8000 && !def.done(ctx); i++) { O.pilot(ctx, a, 1 / 60); const g0 = ctx.s.gate, ok0 = ctx.s.gatesOk; def.step(ctx, 1 / 60); if (ctx.s.m > 790 && ctx.s.m < 845 && i % 6 === 0) console.log('m', ctx.s.m.toFixed(0), 'x', ctx.s.x.toFixed(2), 'st', ctx.s.steer.toFixed(2), 'air', ctx.s.air.toFixed(2), 'crash', ctx.s.crash.toFixed(1), 'I', a.I.mv[0].toFixed(2)); if (ctx.s.gate !== g0) { const gt = c.gates[g0]; console.log('gate', g0, 'at', gt.s.toFixed(0), 'xc', gt.xc, 'x', ctx.s.x.toFixed(2), ctx.s.gatesOk > ok0 ? 'ok' : 'MISS', 'v', ctx.s.v.toFixed(1), 'sec', c.at(gt.s).sec, 'curve', c.at(gt.s).curve); } }
console.log('finish', ctx.s.finish, 'gates', ctx.s.gatesOk);
