/**
 * @file The one command: node labs/game/tools/verify.mjs [--quick]. Node stages: npm run check, then the game's tests. Browser
 * stages: build the single file, then tools/browser.py plays it in headless Chromium and tools/hub.py runs the hub's harness.
 * Prints only failures and one final count line.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const quick = process.argv.includes('--quick');
const OUT = resolve('../WeeTare-WiiFit-claude-opus-5-5-medium-20261105-024328.html');
let passed = 0;
let failed = 0;

/** Runs a stage; on failure prints its last lines. `count` reads "ok N, fail M" lines from a script. */
function stage(name, command, args, options = {}) {
  let run = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
  let text = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  // The machine is shared, and earlyoom ends the biggest process when memory runs out: that says nothing about the game.
  for (
    let tries = 0;
    tries < 3 &&
    run.status !== 0 &&
    (run.status === null || /Worker exited unexpectedly|Target crashed|has been closed|REPLAY_CRASH/.test(text));
    tries++
  ) {
    spawnSync('sleep', ['60']);
    run = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
    text = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  }
  const counted = /^RESULT ok (\d+) fail (\d+)$/m.exec(text);
  if (counted) {
    passed += Number(counted[1]);
    failed += Number(counted[2]);
    for (const line of text.split('\n')) if (line.startsWith('FAIL')) console.log(`${name}: ${line}`);
    return;
  }
  if (run.status === 0) passed += 1;
  else {
    failed += 1;
    console.log(`FAIL ${name}\n${text.split('\n').slice(-25).join('\n')}`);
  }
}

stage('check', 'npm', ['run', 'check']);
// One small process per group: a few hundred headless islands in a single worker is more memory than a shared machine has.
stage('tests', 'npx', [
  'vitest',
  'run',
  'labs/game/audio',
  'labs/game/props',
  'labs/game/scenes/round',
  'labs/game/scenes/game',
  'labs/game/replays',
]);
stage('random input', 'npx', ['vitest', 'run', 'labs/game/scenes/balance', '-t', 'random']);
for (const shard of [
  'check,poseA,poseB,poseC,pond',
  'reps,step,line,paddle,garden',
  'plunge,hoop,jog,ring',
  'heron,hoopS,stepS,pondS',
]) {
  stage(`balance ${shard}`, 'npx', ['vitest', 'run', 'labs/game/scenes/balance', '-t', 'meets'], {
    env: { ...process.env, WT_ONLY: shard },
  });
}
stage('no audio files', 'node', [
  '-e',
  `
const fs=require('fs');const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
for(const f of walk('labs/game')) if(/\\.(mp3|wav|ogg|flac|m4a)$/i.test(f)) throw new Error(f);`,
]);
stage('qa audio', 'node', ['x', 'qa', 'audio']);
stage('replays', 'node', ['x', 'replay', 'labs/game/replays', '--runs', '2']);
if (!quick) {
  stage('replays in Chromium', 'node', ['x', 'replay', 'labs/game/replays', '--runs', '1', '--browser', 'sim'], {
    env: {
      ...process.env,
      CHROMIUM_PATH: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
    },
    timeout: 1500000,
  });
  stage('build', 'node', ['labs/game/tools/onefile.mjs', OUT]);
  stage('browser', 'python3', ['-u', 'labs/game/tools/browser.py', OUT]);
  stage('route, pad alone', 'python3', ['-u', 'labs/game/tools/route.py', OUT, 'pad']);
  stage('route, keys and mouse', 'python3', ['-u', 'labs/game/tools/route.py', OUT, 'keys']);
  stage('hub', 'python3', ['-u', 'labs/game/tools/hub.py', OUT]);
}
console.log(`${failed === 0 ? 'ok' : 'FAILED'}: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
