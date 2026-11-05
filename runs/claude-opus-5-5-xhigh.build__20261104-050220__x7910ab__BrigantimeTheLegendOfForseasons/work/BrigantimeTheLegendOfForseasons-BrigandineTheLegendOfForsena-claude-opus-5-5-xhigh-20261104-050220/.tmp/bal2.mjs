import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG, CA = G.CampaignAI;
const sim = G.CampaignSim.create({ seed: 1, humans: [], difficulty: 'normal' });
for (let t = 0; t < 8; t++) {
  const r = 'solmark';
  sim.beginSeason();
  const lines = [];
  for (const tg of sim.marchTargets(r)) { const ks = sim.marchers(r, tg); const def = CA.defense(sim, tg), pw = G.sum(ks.slice(0, 3), k => sim.troopPower(k)); lines.push(tg + ':' + ks.length + 'k ' + Math.round(pw) + '/' + Math.round(def)); }
  console.log(sim.season, sim.year, 'agg', CA.aggression(sim, r).toFixed(2), 'castles', sim.castlesOf(r).map(c => c + '(' + sim.s.castles[c].knights.length + (CA.border(sim, c, r) ? 'B' : '') + ')').join(' '), '|', lines.join(' ; '));
  while (sim.s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() });
  while (sim.s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() });
  console.log('   marches', sim.s.queue.map(m => m.realm.slice(0, 3) + '->' + m.target + '(' + m.knights.length + ')').join(' '));
  let p; while ((p = sim.nextBattle())) { if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } }
  sim.endSeason();
}
