/* Launch the same quiet verifier beyond a terminal session's wall-time limit. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './load.mjs';

const log = path.join(root, 'docs/evidence/verify-run.log');
const descriptor = fs.openSync(log, 'w');
const child = spawn(process.execPath, [path.join(root, 'tools/verify.mjs')], {
  cwd: root,
  detached: true,
  stdio: ['ignore', descriptor, descriptor],
});
await new Promise((resolve, reject) => {
  child.once('spawn', resolve);
  child.once('error', reject);
});
fs.writeFileSync(
  path.join(root, 'docs/evidence/verify-process.json'),
  JSON.stringify(
    {
      pid: child.pid,
      started: new Date().toISOString(),
      command: 'node tools/verify.mjs',
      cwd: root,
      log,
    },
    null,
    2,
  ) + '\n',
);
child.unref();
fs.closeSync(descriptor);
console.log(`Verification PID ${child.pid}; log ${path.relative(root, log)}`);
