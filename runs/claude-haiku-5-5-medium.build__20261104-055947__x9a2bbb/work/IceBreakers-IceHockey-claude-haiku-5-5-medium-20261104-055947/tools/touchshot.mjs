// A screenshot of the title as a touch-only device sees it (the notice and the settings button). Usage: node tools/touchshot.mjs <game.html> <out.png>
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
const html = readFileSync(process.argv[2], 'utf8');
const srv = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 800, height: 400 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:' + srv.address().port + '/', { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.screenshot({ path: process.argv[3] });
await b.close(); srv.close();
