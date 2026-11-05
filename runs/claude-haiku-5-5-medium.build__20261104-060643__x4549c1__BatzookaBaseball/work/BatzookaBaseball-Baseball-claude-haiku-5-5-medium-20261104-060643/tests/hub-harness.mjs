// The AI Hub's own check, run on the single-file bundle: node tests/hub-harness.mjs [players] [extra query]
// It copies the harness (hub/harness.html, bridge.js, round.js) and the bundle into a scratch folder inside this one, serves
// it on 127.0.0.1 with a port the OS picks, and waits for the harness to finish. It stops only the server it started.
// The game passes when window.__hubCheck.pass is true.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundleName = 'BatzookaBaseball-Baseball-claude-haiku-5-5-medium-20261104-060643.html';
const bundle = join(root, '..', bundleName);
const players = process.argv[2] || '2';
const extra = process.argv[3] || '';
const dir = join(root, '.hubtest');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(root, 'hub', f), join(dir, f));
copyFileSync(bundle, join(dir, bundleName));

const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
let port;
try {
  port = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('the server did not print its port')), 10000);
    server.stdout.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) { clearTimeout(t); resolve(m[1]); } });
    server.on('error', reject);
  });
} catch (e) {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
  console.log(e.message);
  process.exit(1);
}
let ok = false;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const url = `http://127.0.0.1:${port}/harness.html?game=${encodeURIComponent(bundleName)}&players=${players}&auto=1${extra ? '&' + extra : ''}`;
  await page.goto(url);
  await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 420000, polling: 500 });
  const pass = await page.evaluate(() => !!(window.__hubCheck && window.__hubCheck.pass));
  const checks = await page.evaluate(() => ((window.__hubCheck && window.__hubCheck.checks) || []).map(c => ({ name: c.name, pass: c.pass, detail: c.detail })));
  for (const c of checks) if (!c.pass) console.log('FAIL ' + c.name + (c.detail ? ': ' + c.detail : ''));
  console.log(`${checks.filter(c => c.pass).length} of ${checks.length} harness checks pass`);
  console.log(pass ? `hub check passed (${players} players${extra ? ', ' + extra : ''})` : 'hub check FAILED');
  if (errors.length) console.log('page errors:', errors.slice(0, 3));
  ok = pass && !errors.length;
} catch (e) {
  console.log('hub check did not finish:', e.message);
} finally {
  await browser.close();
  server.kill();
  rmSync(dir, { recursive: true, force: true });
}
process.exit(ok ? 0 : 1);
