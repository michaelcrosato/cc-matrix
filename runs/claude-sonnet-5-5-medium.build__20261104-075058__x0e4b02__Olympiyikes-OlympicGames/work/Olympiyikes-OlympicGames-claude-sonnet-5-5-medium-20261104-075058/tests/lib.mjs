// shared headless loader: the same files, same order as index.html, in a vm context (no DOM)
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function load() {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => !f.startsWith('vendor/'));
  const ctx = { console, setTimeout, clearTimeout };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
export { root };
