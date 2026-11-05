// plays N AI-vs-AI games (no humans) and prints goals, shots, saves, hits, fights, kabooms
import { load } from './lib.mjs';
const N = +process.argv[2] || 3, len = +process.argv[3] || 120;
const { game, G } = load();
game.advance(.5);
const tot = { goals: 0, shots: 0, saves: 0, sa: 0, hits: 0, big: 0, fights: 0, kab: 0, passes: 0, posts: 0, glass: 0, errors: 0 };
for (let i = 0; i < N; i++) {
  const ev = {}; G.Bus.sim('*', e => { ev[e.type] = (ev[e.type] || 0) + 1; });
  const cfg = { mode: 'exhibition', home: G.TEAMS ? ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders'][i % 5] : 'muskrats', away: ['drillers', 'lumberjacks', 'bruisers', 'marauders', 'muskrats'][i % 5], arena: 'icebox', humans: [], intros: false, flood: 'never', periodLen: len, seed: 100 + i, replays: 'off' };
  game.go('match', { cfg }, { fade: 0 }); game.advance(.1);
  let t = 0; while (G.Match.m.phase !== 'final' && t < len * 3 + 400) { game.advance(1); t++; if (G.Match.m.phase === 'intermission_wait') {} }
  const m = G.Match.m;
  const g = m.goalies.reduce((a, q) => [a[0] + q.stats.saves, a[1] + q.stats.sa], [0, 0]);
  console.log('game', i, m.teams[0].def.abbr, m.teams[0].score, '-', m.teams[1].score, m.teams[1].def.abbr, 'shots', m.teams[0].shots, m.teams[1].shots, 'saves', g[0] + '/' + g[1], 'hits', ev.hit || 0, 'big', m.skaters.reduce((a, s) => a + s.stats.bigHits, 0), 'fights', ev.fight_start || 0, 'kab', ev.kaboom_start || 0, 'passes', ev.pass || 0, 'compl', ev.pass_complete || 0, 'posts', ev.post || 0, 'glass', ev.glass || 0, 'phase', m.phase, 't', t);
  tot.goals += m.teams[0].score + m.teams[1].score; tot.saves += g[0]; tot.sa += g[1]; tot.fights += ev.fight_start || 0; tot.kab += ev.kaboom_start || 0;
}
console.log('AVG goals', (tot.goals / N).toFixed(1), 'save%', (tot.saves / Math.max(1, tot.sa)).toFixed(3), 'fights/game', (tot.fights / N).toFixed(2), 'kab/game', (tot.kab / N).toFixed(2), 'errors', game.errors.length, game.errors.slice(0, 3).map(e => e.message + ' ' + (e.stack || '').split('\n')[1]));
