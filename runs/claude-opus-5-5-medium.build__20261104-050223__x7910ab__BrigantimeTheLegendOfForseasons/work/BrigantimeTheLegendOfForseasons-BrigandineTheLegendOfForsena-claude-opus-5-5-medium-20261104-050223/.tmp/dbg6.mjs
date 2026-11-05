import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G; G.tune.aiPlayerBoost = +(process.argv[2] || 0); const lv = +(process.argv[3] || 10);
const s = G.CampaignSim.create({ humans: ['verdance'], seed: 21 });
const ks = ['gareth', 'lynette', 'wren']; for (const k of ks) { const r = s.kn(k); while (r.lvl < lv) G.levelUpKnight(r, s.state.rng); for (const u of r.troop) { const m = s.mon(u); m.lvl = lv; } }
for (const seed of [1, 2, 3, 4, 5]) { const att = { march: { realm: 'verdance', target: process.argv[4] || 'meridian', knights: ks, from: {} }, kind: 'battle' };
const b = G.BattleSim.create(s.battleSpec(att, seed)); G.BattleAI.resolve(b); const S = b.state; console.log(JSON.stringify(S.over), 'att alive', b.live(0).length, 'def alive', b.live(1).length); }
