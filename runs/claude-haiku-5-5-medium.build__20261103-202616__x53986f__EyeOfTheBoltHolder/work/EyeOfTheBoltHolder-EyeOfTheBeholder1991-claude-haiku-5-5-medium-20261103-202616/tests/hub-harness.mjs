// Runs the AI Hub's own harness against the bundled game: serves the harness, bridge, round and the game on 127.0.0.1 with
// an OS-picked port, opens harness.html for the given query, and waits for __hubCheck. Usage: node tests/hub-harness.mjs "players=2&auto=1"
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out', 'hub'); mkdirSync(out, { recursive: true });
const game = path.resolve(here, '..', '..', 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-haiku-5-5-medium-20261103-202616.html');
copyFileSync(game, path.join(out, 'GAME.html'));
for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(path.join(here, '..', 'hub', f), path.join(out, f));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(out, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'harness.html');
  if (!f.startsWith(out) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const query = process.argv[2] || 'players=2&auto=1';
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(`http://127.0.0.1:${port}/harness.html?game=GAME.html&${query}`);
let done = false;
for (let i = 0; i < 170 && !done; i++) { await new Promise(r => setTimeout(r, 1000)); done = await page.evaluate(() => document.body.dataset.complete === 'true').catch(() => false); }
const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, rows: window.__hubCheck && (window.__hubCheck.rows || window.__hubCheck.checks || null) })).catch(e => ({ err: e.message }));
await browser.close(); server.close();
const rows = Array.isArray(res.rows) ? res.rows : [];
for (const r of rows) console.log((r.pass ? "ok   " : "FAIL ") + r.name + " :: " + (r.detail || "")); for (const r of []) console.log('FAIL ' + JSON.stringify(r).slice(0, 200));
for (const e of errs.slice(0, 5)) console.log('FAIL ' + e);
console.log(`hub ${query}: ${done ? 'complete' : 'timed out'} · pass ${res.pass} · ${rows.length} rows`);
process.exit(res.pass === true && done ? 0 : 1);
