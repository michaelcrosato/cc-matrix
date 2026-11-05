// loads the engine + game sources headless into one vm context (draw is skipped without a screen)
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
export function load(files) {
  const root = new URL('../', import.meta.url);
  const ctx = { console, setTimeout, clearTimeout }; ctx.window = ctx; ctx.location = { hash: '' }; ctx.setInterval = setInterval; ctx.performance = performance;
  vm.createContext(ctx);
  const run = (f) => vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  run('engine/my-3d2dge.js');
  const src = readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).sort();
  for (const f of src) if (!files || files.includes(f)) run('src/' + f);
  return ctx;
}
