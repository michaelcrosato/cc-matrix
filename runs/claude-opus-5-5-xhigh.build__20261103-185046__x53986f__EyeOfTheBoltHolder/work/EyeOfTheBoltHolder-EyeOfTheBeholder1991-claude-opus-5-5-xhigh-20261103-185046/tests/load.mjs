// Loads the engine and the game's sources into a Node vm context (the same text the bundle runs), with browser stand-ins.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url);
export const SRC = () => readdirSync(new URL('src/', ROOT)).filter(f => f.endsWith('.js')).sort();
export function gameSource() { return '(() => {\n' + SRC().map(f => '/* ==== ' + f + ' ==== */\n' + readFileSync(new URL('src/' + f, ROOT), 'utf8')).join('\n') + '\n})();\n'; }
export function load(o = {}) {
  const store = new Map();
  const ctx = { console: o.quiet ? { log() {}, warn() {}, error: console.error, info() {} } : console, performance, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone, URL, TextEncoder, TextDecoder };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.location = { hash: o.hash || '', search: o.search || '', href: 'file:///game.html', pathname: '/game.html' };
  ctx.matchMedia = q => ({ matches: !!(o.coarse && /coarse/.test(q)) || (o.coarse ? false : /hover: hover/.test(q) ? true : false), addEventListener() {}, removeEventListener() {} });
  ctx.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size; } };
  ctx.navigator = { getGamepads: () => [], userAgent: 'node', maxTouchPoints: o.coarse ? 5 : 0 };
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', ROOT), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  if (o.before) o.before(ctx);
  // o.expose: names private to the bundle's closure handed to tests as B.__test (only in this loader, never in the page)
  const src = o.expose ? gameSource().replace(/\n\}\)\(\);\n$/, '\nB.__test = { ' + o.expose.join(', ') + ' };\n})();\n') : gameSource();
  vm.runInContext(src, ctx, { filename: 'game.js' });
  return { ctx, B: ctx.BOLT, E: ctx.My3D2dge, store };
}
