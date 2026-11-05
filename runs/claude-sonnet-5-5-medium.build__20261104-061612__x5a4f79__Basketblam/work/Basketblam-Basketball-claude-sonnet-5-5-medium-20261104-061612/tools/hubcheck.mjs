// runs the AI Hub harness against the built game: node tools/hubcheck.mjs <port> [players] [extra query]
import { chromium } from 'playwright';
const [port, players = '2', extra = ''] = process.argv.slice(2);
const base = `http://127.0.0.1:${port}`;
const t = await (await fetch(base + '/game.html')).text();
if (!/<title>BASKETBLAM<\/title>/.test(t)) { console.log('FAIL: server is not serving Basketblam'); process.exit(1); }
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n')[0]));
await page.goto(`${base}/harness.html?game=game.html&players=${players}&auto=1&limit=40${extra}`);
await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }).catch(() => {});
const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, check: window.__hubCheck, text: document.body.innerText.slice(0, 1500) }));
console.log('pass:', res.pass, errs.length ? 'page errors: ' + errs.join(' | ') : '');
if (!res.pass) console.log(JSON.stringify(res.check).slice(0, 1500), '\n', res.text);
await page.screenshot({ path: 'check-output/hub.png' });
await browser.close();
process.exit(res.pass ? 0 : 1);
