// One command: `node tools/test.mjs`. Prints only failures and a final count.
//   --only <name>   one suite (a file name in tests/node or tests/browser, without its extension)
//   --fast          Node suites only, no browsers
//   --verbose       suites may print their reports
import { readdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const fast = args.includes('--fast');
const verbose = args.includes('--verbose');
process.env.TEST_VERBOSE = verbose ? '1' : '';

let passed = 0;
let failed = 0;
const fail = (suite, msg) => { failed++; console.log(`FAIL ${suite}: ${msg}`); };

/** Each Node suite runs in its own process, so one that wedges or throws can't take the rest down. */
function runNode(file) {
  const name = file.replace(/\.mjs$/, '');
  return new Promise((done) => {
    const p = spawn(process.execPath, [join(DEV, 'tools/run-suite.mjs'), pathToFileURL(join(DEV, 'tests/node', file)).href], { cwd: DEV, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const limit = setTimeout(() => { p.kill(); fail(name, 'timed out after 900 s'); }, 900000);
    p.on('close', () => {
      clearTimeout(limit);
      let reported = false;
      for (const line of out.split('\n')) {
        if (line.startsWith('@@FAIL ')) fail(name, line.slice(7));
        else if (line.startsWith('@@COUNT ')) { const [a] = line.slice(8).split(' ').map(Number); passed += a; reported = true; }
        else if (line && verbose) console.log(line);
      }
      if (!reported) fail(name, `crashed: ${err.split('\n').slice(0, 12).join(' | ').slice(0, 1500)}`);
      done();
    });
  });
}

function runBrowser(file) {
  const name = file.replace(/\.py$/, '');
  return new Promise((done) => {
    const p = spawn('python3', ['-u', join(DEV, 'tests/browser', file)], { cwd: DEV, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const limit = setTimeout(() => { p.kill(); fail(name, 'timed out after 900 s'); }, 900000);
    p.on('close', () => {
      clearTimeout(limit);
      let reported = false;
      for (const line of out.split('\n')) {
        if (line.startsWith('@@FAIL ')) fail(name, line.slice(7));
        else if (line.startsWith('@@COUNT ')) { const [a] = line.slice(8).split(' ').map(Number); passed += a; reported = true; }
        else if (line && verbose) console.log(line);
      }
      if (!reported) fail(name, `crashed: ${err.split('\n').slice(-12).join(' | ').slice(0, 1500)}`);
      done();
    });
  });
}

const nodeDir = join(DEV, 'tests/node');
const browserDir = join(DEV, 'tests/browser');
const nodeSuites = existsSync(nodeDir) ? readdirSync(nodeDir).filter((f) => f.endsWith('.mjs')).sort() : [];
const browserSuites = existsSync(browserDir) ? readdirSync(browserDir).filter((f) => f.endsWith('.py') && !f.startsWith('_')).sort() : [];
const wanted = (f) => !only || f.replace(/\.(mjs|py)$/, '') === only;

const queue = nodeSuites.filter(wanted);
const WORKERS = 6;
await Promise.all(Array.from({ length: WORKERS }, async () => { while (queue.length) await runNode(queue.shift()); }));
if (!fast) for (const f of browserSuites.filter(wanted)) await runBrowser(f);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
