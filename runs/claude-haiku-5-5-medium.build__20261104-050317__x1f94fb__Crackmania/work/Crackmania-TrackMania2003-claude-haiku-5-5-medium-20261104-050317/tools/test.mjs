// THE one command: node tools/test.mjs [suite ...]  (default: every suite). Prints only failures and one count line.
import { suites } from './tests/suites.mjs';

const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
const names = want.length ? want : Object.keys(suites);
let pass = 0, fail = 0;
for (const suite of names) {
  if (!suites[suite]) { console.log('unknown suite: ' + suite); fail++; continue; }
  for (const [name, fn] of suites[suite]) {
    try { await fn(); pass++; } catch (e) { fail++; console.log('FAIL ' + suite + ' · ' + name + '\n     ' + (e && e.message ? e.message : e)); }
  }
}
console.log(`${pass} passed, ${fail} failed (${pass + fail} checks)`);
process.exitCode = fail ? 1 : 0;
