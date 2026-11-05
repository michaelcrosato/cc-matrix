// THE one command: node tests/run.mjs  -- prints only failures and a one-line count. Add --browser to include the Chromium suite.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); let pass = 0, fail = 0; const fails = [];
const verbose = process.argv.includes('--verbose'); const t = { ok(c, m) { if (c) { pass++; if (verbose) console.log('PASS', m); } else { fail++; fails.push(m); } }, fail(m) { fail++; fails.push(m); } };
const useBrowser = process.argv.includes('--browser');
const suites = fs.readdirSync(path.join(here, 'node')).filter(f => f.endsWith('.test.mjs')).sort();
for (const f of suites) { try { const m = await import(path.join(here, 'node', f)); await m.default(t); } catch (e) { fail++; fails.push(f + ' threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); } }
if (useBrowser) { const m = await import(path.join(here, 'browser', 'browser.test.mjs')); try { await m.default(t); } catch (e) { fail++; fails.push('browser suite threw: ' + String(e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
for (const f of fails) console.log('FAIL', f);
console.log((fail ? 'FAILED ' : 'ok ') + pass + ' passed, ' + fail + ' failed' + (useBrowser ? ' (with browser)' : ''));
process.exit(fail ? 1 : 0);
