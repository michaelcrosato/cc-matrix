// loads the engine and the game's src files, in manifest order, into a headless vm context
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
export function boot(extra = {}) {
  const store = {};
  const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, ...extra };
  ctx.window = ctx; vm.createContext(ctx);
  const run = (f) => vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  run('engine/my-3d2dge.js');
  const man = JSON.parse(readFileSync(new URL('src/manifest.json', root), 'utf8'));
  for (const f of man) run('src/' + f);
  return ctx;
}
