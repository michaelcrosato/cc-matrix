// The one command: node tests/run.mjs [suite ...] [--fast]. Prints only failures and one final line.
import fs from 'node:fs'; import { runSim } from './sim.test.mjs'; import { run as runBot } from './bot.test.mjs';
const args = process.argv.slice(2), fast = args.includes('--fast'), names = args.filter(a => !a.startsWith('--')); const t0 = Date.now();
const want = n => !names.length || names.includes(n);
let pass = 0, fail = 0, suites = 0; const out = []; const add = (r) => { pass += r.pass; fail += r.fail; suites++; out.push(...r.fails); };
function playthrough() {
  const fails = []; let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; fails.push('FAIL playthrough: ' + m); } }; const rep = [];
  for (const seed of [7, 21]) { const t = Date.now(); const o = run(seed); rep.push(`seed ${seed}: ${o.log.join(' | ')} | ended=${o.ended} over=${o.over} t=${o.t.toFixed(0)}s kills=${o.kills} party=${o.party.join(',')} deeds=${JSON.stringify(o.flags)} (${((Date.now() - t) / 1000).toFixed(0)}s wall)`);
    ok(o.ended, `seed ${seed}: the bot reaches the ending (floor ${o.floor}, cell ${o.cell}, over=${o.over})`); ok(!o.over, `seed ${seed}: no wipe`); ok(o.flags.d2 && o.flags.d3, `seed ${seed}: the clock and candle deeds`); ok(o.t < 5400, `seed ${seed}: under 90 minutes`); ok(o.B.S.party.members.some(m => m.lvl >= 5), `seed ${seed}: pace: level 5 by the boss`); }
  fs.mkdirSync('tests/out', { recursive: true }); fs.writeFileSync('tests/out/balance.txt', rep.join('\n') + '\n'); return { pass, fail, fails };
  function run(seed) { return runBot({ seed, maxSeconds: 1200 }); }
}
if (want('lint') || want('sim')) add(runSim());
if (want('playthrough')) add(playthrough());
if (!fast && want('browser')) { const { runBrowser } = await import('./browser.test.mjs'); add(await runBrowser()); }
if (!fast && want('harness')) { const { runHarness } = await import('./harness.test.mjs'); add(await runHarness()); }
if (out.length) console.log(out.join('\n'));
console.log(`${pass} passed, ${fail} failed · ${suites} suites · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(fail ? 1 : 0);
