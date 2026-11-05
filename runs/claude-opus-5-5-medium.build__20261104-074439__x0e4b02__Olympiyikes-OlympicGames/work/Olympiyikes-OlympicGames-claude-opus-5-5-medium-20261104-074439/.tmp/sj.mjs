import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
O.meet = { mode: 'single', seed: 3, players: [], difficulty: 'Normal' };
const def = O.EVENTS.skijump, ctx = O.makeCtx(def, O.meet, { sandbox: true });
const a = ctx.athletes[0]; a.pilot.cheat = process.argv[2] || 'perfect'; a.mash = new O.Mash(); a.hype = 0;
ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx);
let maxv = 0, lastPhase = '';
for (let i = 0; i < 60 * 60 && !def.done(ctx); i++) { O.simStep(ctx, 1/60); if (a.S.phase !== lastPhase) { console.log(lastPhase = a.S.phase, 'v', a.S.v.toFixed(1), 'vx', (a.S.vx||0).toFixed(1), 'vz', (a.S.vz||0).toFixed(1), 'x', (a.S.x||0).toFixed(1)); } }
console.log('dist', a.S.dist, 'style', a.S.style, 'pts', a.cur, 'crash', a.S.crashed, 'al', a.S.al.toFixed(1));
