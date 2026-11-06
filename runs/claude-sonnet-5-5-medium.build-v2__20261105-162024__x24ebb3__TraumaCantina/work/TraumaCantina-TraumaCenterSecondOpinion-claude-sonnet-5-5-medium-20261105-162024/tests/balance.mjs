// node tests/balance.mjs [calibrate]: runs each op on the bot at skills 0.4, 0.7 and 1.0 and prints time used, final vitals, mistakes and rank.
import { runBot } from './harness.mjs';
import { OPS, BY_ID } from '../src/content/ops/index.js';
import { result } from '../src/sim/op.js';
const ids = [...OPS.map((o) => o.id), 'pileup'];
const out = [];
console.log('op        skill  result  used   vit  mist  rank  pct   clockLeft%');
for (const id of ids) {
  for (const sk of [0, 0.4, 0.7, 1]) {
    const r = runBot(id, { skill: sk, maxSec: 700 }), s = r.sim, def = BY_ID[id];
    const res = s.over === 'win' ? result(s) : null;
    console.log(id.padEnd(9), String(sk).padEnd(5), (s.over || '-').padEnd(6), `${s.t.toFixed(0)}s`.padEnd(6), String(Math.round(s.tables[0].vitals)).padEnd(4), String(s.score.mistakes).padEnd(4), (res?.rank || '-').padEnd(4), res ? res.pct.toFixed(2).padEnd(5) : '-    ', res ? Math.round((s.clock / s.clockMax) * 100) + '%' : '');
    if (sk === 1 && res) out.push([id, s.score.pts, s.tables.reduce((a, t) => a + t.vitals, 0) / s.tables.length, def.time]);
  }
}
if (process.argv[2] === 'calibrate') { for (const [id, pts, vit, time] of out) { const par = Math.round(((pts + 5 * 0.5 * time + 10 * vit) / 0.9) / 100) * 100; console.log(`${id}: par ${par}`); } }
