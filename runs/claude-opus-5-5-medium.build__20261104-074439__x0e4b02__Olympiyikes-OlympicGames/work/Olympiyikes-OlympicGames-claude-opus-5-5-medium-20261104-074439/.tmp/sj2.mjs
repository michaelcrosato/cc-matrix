import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS.skijump;
for (const cl of [.0025, .003, .0035, .004]) {
  O.tune.set('skijump', 'cL0', cl); const row = [];
  for (const sk of ['perfect', .9, .5, 'notake']) { let sum = 0, n = 0, cr = 0;
    for (let seed = 1; seed <= 6; seed++) { O.meet = { mode: 'single', seed, players: [], difficulty: 'Normal' };
      const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash(); a.hype = 0;
      if (sk === 'perfect') a.pilot.cheat = 'perfect'; else if (sk === 'notake') { a.pilot.skill = .9; } else a.pilot.skill = sk;
      ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx); if (sk === 'notake') a.S.bot.noTake = true; if (sk === 'perfect') a.hype = 0;
      O.runToEnd(ctx, 60); if (a.S.dist != null) { sum += a.S.dist; n++; } if (a.S.crashed) cr++; }
    row.push(sk + ':' + (sum / Math.max(1, n)).toFixed(1) + (cr ? ' c' + cr : '')); }
  console.log(cl, row.join('  '));
}
