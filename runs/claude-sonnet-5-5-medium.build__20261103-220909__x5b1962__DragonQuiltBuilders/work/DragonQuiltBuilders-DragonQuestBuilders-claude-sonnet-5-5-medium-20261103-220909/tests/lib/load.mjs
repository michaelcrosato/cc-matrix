// Headless loader: engine + every src module in one vm context (no DOM).
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function load(opts = {}) {
  const ctx = { console, setTimeout, clearTimeout, performance, AIHubStub: opts.hub };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(root, 'engine/my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  const files = readdirSync(path.join(root, 'src')).filter(f => /^\d.*\.js$/.test(f)).sort();
  for (const f of files) { if (opts.upTo && f > opts.upTo) break; vm.runInContext(readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f }); }
  return ctx;
}
export { root };
