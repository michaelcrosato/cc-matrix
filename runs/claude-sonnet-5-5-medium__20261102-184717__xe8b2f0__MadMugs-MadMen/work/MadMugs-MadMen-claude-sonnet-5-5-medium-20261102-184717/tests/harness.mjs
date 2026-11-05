// Shared test harness: loads the engine and the bundled game.js into a vm with no DOM (headless), like game/test.mjs.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export function load(extra = {}) {
  const ctx = Object.assign({ console }, extra);
  vm.createContext(ctx);
  for (const f of ['../vendor/my-3d2dge.js', '../game.js']) vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, D: game.debug, snap: () => game.debug.snapshot() };
}
let failed = 0, total = 0;
export const check = (what, ok, detail = '') => { total++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (!ok) failed++; };
export const done = () => { console.log(failed ? `${failed} of ${total} check(s) failed` : `all ${total} checks passed`); process.exit(failed ? 1 : 0); };
