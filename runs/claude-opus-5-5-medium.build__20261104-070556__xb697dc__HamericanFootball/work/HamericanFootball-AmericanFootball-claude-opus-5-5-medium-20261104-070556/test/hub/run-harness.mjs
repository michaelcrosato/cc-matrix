// The AI Hub harness against the bundle: serve test/hub/serve on a port the OS picks, open harness.html in each
// configuration, wait for document.body.dataset.complete, and print window.__hubCheck (failed checks only).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { copyFileSync } from 'node:fs';
const NAME = 'HamericanFootball-AmericanFootball-claude-opus-5-5-medium-20261104-070556.html';
const dir = new URL('./serve/', import.meta.url).pathname;
copyFileSync(new URL('../../../' + NAME, import.meta.url), dir + 'game.html');
const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir });
const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 10000); });
console.log('server pid', srv.pid, 'port', port);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'] });
let allPass = true;
try {
  const page0 = await browser.newPage();
  const body = await (await page0.goto(`http://127.0.0.1:${port}/game.html`)).text();
  if (!body.includes('HAMERICAN FOOTBALL')) throw new Error('the served page is not the game');
  await page0.close();
  const configs = (process.argv[2] ? [process.argv[2]] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']);
  for (const cfg of configs) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${cfg}&limit=90`);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 });
    const r = await page.evaluate(() => window.__hubCheck);
    console.log((r.pass ? 'PASS ' : 'FAIL ') + cfg + (r.pass ? '' : '\n  ' + r.checks.filter(c => !c.pass).map(c => c.name + ' — ' + c.detail).join('\n  ')));
    if (!r.pass) allPass = false;
    await page.close();
  }
} finally { await browser.close(); srv.kill(); console.log('server stopped'); }
process.exit(allPass ? 0 : 1);
