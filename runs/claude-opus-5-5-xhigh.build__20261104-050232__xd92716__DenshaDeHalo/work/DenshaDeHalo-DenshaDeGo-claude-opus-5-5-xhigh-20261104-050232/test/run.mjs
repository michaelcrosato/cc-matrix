// THE one test command: node test/run.mjs [suite ...] [--browser] [--hub] [--bundle]
// Every headless suite runs in a fresh copy of the game (engine + rail.js + src, in a vm), driven by game.advance, input
// taps and game.debug. Prints only failures (FAIL <suite>: <what> (<detail>)), then one line: "N passed, M failed".
// --browser adds the Playwright checks on the page (or the bundle with --bundle); --hub adds the AI Hub harness;
// --bundle also checks the deliverables against TASK.md (test/bundle-checks.mjs).
import { load } from './lib.mjs';
import core from './suites-core.mjs';
import ui from './suites-ui.mjs';
import play from './playthrough.mjs';
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
const args = process.argv.slice(2), flags = new Set(args.filter(a => a.startsWith('--'))), want = args.filter(a => !a.startsWith('--') && !a.startsWith('--worker'));
const SUITES = Object.assign({}, core, ui, play);
let passed = 0, failed = 0;
// the parent shares the suites among worker processes (the slow ones first) and adds up their counts
const workerArg = args.find(a => a.startsWith('--worker='));
if (!workerArg && !flags.has('--serial')) {
  const names = Object.keys(SUITES).filter(n => !want.length || want.includes(n)), SLOW = ['playthrough', 'autopilot', 'timetable', 'progress', 'events', 'screens', 'hub', 'duel', 'attract', 'signals'];
  names.sort((a, b) => (SLOW.indexOf(a) < 0 ? 99 : SLOW.indexOf(a)) - (SLOW.indexOf(b) < 0 ? 99 : SLOW.indexOf(b)));
  const K = Math.max(1, Math.min(names.length, cpus().length - 1, 8)), queue = names.slice();
  await Promise.all(Array.from({ length: K }, () => (async () => {
    while (queue.length) {
      const n = queue.shift();
      await new Promise(res => { const ch = spawn(process.execPath, [new URL(import.meta.url).pathname, '--worker=' + n], { stdio: ['ignore', 'pipe', 'inherit'] }); let buf = ''; ch.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); const m = /^RESULT (\d+) (\d+)$/.exec(line); if (m) { passed += +m[1]; failed += +m[2]; } else if (line) console.log(line); } }); ch.on('close', code => { if (code && code !== 1) { failed++; console.log('FAIL ' + n + ': the worker exited with ' + code); } res(); }); });
    }
  })()));
  if (flags.has('--browser')) { const { browser } = await import('./browser.mjs'); const r = await browser({ bundle: flags.has('--bundle') }); passed += r.passed; failed += r.failed; }
  if (flags.has('--hub')) { const { hub } = await import('./hub-harness.mjs'); const r = await hub({ bundle: flags.has('--bundle') }); passed += r.passed; failed += r.failed; }
  if (flags.has('--bundle')) { const { bundleChecks } = await import('./bundle-checks.mjs'); const r = await bundleChecks(); passed += r.passed; failed += r.failed; }
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}
if (workerArg) want.push(workerArg.slice(9));
const fail = (suite, what, detail) => { failed++; console.log('FAIL ' + suite + ': ' + what + (detail !== undefined && detail !== '' ? ' (' + String(typeof detail === 'object' ? JSON.stringify(detail) : detail).slice(0, 300) + ')' : '')); };
for (const name of Object.keys(SUITES)) {
  if (want.length && !want.includes(name)) continue;
  const errors = [];
  let ctx;
  try { ctx = load({ errors }); } catch (e) { fail(name, 'the game loads', e.stack); continue; }
  const check = (what, ok, detail) => { if (ok) passed++; else fail(name, what, detail); };
  try { await SUITES[name](Object.assign({ check, load, errors }, ctx)); }
  catch (e) { fail(name, 'runs without throwing', (e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); }
  const ge = ctx.game.errors.filter(e => !e.expected);
  if (ge.length) fail(name, 'no game errors', ge.map(e => e.message + ' @ ' + (e.stack || '').split('\n')[1]).join(' | '));
}
if (workerArg) { console.log('RESULT ' + passed + ' ' + failed); process.exit(failed ? 1 : 0); }
if (flags.has('--browser')) { const { browser } = await import('./browser.mjs'); const r = await browser({ bundle: flags.has('--bundle') }); passed += r.passed; failed += r.failed; }
if (flags.has('--hub')) { const { hub } = await import('./hub-harness.mjs'); const r = await hub({ bundle: flags.has('--bundle') }); passed += r.passed; failed += r.failed; }
if (flags.has('--bundle')) { const { bundleChecks } = await import('./bundle-checks.mjs'); const r = await bundleChecks(); passed += r.passed; failed += r.failed; }
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
