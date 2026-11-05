// THE test command: node tests/run.mjs [--only name,name]. Prints only failures and one summary line.
import { readdirSync } from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)); const t0 = Date.now();
const only = (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null);
const suites = []; for (const sub of ['unit', 'play', 'net']) { try { for (const f of readdirSync(path.join(dir, sub)).filter(f => f.endsWith('.test.mjs')).sort()) suites.push([sub + '/' + f.replace('.test.mjs', ''), path.join(dir, sub, f)]); } catch (e) { } }
let pass = 0, fail = 0; const log = console.log; const out = [];
for (const [name, file] of suites) {
  if (only && !only.some(o => name.includes(o))) continue;
  console.log = () => { };
  try { const H = await (await import(pathToFileURL(file).href)).default(); console.log = log; pass += H.count - H.fails.length; fail += H.fails.length; for (const f of H.fails) out.push('FAIL ' + name + ': ' + f); }
  catch (e) { console.log = log; const HH = globalThis.__H; if (HH) { pass += HH.count - HH.fails.length; fail += HH.fails.length; for (const f of HH.fails) out.push('FAIL ' + name + ': ' + f); } fail++; out.push('CRASH ' + name + ': ' + (e && e.stack || e).toString().slice(0, 500)); }
}
console.log = log; for (const l of out) console.log(l);
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`); process.exit(fail ? 1 : 0);
