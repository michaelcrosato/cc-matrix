// The AI Hub check: the hub's own harness (hub/harness.html) runs the game as 1 to 4 copies on a simulated network, with
// latency and loss, a server-hosted round, and a host who leaves, and reports the hub's verdict for each. Copies the
// latest build to hub/game.html first. Prints the failures and a count; exit code 1 on a failure.
import { createServer } from 'node:http';
import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hub = join(root, 'hub');
copyFileSync(join(root, '..', 'IceBreakers-IceHockey-claude-haiku-5-5-medium-20261104-055947.html'), join(hub, 'game.html'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer((req, res) => {
  const f = join(hub, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'harness.html');
  if (!existsSync(f) || !f.startsWith(hub)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/';
const VARIANTS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=server&auto=1', 'players=4&auto=1&scenario=host-leave'];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0, pass = 0;
try {
  for (const q of VARIANTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'harness.html?game=game.html&' + q, { waitUntil: 'load' });
    let st = null;
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(1000);
      st = await page.evaluate(() => ({ done: document.body.dataset.complete === 'true', pass: !!(window.__hubCheck && window.__hubCheck.pass),
        failed: window.__hubCheck ? Object.entries(window.__hubCheck).filter(([, v]) => v === false).map(([k]) => k) : [] }));
      if (st.done) break;
    }
    if (st && st.pass && !errors.length) pass++;
    else { fail++; console.log('FAIL hub ' + q + ': ' + (st && st.done ? 'checks failed: ' + (st.failed.join(', ') || 'none named') : 'did not finish') + (errors.length ? '; errors: ' + errors.slice(0, 2).join(' | ') : '')); }
    await page.close();
  }
} finally { await browser.close(); server.close(); }
console.log(fail ? `${pass} hub rounds passed, ${fail} failed` : `all ${pass} hub rounds passed`);
process.exit(fail ? 1 : 0);
