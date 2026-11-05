import { boot } from '../tests/harness.mjs';
const c = boot({}); const O = c.OLY, game = O.game;
O.flow = { quickMeet: () => ({}), eventDone() {} };
const id = process.argv[2], def = O.EVENTS[id]; let wins = 0, N = +(process.argv[3] || 4), t0 = Date.now();
for (let seed = 1; seed <= N; seed++) {
  O.meet = { mode: 'single', seed, players: [], difficulty: 'Normal' };
  const ctx = O.makeCtx(def, O.meet, { sandbox: true }); for (const a of ctx.athletes) a.mash = new O.Mash();
  ctx.athletes[0].pilot.skill = .9; ctx.athletes[0].pilot.cheat = 'testA';
  def.build(ctx); def.start(ctx);
  const [A, B] = ctx.active; B.pilot.skill = .3;
  O.runToEnd(ctx, 2000);
  const sc = ctx.teams.map(a => a.S.score); if (sc[0] > sc[1]) wins++;
  console.log(seed, ctx.teams.map(a => a.id + ':' + a.S.score).join(' '), 'yikes', ctx.events.filter(e => e[0] === 'yikes').length);
}
console.log('A wins', wins, '/', N, 'ms', Date.now() - t0, game.errors.map(e => e.message));
