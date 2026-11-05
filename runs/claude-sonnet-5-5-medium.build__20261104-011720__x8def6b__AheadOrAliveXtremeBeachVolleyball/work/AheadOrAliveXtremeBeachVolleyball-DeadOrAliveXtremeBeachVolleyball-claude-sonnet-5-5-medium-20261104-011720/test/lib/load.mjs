// Loads the engine and the built game into a vm context, headless. No browser needed.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function load(opts = {}) {
  const ctx = { console, setTimeout, clearTimeout, Promise };
  ctx.window = ctx; ctx.__AOA_NOBOOT = true; if (opts.hub) ctx.AIHub = opts.hub;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(DEV + '/engine/my-3d2dge.js', 'utf8'), ctx, { filename: 'engine.js' });
  vm.runInContext(readFileSync(DEV + '/build/game.js', 'utf8'), ctx, { filename: 'game.js' });
  const G = ctx.AOA; const game = G.startGame();
  return { ctx, G, game, E: ctx.My3D2dge, I: game.input };
}
export function makeCheck() {
  let n = 0, fails = [];
  const check = (name, ok, detail = '') => { n++; if (!ok) fails.push(name + (detail ? ': ' + detail : '')); };
  return { check, done() { for (const f of fails) console.log('FAIL ' + f); console.log(fails.length ? `${fails.length} of ${n} checks failed` : `all ${n} checks passed`); return fails.length; } };
}
