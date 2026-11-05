import { open } from './lib.mjs';
const { browser, page, errors } = await open({ q: '?debug' });
await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/dw_office.png' });
console.log(await page.evaluate(() => JSON.stringify({ mode: __M.mode, w: __M.S.world, hero: [__M.hero.x, __M.hero.y] })));
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
await page.screenshot({ path: '/tmp/dw_office2.png' });
console.log(errors.slice(0, 15).join('\n'));
await browser.close();
