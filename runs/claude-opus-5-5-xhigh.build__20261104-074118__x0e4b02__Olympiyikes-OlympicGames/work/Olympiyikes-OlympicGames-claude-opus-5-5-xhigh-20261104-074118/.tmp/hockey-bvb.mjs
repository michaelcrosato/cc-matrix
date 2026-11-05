import { boot } from '../tests/harness.mjs';
const h = boot(); const { O } = h;
const def = O.EVENTS.hockey; const [sa, sb, n] = [+(process.argv[2] || .7), +(process.argv[3] || .7), +(process.argv[4] || 6)];
let wins = 0, goals = [0, 0], shots = [0, 0];
for (let seed = 1; seed <= n; seed++) {
  O.meet = O.flow.newMeet({ mode: 'single', events: ['hockey'], players: [], seed: seed * 31 });
  const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); ctx.teams[0].skill = sa; ctx.teams[1].skill = sb;
  O.sandbox = true; def.start(ctx); for (let i = 0; i < 60 * 1200 && !def.done(ctx); i++) { for (const a of ath) O.pilot(ctx, a, 1 / 60); def.step(ctx, 1 / 60); } O.sandbox = false;
  const s = ctx.s; goals[0] += s.score[0]; goals[1] += s.score[1]; shots[0] += s.shotsOn[0]; shots[1] += s.shotsOn[1]; if (s.score[0] > s.score[1] || (s.score[0] === s.score[1] && s.shoot && s.shoot.goals[0] > s.shoot.goals[1])) wins++;
  if (seed <= 3) console.log('seed', seed, 'score', s.score.join('-'), 'shots', s.shotsOn.join('/'), s.ot ? 'OT' : '', s.shoot ? 'SO ' + s.shoot.goals.join('-') : '', 'phase', s.phase);
}
console.log('A wins', wins, '/', n, 'goals', goals.join('-'), 'shots', shots.join('/'), h.errors().slice(0, 2));
