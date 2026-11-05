// the real AI Hub harness: 2 players; 4 players on a bad network; the host leaving. Served on 127.0.0.1 at a port the OS
// picks; the server is stopped by its PID.
import { chromium } from '../../handoff/node_modules/playwright/index.mjs';
import { mkdirSync, copyFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const NAME = 'Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420';
export default async ({ check, dev }) => {
  const dir = new URL('.hubtest/', dev); mkdirSync(dir, { recursive: true });
  copyFileSync(new URL('../' + NAME + '.html', dev), new URL('game.html', dir));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/aihub/' + f, dev), new URL(f, dir));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const port = await new Promise((ok, no) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) ok(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => no(new Error('no port: ' + buf)), 8000); });
    const browser = await chromium.launch();
    try {
      const page0 = await browser.newPage(); await page0.goto(`http://127.0.0.1:${port}/game.html`); const title = await page0.title(); await page0.close();
      check('the served page is this game', /Bentou 2/.test(title), title);
      for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'scenario=host-leave&players=2&auto=1']) {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
        await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 });
        const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, fails: (window.__hubCheck && (window.__hubCheck.checks || window.__hubCheck.results) || []).filter(c => c && (c.ok === false || c.pass === false)).map(c => c.name || c.label || JSON.stringify(c)).slice(0, 6) }));
        check('harness ' + q, res.pass === true, JSON.stringify(res));
        await page.close();
      }
    } finally { await browser.close(); }
  } finally { srv.kill('SIGTERM'); }
};
