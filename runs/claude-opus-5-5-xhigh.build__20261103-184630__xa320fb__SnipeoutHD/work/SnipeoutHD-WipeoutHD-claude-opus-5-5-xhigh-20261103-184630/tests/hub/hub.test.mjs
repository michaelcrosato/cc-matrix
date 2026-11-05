// The real AI Hub harness (the pinned harness.html, bridge.js, round.js): the bundle served beside it on 127.0.0.1 (a
// port the OS picks), our page confirmed, then players=2&auto=1, players=4 with latency, jitter and loss, and the
// host-leave scenario; window.__hubCheck.pass must be true in each. The server is stopped by its own PID.
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { build, OUT, NAME } from '../../tools/bundle.mjs';
const HERE = new URL('./', import.meta.url), DIR = new URL('../out/hub/', import.meta.url);
export async function run(T) {
  build(); mkdirSync(DIR, { recursive: true });
  copyFileSync(OUT, new URL(NAME + '.html', DIR));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL(f, HERE), new URL(f, DIR));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: DIR.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const port = await new Promise((ok, no) => { let buf = ''; const t = setTimeout(() => no(new Error('the server did not start')), 10000); const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) { clearTimeout(t); ok(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
    const base = 'http://127.0.0.1:' + port + '/', html = await (await fetch(base + NAME + '.html')).text();
    T.check('the server serves our page (title Snipeout HD)', /<title>Snipeout HD<\/title>/.test(html), html.slice(0, 200));
    const browser = await chromium.launch();
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&auto=1&scenario=host-leave']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.goto(base + 'harness.html?game=' + NAME + '.html&' + q);
      await page.waitForSelector('body[data-complete="true"]', { timeout: 400000 }).catch(() => {});
      const r = await page.evaluate(() => window.__hubCheck || null);
      const failed = r ? r.checks.filter(c => !c.pass && !c.ok).map(c => (c.name || c.what || c.label) + ': ' + (c.detail || '')) : ['no report'];
      T.check('hub harness ' + q + ' passes', !!(r && r.pass), failed.slice(0, 8).join(' | ') + (r ? ' | log: ' + (r.log || []).slice(-6).join(' / ') : ''));
      await page.close();
    }
    await browser.close();
  } finally { srv.kill('SIGTERM'); }
}
