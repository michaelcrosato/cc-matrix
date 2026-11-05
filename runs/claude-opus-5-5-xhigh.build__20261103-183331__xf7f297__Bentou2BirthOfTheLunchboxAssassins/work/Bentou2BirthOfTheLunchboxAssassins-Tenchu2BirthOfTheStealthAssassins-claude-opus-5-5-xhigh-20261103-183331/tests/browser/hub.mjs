// browser/hub: the real AI Hub harness. The bundle and the harness are served from one folder (python3 -m http.server on
// a port the OS picks, bound to 127.0.0.1; the page is checked to be ours), then three conformance runs: 2 players; 4
// players on a bad network; the host leaving. window.__hubCheck.pass must be true. The server is stopped by its PID
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdirSync, copyFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { NAME } from '../../tools/name.mjs';
export default async function ({ dev, check }) {
  const require = createRequire(join(dev, 'handoff', 'package.json')), { chromium } = require('playwright');
  const dir = join(dev, '.hubtest'); mkdirSync(dir, { recursive: true });
  copyFileSync(join(dev, '..', NAME + '.html'), join(dir, 'game.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(dev, 'vendor', 'aihub', f), join(dir, f));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  let port = null;
  await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('no port from http.server')), 8000); const on = d => { const m = /port (\d+)/.exec(String(d)); if (m) { port = +m[1]; clearTimeout(to); res(); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const base = 'http://127.0.0.1:' + port + '/';
    const p0 = await browser.newPage(); const r = await p0.goto(base + 'game.html'); const title = await p0.title(); await p0.close();
    check('the served page is this game', r && r.ok() && /Bentou 2/.test(title), title);
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.goto(base + 'harness.html?game=game.html&' + q);
      let done = false; for (let i = 0; i < 240 && !done; i++) { await page.waitForTimeout(1000); done = await page.evaluate(() => document.body.dataset.complete === 'true'); }
      const rep = await page.evaluate(() => window.__hubCheck && { pass: window.__hubCheck.pass, failed: window.__hubCheck.checks.filter(c => !c.pass).map(c => c.name + (c.detail ? ' (' + c.detail + ')' : '')) });
      check('the hub harness passes: ' + q, done && rep && rep.pass, done ? (rep ? rep.failed.join('; ') : 'no report') : 'did not complete');
      await page.close();
    }
  } finally { await browser.close(); srv.kill(); }
}
