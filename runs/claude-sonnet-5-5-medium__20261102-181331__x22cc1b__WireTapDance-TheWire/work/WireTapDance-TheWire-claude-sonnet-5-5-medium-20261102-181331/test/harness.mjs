// loads the engine and the game headless in a vm: no DOM, exact fixed steps
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
export function load(extra = {}) {
  const ctx = Object.assign({ console, performance, setTimeout, clearTimeout, Math, Date }, extra);
  vm.createContext(ctx);
  for (const f of ['engine.patched.js', 'game.bundle.js']) vm.runInContext(readFileSync(join(here, f), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, dbg: game.debug, snap: () => game.debug.snapshot() };
}
export function makeCheck() {
  let failed = 0, passed = 0;
  const check = (what, ok, detail = '') => { if (ok) passed++; else failed++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); };
  return { check, done() { console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); } };
}
