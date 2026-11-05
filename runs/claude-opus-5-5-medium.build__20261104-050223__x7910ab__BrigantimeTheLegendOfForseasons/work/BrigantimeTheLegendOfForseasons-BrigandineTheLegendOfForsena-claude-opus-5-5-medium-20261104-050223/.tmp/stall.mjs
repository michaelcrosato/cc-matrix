import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; G.tune.aiPlayerBoost = +(process.argv[3] || 0); const r = process.argv[2] || 'verdance';
const s = G.CampaignSim.create({ humans: [r], seed: +(process.argv[4] || 2), difficulty: 'easy' }); let n = 0;
while (!s.state.over && n++ < 40) { const lab = s.label(); const log = s.autoSeason(); const mine = log.filter(l => l.kind === 'battle' && (l.out.attacker === r || l.out.defender === r)).map(l => (l.out.attacker === r ? 'ATT ' : 'DEF ') + l.out.castle + (l.out.won === (l.out.attacker === r) ? ' W' : ' L')); const ks = s.knightsOf(r); console.log(lab, 'castles', s.castlesOf(r).length, 'avgLv', (ks.reduce((a, k) => a + k.lvl, 0) / ks.length).toFixed(1), 'knights', ks.length, 'mana', s.state.realms[r].mana, mine.join(', ')); }
console.log(JSON.stringify(s.state.over));
