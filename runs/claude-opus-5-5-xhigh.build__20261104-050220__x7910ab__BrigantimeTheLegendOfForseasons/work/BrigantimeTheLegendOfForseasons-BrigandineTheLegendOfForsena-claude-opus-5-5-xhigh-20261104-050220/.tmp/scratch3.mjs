import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
const N = +(process.argv[2] || 6), diff = process.argv[3] || 'normal', human = process.argv[4] || 'verdance';
const tally = {};
for (let seed = 1; seed <= N; seed++) {
  const t0 = Date.now(); const sim = G.CampaignSim.create({ seed, humans: [human], difficulty: diff });
  let seasons = 0, battles = 0, merFall = null;
  while (!sim.s.result && seasons < 24) { const ev = G.CampaignAI.playSeason(sim); battles += ev.filter(e => e.e === 'taken' || e.e === 'held').length; seasons++; if (merFall === null && sim.s.castles.meridian.owner !== 'dominion') merFall = seasons; }
  const r = sim.s.result, k = r ? r.kind + ':' + r.ending : 'none'; tally[k] = (tally[k] || 0) + 1;
  console.log('seed', seed, k, 'seasons', seasons, 'battles', battles, 'meridian', merFall, 'ms', Date.now() - t0, JSON.stringify(Object.fromEntries(G.REALMS.map(r => [r.slice(0,3), sim.castlesOf(r).length]))));
}
console.log(JSON.stringify(tally));
