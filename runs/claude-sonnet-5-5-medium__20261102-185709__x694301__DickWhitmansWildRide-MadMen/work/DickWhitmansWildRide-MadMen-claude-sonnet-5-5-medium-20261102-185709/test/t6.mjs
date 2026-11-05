import { open } from './lib.mjs';
let { browser, page, errors } = await open({ q: '?debug' });
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
const t = await page.evaluate(() => document.body.innerText);
console.log(['Invert stick horizontal', 'Invert stick vertical', 'Controller glyphs', 'Difficulty', 'Hints'].map(s => s + ': ' + t.includes(s)).join('\n'));
console.log(errors.join('\n'));
await browser.close();
