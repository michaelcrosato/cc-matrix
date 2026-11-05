// The AI Hub harness, as the hub runs it when a game joins the library: 4 players on a lossy network, the host leaving,
// a server host with 2 players, and 1 player. The game is served with the harness from 127.0.0.1 on a port the OS
// picks; the server is stopped by its own PID.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { DEV } from '../lib/load.mjs';
import { build } from '../../tools/build.mjs';
export default async function (t) {
  build();
  const dir = join(DEV, 'test-output/hub-serve'); mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(DEV, 'hub', f), join(dir, f));
  copyFileSync(join(DEV, '..', basename(DEV) + '.html'), join(dir, 'game.html'));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 10000); });
    const base = `http://127.0.0.1:${port}/`;
    const page0 = await (await fetch(base + 'game.html')).text();
    t.ok('the served page is this game', /<title>Ahead or Alive: Xtreme Beach Volleyball<\/title>/.test(page0));
    const browser = await chromium.launch();
    try {
      const runs = [['4 players, 150 ms, jitter, 5% loss', 'players=4&latency=150&jitter=50&loss=5&auto=1'], ['the host leaves', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'], ['a server host, 2 players', 'players=2&scenario=server&auto=1'], ['1 player', 'players=1&auto=1']];
      for (const [name, q] of runs) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.goto(base + 'harness.html?game=game.html&' + q);
        const done = await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).then(() => true, () => false);
        const rep = await page.evaluate(() => window.__hubCheck ? JSON.parse(JSON.stringify(window.__hubCheck)) : null);
        const fails = rep && rep.checks ? rep.checks.filter(c => !c.pass).map(c => c.name + (c.detail ? ' (' + c.detail + ')' : '')) : ['no report'];
        t.ok('hub harness: ' + name, done && rep && rep.pass === true, fails.slice(0, 4).join('; '));
        await page.screenshot({ path: join(DEV, 'test-output/hub-' + name.replace(/\W+/g, '-') + '.png') });
        await page.close();
      }
    } finally { await browser.close(); }
  } finally { srv.kill('SIGTERM'); }
}
