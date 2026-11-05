import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const D = process.cwd();
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(D + '/' + f, 'utf8'), ctx, { filename: f });
const G = ctx.BRIG;
const sim = G.CampaignSim.create({ seed: 1, humans: [], difficulty: 'normal' });
const show = () => { const c = sim.s.castles.beltane; console.log(sim.season, sim.year, c.knights.map(k => k + ':' + sim.knight(k).hp + '/' + sim.knight(k).stats.hp + ' troop ' + sim.knight(k).troop.map(u => sim.monster(u).sp + sim.monster(u).level).join(',')), 'reserve', c.reserve.length); };
show(); for (let i = 0; i < 5; i++) { G.CampaignAI.playSeason(sim); show(); }
