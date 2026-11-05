import { G } from './sim.mjs';
const c = {}; G.on('chaos', d => c[d.id] = (c[d.id] || 0) + 1); G.on('cowstop', () => c.cowstop = (c.cowstop || 0) + 1); G.on('target', d => c['target:' + d.t.id] = 1);
for (let s = 1; s <= 30; s++) { G.RNG.play = G.mkrng(s); const M = G.createMatch({ overs: 3, wickets: 3, diff: 1, chaos: 'all', cheat: true }); M.start(); let k = 0; while (!M.over && k++ < 120 * 900) M.step(1 / 120, {}); }
console.log(JSON.stringify(c));
