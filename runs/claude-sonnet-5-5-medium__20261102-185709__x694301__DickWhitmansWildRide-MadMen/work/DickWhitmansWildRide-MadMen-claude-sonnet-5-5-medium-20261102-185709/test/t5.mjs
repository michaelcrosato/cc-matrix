import { open, pw } from './lib.mjs';
let { browser, page, errors } = await open({ q: '?debug' });
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/dw_settings.png' });
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
console.log('scene', await page.evaluate(() => __game.scene && __game.scene.name));
await page.evaluate(() => __game.go('play', { fresh: true })); await page.waitForTimeout(1500);
for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyV'); await page.waitForTimeout(700); await page.screenshot({ path: `/tmp/dw_view${i}.png` }); }
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/dw_pause.png' });
console.log(errors.slice(0, 10).join('\n'));
await browser.close();
const b2 = await pw.chromium.launch({ executablePath: '/home/micha/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b2.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const p2 = await ctx.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
await p2.goto('file://' + new URL('../../DickWhitmansWildRide-MadMen-claude-sonnet-5-5-medium-20261102-185709.html', import.meta.url).pathname);
await p2.waitForTimeout(2000); await p2.screenshot({ path: '/tmp/dw_touch.png' }); console.log(e2.join('\n'));
await b2.close();
