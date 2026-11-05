// The AI: the Play Lab's bands (nothing stuck, plays end, no unstoppable play, no unbeatable defense) and the coach's calls.
import { simCtx, match } from '../lib/sim.mjs';
import { load } from '../lib/context.mjs';
export default async ok => {
  const { FF } = load(); FF.fast = true;
  const offs = FF.data.offPlays.map(p => p.id), defs = FF.data.defPlays.map(p => p.id);
  const avg = {}, defMax = {}; let stuck = 0, maxT = 0, passComp = [], n = 4;
  for (const o of offs) { let y = 0; for (const d of defs) { const r = FF.dev.playLab(o, d, n, { seed: 3, home: 'dynasty', away: 'owls' }); y += r.avgYards; stuck += r.stuck; maxT = Math.max(maxT, r.maxTime); defMax[d] = Math.max(defMax[d] || -99, r.avgYards); if (r.completion !== null) passComp.push(r.completion); } avg[o] = y / defs.length; }
  ok('no play is stuck', stuck === 0, stuck);
  ok('every play ends within 25 s', maxT <= 25, maxT);
  const hot = Object.entries(avg).filter(([, v]) => v > 25); ok('no play averages over 25 yards against every defense', !hot.length, JSON.stringify(hot));
  const wall = Object.entries(defMax).filter(([, v]) => v < 1); ok('no defense holds every play under a yard', !wall.length, JSON.stringify(wall));
  const comp = passComp.reduce((a, b) => a + b, 0) / passComp.length; ok('pass completion is between 35% and 90% overall', comp > .35 && comp < .9, comp);
  // the coach
  const { FF: F2 } = simCtx();
  const coach = (st, side = 0) => { const m = match(F2, { start: st, seed: 9 }); m.toPlaycall(); return F2.coach.call(m, side).play; };
  ok('4th & 15 at your 30: punt', coach({ possession: 0, los: 30, down: 4, toGo: 15 }) === 'punt', coach({ possession: 0, los: 30, down: 4, toGo: 15 }));
  ok('4th & 3 at their 25: a field goal', coach({ possession: 0, los: 75, down: 4, toGo: 3 }) === 'field_goal', coach({ possession: 0, los: 75, down: 4, toGo: 3 }));
  const late = match(F2, { start: { possession: 0, los: 60, down: 4, toGo: 1 }, quarter: 4, clock: 50, score: [10, 21] }); late.toPlaycall(); const lp = F2.coach.call(late, 0).play;
  ok('4th & 1 at their 40, late and trailing: go for it', !['punt', 'field_goal'].includes(lp), lp);
  const pat = match(F2, { start: { possession: 0, los: 85 }, quarter: 4, score: [12, 14] }); pat.callKind = 'pat'; ok('down 2 after a late TD: go for 2', F2.coach.call(pat, 0).play === 'pat_two');
  const ko = match(F2, { start: { possession: 0, los: 30, kickoff: true }, quarter: 4, clock: 60, score: [17, 21] }); ok('trailing by 4 late: an onside kick', F2.coach.call(ko, 0).play === 'ko_onside');
  const sug = match(F2, { start: { possession: 0, los: 50 } }); sug.toPlaycall(); ok('COACH SAYS suggests a real play', !!F2.data.plays[F2.coach.suggest(sug, 0)]);
};
