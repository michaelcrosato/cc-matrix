// Balance: CPU vs CPU games headless at Pro, 2:00 quarters, printed against the targets. node test/balance.mjs [games]
import { load } from './lib/context.mjs';
const { FF } = load({ only: s => !/\/(5\d|70|80|90|37|38|39|40|41|14|15|17|2[013])-/.test(s) });
FF.fast = true;
const N = +(process.argv[2] || 10), teams = FF.data.playable, R = { pts: [], comp: 0, att: 0, carries: 0, rushYds: 0, sacks: 0, to: 0, fgA: 0, fgM: 0, plays: 0, live: 0, hot: 0, fills: 0, games: 0 };
const bus = FF.bus; let cur = null;
bus.on('fg', d => { if (d.m === cur && d.yards >= 40 && d.yards < 50) { R.fgA++; if (d.good) R.fgM++; } });
bus.on('hotOn', d => { if (d.m === cur) R.hot++; });
for (let g = 0; g < N; g++) {
  const home = teams[g % teams.length], away = teams[(g + 1 + Math.floor(g / teams.length)) % teams.length];
  const m = cur = new FF.Match({ home, away: away === home ? 'mudhogs' : away, seed: 100 + g, mode: 'lab', quarterLength: 120, difficulty: 'pro' }); m.fastCalls = true;
  let k = 0, live = 0, plays = 0, lastPlay = -1; while (!m.over && k < 120 * 60 * 30) { m.stepSim(1 / 120); k++; if (m.phase === 'LIVE') { live += 1 / 120; if (m.playNo !== lastPlay) { lastPlay = m.playNo; plays++; } } if (m.phase === 'PLAYCALL' || m.phase === 'PRESNAP') m.phaseT = Math.min(m.phaseT, 2); }
  for (const s of [0, 1]) { R.pts.push(m.score[s]); R.sacks += m.stats[s].sacks; R.to += m.stats[s].turnovers; }
  for (const a of m.all) { R.comp += a.stats.comp; R.att += a.stats.att; }
  R.plays += plays; R.live += live; R.fills += m.fiascoFills[0] + m.fiascoFills[1]; R.games++;
  m.ots.dispose();
  console.log(`game ${g + 1}: ${home} ${m.score[0]} - ${m.score[1]} ${m.teams[1].id}  (${plays} plays)`);
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log('points per team per game', avg(R.pts).toFixed(1), '(target 14-28)');
console.log('completion', (R.comp / Math.max(1, R.att) * 100).toFixed(0) + '%', '(55-70%)');
console.log('sacks per team per game', (R.sacks / R.games / 2).toFixed(1), '(1-3)');
console.log('turnovers per game', (R.to / R.games).toFixed(1), '(1-2.5)');
console.log('FG% 40-49', R.fgA ? (R.fgM / R.fgA * 100).toFixed(0) + '% of ' + R.fgA : 'none', '(60-75%)');
console.log('live seconds a play', (R.live / Math.max(1, R.plays)).toFixed(1), '(5-8)');
console.log('hot streaks per game', (R.hot / R.games).toFixed(1), '(about 1)');
console.log('fiasco meter fills per team per game', (R.fills / R.games / 2).toFixed(1), '(1-2)');
