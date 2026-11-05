import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY, game = O.game;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS.figure;
O.meet = { mode: 'single', seed: 3, players: [], difficulty: 'Normal' };
game.start({ scenes: { x: { update() {}, draw() {} } }, scene: 'x' });
const ctx = O.makeCtx(def, O.meet, { }); const a = ctx.athletes[0]; a.mash = new O.Mash(); a.rig = O.makeRig(a.nat, 'figure');
if (process.argv[2] === 'perfect') a.pilot.cheat = 'perfect'; else a.pilot.skill = +(process.argv[2] || .9);
if (process.argv[3]) a.S.skipTo = 0;
ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx); if (process.argv[3]) a.S.skipTo = +process.argv[3];
for (let i = 0; i < 120 * 90 && !def.done(ctx); i++) { O.simStep(ctx, 1/120); game.advance(1/120); }
console.log('perf', a.cur, a.S.rh.counts, 'falls', a.S.falls, 'combo', a.S.rh.maxCombo, 'total', a.S.total, 'res', a.S.result, 'err', game.errors.map(e=>e.message));
for (const sk of [.9, .6, .3]) console.log('sim', sk, def.simPerf(Object.assign(ctx, {}), Object.assign({}, a, { pilot: { skill: sk } })));
