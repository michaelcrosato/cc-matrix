/**
 * @file The one command: `node labs/game/tools/verify.mjs [--quick]` runs every stage and prints only failures and one final count line.
 * Node stages: `npm run check`, then the game's tests (the Wobble Model, the four stand-in players on every activity on 10 seeds,
 * the whole-game playthrough on 3 seeds, Group Class, attract, audio, content). Browser stages (skipped by --quick): build
 * the single file, then the browser checks (boot, controller, keyboard, 10-foot text, attract, touch-only, About, no-WebGPU)
 * and the AI Hub harness at 2, 3 and 4 players and with the host leaving. Rerun it only after changing code it covers.
 * @example
 * node labs/game/tools/verify.mjs --quick
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

const quick = process.argv.includes('--quick');
const NAME = 'WellWobbled-WiiFit-claude-sonnet-5-5-medium-20261105-031600';
const built = `../${NAME}.html`;
const failures = [];
let total = 0;
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });

// 1. npm run check
let r = run('npm', ['run', 'check']);
total += 1;
if (r.status !== 0)
  failures.push(
    `npm run check:\n${(r.stdout + r.stderr)
      .split('\n')
      .filter((l) => /error|fail|✖/i.test(l))
      .slice(0, 12)
      .join('\n')}`,
  );

// 2. the game's tests
mkdirSync('out/verify', { recursive: true });
r = run('npx', ['vitest', 'run', 'labs/game', '--reporter=json', '--outputFile=out/verify/vitest.json']);
if (existsSync('out/verify/vitest.json')) {
  const j = JSON.parse(readFileSync('out/verify/vitest.json', 'utf8'));
  total += j.numTotalTests;
  for (const f of j.testResults)
    for (const t of f.assertionResults)
      if (t.status === 'failed')
        failures.push(`${t.fullName}: ${(t.failureMessages[0] ?? '').split('\n')[0].slice(0, 200)}`);
  for (const f of j.testResults)
    if (f.status === 'failed' && f.assertionResults.length === 0)
      failures.push(`${f.name}: ${(f.message ?? '').slice(0, 200)}`);
} else {
  total += 1;
  failures.push('vitest produced no report');
}

if (!quick) {
  r = run('node', ['labs/game/tools/onefile.mjs', built]);
  total += 1;
  if (r.status !== 0) failures.push(`build: ${(r.stderr || r.stdout).slice(0, 300)}`);
  else {
    r = run('python3', ['labs/game/tools/browser.py', built]);
    for (const l of r.stdout.split('\n')) {
      if (l.startsWith('FAIL')) failures.push(l);
      const m = /browser: (\d+)\/(\d+)/.exec(l);
      if (m) total += Number(m[2]);
    }
    if (r.status !== 0 && !/browser:/.test(r.stdout)) {
      total += 1;
      failures.push(`browser stages crashed: ${r.stderr.slice(-300)}`);
    }
    mkdirSync('out/hubrun', { recursive: true });
    copyFileSync(built, 'out/hubrun/game.html');
    for (const f of ['harness.html', 'bridge.js', 'round.js']) {
      if (!existsSync(`out/hub/${f}`)) {
        mkdirSync('out/hub', { recursive: true });
        run('curl', [
          '-sfL',
          `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/${f}`,
          '-o',
          `out/hub/${f}`,
        ]);
      }
      copyFileSync(`out/hub/${f}`, `out/hubrun/${f}`);
    }
    for (const [n, extra] of [
      ['2', ''],
      ['3', ''],
      ['4', ''],
      ['3', '&scenario=host-leave'],
    ]) {
      total += 1;
      r = run(
        'python3',
        ['labs/game/tools/hubcheck.py', 'out/hubrun', n, extra].filter((x) => x !== ''),
      );
      const out = r.stdout.split('\n').filter((l) => l.startsWith('HUB') || l.includes('FAILED'));
      if (!out.some((l) => /PASS/.test(l)))
        failures.push(`hub harness ${n} ${extra}: ${out.join(' | ') || r.stderr.slice(-200)}`);
    }
  }
}
for (const f of failures) console.log(`FAIL ${f}`);
console.log(`verify: ${total - failures.length}/${total} passed${quick ? ' (quick: Node stages only)' : ''}`);
process.exitCode = failures.length ? 1 : 0;
