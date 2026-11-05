import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; G.tune.aiPlayerBoost = 1.5;
const s = G.CampaignSim.create({ humans: ['verdance'], seed: 21 }); const orig = s.applyBattle.bind(s);
s.applyBattle = (att, res) => { if (att.march.target === 'meridian') { console.log(s.label(), 'ATT', att.march.knights.map(k => k + ' L' + s.kn(k).lvl + ' hp' + s.kn(k).hp + ' p' + Math.round(s.troopPower(k)) + ' n' + s.kn(k).troop.length).join(', '), '| DEF', s.defenders('meridian').map(k => k + ' L' + s.kn(k).lvl + ' p' + Math.round(s.troopPower(k))).join(', '), '=>', res.winner, res.why, res.bell); } return orig(att, res); };
for (let i = 0; i < 10; i++) s.autoSeason();
