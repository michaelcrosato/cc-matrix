import { open, pw } from './lib.mjs';
const q = process.argv[2] || 'players=2&auto=1';
const browser = await pw.chromium.launch({ executablePath: '/home/micha/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:18431/harness.html?game=game.html&' + q);
for (let i = 0; i < 50; i++) { await page.waitForTimeout(2000); if (await page.evaluate(() => document.body.dataset.complete === 'true')) break; }
console.log(JSON.stringify(await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, c: window.__hubCheck }))).slice(0, 2500));
await page.screenshot({ path: '/tmp/hub.png' });
console.log(errs.join('\n'));
await browser.close();
