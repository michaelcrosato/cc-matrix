import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const ctx = { console, addEventListener() {}, location: { hash: '' }, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(root + 'engine/my-3d2dge.js', 'utf8'), ctx);
vm.runInContext(readFileSync(root + 'build/game.js', 'utf8'), ctx);
const { game: G, M } = ctx.__game;
G.go('match', { cfg: { teams: [0, 1], arena: 0, humans: 0, seed: 5, mode: 'exhibition' } }, { fade: 0 });
G.advance(1 / 120);
let first = -1, tot = 0;
for (let i = 0; i < 120 * 400; i++) { G.advance(1 / 120); const a = M().tries || [0, 0]; const t = a[0] + a[1]; if (t && first < 0) first = i / 120; tot = t; }
console.log('first attempt at', first.toFixed(1), 's; attempts by 400s', tot);
