// One command: node tests/run.mjs [filter]. Prints only failures and one count line.
const filter = process.argv[2] ?? '';
import { writeFileSync } from 'node:fs';
const passedLabels = [];
const groups = { sim: './sim.test.mjs', content: './content.test.mjs', headless: './headless.test.mjs', browser: './browser/run.mjs', hub: './browser/hub.mjs' };
let pass = 0, fail = 0;
export const results = { pass: 0, fail: 0 };
for (const [name, file] of Object.entries(groups)) {
  if (filter && !name.startsWith(filter)) continue;
  try {
    const m = await import(file);
    const r = await m.run((label, ok, detail) => { if (ok) { pass++; passedLabels.push(`${name}: ${label}`); } else { fail++; console.log(`FAIL [${name}] ${label}${detail ? `: ${detail}` : ''}`); } });
    void r;
  } catch (err) { fail++; console.log(`FAIL [${name}] crashed: ${err.stack ?? err}`); }
}
if (process.env.PASSED_FILE) writeFileSync(process.env.PASSED_FILE, passedLabels.join('\n'));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
