// the AI Hub harness, 4 runs: 2 players; 4 players on a bad network; the host leaving; a server copy with no player
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite } from './lib.mjs';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = 'MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html';
export default async () => {
  const S = suite('hub'), dir = join(DEV, '.cache/serve'); mkdirSync(dir, { recursive: true });
  copyFileSync(join(DEV, '..', OUT), join(dir, 'game.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(DEV, 'vendor/hub', f), join(dir, f));
  const types = { '.html': 'text/html', '.js': 'text/javascript' };
  const server = http.createServer((q, r) => { try { const p = join(dir, decodeURIComponent(new URL(q.url, 'http://x').pathname)); r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p)); } catch (e) { r.writeHead(404); r.end(); } });
  await new Promise(res => server.listen(0, '127.0.0.1', res)); const port = server.address().port;
  const b = await chromium.launch();
  try {
    const p0 = await b.newPage(); await p0.goto(`http://127.0.0.1:${port}/game.html`); await p0.waitForTimeout(1500);
    S.check('the page served is MASH TV', await p0.evaluate(() => document.title === 'MASH TV' && !!window.MT)); await p0.close();
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1']) {
      const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
      await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
      await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }).catch(() => {});
      const rep = await p.evaluate(() => window.__hubCheck || null);
      const failed = rep && rep.checks ? rep.checks.filter(c => !c.pass).map(c => c.name + (c.detail ? ' (' + c.detail + ')' : '')) : ['no report'];
      S.check('harness PASS: ' + q, !!(rep && rep.pass), failed.join('; ').slice(0, 600));
      await p.close();
    }
  } finally { await b.close(); server.close(); }
  return S;
};
