// Balance: AI-vs-AI games at Pro. Prints goals, shots, save %, fights and KABOOMs per game (alone: a table).
import { load } from './lib.mjs';
export function balance(n = 3, len = 120) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const { game, G, snap } = load('');
    game.advance(.1);
    game.go('match', { home: ['muskrats', 'lumberjacks', 'bruisers', 'marauders'][k % 4], away: ['drillers', 'bruisers', 'marauders', 'grizzlies'][k % 4], arena: 'icebox', periods: 3, len, ot: true, shootout: true, humans: [], intros: false, seed: 11 + k, replays: false, flood: false, noResults: true }, { fade: 0 });
    let i = 0; while (!G.M.finished && i++ < 4 * (len * 3 + 400)) game.advance(.25);
    const ev = G.M.events, M = G.M, cnt = t => ev.filter(e => e.type === t).length;
    const shots = M.shots[0] + M.shots[1], goals = M.goals.length, saves = M.stats.g0.saves + M.stats.g1.saves;
    out.push({ score: M.score.join('-'), goals, shotsOnGoal: shots, svpct: +(saves / Math.max(1, saves + goals)).toFixed(2), fights: M.fights, kabooms: M.kabooms[0] + M.kabooms[1], bigHits: M.events.length, phase: M.phase, errors: game.errors.map(e => e.message).slice(0, 2) });
  }
  return out;
}
if (process.argv[1].endsWith('balance.mjs')) for (const r of balance(+process.argv[2] || 3, +process.argv[3] || 120)) console.log(JSON.stringify(r));
