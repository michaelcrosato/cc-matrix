// Loads the engine and the game's source in a vm context, the way the build bundles them, for headless tests.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

export function loadGame() {
  const engine = readFileSync(join(root, 'engine', 'my-3d2dge.js'), 'utf8');
  const files = readdirSync(join(root, 'src')).filter(f => f.endsWith('.js')).sort();
  const body = files.map(f => `/* ==== ${f} ==== */\n` + readFileSync(join(root, 'src', f), 'utf8')).join('\n');
  const ctx = { console, Math, Date, performance: { now: () => 0 }, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.location = { hash: '', search: '' }; ctx.matchMedia = () => ({ matches: false, addEventListener() {} });
  ctx.navigator = { getGamepads: () => [] };
  // the engine's saves go to localStorage: an in-memory stand-in, as a browser gives
  const mem = new Map();
  ctx.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  vm.createContext(ctx);
  vm.runInContext(engine, ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(`(() => { const E = My3D2dge; ${body}\n globalThis.SM = SM; })();`, ctx, { filename: 'smashby.js' });
  return { ctx, E: ctx.My3D2dge, SM: ctx.SM };
}
