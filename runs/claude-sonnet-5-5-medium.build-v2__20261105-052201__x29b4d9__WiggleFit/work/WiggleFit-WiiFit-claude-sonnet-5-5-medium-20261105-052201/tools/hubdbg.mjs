import { chromium } from 'playwright'; import http from 'node:http'; import { readFileSync } from 'node:fs'; import { RENDER, GAME } from './lib.mjs'; import { FILE } from '../src/data/config.js';
const files = { '/harness.html': 'tools/hub/harness.html', '/bridge.js': 'tools/hub/bridge.js', '/round.js': 'tools/hub/round.js', ['/' + FILE + '.html']: GAME };
const srv = http.createServer((q, r) => { const f = files[q.url.split('?')[0]]; if (!f) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(readFileSync(f)); }); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port; const b = await chromium.launch({ args: [...RENDER, '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage(); pg.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); }); pg.on('pageerror', (e) => console.log('PAGEERR', e.message.slice(0, 200)));
await pg.goto(`${base}/harness.html?game=${FILE}.html&${process.argv[2]}&auto=1&limit=190`); await pg.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 250000 });
console.log(JSON.stringify(await pg.evaluate(() => { const h = window.__hubCheck; return { pass: h.pass, bad: (h.checks || []).filter((c) => c.ok !== true && c.pass !== true).slice(0, 5), log: (h.log || []).filter((l) => /error|fail|exception|dialog|socket/i.test(JSON.stringify(l))).slice(0, 6) }; })));
await b.close(); srv.close();
