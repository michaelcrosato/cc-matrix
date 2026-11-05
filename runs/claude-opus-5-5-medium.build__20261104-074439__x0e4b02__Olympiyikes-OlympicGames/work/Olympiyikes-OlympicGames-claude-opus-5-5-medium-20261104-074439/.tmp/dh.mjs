import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const id = process.argv[2] || 'downhill', def = O.EVENTS[id];
O.meet = { mode: 'single', seed: 3, players: [], difficulty: 'Normal' };
const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash();
if (process.argv[3] === 'perfect') a.pilot.cheat = 'perfect'; else a.pilot.skill = +(process.argv[3] || .9);
ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx);
let ev = []; const yk = ctx.events; let lastSec = '';
for (let i = 0; i < 60 * 150 && !def.done(ctx); i++) { O.simStep(ctx, 1/60); if (i % 120 === 0) ev.push(`${(a.S.t||0).toFixed(0)}s s=${(a.S.s||0).toFixed(0)} v=${(a.S.v||0).toFixed(1)} x=${(a.S.x||0).toFixed(2)}${a.S.crashT>0?' CRASH':''}`); }
console.log(ev.join('\n')); console.log('perf', a.cur, 'gates', a.S.gatesOk, 'pen', a.S.pen, 'events', yk.map(e => e[0] + ':' + (e[1].kind||'')).join(','));
