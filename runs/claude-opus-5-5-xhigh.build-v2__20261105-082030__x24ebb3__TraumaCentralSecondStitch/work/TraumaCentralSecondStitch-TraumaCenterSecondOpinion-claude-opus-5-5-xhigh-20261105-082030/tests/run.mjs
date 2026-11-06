#!/usr/bin/env node
// One command: node tests/run.mjs [sim|content|browser|smoke|hub]. Prints only failures and one count line.
const filter = process.argv[2];
const groups = filter ? [filter] : ['sim', 'content', 'browser', 'smoke', 'hub'];
let pass = 0, fail = 0;
const failures = [];
export const report = (name, ok, detail = '') => { if (ok) pass++; else { fail++; failures.push(`FAIL ${name}${detail ? `: ${detail}` : ''}`); } };
globalThis.__report = report;

for (const g of groups) {
  if (g === 'sim') await (await import('./sim.test.mjs')).run(report);
  if (g === 'content') await (await import('./content.test.mjs')).run(report);
  if (g === 'browser') await (await import('./browser/game.test.mjs')).run(report);
  if (g === 'smoke') await (await import('./browser/smoke.test.mjs')).run(report);
  if (g === 'hub') {
    const { runHub } = await import('./browser/hub.mjs');
    const r = await runHub();
    for (let i = 0; i < r.count - r.fails.length; i++) report('hub', true);
    for (const f of r.fails) report(f, false);
  }
}
for (const f of failures) console.log(f);
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
