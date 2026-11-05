// Loads the game headless in Node (the engine runs with no DOM) and hands back its debug handle.
import vm from 'node:vm';
import { scripts } from '../build.mjs';
export function load(extra = {}, seed = +(process.env.SEED || 12345)) {
  const s = scripts(), ctx = Object.assign({ console }, extra);
  vm.createContext(ctx);
  vm.runInContext(`(() => { let s = ${seed} >>> 0; Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })()`, ctx);   // the same dice every run
  for (const k of ['engine', 'rules', 'world', 'audio', 'game']) vm.runInContext(s[k], ctx, { filename: k + '.js' });
  const WW = ctx.WW, E = ctx.My3D2dge, d = WW.debug;
  return { ctx, WW, E, d, game: d.game };
}
export function checker() {
  let failed = 0, n = 0;
  const check = (what, ok, detail = '') => { n++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (!ok) failed++; };
  const done = () => { console.log(failed ? `${failed} of ${n} check(s) failed` : `all ${n} checks passed`); process.exit(failed ? 1 : 0); };
  return { check, done, get failed() { return failed; } };
}
