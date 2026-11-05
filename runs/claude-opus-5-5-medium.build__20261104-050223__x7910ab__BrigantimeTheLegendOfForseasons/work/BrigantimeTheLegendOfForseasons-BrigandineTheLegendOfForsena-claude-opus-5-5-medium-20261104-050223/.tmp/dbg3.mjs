import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; const hum = process.argv[2] ? [process.argv[2]] : []; G.tune.aiPlayerBoost = +(process.argv[3] || 0);
const s = G.CampaignSim.create({ humans: hum, seed: +(process.argv[4] || 11) }); let n = 0;
while (!s.state.over && n++ < 40) { const lab = s.label(); const log = s.autoSeason(); const own = {}; for (const c in s.state.castles) own[s.state.castles[c].owner] = (own[s.state.castles[c].owner] || 0) + 1;
  console.log(lab, JSON.stringify(own), log.filter(l => l.kind === 'battle' || l.kind === 'open').map(l => l.kind === 'open' ? 'OPEN ' + l.realm + '>' + l.castle : l.out.attacker + '>' + l.out.castle + (l.out.won ? ' W' : ' L')).join(', ')); }
console.log(JSON.stringify(s.state.over));
