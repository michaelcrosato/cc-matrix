import fs from 'node:fs'; import { loadB } from './lint.mjs';
const files = fs.readdirSync('src').filter(f => /^(0|1|2)\d-/.test(f) || f === '72-bot.js').sort();
export function run(opts = {}) {
  const B = loadB(files); B.startGame(opts.seed || 7, null, opts.diff || 'normal'); const S = B.S; const out = { floors: {}, log: [], over: false };
  const dt = 0.01; let t = 0, lastFloor = S.floor; B.Bot.start({ cheats: !!opts.cheats });
  const max = (opts.maxSeconds || 1500);
  while (t < max && !S.ended && !S.over) {
    B.Bot.step(dt); B.update(dt); t += dt; S.events.length = 0;
    if (S.floor !== lastFloor) { out.floors[lastFloor] = +t.toFixed(0); lastFloor = S.floor; out.log.push(`${t.toFixed(0)}s -> ${S.floor} levels ${S.party.members.map(m => m.lvl).join('')} hp ${S.party.members.map(m => m.hp).join('/')}`); if (opts.stopAt === S.floor) break; }
    if (!B.Bot.active && !S.ended) { out.log.push(`bot idle on ${S.floor} at ${t.toFixed(0)}s cell ${S.party.cx},${S.party.cy} goal ${B.Bot.gi}`); break; }
  }
  out.t = t; out.over = S.over; out.ended = S.ended; out.floor = S.floor; out.cell = [S.party.cx, S.party.cy]; out.gi = B.Bot.gi; out.party = S.party.members.map(m => m.name + ':' + m.state + ':' + m.hp + '/' + m.max + ' L' + m.lvl); out.kills = S.stats.kills; out.flags = S.special; out.B = B; return out;
}
if (process.argv[1].endsWith('bot.test.mjs')) { const o = run({ cheats: process.argv.includes('--cheats'), maxSeconds: 900, stopAt: process.argv.find(a => a.startsWith('--stop='))?.slice(7) }); delete o.B; console.log(JSON.stringify(o, null, 1)); }
