// Loads the engine and the game's src/ files into a Node vm context: the headless game (no screen, sound or DOM)
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export const manifest = () => JSON.parse(readFileSync(new URL('src/manifest.json', root), 'utf8'));
/** opts: { only: [files] (stop after these), touch: true (a touch-only device), hub: mock AIHub object, search } */
export function load(opts = {}) {
  const store = new Map();
  const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, URLSearchParams, performance, TextEncoder, TextDecoder, structuredClone, queueMicrotask, atob, btoa };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.location = { search: opts.search || '', hash: '', href: 'file:///test.html' };
  ctx.matchMedia = q => ({ matches: opts.touch ? /coarse|hover: none/.test(q) && !/fine/.test(q) : /fine|hover: hover/.test(q), addEventListener() {} });
  ctx.navigator = { maxTouchPoints: opts.touch ? 5 : 0, getGamepads: () => opts.pads ? opts.pads() : [], userAgent: 'node' };
  ctx.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  if (opts.hub) ctx.AIHub = opts.hub;
  vm.createContext(ctx);
  // a seeded Math.random in the context: every headless run is reproducible (the sim never uses it; seeds and cosmetics do)
  vm.runInContext('(() => { let a = ' + (opts.seed || 12345) + '; const M = Object.create(Math); M.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; globalThis.Math = M; })()', ctx);
  const files = ['engine/my-3d2dge.js', ...manifest().map(f => 'src/' + f)];
  for (const f of files) {
    if (opts.only && f.startsWith('src/') && !opts.only.includes(f.slice(4)) && !opts.all) continue;
    vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}
