// The real AI Hub harness (lib/hub/harness.html) in headless Chromium: the bundled game served beside it from
// 127.0.0.1 on a port the OS picks; the four runs the hub's own test makes. The server is ours and is closed after.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';
import { chromium } from 'playwright';
import { suite } from './lib.mjs';
import { bundle, NAME } from '../build.mjs';
const root = new URL('../', import.meta.url), serve = new URL('./.serve/', root);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
export default async function () {
  const S = suite('hub');
  bundle();
  mkdirSync(serve, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('./hub/' + f, root), new URL(f, serve));
  writeFileSync(new URL('game.html', serve), readFileSync(new URL('../' + NAME + '.html', root)));
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'harness.html';
    if (p.includes('..')) { res.writeHead(403); res.end(); return; }
    try { const body = readFileSync(new URL(p, serve)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body); } catch (e) { res.writeHead(404); res.end('not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page0 = await browser.newPage(); await page0.goto(base + 'game.html'); const title = await page0.title(); await page0.close();
    S.check('the served page is this game', title === 'Gauntletdown', title);
    const runs = [['players=2&auto=1', '2 players'], ['players=4&latency=150&jitter=50&loss=5&auto=1', '4 players, 150 ms, 5% loss'], ['players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'the host leaves'], ['players=2&scenario=server&auto=1', 'a server round']];
    for (const [q, label] of runs) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(base + 'harness.html?game=game.html&' + q);
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); } catch (e) { S.check(label + ': the harness completes', false, 'timed out'); }
      const rep = await page.evaluate(() => window.__hubCheck && { pass: window.__hubCheck.pass, checks: window.__hubCheck.checks.map(c => ({ name: c.name, pass: c.pass, detail: c.detail })) });
      S.check(label + ': the harness passes', rep && rep.pass, rep ? rep.checks.filter(c => !c.pass) : 'no report');
      if (rep) for (const c of rep.checks) S.check(label + ': ' + c.name, c.pass, c.detail);
      await page.close();
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
  return S;
}
