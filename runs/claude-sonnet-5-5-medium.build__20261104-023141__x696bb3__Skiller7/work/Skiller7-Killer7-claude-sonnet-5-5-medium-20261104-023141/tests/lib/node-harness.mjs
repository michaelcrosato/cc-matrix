// Loads the engine and the built bundle in a vm with no screen: the sim runs headless.
import vm from 'node:vm'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function load() {
  const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'engine/my-3d2dge.js'), 'utf8'), ctx, { filename: 'engine' });
  vm.runInContext(fs.readFileSync(path.join(root, 'out/bundle.js'), 'utf8'), ctx, { filename: 'bundle' });
  const S7 = ctx.S7; return { S7, ctx };
}
export function makeChecker() {
  let n = 0, failed = 0; const fails = [];
  const check = (what, ok, detail = '') => { n++; if (!ok) { failed++; fails.push(what + (detail ? ': ' + detail : '')); } };
  return { check, report() { for (const f of fails) console.log('FAIL ' + f); console.log(failed ? `${failed} of ${n} checks failed` : `all ${n} checks passed`); return failed; } };
}
