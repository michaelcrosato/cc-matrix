import { boot } from '../tests/harness.mjs';
const c = boot(); const O = c.OLY; O.flow.eventDone = () => {};
const def = O.EVENTS.swim, bot = def.bot; def.bot = (ctx, a, dt, I) => { bot(ctx, a, dt, I); if (!a.S.turned) I.A = false; return I; };
O.meet = { mode: 'single', seed: 7, players: [], difficulty: 'Normal' };
const ctx = O.makeCtx(def, O.meet, { sandbox: true }); for (const b of ctx.athletes) b.mash = new O.Mash(); const a = ctx.athletes[0]; a.pilot.skill = .9;
def.build(ctx); ctx.active = [a]; ctx.round = 0; a.fin = false; def.start(ctx);
let last=''; for (let i = 0; i < 6000 && !def.done(ctx); i++) { O.simStep(ctx, 1/60); const k = a.S.state + ' ' + a.S.turnQ; if (k !== last) { console.log(a.S.d.toFixed(1), k); last = k; } }
