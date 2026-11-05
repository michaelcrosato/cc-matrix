// A screenshot of a Cup Run cutscene (the portraits and the chapter's first line). Usage: node tools/cutsceneshot.mjs <game.html> <out.png>
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
const html = readFileSync(process.argv[2], 'utf8');
const srv = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://127.0.0.1:' + srv.address().port + '/#cutscene', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[3] });
await b.close(); srv.close();
