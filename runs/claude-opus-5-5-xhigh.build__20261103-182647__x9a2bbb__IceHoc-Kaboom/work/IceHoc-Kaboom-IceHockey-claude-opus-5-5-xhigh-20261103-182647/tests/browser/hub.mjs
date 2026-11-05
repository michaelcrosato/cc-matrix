// The AI Hub harness (18.6): serve hub/ on a port the OS picks, confirm the page is this game, run the hub's checks in
// four configurations, then check the game outside a session still reaches its title. Stops only its own server.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { check, guard } from '../t.mjs';
guard('hub', async () => {
  const dir = new URL('../../hub/', import.meta.url).pathname;
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 15000); });
  const base = 'http://127.0.0.1:' + port + '/';
  try {
    const page0 = await (await fetch(base + 'game.html')).text(); check('the served page is Ice Hoc-Kaboom', page0.includes('<title>Ice Hoc-Kaboom</title>'));
    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const runs = (process.env.HUBRUNS || 'players=2&auto=1,players=4&latency=150&jitter=50&loss=5&auto=1,players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1,players=2&scenario=server&auto=1').split(',');
    for (const q of runs) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(base + 'harness.html?game=game.html&' + q);
      let done = false; for (let i = 0; i < 360 && !done; i++) { await page.waitForTimeout(1000); done = await page.evaluate(() => document.body.dataset.complete === 'true'); }
      const res = await page.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, failed: (window.__hubCheck.checks || window.__hubCheck.items || []).filter(c => c && (c.ok === false || c.pass === false)).map(c => c.name || c.label || c.text || JSON.stringify(c)) } : null);
      check('hub harness ' + q + ' completes', done); check('hub harness ' + q + ' passes', !!(res && res.pass), JSON.stringify(res) + ' ' + errs.slice(0, 2).join(' | '));
      if (process.env.HUBSHOT) await page.screenshot({ path: new URL('../../shots/hub-' + q.replace(/[^a-z0-9]+/g, '_') + '.png', import.meta.url).pathname });
      await page.close();
    }
    // outside a session the game still reaches its title
    const page = await browser.newPage(); await page.goto(base + 'game.html'); await page.waitForTimeout(3000);
    check('outside a session the game reaches the title', await page.evaluate(() => window.__game && window.__game.game.sceneName === 'title'));
    await browser.close();
  } finally { srv.kill(); }
});
