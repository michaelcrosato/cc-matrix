import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; G.tune.aiPlayerBoost = +(process.argv[2] || 0);
const s = G.CampaignSim.create({ humans: ['verdance'], seed: 21 });
const ks = ['gareth', 'lynette', 'wren']; for (const k of ks) { const r = s.kn(k); while (r.lvl < +(process.argv[3] || 14)) G.levelUpKnight(r, s.state.rng); for (const u of r.troop) { const m = s.mon(u); m.lvl = +(process.argv[3] || 14); m.tier = +(process.argv[4] || 2); } }
const att = { march: { realm: 'verdance', target: 'sanctum', knights: ks, from: {} }, kind: 'sanctum' };
const b = G.BattleSim.create(s.battleSpec(att, 7)); const S = b.state; let lastBell = 0;
while (!S.over) { G.BattleAI.troop(b); if (S.bell !== lastBell) { lastBell = S.bell; const gk = S.units.find(u => u.ref === 'graynight'); console.log('bell', S.bell, 'gk', gk.hp, 'dials', Object.values(S.dials).filter(Boolean).length, 'wheel', S.wheelTurned, 'player alive', b.live(0).length, 'dom alive', b.live(1).length); } }
console.log(JSON.stringify(S.over));
