// Runs the AI Hub harness (hub/harness.html) against the game in hub/game.html, in Chromium: N copies of the game on a
// simulated network, and the hub's own checks. Usage: node tools/hubcheck.mjs <base-url> [query]
// Prints the checklist's failures and whether window.__hubCheck.pass is true.
import { chromium } from 'playwright';
const base = process.argv[2], query = process.argv[3] || 'players=2&auto=1';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + 'harness.html?game=game.html&' + query, { waitUntil: 'load' });
let state = null;
for (let i = 0; i < 300; i++) {
  await page.waitForTimeout(1000);
  state = await page.evaluate(() => ({ done: document.body.dataset.complete === 'true', pass: !!(window.__hubCheck && window.__hubCheck.pass), check: window.__hubCheck ? JSON.parse(JSON.stringify(window.__hubCheck, (k, v) => (typeof v === 'function' ? undefined : v))) : null }));
  if (state.done) break;
}
const fails = []; if (state && state.check) for (const [k, v] of Object.entries(state.check)) { if (v === false) fails.push(k); }
console.log(JSON.stringify({ query, done: state && state.done, pass: state && state.pass, fails, errors: errors.slice(0, 3) }, null, 1).slice(0, 2500));
await browser.close();
process.exit(state && state.pass ? 0 : 1);
