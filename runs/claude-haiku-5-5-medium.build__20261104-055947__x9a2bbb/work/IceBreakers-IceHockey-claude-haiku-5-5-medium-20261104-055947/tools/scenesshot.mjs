// Screenshots for a visual check: the Flood Wagon, and a match in a chosen arena. Usage: node tools/scenesshot.mjs <game.html> <out-prefix>
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
const html = readFileSync(process.argv[2], 'utf8'), out = process.argv[3];
const srv = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port + '/';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(base + '#flood', { waitUntil: 'load' });
await p.waitForTimeout(3000);
await p.screenshot({ path: out + '-flood.png' });
await p.goto(base + '#match', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => window.__game.game.go('match', { cfg: { teams: [0, 1], arena: 2, humans: 0, seed: 9, mode: 'exhibition' } }, { fade: 0 }));
await p.waitForTimeout(9000);
await p.screenshot({ path: out + '-pond.png' });
await b.close(); srv.close();
