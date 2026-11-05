// The hub (plan §19.2 "hub", §15.4): the four harness scenarios pass; the server serves our page first and is stopped by
// its PID; no other process is touched.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { DEV, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f, o) => tests.push([n, f, o]);
const SCEN = [['2 players, auto', 'players=2&auto=1'], ['4 players, latency and loss', 'players=4&latency=150&jitter=50&loss=5&auto=1'], ['host leaves', 'players=4&scenario=host-leave&auto=1'], ['server copy', 'players=2&scenario=server&auto=1']];   // (plan §15.4: each variant runs with auto=1)
const serve = () => new Promise((resolveP, reject) => {
  const p = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: DEV, stdio: ['ignore', 'pipe', 'pipe'] });
  let buf = '';
  const onData = d => { buf += d.toString(); const m = /port (\d+)/.exec(buf); if (m) { resolveP({ p, port: +m[1] }); } };
  p.stdout.on('data', onData); p.stderr.on('data', onData);   // (python prints its port on stderr)
  p.on('error', reject);
  setTimeout(() => reject(new Error('the server did not print its port')), 8000);
});
for (const [label, q] of SCEN) {
  T('hub.harness: ' + label, async () => {
    const { p, port } = await serve();
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      const errs = [];
      page.on('pageerror', e => errs.push(String(e.message || e)));
      // the harness runs the game in its frame; our page is checked first (its <title> is ours)
      const gameUrl = `http://127.0.0.1:${port}/build/game.html`;
      await page.goto(gameUrl);
      expect((await page.title()) === 'ZONEFIRE', `the served page is ours (${await page.title()})`);
      await page.goto(`http://127.0.0.1:${port}/vendor/hub-harness/harness.html?game=${encodeURIComponent('../../build/game.html')}&${q}&limit=45`);
      await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 170000 });
      const pass = await page.evaluate(() => !!(window.__hubCheck && window.__hubCheck.pass === true));
      expect(pass, `the harness: ${await page.evaluate(() => JSON.stringify(window.__hubCheck || {}).slice(0, 300))}`);
      expect(errs.length === 0, `page errors: ${errs.slice(0, 2).join(' | ')}`);
    } finally { await browser.close(); p.kill('SIGTERM'); }
  }, { browser: true, slow: true });
}
