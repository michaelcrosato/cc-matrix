import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const ctx = { console, addEventListener() {}, location: { hash: '' }, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(root + 'engine/my-3d2dge.js', 'utf8'), ctx);
vm.runInContext(readFileSync(root + 'build/game.js', 'utf8'), ctx);
const { game: G, M } = ctx.__game;
for (const seed of [5, 6, 8]) {
  G.go('match', { cfg: { teams: [0, 1], arena: seed % 5, humans: 0, seed, mode: 'exhibition' } }, { fade: 0 });
  G.advance(1 / 120);
  let n = 0; while (M().phase !== 'over' && n < 120 * 900) { G.advance(1 / 120); n++; }
  const m = M();
  console.log('seed', seed, 'secs', (n / 120).toFixed(0), 'score', m.score, 'shots', m.shots, 'tries', m.tries, 'saves', m.saves, 'errors', G.errors.length);
}
