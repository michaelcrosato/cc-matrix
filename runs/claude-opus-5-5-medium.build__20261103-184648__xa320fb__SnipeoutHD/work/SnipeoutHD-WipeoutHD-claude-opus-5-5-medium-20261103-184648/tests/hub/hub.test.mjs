// The real AI Hub harness (pinned harness.html, bridge.js, round.js) against the bundle: served on 127.0.0.1 port 0 by
// our own python server (stopped by its PID), our page confirmed by its <title>, three scenarios
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { test, check, done } from '../lib/t.mjs';
const root = new URL('../../', import.meta.url).pathname, dir = root + 'tests/out/hub/', NAME = 'SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html';
mkdirSync(dir, { recursive: true });
copyFileSync(root + '../' + NAME, dir + NAME); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(root + 'tests/hub/' + f, dir + f);
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir });
const port = await new Promise((ok, no) => { let buf = ''; const t = setTimeout(() => no(new Error('no port')), 15000); srv.stdout.on('data', d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) { clearTimeout(t); ok(+m[1]); } }); });
const base = 'http://127.0.0.1:' + port + '/';
try {
  await test('our page is served', async () => { const html = await (await fetch(base + NAME)).text(); check(/<title>Snipeout HD<\/title>/.test(html), 'the page is Snipeout HD'); });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&auto=1&scenario=host-leave']) {
    await test('harness ' + q, async () => {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.goto(base + 'harness.html?game=' + NAME + '&' + q);
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000 });
      const r = await page.evaluate(() => window.__hubCheck);
      check(r && r.pass === true, 'window.__hubCheck.pass', r && (r.failed || r.checks && r.checks.filter(c => !c.ok && !c.pass)) || r);
      await page.close();
    });
  }
  await browser.close();
} finally { srv.kill(); }
done();
