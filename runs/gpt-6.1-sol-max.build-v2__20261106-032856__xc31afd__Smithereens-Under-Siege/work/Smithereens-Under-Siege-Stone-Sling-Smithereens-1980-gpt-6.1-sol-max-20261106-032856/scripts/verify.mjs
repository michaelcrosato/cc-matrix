import { spawnSync } from 'node:child_process';
import process from 'node:process';
process.chdir(import.meta.dirname + '/..');
let count = 0,
  failures = 0;
const pending = [];
function check(name, fn) {
  count++;
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      const p = r.catch((e) => {
        failures++;
        console.log(`FAIL ${name}: ${e.stack || e}`);
      });
      pending.push(p);
      return p;
    }
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}: ${e.stack || e}`);
  }
}
const group = process.argv[2] || 'all';
const built = spawnSync(process.execPath, ['scripts/build.mjs'], {
  encoding: 'utf8',
});
if (built.status !== 0) {
  console.log('FAIL build: ' + (built.stderr || built.stdout));
  console.log('1 checks, 1 failures');
  process.exit(1);
}
if (group === 'all' || group === 'sim') {
  try {
    await (await import('../tests/sim.test.mjs')).run(check);
    await (await import('../tests/network.test.mjs')).run(check);
    await (await import('../tests/artifact.test.mjs')).run(check);
  } catch (e) {
    failures++;
    console.log(`FAIL simulation runner: ${e.stack}`);
  }
}
await Promise.all(pending);
if (group === 'all' || group === 'browser') {
  const r = spawnSync(
    '/home/micha/.local/share/pipx/venvs/playwright/bin/python',
    ['tests/browser_verify.py'],
    { encoding: 'utf8', maxBuffer: 8e6 },
  );
  if (r.stdout) {
    for (const line of r.stdout.trim().split('\n')) {
      try {
        const d = JSON.parse(line);
        if (d.checks !== undefined) {
          count += d.checks;
          failures += d.failures;
        } else console.log(line);
      } catch {
        console.log(line);
      }
    }
  }
  if (r.status !== 0) {
    failures++;
    console.log(`FAIL browser runner: ${r.stderr || r.error || r.status}`);
  }
}
console.log(`${count} checks, ${failures} failures`);
process.exitCode = failures ? 1 : 0;
