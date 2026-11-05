// The AI Hub harness, run against the bundle (section 8.4): node test/hub-harness.mjs <port>
// The server is started by the caller (python3 -m http.server 0 --bind 127.0.0.1 in test/.serve), and stopped by its PID.
import { chromium } from '../engine/node_modules/playwright/index.mjs';
const port = process.argv[2];
if (!port) { console.log('usage: node test/hub-harness.mjs <port>'); process.exit(2); }
const SCENARIOS = [
  ['2 players, auto', 'players=2&auto=1'],
  ['4 players, latency, jitter and loss', 'players=4&latency=150&jitter=50&loss=5&auto=1'],
  ['host leaves', 'players=4&scenario=host-leave&auto=1'],
];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
let fails = 0;
for (const [name, q] of SCENARIOS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
  try {
    await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 420000, polling: 1000 });
    const r = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, items: (window.__hubCheck && window.__hubCheck.items) || window.__hubCheck }));
    if (r.pass) console.log(`PASS ${name}`);
    else { fails++; console.log(`FAIL ${name}: ` + JSON.stringify(r.items).slice(0, 1500)); }
  } catch (e) { fails++; console.log(`FAIL ${name}: did not complete (${e.message.split('\n')[0]})`); }
  if (errs.length) console.log('  page errors: ' + errs.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} scenario(s) failed` : 'all hub scenarios passed');
process.exit(fails ? 1 : 0);
