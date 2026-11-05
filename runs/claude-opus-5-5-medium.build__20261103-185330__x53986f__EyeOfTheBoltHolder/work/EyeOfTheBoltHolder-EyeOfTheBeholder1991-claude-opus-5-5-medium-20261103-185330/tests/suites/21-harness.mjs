// harness (Playwright): the AI Hub's own harness, served beside the bundled file on 127.0.0.1 (a port the OS picks):
// two players; four with latency, jitter and loss; and the host leaving. Each must end with window.__hubCheck.pass.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { NAME } from '../../tools/build.mjs';
import { ARGS } from './20-browser.mjs';
const here = new URL('../..', import.meta.url).pathname, root = new URL('../../..', import.meta.url).pathname, out = here + 'tests/out/hub/';
export default async check => {
  mkdirSync(out, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(here + 'hub/' + f, out + f);
  copyFileSync(root + NAME + '.html', out + 'game.html');
  const types = { html: 'text/html', js: 'text/javascript' };
  const server = createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'harness.html'; try { const b = readFileSync(out + p.replace(/\.\./g, '')); res.writeHead(200, { 'content-type': types[p.split('.').pop()] || 'application/octet-stream' }); res.end(b); } catch (e) { res.writeHead(404); res.end(); } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port, base = 'http://127.0.0.1:' + port + '/';
  const browser = await chromium.launch({ args: ARGS });
  try {
    const head = await (await fetch(base + 'game.html')).text();
    check('the server serves our game', head.includes('<title>Eye of the Bolt-Holder</title>'));
    for (const q of (process.env.HQ ? [process.env.HQ] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'scenario=host-leave&auto=1'])) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(base + 'harness.html?game=game.html&' + q);
      let done = false;
      try { await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 240000 }); done = true; } catch (e) { /* timed out */ }
      const r = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, rows: [...document.querySelectorAll('#checklist li.bad')].map(e => e.textContent.trim().replace(/\s+/g, ' ')).slice(0, 12) }));
      check('harness ' + q + ' completes', done);
      check('harness ' + q + ' passes', r.pass === true, r.rows.join(' | '));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
};
