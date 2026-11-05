import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
let taken = 0, held = 0, reasons = {}, ratios = [];
for (let seed = 1; seed <= 3; seed++) {
  const sim = G.CampaignSim.create({ seed, humans: [], difficulty: 'normal' });
  for (let t = 0; t < 16 && !sim.s.result; t++) {
    sim.beginSeason(); while (sim.s.phase === 'muster') sim.apply({ t: 'endMuster', realm: sim.currentHuman() }); while (sim.s.phase === 'march') sim.apply({ t: 'endMarch', realm: sim.currentHuman() });
    let p; while ((p = sim.nextBattle())) { if (p.kind === 'open') { sim.takeOpen(); continue; } const r = G.sum(p.march.knights, k => sim.troopPower(k)) / Math.max(1, G.CampaignAI.defense(sim, p.castle || 'meridian')); const b = G.BattleSim.create(sim.battleSpec(p)); G.BattleAI.resolve(b); const res = b.result(); reasons[res.reason] = (reasons[res.reason] || 0) + 1; ratios.push(r.toFixed(2) + (res.winner === 0 ? 'W' : 'L')); res.winner === 0 ? taken++ : held++; sim.applyBattle(res); }
    sim.endSeason();
  }
}
console.log('attacker won', taken, 'held', held, JSON.stringify(reasons)); console.log(ratios.join(' '));
