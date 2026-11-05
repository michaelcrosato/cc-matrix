// the real AI Hub harness: harness.html, bridge.js, round.js and the bundle (as game.html) served from one origin on a
// port the OS picks (127.0.0.1), checked to be our page, then opened in Playwright for: 2 players; 4 players with latency,
// jitter and loss; the same with the host leaving. Each must end with window.__hubCheck.pass === true. The server is
// stopped by its own PID.
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
const here = new URL('../', import.meta.url), P = f => decodeURIComponent(new URL(f, here).pathname);
export async function hub(o = {}) {
  let passed = 0, failed = 0; const fail = (w, d) => { failed++; console.log('FAIL hub-harness: ' + w + (d ? ' (' + d + ')' : '')); };
  const dir = P('test/.serve/'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(P('vendor/aihub/' + f), dir + f);
  copyFileSync(P('../DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232.html'), dir + 'game.html');
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', dir], { stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const t = setTimeout(() => rej(new Error('no port')), 8000); srv.stdout.on('data', d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) { clearTimeout(t); res(+m[1]); } }); });
  const base = 'http://127.0.0.1:' + port + '/';
  let browser;
  try {
    const page0 = await (await fetch(base + 'game.html')).text();
    if (!/<title>Densha de Halo!<\/title>/.test(page0)) { fail('the server serves our page', 'wrong page on port ' + port); return { passed, failed }; }
    browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave']) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), page = await ctx.newPage();
      await page.goto(base + 'harness.html?game=game.html&' + q);
      const done = await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).then(() => true).catch(() => false);
      const res = await page.evaluate(() => window.__hubCheck && { pass: window.__hubCheck.pass, checks: (window.__hubCheck.checks || []).filter(c => !c.pass).map(c => c.name + ': ' + c.detail) }).catch(() => null);
      if (done && res && res.pass) passed++; else fail('harness ' + q, done ? (res ? res.checks.join(' | ') : 'no result') : 'did not complete');
      await ctx.close();
    }
  } catch (e) { fail('the harness runs', e.message); }
  finally { if (browser) await browser.close(); try { process.kill(srv.pid); } catch (e) { /* gone */ } rmSync(dir, { recursive: true, force: true }); }
  return { passed, failed };
}
