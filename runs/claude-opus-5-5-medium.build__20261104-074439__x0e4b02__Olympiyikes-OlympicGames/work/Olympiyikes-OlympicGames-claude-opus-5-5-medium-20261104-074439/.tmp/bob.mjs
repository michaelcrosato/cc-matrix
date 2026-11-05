import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS.bobsled;
O.meet = { mode: 'single', seed: 3, players: [], difficulty: 'Normal' };
const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash(); a.pilot.skill = .9;
ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx);
let fl = false;
for (let i = 0; i < 60 * 100 && !def.done(ctx); i++) { O.simStep(ctx, 1/60); const s = a.S; if (s.flipT > 0 && !fl) { fl = true; console.log('FLIP at', s.s.toFixed(0), O.Bob.secs.find(q => s.s >= q.s0 && s.s < q.s1).name, 'v', s.v.toFixed(1)); } if (s.flipT <= 0) fl = false; if (i % 30 === 0 && s.s > 380 && s.s < 560) console.log(s.s.toFixed(0), 'x', s.x.toFixed(2), 'xv', s.xv.toFixed(2), 'cv', O.Bob.road.curveAt(s.s*100).toFixed(2), 'steer', s.steer.toFixed(2)); }
