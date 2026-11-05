// Balance runs: node tools/simulate.mjs [games]. Plays battles with the planner on every map and season and prints who won,
// why, and how many bells they lasted. Use it after changing tunables or the data.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = dirname(dirname(fileURLToPath(import.meta.url)));
const ctx = { console };
vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'dist/game.js']) vm.runInContext(readFileSync(join(DEV, f), 'utf8'), ctx, { filename: f });
const G = ctx.My3D2dge.Brigantime;
const games = Number(process.argv[2] || 20);
for (const a of process.argv.slice(3)) { const [k, v] = a.split('='); G.tune[k] = Number(v); }
const troopsA = [{ kind: 'knight', ref: 'oren', leader: true }, { kind: 'monster', ref: 'gleam-slime', form: 0 }, { kind: 'monster', ref: 'thorn-hare', form: 0 }, { kind: 'knight', ref: 'dunstan' }];
const troopsB = [{ kind: 'knight', ref: 'shade', leader: true }, { kind: 'monster', ref: 'dusk-bat', form: 0 }, { kind: 'monster', ref: 'cinder-imp', form: 0 }, { kind: 'knight', ref: 'ashen' }];
const tally = {};
let bells = 0, n = 0;
for (const map of G.ids('map')) for (const season of G.SEASON_ORDER) for (let s = 0; s < games; s++) {
  const sim = G.BattleSim.create({ map, season, seed: 1000 + s, sides: [{ troops: troopsA }, { troops: troopsB }] });
  G.autoplayBattle(sim, 5000);
  const key = (sim.s.winner === 0 ? 'attacker' : 'defender') + ' by ' + sim.s.reason;
  tally[key] = (tally[key] || 0) + 1; bells += sim.s.bell; n++;
}
for (const [k, v] of Object.entries(tally).sort()) console.log(String(v).padStart(4), k, ((v / n) * 100).toFixed(0) + '%');
console.log('average bells', (bells / n).toFixed(1), 'over', n, 'battles');
