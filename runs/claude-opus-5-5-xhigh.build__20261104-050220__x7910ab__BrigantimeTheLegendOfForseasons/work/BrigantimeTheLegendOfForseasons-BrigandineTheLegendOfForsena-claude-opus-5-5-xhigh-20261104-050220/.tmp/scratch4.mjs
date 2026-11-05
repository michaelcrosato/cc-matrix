import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
const sim = G.CampaignSim.create({ seed: 1, humans: ['verdance'], difficulty: 'normal' });
for (const c of Object.keys(sim.s.castles)) console.log(c.padEnd(12), sim.s.castles[c].owner.padEnd(9), 'def', Math.round(G.CampaignAI.defense(sim, c)), sim.s.castles[c].knights.map(k => k + ':' + sim.troopPower(k)).join(' '));
for (let t = 0; t < 12; t++) { G.CampaignAI.playSeason(sim); const d = sim.s.realms.dominion; console.log(sim.season, sim.year, 'dom mana', d.mana, 'inc', d.income, 'up', d.upkeep, 'mons', Object.values(sim.s.monsters).filter(m => m.realm === 'dominion').length, 'ver mana', sim.s.realms.verdance.mana, 'mons', Object.values(sim.s.monsters).filter(m => m.realm === 'verdance').length, 'avg lv', (sim.knightsOf('verdance').reduce((a,k)=>a+k.level,0)/sim.knightsOf('verdance').length).toFixed(1), 'merid def', Math.round(G.CampaignAI.defense(sim,'meridian'))); }
