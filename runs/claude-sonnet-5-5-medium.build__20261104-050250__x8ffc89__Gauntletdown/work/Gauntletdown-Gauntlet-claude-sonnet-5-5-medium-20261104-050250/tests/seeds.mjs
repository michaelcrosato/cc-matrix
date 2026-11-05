import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('game/game.js', 'utf8'), ctx);
const D = ctx.My3D2dge.current.debug, A = D.api; let stalls = 0, n = 0;
for (const step of [1, 2, 4, 5, 6, 8, 9]) for (let seed = 1; seed <= 12; seed++) {
  D.RUN.seed = seed * 31337; D.RUN.mode = 'solo'; const w = A.buildWorld(step, { players: 4 }); w.heroes = [0, 1, 2, 3].map(i => A.makeHero(i, i, null)); D.RUN.heroes = w.heroes; A.placeHeroes(w.heroes, w.starts); w.heroes.forEach(h => h.bot = A.makeBot(true)); w.allyStun = step >= 6;
  let ok = false; for (let t = 0; t < 420 * 120; t++) { A.simStep(1 / 120); if (w.descend) { ok = true; break; } } n++; if (!ok) { stalls++; console.log('STALL step', step, 'seed', seed); }
}
console.log(stalls + ' stalls in ' + n + ' floors (bots, 420 s each, ally stun on from floor 6)');
