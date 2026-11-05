// The headless loader: stand-ins on the global object, then the engine and the game's scripts in manifest order, run in
// this process's own context (a vm sandbox makes every global lookup slow). One load per process.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const manifest = () => JSON.parse(readFileSync(join(ROOT, 'build/manifest.json'), 'utf8'));
export function load(o = {}) {
  const store = new Map(), g = globalThis;
  Object.assign(g, {
    location: { hash: o.hash || '', search: o.search || '', href: 'file:///game.html' + (o.hash || '') },
    matchMedia: q => ({ matches: o.touchOnly ? /coarse/.test(q) && !/any-pointer: fine/.test(q) : /fine/.test(q), addEventListener() {} }),
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
  });
  if (o.hub) g.AIHub = o.hub;
  const m = manifest(), files = m.engine.concat(o.only || m.src);
  for (const f of files) vm.runInThisContext(readFileSync(join(ROOT, f), 'utf8'), { filename: f });
  const B = g.BB, E = g.My3D2dge;
  return { B, E, game: E.current, store };
}
