// Hub suite: the AI Hub harness in Chromium, served from 127.0.0.1 on a port the OS picks (stopped by its own handle).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const root = new URL('..', import.meta.url).pathname, serve = root + '.serve/', NAME = 'Gauntletdown-Gauntlet-claude-opus-5-5-medium-20261104-050247.html';
export default async function (check) {
  mkdirSync(serve, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(root + 'hub/' + f, serve + f);
  copyFileSync(root + 'game/' + NAME, serve + 'game.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript' };
  const srv = createServer((q, s) => { const p = join(serve, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '')); if (!p.startsWith(serve) || !existsSync(p)) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); s.end(readFileSync(p)); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, base = 'http://127.0.0.1:' + port + '/';
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const title = await (await fetch(base + 'game.html')).text().then(t => (t.match(/<title>([^<]*)/) || [])[1]);
    check('the served page is this game', title === 'Gauntletdown', title);
    const runs = process.env.HUB_RUNS ? process.env.HUB_RUNS.split(',') : ['players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'players=2&scenario=server'];
    for (const q of runs) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(base + 'harness.html?game=game.html&' + q + '&auto=1');
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }).catch(() => {});
      const res = await page.evaluate(() => window.__hubCheck || null);
      const fails = res && res.checks ? res.checks.filter(c => !c.pass && !c.ok).map(c => (c.name || c.label) + ': ' + (c.detail || '')) : [];
      check('harness ' + q, res && res.pass === true, res ? fails.join(' | ') || JSON.stringify(res).slice(0, 600) : 'no result (timeout)');
      if (process.env.HUB_SHOT) await page.screenshot({ path: root + 'shots/hub-' + q.replace(/[^a-z0-9]/gi, '_') + '.png' });
      await page.close();
    }
  } finally { await browser.close(); srv.close(); }
}
