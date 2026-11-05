// runs the AI Hub harness's conformance scenario against tests/_game.html: node tools/hubcheck.mjs <port> [players] [scenario]
import { chromium } from 'playwright';
const [port, players = '3', scenario = 'standard'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
await p.goto(`http://127.0.0.1:${port}/hub/harness.html?game=/tests/_game.html&players=${players}&auto=1&play=9000&scenario=${scenario}`);
await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 });
const rep = await p.evaluate(() => window.__hubCheck);
for (const c of rep.checks) console.log((c.pass ? 'ok   ' : 'FAIL ') + c.name + (c.pass ? '' : ' — ' + c.detail));
console.log(rep.pass ? 'HUB CONFORMANCE PASS' : 'HUB CONFORMANCE FAIL');
if (errs.length) console.log('page errors:', errs.slice(0, 3).join('\n'));
await p.screenshot({ path: 'shots/hub.png' });
await b.close();
