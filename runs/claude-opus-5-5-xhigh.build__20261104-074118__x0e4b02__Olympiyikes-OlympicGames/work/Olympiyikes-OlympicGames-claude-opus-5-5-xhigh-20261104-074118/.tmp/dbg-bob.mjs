import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h;
O.flow = { quickMeet: e => ({ mode: 'single', seed: 1, events: [e], players: [], difficulty: 'Normal', medals: {}, yikes: {}, rival: 'TRB' }), eventDone() {} };
const def = O.EVENTS.bobsled; def.turboOk = false;
for (const sk of ['p', '.7']) { O.meet = O.flow.quickMeet('bobsled'); const ath = O.makeAthletes(def, O.meet); const a = ath[0]; if (sk === 'p') a.cheat = 'perfect'; else a.skill = +sk; const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); O.sandbox = true; ctx.cur = a; def.start(ctx, a); const c = O.bobCourse(); let mk = 0, out = [], skid = 0, offs = 0, n = 0, vmax = 0;
  for (let i = 0; i < 9000 && !def.done(ctx); i++) { O.pilot(ctx, a, 1 / 60); def.step(ctx, 1 / 60); const s = ctx.s; vmax = Math.max(vmax, s.v); if (s.loaded) { offs += Math.abs(s.x - s.groove); n++; } if (c.marks[mk] && s.m >= c.marks[mk].s) { out.push(c.marks[mk].name.slice(0, 6) + ':' + s.t.toFixed(1) + '/' + s.v.toFixed(0)); mk++; } }
  console.log(sk, ctx.s.finish, 'start', ctx.s.startT && ctx.s.startT.toFixed(2), 'load', ctx.s.loadQ, 'flips', ctx.s.flipped, 'skidT', ctx.s.skidT.toFixed(1), 'off', (offs / n).toFixed(2), 'vmax', vmax.toFixed(1)); console.log(out.join(' ')); }
