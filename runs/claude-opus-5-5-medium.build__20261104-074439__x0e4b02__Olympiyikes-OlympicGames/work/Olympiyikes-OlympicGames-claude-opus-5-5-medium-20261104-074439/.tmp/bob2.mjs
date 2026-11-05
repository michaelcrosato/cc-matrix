import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS[process.argv[2] || 'bobsled'];
for (const sk of ['perfect', 'perfectNoTurbo', .95, .7, .5, .2]) { let sum = 0, n = 0, sk2 = [];
  for (let seed = 1; seed <= 4; seed++) { O.meet = { mode: 'single', seed, players: [], difficulty: 'Normal' };
    const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash();
    if (sk === 'perfect') a.pilot.cheat = 'perfect'; else if (sk === 'perfectNoTurbo') { a.pilot.skill = 1; } else a.pilot.skill = sk;
    def.build && def.build(ctx); ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx); O.runToEnd(ctx, 150);
    if (a.cur != null) { sum += a.cur; n++; } sk2.push((a.S.skidT || 0).toFixed(1)); }
  console.log(sk, (sum / Math.max(1, n)).toFixed(2), 'n', n, 'skid', sk2.join(','), 'start50', '');
}
