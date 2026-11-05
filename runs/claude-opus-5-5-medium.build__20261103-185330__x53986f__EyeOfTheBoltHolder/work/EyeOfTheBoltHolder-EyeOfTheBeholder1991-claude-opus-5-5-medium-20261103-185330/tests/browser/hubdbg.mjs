import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { ARGS } from '../suites/20-browser.mjs';
const out = new URL('../out/hub/', import.meta.url).pathname;
const server = createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, ''); try { const b = readFileSync(out + p); res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'text/javascript' }); res.end(b); } catch (e) { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ARGS }), page = await browser.newPage();
await page.goto('http://127.0.0.1:' + server.address().port + '/harness.html?game=game.html&players=2&auto=1');
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(3000);
  for (const f of page.frames()) { try { const s = await f.evaluate(() => window.B && B.game ? [B.game.sceneName, B.Hub.active, B.Hub.startAt, window.AIHub && AIHub.time(), B.Hub.ended, B.S && B.S.race && B.S.race.t, B.game.errors.map(e => e.message).join()] : null); if (s) console.log(i, JSON.stringify(s)); } catch (e) {} }
}
console.log(await page.evaluate(() => [...document.querySelectorAll('#checklist li')].map(e => e.className + ' ' + e.textContent.trim().slice(0, 100)).join('\n')));
await browser.close(); server.close();
