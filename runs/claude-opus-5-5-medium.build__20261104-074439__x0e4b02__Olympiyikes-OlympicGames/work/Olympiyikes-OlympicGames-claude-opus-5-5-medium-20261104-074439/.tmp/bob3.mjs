import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS.bobsled; O.meet = { mode: 'single', seed: 1, players: [], difficulty: 'Normal' };
const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash(); a.pilot.skill = 1;
ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx);
for (let i = 0; i < 60 * 50 && !def.done(ctx); i++) { O.simStep(ctx, 1/60); const s = a.S; if (i % 40 === 0 && s.loaded) console.log(s.s.toFixed(0), 'v', s.v.toFixed(1), 'x', s.x.toFixed(2), 'skid', s.skidding ? 1 : 0, 'steer', s.steer.toFixed(2), 'cv', O.Bob.road.curveAt(s.s * 100).toFixed(2)); }
