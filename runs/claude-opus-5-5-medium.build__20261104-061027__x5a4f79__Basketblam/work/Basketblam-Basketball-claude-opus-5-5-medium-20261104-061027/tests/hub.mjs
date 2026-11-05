// the hub suite: the AI Hub harness's four scenarios against the bundle, served from 127.0.0.1 on a port the OS picks;
// the server is checked to serve our page and is stopped by its PID
import { chromium } from 'playwright'; import { spawn } from 'node:child_process'; import { mkdirSync, copyFileSync } from 'node:fs';
export async function runHub() {
  const out = [], dir = 'build/hub'; mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync('vendor/hub-harness/' + f, dir + '/' + f);
  copyFileSync('build/game.html', dir + '/game.html');
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 8000); });
  try {
    const base = `http://127.0.0.1:${port}`, html = await (await fetch(base + '/game.html')).text();
    out.push(['the server serves our page', /<title>BASKETBLAM<\/title>/.test(html), html.slice(0, 80)]);
    const browser = await chromium.launch();
    for (const q of ['players=2&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45', 'players=4&latency=150&jitter=50&loss=5&auto=1&limit=45&scenario=host-leave', 'players=2&scenario=server&auto=1&limit=45']) {
      const page = await browser.newPage();
      await page.goto(`${base}/harness.html?game=game.html&${q}`);
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 180000 }).catch(() => {});
      const r = await page.evaluate(() => window.__hubCheck || null);
      const fails = r ? r.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail) : ['no result'];
      out.push(['harness ' + q, !!(r && r.pass), fails.join(' | ')]);
      await page.close();
    }
    await browser.close();
  } finally { srv.kill('SIGTERM'); }
  return out;
}
