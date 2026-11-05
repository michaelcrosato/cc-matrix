// Loads the sim (the sim's src files, in order: 00, 10, 15, 20-29, 30) into a vm context and returns the B namespace.
// No DOM, no engine: the presenter, the screens and the scenes (40-44, 90) need the browser.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
export function loadSim() {
  const dir = new URL('../src/', import.meta.url);
  const code = readdirSync(dir).filter(f => /^(00|10|15|2\d|30)-.*\.js$/.test(f)).sort().map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n;\n');
  const ctx = { console, Math, JSON, Int32Array, Map, Set, Object, Array, Number, String, Error };
  vm.createContext(ctx);
  vm.runInContext(code + '\n;this.B = B;', ctx, { filename: 'sim.js' });
  return ctx.B;
}
