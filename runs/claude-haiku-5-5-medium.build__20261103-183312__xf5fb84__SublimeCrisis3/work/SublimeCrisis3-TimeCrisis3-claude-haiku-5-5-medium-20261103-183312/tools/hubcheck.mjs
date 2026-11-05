// Runs the AI Hub harness against the game: opens harness.html (served from hubtest/, on 127.0.0.1) with N players and
// waits for window.__hubCheck. Usage: node tools/hubcheck.mjs PORT [players] [extra query]
import { chromium } from 'playwright';
const port = process.argv[2];
const players = process.argv[3] || '2';
const extra = process.argv[4] || '';
if (!port) { console.log('FAIL usage: node tools/hubcheck.mjs PORT [players]'); process.exit(1); }
const url = `http://127.0.0.1:${port}/harness.html?game=GAME.html&players=${players}&auto=1${extra}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(url, { waitUntil: 'load' });
let res = null;
const t0 = Date.now();
while (Date.now() - t0 < 240000) {
  res = await page.evaluate(() => (window.__hubCheck ? { pass: window.__hubCheck.pass, done: document.body.dataset.complete, checks: window.__hubCheck.checks || window.__hubCheck.list || null } : null)).catch(() => null);
  if (res && res.done === 'true') break;
  await page.waitForTimeout(2000);
}
await page.screenshot({ path: 'check-output/hub-harness.png' }).catch(() => {});
await browser.close();
console.log(JSON.stringify({ url, pass: res && res.pass, done: res && res.done, pageErrors: errs.slice(0, 5), checks: res && res.checks }).slice(0, 3000));
process.exit(res && res.pass ? 0 : 1);
