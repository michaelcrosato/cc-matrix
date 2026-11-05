// usage: node tests/hub.mjs <port> "<query>" [seconds]
import { chromium } from 'playwright';
const [port, q = 'players=2&auto=1', secs = '40'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + (e.stack || e).toString().slice(0, 400)));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
const t0 = Date.now(); let done = false;
while (Date.now() - t0 < secs * 1000) { await p.waitForTimeout(1000); done = await p.evaluate(() => document.body.dataset.complete === 'true'); if (done) break; }
const res = await p.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, complete: document.body.dataset.complete, check: window.__hubCheck }));
console.log('done', done, 'pass', res.pass); console.log(JSON.stringify(res.check, null, 1).slice(0, 3000));
await p.screenshot({ path: 'shots/hub-' + q.replace(/[^a-z0-9]/gi, '_') + '.png' });
console.log(errs.length ? errs.slice(0, 8).join('\n') : 'no page errors');
await b.close();
