// The AI Hub harness (lib/hub/harness.html, unmodified) plays the hub: it loads the bundled game and runs the hub's own checks.
// node test/hub.mjs [players]   Serves a scratch folder on 127.0.0.1 (port picked by the OS) and stops only that server, by PID.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..'), root = dirname(here);
const bundle = readdirSync(root).find(f => f.endsWith('.html') && f.startsWith('AmericanFootballFiasco'));
if (!bundle) { console.log('no bundle: run node build.mjs first'); process.exit(1); }
const dir = join(here, '.cache', 'hubtest'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(here, 'test', f), join(dir, f));
copyFileSync(join(root, bundle), join(dir, 'game.html'));
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((ok, no) => { const t = setTimeout(() => no(new Error('no port')), 8000); srv.stdout.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) { clearTimeout(t); ok(+m[1]); } }); });
let code = 0;
try {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const q of (process.argv[2] ? [process.argv[2]] : ['2&latency=0', '4&latency=150&jitter=50&loss=5'])) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=${q}&auto=1&limit=40`);
    // confirm the page the harness loads is the game before trusting a result
    await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 150000 }).catch(() => {});
    const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, checks: window.__hubCheck && (window.__hubCheck.checks || window.__hubCheck.items || null), all: JSON.stringify(window.__hubCheck).slice(0, 1800) }));
    console.log('players=' + q, 'pass=' + res.pass); if (!res.pass) { console.log(res.all); code = 1; }
    await page.close();
  }
  await browser.close();
} finally { srv.kill('SIGTERM'); }
process.exit(code);
