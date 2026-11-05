import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY; O.flow.eventDone = () => {};
const def = O.EVENTS.skijump;
for (const sk of ['perfect', .95, .5]) { const pts = [], ds = [];
  for (let seed = 1; seed <= 8; seed++) { O.meet = { mode: 'single', seed, players: [], difficulty: 'Normal' };
    const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash(); if (sk === 'perfect') a.pilot.cheat = 'perfect'; else a.pilot.skill = sk;
    ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx); O.runToEnd(ctx, 60); pts.push(a.cur); ds.push(a.S.dist + (a.S.crashed ? 'c' : '')); }
  console.log(sk, 'pts', pts.map(v => v == null ? 'x' : v.toFixed(0)).join(' '), 'dist', ds.join(' ')); }
