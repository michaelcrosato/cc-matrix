// Loads the engine and src/ (in manifest order) into a Node vm context: the headless game. Returns { ctx, E, SN, game }.
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url);
export const manifest = () => JSON.parse(readFileSync(new URL('src/manifest.json', ROOT), 'utf8'));
export function load(o = {}) {
  const store = new Map();
  const ctx = {
    console: o.quiet ? { log() {}, warn() {}, error: (...a) => (o.errors || []).push(a.join(' ')), info() {} } : console,
    location: { search: o.search || '', hash: '', pathname: '/snipeout' }, navigator: { maxTouchPoints: o.touch ? 5 : 0, getGamepads: () => o.pads || [] },
    matchMedia: q => ({ matches: o.touch ? /coarse/.test(q) : /fine/.test(q), addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout, setInterval, clearInterval, performance, structuredClone,
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    TextEncoder, TextDecoder, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), URLSearchParams
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  if (o.before) o.before(ctx);
  vm.createContext(ctx);
  const run = f => vm.runInContext(readFileSync(new URL(f, ROOT), 'utf8'), ctx, { filename: f });
  run('engine/my-3d2dge.js');
  const files = o.files || manifest();
  for (const f of files) run('src/' + f);
  return { ctx, E: ctx.My3D2dge, SN: ctx.SN, game: ctx.My3D2dge.current };
}
