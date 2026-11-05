// loads the engine, rail.js and src/*.js (index.html's order) into a vm context with stand-ins for the page's globals;
// returns { E, DH, game, I, ctx }. opts: { hash, hub (a mock AIHub), touch, keep }
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url);
export function load(opts = {}) {
  const html = readFileSync(new URL('index.html', here), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('session.js'));
  const quiet = { log() {}, info() {}, warn() {}, error: (...a) => { if (opts.errors) opts.errors.push(a.join(' ')); else console.error(...a); }, debug() {} };
  const ctx = { console: opts.verbose ? console : quiet, addEventListener() {}, removeEventListener() {}, location: { hash: opts.hash || '', search: opts.search || '', pathname: '/densha' },
    navigator: { maxTouchPoints: opts.touch ? 5 : 0, getGamepads: () => [] }, setTimeout, clearTimeout, performance: { now: () => 0 },
    matchMedia: q => ({ matches: opts.touch ? /coarse/.test(q) && !/any-pointer: fine/.test(q) : /fine/.test(q) && !/coarse/.test(q), addEventListener() {} }) };
  ctx.window = ctx; ctx.globalThis = ctx;
  if (opts.hub) ctx.AIHub = opts.hub;
  vm.createContext(ctx);
  for (const f of scripts) vm.runInContext(readFileSync(new URL(f, here), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, DH = ctx.DH, game = DH.game;
  return { E, DH, game, I: game.input, ctx };
}
