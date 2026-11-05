import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; G.tune.aiPlayerBoost = 0;
for (const diff of ['easy', 'normal']) { const res = {}; for (const r of G.PLAYABLE) { let w = 0; for (let seed = 1; seed <= 15; seed++) { const s = G.CampaignSim.create({ humans: [r], seed, difficulty: diff }); let n = 0; while (!s.state.over && n++ < 40) s.autoSeason(); if (s.state.over && s.state.over.kind === 'win') w++; } res[r] = w + '/15'; } console.log(diff, JSON.stringify(res)); }
