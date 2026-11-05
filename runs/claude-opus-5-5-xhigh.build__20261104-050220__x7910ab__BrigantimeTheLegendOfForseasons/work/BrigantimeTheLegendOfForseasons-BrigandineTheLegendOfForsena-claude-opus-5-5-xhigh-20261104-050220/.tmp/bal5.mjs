import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG, CA = G.CampaignAI, R = process.argv[2] || 'verdance';
const sim = G.CampaignSim.create({ seed: 2, humans: [], difficulty: 'normal' });
for (let t = 0; t < 10; t++) {
  sim.beginSeason();
  const ks = sim.knightsOf(R).map(k => k.id + '@' + (k.castle || 'quest') + (k.wounded ? 'W' : '') + ':' + sim.troopPower(k.id));
  console.log(sim.season, sim.year, 'mana', sim.s.realms[R].mana, 'knights', ks.join(' '));
  for (const tg of sim.marchTargets(R)) { const all = sim.marchers(R, tg); console.log('   ', tg, 'owner', sim.s.castles[tg].owner, 'marchers', all.join(','), 'def', Math.round(CA.defense(sim, tg)), 'pw', Math.round(G.sum(all.slice(0, 3), k => sim.troopPower(k))), 'need', Object.fromEntries(sim.castlesOf(R).map(c => [c, Math.round(CA.need(sim, c, R))]))); }
  while (sim.s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() }); while (sim.s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() });
  console.log('   marches:', sim.s.queue.filter(m => m.realm === R).map(m => m.target + '(' + m.knights.join(',') + ')').join(' '));
  let p; while ((p = sim.nextBattle())) { if (p.kind === 'open') sim.takeOpen(); else { const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); sim.applyBattle(b.result()); } }
  sim.endSeason();
}
