// node test/hub.mjs PORT: runs the AI Hub harness in its four configurations; prints failing checks only
import { chromium } from '../tools/node_modules/playwright/index.mjs';
const port = process.argv[2];
const runs = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=2&scenario=server&auto=1'];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failed = 0;
for (const q of runs) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
  try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000 }); } catch (e) { console.log('FAIL hub › ' + q + ': timed out'); failed++; await page.close(); continue; }
  const r = await page.evaluate(() => window.__hubCheck);
  if (!r || !r.pass) { failed++; console.log('FAIL hub › ' + q + ': ' + JSON.stringify((r && (r.checks || r.failed || r)) || null).slice(0, 1500)); }
  else console.log('ok ' + q);
  await page.close();
}
await browser.close();
console.log(failed ? failed + ' hub runs failed' : 'hub: all passed');
