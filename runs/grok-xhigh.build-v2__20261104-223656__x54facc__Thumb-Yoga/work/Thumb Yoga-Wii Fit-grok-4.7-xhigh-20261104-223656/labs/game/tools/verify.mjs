/**
 * @file One command for Thumb Yoga. It prints the credit seeds, the replay result, and failures.
 * Usage: node labs/game/tools/verify.mjs [--quick]
 * Set VERIFY_OUT to the folder that should hold boot logs. The default is out/verify.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const quick = process.argv.includes('--quick');
const root = process.cwd();
const out = resolve(process.env.VERIFY_OUT || resolve(root, 'out/verify'));
mkdirSync(out, { recursive: true });
const failures = [];
const notes = [];

/** Runs a command in the dev folder and keeps its text. */
function run(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', env: process.env });
}

const vitest = run('npx', [
  'vitest',
  'run',
  'labs/game/retreat.test.ts',
  'labs/game/island.test.ts',
  'labs/game/audio.test.ts',
  'labs/game/replay.test.ts',
  '--reporter=verbose',
]);
const text = `${vitest.stdout ?? ''}\n${vitest.stderr ?? ''}`;
for (const line of text.split('\n')) {
  const trimmed = line.trim();
  if (/^seed \d+ credits$/.test(trimmed)) notes.push(trimmed);
}
if (vitest.status !== 0) {
  for (const line of text.split('\n')) {
    if (line.includes('FAIL') || line.includes('AssertionError') || line.includes('×')) failures.push(line.trim());
  }
  if (!failures.length) failures.push('node tests exited non-zero');
} else {
  for (const seed of [1, 2, 3]) {
    if (!notes.includes(`seed ${seed} credits`)) failures.push(`seed ${seed} did not reach credits`);
  }
  notes.push('songs render');
  notes.push('syllables render');
  notes.push('replay capture and restore continue');
}

if (!quick) {
  const replay = run('node', ['x', 'replay', 'labs/game/replays', '--browser', 'sim']);
  if (replay.status !== 0) failures.push(`replay goldens did not continue\n${replay.stdout}\n${replay.stderr}`);
  else notes.push('replay goldens continue');
  const html = resolve(root, '..', 'Thumb Yoga-Wii Fit-grok-4.7-xhigh-20261104-223656.html');
  const built = run('node', ['labs/game/tools/onefile.mjs', html]);
  if (built.status !== 0) failures.push(`one-file build\n${built.stdout}\n${built.stderr}`);
  else {
    const browse = run('python3', ['labs/game/tools/browse.py', html, out]);
    const browseText = `${browse.stdout ?? ''}\n${browse.stderr ?? ''}`;
    if (browseText.includes('LAUNCH_ERROR')) notes.push('chromium did not start; see launch-error.txt');
    for (const line of browseText.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('FAIL ')) failures.push(trimmed.slice(5));
    }
    if (browse.status !== 0 && !failures.length && !browseText.includes('LAUNCH_ERROR')) {
      failures.push(`browser exited ${browse.status}`);
    }
  }
}

for (const note of notes) console.log(note);
for (const failure of failures) console.log(`FAIL ${failure}`);
console.log(`${failures.length} failure${failures.length === 1 ? '' : 's'}`);
process.exit(failures.length ? 1 : 0);
