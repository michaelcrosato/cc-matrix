import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { NAME } from '../tools/bundle.mjs';
const DIR = new URL('../tests/out/hub/', import.meta.url);
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: DIR.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise(ok => { let b = ''; const on = d => { b += d; const m = /port (\d+)/.exec(b); if (m) ok(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://127.0.0.1:' + port + '/harness.html?game=' + NAME + '.html&players=4&latency=150&jitter=50&loss=5&auto=1');
await page.waitForTimeout(30000);
for (const f of page.frames()) { const t = await f.evaluate(() => window.SN && { tm: SN._tm, origin: Math.round(performance.timeOrigin % 100000) }).catch(() => null); if (t) console.log(JSON.stringify(t)); }
await browser.close(); srv.kill('SIGTERM');
