// A headless context: the engine and every src module in a vm, as the built page runs them. Returns { E, DQ, ctx }.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const engineSrc = readFileSync(path.join(root, 'engine/my-3d2dge.js'), 'utf8');
const files = readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort();
const srcs = files.map(f => [f, readFileSync(path.join(root, 'src', f), 'utf8')]);
let engineScript = null;
export function load(o = {}) {
  const store = new Map();
  const ctx = { console: o.quiet ? { log() {}, warn() {}, error: console.error, info() {} } : console, setTimeout, clearTimeout, setInterval, clearInterval, performance, URLSearchParams,
    location: { hash: o.hash || '', search: o.search || '', pathname: '/dqb.html', href: 'file:///dqb.html' },
    matchMedia: o.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size; } },
    addEventListener() {}, removeEventListener() {}, navigator: { userAgent: 'node', getGamepads: () => [] }, DQ_TEST: o.test !== false, AIHub: o.AIHub };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  if (!engineScript) engineScript = new vm.Script(engineSrc, { filename: 'my-3d2dge.js' });
  engineScript.runInContext(ctx);
  ctx.DQ = { ABOUT: o.about || null };
  for (const [f, s] of srcs) vm.runInContext(s, ctx, { filename: 'src/' + f });
  return { E: ctx.My3D2dge, DQ: ctx.DQ, ctx, store };
}
