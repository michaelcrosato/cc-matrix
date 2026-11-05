import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; const s = G.CampaignSim.create({ humans: [process.argv[2] || 'solmark'], seed: +(process.argv[3] || 2), difficulty: 'easy' }); const o = s.applyBattle.bind(s);
s.applyBattle = (a, res) => { if (a.march.target === 'meridian' || a.kind === 'sanctum') console.log(s.label(), a.kind, 'ATT', a.march.knights.map(k => k + ' L' + s.kn(k).lvl + ' p' + Math.round(s.troopPower(k))).join(', '), '| DEF', a.kind === 'sanctum' ? 'GK' : s.defenders('meridian').map(k => k + ' L' + s.kn(k).lvl + ' p' + Math.round(s.troopPower(k))).join(', '), '=>', res.winner, res.why, res.bell); return o(a, res); };
let n = 0; while (!s.state.over && n++ < 40) s.autoSeason();
