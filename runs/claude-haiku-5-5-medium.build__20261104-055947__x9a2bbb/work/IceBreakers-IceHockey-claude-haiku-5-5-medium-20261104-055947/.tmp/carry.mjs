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
let shown = 0;
for (let i = 0; i < 120 * 200 && shown < 12; i++) {
  G.advance(1 / 120); const m = M(); const o = m.puck.owner;
  if (o && o.t === 0 && m.puck.x > 800 && i % 90 === 0) { shown++; console.log('t', (i/120).toFixed(0), o.name, 'x', o.x.toFixed(0), 'y', o.y.toFixed(0), 'state', o.state, 'cool', o.cool.toFixed(2), 'charge', o.charge.toFixed(2), 'want', o.want.toFixed(2), 'dec', JSON.stringify({sh: o.dec && o.dec.shootHeld, su: o.dec && o.dec.shootUp, pass: o.dec && o.dec.pass, mx: o.dec && o.dec.mx && o.dec.mx.toFixed ? o.dec.mx.toFixed(2) : o.dec && o.dec.mx})); }
}
