import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const def = O.EVENTS.diving;
for (const di of [0, 2, 4, 5]) for (const sk of ['perfect', .9, .5]) { O.meet = { mode: 'single', seed: 2, players: [], difficulty: 'Normal' };
  const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; a.mash = new O.Mash(); def.build(ctx);
  if (sk === 'perfect') a.pilot.cheat = 'perfect'; else a.pilot.skill = sk;
  ctx.round = 0; ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; def.start(ctx); a.S.dive = O.DIVES[di]; a.S.phase = 'board'; a.hype = 0; a.infHype = false; if (sk === 'perfect') { a.pilot.cheat = null; a.pilot.skill = 1; a.S.botErr = 0; }
  O.runToEnd(ctx, 60); void 0; console.log(O.DIVES[di].id, sk, 'score', a.cur, 'err', (a.S.err||0).toFixed(1), 'extra', a.S.extra, 'th/pi', (a.S.th / Math.PI).toFixed(2), 'cards', a.S.cards && a.S.cards.join(','), a.S.verdict); }
