/**
 * @file The four AI Hub harness runs, then the game opened with no session. Serves the one-file page on 127.0.0.1.
 */
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const gameName = 'Trauma-Compass-Trauma-Center-Second-Opinion-grok-4.7-xhigh-20261104-224731.html';
// Outside the project: the one-file page embeds data the asset check will not approve.
const serve = mkdtempSync(join(tmpdir(), 'hub-'));
cpSync(join(root, '..', gameName), join(serve, gameName));
for (const file of ['harness.html', 'bridge.js', 'round.js']) {
  if (!cpExists(join(here, 'hub', file))) continue;
  cpSync(join(here, 'hub', file), join(serve, file));
}

/** True when a downloaded harness file is present. */
function cpExists(path) {
  return existsSync(path);
}

const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
  cwd: serve,
  stdio: ['ignore', 'pipe', 'pipe'],
});
const port = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('the server did not say its port')), 8000);
  // A pipe block-buffers Python's stdout, so -u is what makes the banner arrive. 3.14 prints it on stdout.
  // Older copies used stderr. Either stream counts.
  const note = (buf) => {
    const found = String(buf).match(/port (\d+)/);
    if (!found) return;
    clearTimeout(timer);
    resolve(Number(found[1]));
  };
  server.stdout.on('data', note);
  server.stderr.on('data', note);
  server.on('exit', (code) => reject(new Error(`the server exited ${code} before naming a port`)));
});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--use-vulkan=swiftshader',
    '--use-angle=swiftshader',
    '--use-webgpu-adapter=swiftshader',
  ],
});
let failed = 0;

/** One JSON line for verify. */
function report(name, ok, detail = '') {
  if (!ok) failed += 1;
  console.log(JSON.stringify({ name, ok, detail: String(detail).slice(0, 400) }));
}

// `play` is milliseconds. A short round still has to finish: the host answers time-up while the field warms.
const runs = [
  ['hub 2 players', 'players=2&auto=1&play=8000'],
  ['hub 4 players lossy', 'players=4&latency=150&jitter=50&loss=5&auto=1&play=8000'],
  ['hub host leaves', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1&play=8000'],
  ['hub server copy', 'players=2&scenario=server&auto=1&play=8000'],
];

for (const [name, query] of runs) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=${gameName}&${query}`);
  let ok = false;
  let detailText = '';
  try {
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 180000 });
    const read = await page.evaluate(() => {
      const bad = (window.__hubCheck?.checks ?? [])
        .filter((item) => !item.pass)
        .map((item) => `${item.name}: ${item.detail}`);
      const mismatches = [];
      for (const frame of document.querySelectorAll('iframe')) {
        const list = frame.contentWindow?.__compass?.mismatches;
        if (Array.isArray(list)) mismatches.push(...list);
      }
      return { pass: window.__hubCheck?.pass === true, bad, mismatches };
    });
    ok = read.pass && read.mismatches.length === 0;
    detailText = ok
      ? ''
      : [...read.bad, read.mismatches.length ? `mismatches ${read.mismatches.join(';')}` : '']
          .filter(Boolean)
          .join(' | ');
  } catch (error) {
    ok = false;
    detailText = errors.join(' | ') || String(error?.message ?? error);
  }
  report(name, ok, detailText);
  await page.close();
}

const solo = await browser.newPage();
await solo.goto(`http://127.0.0.1:${port}/${gameName}`);
let soloOk = false;
try {
  await solo.waitForFunction(
    () => window.__engine && window.__engine.ready && window.__compass?.screen === 'title',
    null,
    { timeout: 40000 },
  );
  soloOk = true;
} catch {
  soloOk = false;
}
report('game with no session', soloOk, soloOk ? '' : 'the title did not come up');
await browser.close();
server.kill('SIGTERM');
rmSync(serve, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
