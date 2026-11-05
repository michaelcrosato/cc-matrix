import { load } from './lib/load.mjs';
const { game } = load({ quiet: true });
const D = game.debug;
const n = +(process.argv[2] || 4), inn = +(process.argv[3] || 9), diff = process.argv[4] || 'pro';
let tot = { runs: 0, k: 0, hr: 0, h: 0, ab: 0, err: 0, bb: 0, games: 0, maxT: 0, stuck: 0, pitches: 0 };
const ev = {}, all = []; D.BZ.bus.on('*', (d, e) => { ev[e] = (ev[e] || 0) + 1; if (e === 'hit' || e === 'contact') all.push([e, d]); });
for (let g = 0; g < n; g++) {
  const M = D.match({ away: 'COM', home: ['HCK', 'MCE', 'MBM', 'HMH', 'MMX'][g % 5], innings: inn, seed: 100 + g, fast: true, difficulty: diff, mercy: false });
  let steps = 0; const t0 = Date.now();
  while (M.phase !== 'final' && steps < 120 * 60 * 60) { D.step(1 / 120); steps++; }
  if (M.phase !== 'final') tot.stuck++;
  tot.runs += M.teams[0].runs + M.teams[1].runs; tot.games++; tot.err += M.teams[0].errors + M.teams[1].errors; tot.maxT = Math.max(tot.maxT, steps / 120); tot.pitches += M.pitchCount;
  for (const id in M.stats) { const s = M.stats[id]; tot.k += s.k; tot.hr += s.hr; tot.h += s.h; tot.ab += s.ab; tot.bb += s.bb; }
  console.log(`game ${g}: ${M.teams[0].runs}-${M.teams[1].runs} inn ${M.inning} game-time ${(steps / 120).toFixed(0)}s ${Date.now() - t0}ms ${M.phase}`);
}
const pa = tot.ab + tot.bb;
console.log(`runs/team/game ${(tot.runs / tot.games / 2).toFixed(2)}  K% ${(tot.k / pa * 100).toFixed(1)}  HR/PA ${(tot.hr / pa * 100).toFixed(1)}%  AVG ${(tot.h / tot.ab).toFixed(3)}  BB% ${(tot.bb / pa * 100).toFixed(1)} err/g ${(tot.err / tot.games).toFixed(2)} pitches/g ${(tot.pitches / tot.games).toFixed(0)} stuck ${tot.stuck}`);
console.log(Object.entries(ev).filter(([k]) => ['contact','catch','fielded','forceOut','tagOut','hit','homer','miss','foulTip','error','groundRuleDouble','fenceHit','walk','strikeout','swing','throw','received','doublePlay','dive','climb'].includes(k)).map(([k,v])=>k+':'+v).join(' '));
const hits = all.filter(e => e[0] === 'hit').map(e => e[1].bases); console.log('hit types', [1,2,3,4].map(b => hits.filter(h => h === b).length));
const ct = all.filter(e => e[0] === 'contact').map(e => e[1]); console.log('avg Q', (ct.reduce((a, e) => a + e.Q, 0) / ct.length).toFixed(2), 'avg EV', (ct.reduce((a, e) => a + e.EV, 0) / ct.length).toFixed(0), 'launch', (ct.reduce((a, e) => a + e.launch*57.3, 0) / ct.length).toFixed(0));
const cats = { gb: 0, ld: 0, fb: 0, pu: 0 }; for (const c of ct) { const l = c.launch * 57.3; if (l < 10) cats.gb++; else if (l < 25) cats.ld++; else if (l < 50) cats.fb++; else cats.pu++; } console.log(cats);
if (game.errors.length) console.log('errors', game.errors.map(e => e.where + ': ' + e.message));
