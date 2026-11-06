#!/usr/bin/env node
// Serves the harness beside a copy of the deliverable on 127.0.0.1, port 0, and reports its checks.
import { createServer } from 'node:http';
import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { DEV, HTML, launch } from './browser.mjs';

const site = join(DEV, '.build/hubsite');
mkdirSync(site, { recursive: true });
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(DEV, 'tools/hub', f), join(site, f));
copyFileSync(HTML, join(site, 'game.html'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
export function serve() {
  return new Promise((res) => {
    const srv = createServer((req, r) => {
      const p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/, '');
      const file = join(site, p);
      if (!file.startsWith(site) || !existsSync(file)) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      r.end(readFileSync(file));
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

export async function runVariant(browser, port, query, limitMs = 280000) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${query}`);
  const title = await page.title();
  try {
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: limitMs });
  } catch { /* report below */ }
  const rep = await page.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, done: window.__hubCheck.done, checks: window.__hubCheck.checks, log: window.__hubCheck.log?.slice?.(-12) } : null);
  await ctx.close();
  return { title, rep };
}

if (process.argv[1]?.endsWith('hubcheck.mjs')) {
  const variants = process.argv[2] ? [process.argv[2]] : ['players=2&auto=1'];
  const { srv, port } = await serve();
  const browser = await launch();
  for (const v of variants) {
    const { rep } = await runVariant(browser, port, v);
    console.log(v, rep?.pass ? 'PASS' : 'FAIL');
    for (const c of rep?.checks ?? []) if (!c.pass) console.log('  x', c.name, String(c.detail).slice(0, 300));
    if (!rep?.pass) console.log((rep?.log ?? []).join('\n').slice(0, 1500));
  }
  await browser.close();
  srv.close();
}
