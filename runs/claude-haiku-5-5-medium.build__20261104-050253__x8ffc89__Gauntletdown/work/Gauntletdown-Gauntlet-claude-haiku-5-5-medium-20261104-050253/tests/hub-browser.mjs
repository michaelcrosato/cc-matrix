// The AI Hub conformance run in a browser: copies the harness and the built game into .serve/, serves them from a
// loopback port the OS picks, runs the harness's automatic checks for a ghost round, and prints the failures.
// Usage: node tests/hub-browser.mjs [players] [mode-note]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(dev, '..', 'Gauntletdown-Gauntlet-claude-haiku-5-5-medium-20261104-050253.html');
const serve = join(dev, '.serve');
mkdirSync(serve, { recursive: true });
const gameName = 'game.html';
copyFileSync(game, join(serve, gameName));
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(dev, 'hub', f), join(serve, f));

const players = process.argv[2] || '2';
const extra = process.argv[3] || '';   // e.g. 'latency=150&jitter=50&loss=5' or 'scenario=host-leave'
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: serve, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((ok, bad) => {
  const t = setTimeout(() => bad(new Error('no port')), 10000);
  const onText = d => { const m = String(d).match(/port (\d+)/); if (m) { clearTimeout(t); ok(m[1]); } };
  srv.stdout.on('data', onText); srv.stderr.on('data', onText);
  srv.on('exit', () => bad(new Error('server exited')));
});
let browser;
try {
  const base = `http://127.0.0.1:${port}`;
  const probe = await (await fetch(base + '/' + gameName)).text();
  const title = (probe.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (title !== 'Gauntletdown') throw new Error('the page on the port is not the game: ' + title);
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${base}/harness.html?game=${gameName}&players=${players}&auto=1${extra ? '&' + extra : ''}`);
  await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 600000, polling: 1000 });
  const rep = await page.evaluate(() => window.__hubCheck);
  for (const c of rep.checks) if (!c.pass) console.log(`FAIL hub ${c.name}${c.detail ? ': ' + c.detail : ''}`);
  console.log(`${rep.checks.length} hub checks, ${rep.checks.filter(c => !c.pass).length} failed (${players} players, ${extra || 'standard'})`);
  if (errors.length) console.log('page errors:', errors.slice(0, 2));
} finally {
  if (browser) await browser.close();
  srv.kill();
}
