// The one command: node tests/run.mjs [suite ...]. Prints only failures, then one line with the count. Exit 1 on a failure.
// Suites: floors sim play net (headless, Node) and ui hub (a browser: Playwright). Default: all of them.
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, [new URL('../build.mjs', import.meta.url).pathname]);   // game.js from game/src first
const ALL = ['floors', 'sim', 'play', 'net', 'ui', 'hub'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
let checks = 0, failed = 0;
const R = { check(suite, name, ok, detail = '') { checks++; if (!ok) { failed++; console.log('FAIL ' + suite + ' ' + name + (detail ? ': ' + String(detail).slice(0, 400) : '')); } } };
for (const s of want) {
  try { const m = await import('./' + s + '.mjs'); await m.default((name, ok, detail) => R.check(s, name, ok, detail)); }
  catch (e) { R.check(s, 'suite ran', false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
console.log(`${checks} checks, ${failed} failed (${want.join(', ')})`);
process.exit(failed ? 1 : 0);
