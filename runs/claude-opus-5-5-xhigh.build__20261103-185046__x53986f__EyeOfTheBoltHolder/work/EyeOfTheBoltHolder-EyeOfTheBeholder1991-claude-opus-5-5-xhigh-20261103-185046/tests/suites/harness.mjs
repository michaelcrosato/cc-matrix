// harness: the AI Hub's own test page plays the hub round with copies of the game (2 players; 4 with latency, jitter and
// loss; the host leaving). It passes when window.__hubCheck.pass is true. The suite serves tests/out/hub on 127.0.0.1:0.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { ARGS } from '../shot.mjs';
const NAME = 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046.html';
export async function run(t) {
  process.env.TMPDIR = new URL('../../.tmp/', import.meta.url).pathname;
  const dir = new URL('../out/hub/', import.meta.url); mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('../../hub/' + f, import.meta.url), new URL(f, dir));
  copyFileSync(new URL('../../../' + NAME, import.meta.url), new URL('game.html', dir));
  const types = { html: 'text/html', js: 'text/javascript' };
  const server = createServer((q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname).replace(/^\/+/, '') || 'harness.html'; try { const b = readFileSync(new URL(p, dir)); r.writeHead(200, { 'content-type': types[p.split('.').pop()] || 'application/octet-stream' }); r.end(b); } catch (e) { r.writeHead(404); r.end(); } });
  await new Promise(res => server.listen(0, '127.0.0.1', res)); const port = server.address().port, base = `http://127.0.0.1:${port}/`;
  const title = await (await fetch(base + 'game.html')).text(); t.check('the server serves our game', /<title>Eye of the Bolt-Holder<\/title>/.test(title));
  const browser = await chromium.launch({ args: ARGS });
  try {
    for (const q of (process.env.HQ ? [process.env.HQ] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1'])) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(base + 'harness.html?game=' + encodeURIComponent('game.html?backend=webgl') + '&' + q);
      let done = false; try { await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 420000, polling: 1000 }); done = true; } catch (e) { /* timed out */ }
      const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, rows: ((window.__hubCheck && window.__hubCheck.checks) || []).filter(c => !c.pass).map(c => c.name + ': ' + c.detail).slice(0, 12), log: ((window.__hubCheck && window.__hubCheck.log) || []).slice(-15) }));
      t.check('harness ' + q + ': complete', done);
      t.check('harness ' + q + ': __hubCheck.pass', res.pass === true, res.rows.join(' / ') + (process.env.HLOG ? ' LOG ' + res.log.join(' | ') : ''));
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
}
