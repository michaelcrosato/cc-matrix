import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
const seeds = process.argv[2] ? +process.argv[2] : 6;
const wins = {};
for (let seed = 1; seed <= seeds; seed++) for (const realm of ['verdance']) {
  const t0 = Date.now();
  const sim = G.CampaignSim.create({ seed, humans: [realm], difficulty: 'normal' });
  let seasons = 0, battles = 0;
  while (!sim.s.result && seasons < 24) { const ev = G.CampaignAI.playSeason(sim); battles += ev.filter(e => e.e === 'taken' || e.e === 'held').length; seasons++;
    if (seed === 1) console.log(' ', sim.season, sim.year, Object.fromEntries(G.REALMS.map(r => [r, sim.castlesOf(r).length])), 'candle', sim.s.candle, 'mana', sim.s.realms[realm].mana); }
  const r = sim.s.result;
  console.log('seed', seed, realm, r ? r.kind + ':' + r.ending + ' ' + (r.realm || '') : 'none', 'seasons', seasons, 'battles', battles, 'ms', Date.now() - t0, 'castles', Object.fromEntries(G.REALMS.map(r => [r, sim.castlesOf(r).length])));
}
