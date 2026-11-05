import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 2).join(' | ')));
await page.goto(pathToFileURL(resolve(process.argv[2])).href + '#exhibition/dome/cats-dogs'); await page.waitForTimeout(800);
await page.evaluate(() => window.__bb.game.settings.set('camera', 'High'));
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
await page.waitForTimeout(2500); await page.screenshot({ path: 'check-output/high.png' });
await page.evaluate(() => { window.__bb.S.cheats.big = true; });  await page.waitForTimeout(500); await page.screenshot({ path: 'check-output/big.png' });
console.log(await page.evaluate(() => window.__bb.game.view.id), errs.length ? 'ERRORS ' + errs.join(' || ') : 'no errors');
await browser.close();
