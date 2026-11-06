// Tier 4: the AI Hub harness against the built bundle, served from 127.0.0.1 on a port the OS picks.
import { createServer } from 'node:http';
import { readFileSync, copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { launch, HTML, ROOT } from '../../tools/browser.mjs';
import { FILE_STEM } from '../../src/data/meta.js';
export const name = 'hub';
const VARIANTS = [
  ['2 players', 'players=2&auto=1'],
  ['4 players lossy', 'players=4&latency=150&jitter=50&loss=5&auto=1'],
  ['4 players host-leave', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1'],
  ['server', 'players=2&scenario=server&auto=1'],
  ['1 player', 'players=1&auto=1'],
];
export async function run(t) {
  const dir = join(ROOT, 'tests', 'hub-run'); mkdirSync(dir, { recursive: true });
  for (const [src, dst] of [['hub_harness.html', 'harness.html'], ['hub_bridge.js', 'bridge.js'], ['hub_round.js', 'round.js']]) copyFileSync(join(ROOT, src), join(dir, dst));
  copyFileSync(HTML, join(dir, 'GAME.html'));
  const types = { '.html': 'text/html', '.js': 'text/javascript' };
  const srv = createServer((req, res) => { const u = new URL(req.url, 'http://x'); const f = join(dir, u.pathname === '/' ? 'harness.html' : u.pathname); if (!f.startsWith(dir) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f)); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const only = process.env.HUB_ONLY ? process.env.HUB_ONLY.split(',').map(Number) : null;
  const b = await launch();
  try {
    for (let i = 0; i < VARIANTS.length; i++) {
      if (only && !only.includes(i)) continue;
      const [label, q] = VARIANTS[i];
      const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=GAME.html&${q}`);
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 }); } catch { t.fail(`hub ${label}: harness did not complete`); }
      const r = await page.evaluate(() => (window.__hubCheck ? { pass: window.__hubCheck.pass, fails: (window.__hubCheck.items || window.__hubCheck.checks || []).filter((c) => c.ok === false || c.pass === false).map((c) => c.name || c.label || JSON.stringify(c)).slice(0, 8) } : null));
      t.ok(r && r.pass, `hub ${label}: ${r ? JSON.stringify(r.fails) : 'no __hubCheck'} ${errs.slice(0, 2).join('|')}`);
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
}
