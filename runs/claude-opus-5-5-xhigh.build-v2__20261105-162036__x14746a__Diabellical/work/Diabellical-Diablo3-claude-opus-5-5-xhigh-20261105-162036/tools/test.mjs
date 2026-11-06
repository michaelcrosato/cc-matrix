#!/usr/bin/env node
// One command. Prints only failures and a one-line count.
//   node tools/test.mjs            everything
//   node tools/test.mjs --sim --headless --browser --hub   one or more tiers
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { DEV } from './browser.mjs';
import { tests } from '../tests/lib.mjs';

const args = process.argv.slice(2);
const only = args.filter((a) => a.startsWith('--')).map((a) => a.slice(2));
const grep = args.find((a) => !a.startsWith('--'));
const tiers = only.length ? only : ['sim', 'headless', 'browser', 'hub'];
let pass = 0, fail = 0;
const quiet = console.log;
for (const t of tiers) await import(pathToFileURL(join(DEV, `tests/${t}/all.mjs`)).href);
for (const t of tests) {
  if (grep && !t.name.includes(grep)) continue;
  const t0 = Date.now();
  try {
    await t.fn();
    pass++;
    if (process.env.TEST_TIMES) quiet(`ok ${((Date.now() - t0) / 1000).toFixed(1)}s ${t.name}`);
  } catch (e) {
    fail++;
    quiet(`FAIL ${t.name}\n  ${String(e?.message ?? e).slice(0, 1400)}`);
    if (process.env.TEST_STACK) quiet(String(e?.stack).slice(0, 1600));
  }
}
quiet(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
