import { chromium, devices } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = process.argv[2];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
// touch-only phone
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 2).join(' | ')));
await page.goto(pathToFileURL(resolve(file)).href + '#title'); await page.waitForTimeout(1500);
await page.screenshot({ path: 'check-output/touch.png' });
await page.waitForTimeout(4500); console.log('touch scene after 6s:', await page.evaluate(() => window.__bb.game.sceneName));
await page.screenshot({ path: 'check-output/touch-attract.png' });
await ctx.close();
// desktop: idle 10s -> attract, key exits; high camera
const page2 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page2.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 2).join(' | ')));
await page2.goto(pathToFileURL(resolve(file)).href + '#title'); await page2.waitForTimeout(11500);
console.log('desktop scene after 11.5s idle:', await page2.evaluate(() => window.__bb.game.sceneName));
await page2.keyboard.press('KeyK'); await page2.waitForTimeout(800);
console.log('after key:', await page2.evaluate(() => window.__bb.game.sceneName));
await page2.goto(pathToFileURL(resolve(file)).href + '#exhibition/alley/cats-dogs'); await page2.waitForTimeout(800);
await page2.evaluate(() => window.__bb.game.settings.set('camera', 'High')); await page2.waitForTimeout(300);
for (let i = 0; i < 6; i++) { await page2.keyboard.press('Space'); await page2.waitForTimeout(300); }
await page2.waitForTimeout(2500); await page2.screenshot({ path: 'check-output/high.png' });
console.log(errs.length ? 'ERRORS ' + errs.join(' || ') : 'no errors');
await browser.close();
