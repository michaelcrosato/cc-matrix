import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { NAME } from '../tools/bundle.mjs';
const DIR = new URL('../tests/out/hub/', import.meta.url);
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: DIR.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise(ok => { let b = ''; const on = d => { b += d; const m = /port (\d+)/.exec(b); if (m) ok(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const browser = await chromium.launch();
for (let k = 0; k < 2; k++) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:' + port + '/harness.html?game=' + NAME + '.html&players=4&latency=150&jitter=50&loss=5&auto=1');
  await page.waitForSelector('body[data-complete="true"]', { timeout: 400000 }).catch(() => {});
  const r = await page.evaluate(() => window.__hubCheck);
  console.log('run', k, 'pass', r.pass, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  console.log(r.log.filter(l => /hello|ready|start|FAIL|error/i.test(l)).slice(0, 30).join('\n'));
  await page.close();
}
await browser.close(); srv.kill('SIGTERM');
