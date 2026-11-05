import { chromium } from '../pw/node_modules/playwright/index.mjs';
const [port, q, secs] = [process.argv[2], process.argv[3], +(process.argv[4] || 60)];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const page = await b.newPage({ viewport: { width: 1400, height: 800 } });
await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
for (let i = 0; i < secs; i++) { await page.waitForTimeout(1000); if (await page.evaluate(() => document.body.dataset.complete === 'true')) break; }
console.log(q, '=> pass:', await page.evaluate(() => window.__hubCheck && window.__hubCheck.pass)); await b.close();
