import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
const N = +(process.argv[2] || 4), boost = +(process.argv[3] || 0), humans = process.argv[4] ? process.argv[4].split(',') : ['verdance'];
if (boost) G.setTune('aiPlayerBoost', boost);
const tally = {}; let merSum = 0, merN = 0;
for (let seed = 1; seed <= N; seed++) {
  const sim = G.CampaignSim.create({ seed, humans: humans[0] === 'none' ? [] : humans, difficulty: 'normal' });
  const bat = {}, lv = []; let merFall = null, seasons = 0;
  while (!sim.s.result && seasons < 24) {
    const ev = G.CampaignAI.playSeason(sim);
    for (const e of ev) if (e.e === 'taken' || e.e === 'held') { const a = e.e === 'taken' ? e.realm : e.by; bat[a] = (bat[a] || 0) + 1; }
    seasons++; if (merFall === null && sim.s.castles.meridian.owner !== 'dominion') merFall = seasons;
    if (seasons % 4 === 0) lv.push(G.PLAYABLE.map(r => { const ks = sim.knightsOf(r); return ks.length ? (ks.reduce((a, k) => a + k.level, 0) / ks.length).toFixed(1) : '-'; }).join('/'));
  }
  const r = sim.s.result, k = r ? r.kind + ':' + r.ending + (r.realm ? ':' + r.realm : '') : 'none'; tally[k] = (tally[k] || 0) + 1;
  if (merFall) { merSum += merFall; merN++; }
  console.log('seed', seed, k, 'seasons', seasons, 'meridianFell', merFall, 'attacks', JSON.stringify(bat), 'lv', lv.join(' | '), 'castles', JSON.stringify(Object.fromEntries(G.REALMS.map(r => [r.slice(0, 3), sim.castlesOf(r).length]))));
}
console.log(JSON.stringify(tally), 'meridian avg', merN ? (merSum / merN).toFixed(1) : '-', merN + '/' + N);
