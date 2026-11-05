// THE one command: node tests/run.mjs [suite ...] [--node] [--browser] [--hub]
// Runs the Node suites (tests/node/*.mjs), then the browser suites (tests/browser/*.mjs, Playwright on the bundle from
// file://), then the AI Hub harness (tests/hub/hub.test.mjs). Prints only failures, and one final line with the count.
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const ROOT = new URL('../', import.meta.url);
process.env.TMPDIR = process.env.TMPDIR || new URL('.tmp', ROOT).pathname;
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), flag = f => args.includes(f);
const want = kind => flag('--' + kind) || (!flag('--node') && !flag('--browser') && !flag('--hub')) || (kind === 'node' && flag('--node'));
const list = (dir, kind) => readdirSync(new URL(dir, ROOT)).filter(f => f.endsWith('.mjs') && !f.startsWith('_')).map(f => ({ name: f.replace(/\.(test\.)?mjs$/, ''), file: new URL(dir + f, ROOT), kind }));
let suites = [];
if (want('node')) suites = suites.concat(list('tests/node/', 'node'));
if (want('browser')) suites = suites.concat(list('tests/browser/', 'browser'));
if (want('hub')) suites = suites.concat([{ name: 'hub-harness', file: new URL('tests/hub/hub.test.mjs', ROOT), kind: 'hub' }]);
if (only.length) suites = suites.filter(s => only.includes(s.name));
const count = { node: 0, browser: 0, hub: 0 }; let passed = 0, failed = 0; const t0 = Date.now();
for (const s of suites) {
  const T = {
    check(what, ok, detail) { count[s.kind]++; if (ok) passed++; else { failed++; console.log('FAIL ' + s.name + ' › ' + what + (detail !== undefined ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')); } return ok; }
  };
  try { const m = await import(pathToFileURL(s.file.pathname).href); await m.run(T); }
  catch (e) { failed++; count[s.kind]++; console.log('FAIL ' + s.name + ' › crashed: ' + (e && e.stack || e).toString().split('\n').slice(0, 6).join(' | ')); }
}
console.log(`${passed} passed, ${failed} failed (node ${count.node}, browser ${count.browser}, hub ${count.hub}) in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(failed ? 1 : 0);
