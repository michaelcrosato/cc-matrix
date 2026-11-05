// The AI Hub harness in Chromium (--hub): copy the bundle beside hub/harness.html, serve that folder on 127.0.0.1 at a
// port the OS picks (stopped when done: our own server only), confirm the page is this game, then run the harness's
// automatic check for 2 players, for 4 on a bad network, and with the host leaving; then open the bundle alone.
// Prints FAIL lines and "N passed, M failed".
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), hubDir = join(root, 'hub');
const NAME = 'BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html';
copyFileSync(join(root, '..', NAME), join(hubDir, 'game.html'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = join(hubDir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'harness.html');
  if (!p.startsWith(hubDir) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port, base = `http://127.0.0.1:${port}/`;
let passed = 0, failed = 0;
const ck = (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log('FAIL [hub] ' + name + (detail ? ': ' + String(detail).slice(0, 600) : '')); } };
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const html = await (await fetch(base + 'game.html')).text();
  ck('the served page is this game', /<title>Batzooka Baseball<\/title>/.test(html));
  for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
    await page.goto(base + 'harness.html?game=game.html&' + q);
    await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 });
    const rep = await page.evaluate(() => window.__hubCheck);
    ck('harness ' + q, rep && rep.pass, rep ? rep.checks.filter(c => !c.pass).map(c => c.name + ' — ' + c.detail).join(' | ') : 'no report');
  }
  // the bundle alone, outside a session, reaches the title
  const p2 = await browser.newPage(); const errs = []; p2.on('pageerror', e => errs.push(String(e)));
  await p2.goto(base + 'game.html'); await p2.waitForTimeout(2500);
  const scene = await p2.evaluate(() => My3D2dge.current && My3D2dge.current.sceneName);
  ck('outside a session the game reaches its title', scene === 'title', scene + ' ' + errs.join(' '));
} catch (e) { ck('the harness ran', false, e.stack); }
await browser.close();
server.close();
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
