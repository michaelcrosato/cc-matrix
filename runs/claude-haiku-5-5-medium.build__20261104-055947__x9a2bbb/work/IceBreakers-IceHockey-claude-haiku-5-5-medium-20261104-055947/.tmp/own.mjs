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
const own = [0, 0, 0], phases = {};
let deep = 0; const zone = [0, 0];
for (let i = 0; i < 120 * 300; i++) {
  G.advance(1 / 120); const m = M();
  phases[m.phase] = (phases[m.phase] || 0) + 1;
  const o = m.puck.owner; if (o) own[o.t]++; else own[2]++;
  if (o && o.t === 0 && m.puck.x > 800) zone[0]++;
  if (o && o.t === 1 && m.puck.x < 320) zone[1]++;
}
console.log('owner frames home/away/loose', own, 'deep-zone carries', zone, 'phases', JSON.stringify(phases));
