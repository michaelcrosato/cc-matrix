// The one test command: node tests/run.mjs [--fast]. Prints only failures, then a one-line count.
import vm from 'node:vm'; import { readFileSync, readdirSync } from 'node:fs'; import { fileURLToPath } from 'node:url'; import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, n = 0; const fail = [];
export const check = (what, ok, detail = '') => { n++; if (!ok) { fails++; fail.push('FAIL ' + what + (detail ? ': ' + String(detail).slice(0, 300) : '')); } };
export function load(opts = {}) {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, performance, setTimeout, clearTimeout, queueMicrotask, structuredClone, Math, JSON };
  ctx.window = ctx; vm.createContext(ctx);
  const man = JSON.parse(readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  for (const f of man.engine.concat(man.game)) { if (opts.skip && opts.skip.includes(f)) continue; try { vm.runInContext(readFileSync(path.join(root, 'src', f), 'utf8'), ctx, { filename: f }); } catch (e) { fail.push('LOAD ' + f + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')); fails++; n++; break; } }
  return ctx;
}
const suites = readdirSync(path.join(root, 'tests')).filter(f => /^t_.*\.mjs$/.test(f)).sort();
const fast = process.argv.includes('--fast');
for (const s of suites) { try { const m = await import('./' + s); await m.default({ check, load, root, fast }); } catch (e) { n++; fails++; fail.push('CRASH ' + s + ': ' + (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); } }
for (const f of fail) console.log(f);
console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
