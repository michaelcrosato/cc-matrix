/**
 * @file The one command (PLAN.md section 16): runs every check behind it and prints only failures and one final count line.
 * `--quick` stops after the Node stages. Set CHROMIUM_PATH for the browser stages.
 * Usage, from the dev folder: node labs/game/tools/verify.mjs [--quick]
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const QUICK = process.argv.includes('--quick');
const HTML = 'out/verify-game.html';
let passed = 0;
let failed = 0;

/** Runs a command; on failure prints its tail. */
function stage(name, command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
  if (result.status === 0) {
    passed += 1;
    return true;
  }
  failed += 1;
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n').filter((line) => line.trim());
  const wanted = text.filter((line) => /FAIL|Error|error|expected|AssertionError/.test(line)).slice(0, 40);
  console.log(`FAIL ${name}\n${(wanted.length ? wanted : text.slice(-20)).join('\n')}`);
  return false;
}

/** Every file under a folder. */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** No TODOs, placeholders or stubs in the game. */
function noStubs() {
  const allowed = /stub|placeholder/i;
  const bad = [];
  for (const path of walk('labs/game')) {
    if (!/\.(ts|mjs|html|css)$/.test(path) || /tools\//.test(path) || /hub\/harness/.test(path)) continue;
    readFileSync(path, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/todo|fixme/i.test(line) || (allowed.test(line) && !/\.test\.ts$/.test(path)))
          bad.push(`${path}:${i + 1}: ${line.trim().slice(0, 80)}`);
      });
  }
  if (bad.length === 0) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL no stubs\n${bad.join('\n')}`);
  }
}

/** Every activity on 10 seeds: each its own process, three side by side, as each is minutes long. */
const BALANCE = [
  'morning',
  'poseA',
  'poseB',
  'poseC',
  'heron',
  'pond',
  'ring',
  'group',
  'reps',
  'step',
  'line',
  'paddle',
  'garden',
  'plunge',
  'hoop',
  'jog',
];

/** Runs one balance group; resolves to whether it passed, printing its failures. */
function balance(ids, tries = 0) {
  return new Promise((done) => {
    const child = spawn('npx', ['vitest', 'run', 'labs/game/scenes/balance.test.ts'], {
      env: { ...process.env, TEETER_SEEDS: '10', TEETER_ONLY: ids.join(',') },
    });
    let text = '';
    child.stdout.on('data', (d) => (text += d));
    child.stderr.on('data', (d) => (text += d));
    child.on('close', (code) => {
      if (code === 0) passed += 1;
      else if (/Worker exited unexpectedly/.test(text) && tries < 2) {
        // The machine ran out of memory (other agents share it), which says nothing of the game: once more.
        balance(ids, tries + 1).then(done);
        return;
      } else {
        failed += 1;
        console.log(
          `FAIL balance ${ids.join(' ')}\n${text
            .split('\n')
            .filter((l) => /FAIL|AssertionError|Error:/.test(l))
            .slice(0, 20)
            .join('\n')}`,
        );
      }
      done();
    });
  });
}

stage('npm run check', 'npm', ['run', 'check']);
stage('game tests', 'npx', ['vitest', 'run', 'labs/game/scenes/whole.test.ts', 'labs/game/scenes/audio.test.ts']);
{
  const queue = [...BALANCE];
  const worker = async () => {
    while (queue.length) await balance([queue.shift()]);
  };
  await Promise.all([worker(), worker(), worker()]);
}
noStubs();
stage('audio QA', 'node', ['x', 'qa', 'audio']);
// A browser ended for memory fails every replay at once, with the hashes never compared: once more if so.
{
  const args = ['x', 'replay', 'labs/game/replays', '--browser', 'sim', '--runs', '1'];
  const first = spawnSync('node', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (first.status === 0) passed += 1;
  else stage('replays', 'node', args);
}
if (!QUICK) {
  if (stage('one-file build', 'node', ['labs/game/tools/onefile.mjs', HTML])) {
    const html = readFileSync(HTML, 'utf8');
    if (/data:audio|\.mp3"|\.wav"|\.ogg"/.test(html)) {
      failed += 1;
      console.log('FAIL the build holds an audio file');
    } else passed += 1;
    stage('browser', 'python3', ['labs/game/tools/browser.py', HTML]);
    stage('hub harness', 'python3', ['labs/game/tools/hubcheck.py', HTML, '2', '3', '4', '3:host-leave']);
  }
}
console.log(`verify: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
