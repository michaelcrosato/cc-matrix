// loads engine + selected game sources into a vm context, headless
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
export function load(files) {
  const ctx = { console, setTimeout, clearTimeout };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', import.meta.url), 'utf8'), ctx, { filename: 'engine' });
  const src = files.map(f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
  vm.runInContext('(() => { const game = new My3D2dge.Game({ headless: true, loop: false, res: "ps1" });\n' + src + '\n window.__game = game; })();', ctx, { filename: 'game' });
  return ctx;
}
