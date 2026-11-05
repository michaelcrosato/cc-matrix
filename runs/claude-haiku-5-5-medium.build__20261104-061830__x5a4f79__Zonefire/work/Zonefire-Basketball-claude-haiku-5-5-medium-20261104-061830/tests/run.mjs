// The one test command: node tests/run.mjs [suite ...] [--quick]. Prints only failures, then one line.
// Suites are tests/<name>.test.mjs, each exporting { tests: [[name, fn, opts?]] }. --quick skips browser and hub suites.
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2), quick = args.includes('--quick');
const want = args.filter(a => !a.startsWith('--'));
const BROWSER = new Set(['browser', 'hub']);
const suites = readdirSync(here).filter(f => f.endsWith('.test.mjs')).map(f => f.slice(0, -'.test.mjs'.length)).sort()
  .filter(s => (want.length ? want.includes(s) : true) && !(quick && BROWSER.has(s)));
const t0 = Date.now();
let passed = 0, failed = 0;
for (const s of suites) {
  const mod = await import(pathToFileURL(join(here, s + '.test.mjs')).href);
  for (const [name, fn] of mod.tests) {
    try { await fn(); passed++; }
    catch (e) {
      failed++;
      const msg = String(e && e.message || e).split('\n').slice(0, 3).join(' / ');
      console.log(`FAIL ${name}: ${msg}`);
    }
  }
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`ZONEFIRE tests: ${passed} passed, ${failed} failed (${secs} s)`);
process.exit(failed ? 1 : 0);
