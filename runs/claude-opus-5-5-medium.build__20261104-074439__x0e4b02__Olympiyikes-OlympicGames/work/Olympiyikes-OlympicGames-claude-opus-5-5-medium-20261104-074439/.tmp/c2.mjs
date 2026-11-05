import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY, game = O.game;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS.curling;
O.meet = { mode: 'single', seed: 1, players: [], difficulty: 'Normal' };
const ctx = O.makeCtx(def, O.meet, { sandbox: true }); for (const a of ctx.athletes) a.mash = new O.Mash();
def.build(ctx); def.start(ctx); let last = '';
for (let i = 0; i < 60 * 300; i++) { O.simStep(ctx, 1/60); const S = ctx.S; const k = S.phase + ' n' + S.n + ' e' + S.end + ' t' + S.turn + (S.plan ? ' plan' + S.plan.i + (S.plan.done ? 'D' : '') : ''); if (k !== last) { console.log(i, k, S.aimY.toFixed(2), S.spin, S.plan && S.plan.best && JSON.stringify(S.plan.best)); last = k; } if (S.over) break; }
