import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G;
for (const hum of [[], ['verdance']]) {
const s = G.CampaignSim.create({ humans: hum, seed: 11 }); let n = 0, battles = 0, opens = 0;
while (!s.state.over && n++ < 40) { const log = s.autoSeason(); for (const l of log) { if (l.kind === 'battle') battles++; if (l.kind === 'open') opens++; } }
const own = {}; for (const c in s.state.castles) own[s.state.castles[c].owner] = (own[s.state.castles[c].owner] || 0) + 1;
console.log(hum, 'seasons', n, 'over', JSON.stringify(s.state.over), 'battles', battles, 'open', opens, JSON.stringify(own), 'candle', s.state.candle, 'year', s.state.year);
}
