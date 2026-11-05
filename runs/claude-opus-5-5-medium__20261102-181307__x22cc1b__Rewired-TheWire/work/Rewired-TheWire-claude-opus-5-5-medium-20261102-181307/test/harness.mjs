// Loads the engine and the built game in a Node VM, headless (no DOM): the engine's fixed-step clock drives it.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
export function load() {
  const ctx = { console, setTimeout, clearTimeout };
  vm.createContext(ctx);
  for (const f of ['../vendor/my-3d2dge.js', '../build/game.js']) vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { E, game, I: game.input, D: game.debug, snap: () => game.debug.snapshot() };
}
export function checker() {
  let failed = 0, passed = 0;
  const check = (what, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (!ok) failed++; else passed++; };
  return { check, done: () => { console.log(`${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); } };
}
