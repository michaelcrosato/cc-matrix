import { launch, ROOT, waitReady, state } from './lib.mjs';
const q = process.argv[2] || '';
const { browser, page, errs } = await launch();
await page.goto('file://' + ROOT + '/dist/game.html' + q);
try { await waitReady(page); } catch (e) { console.log('NOT READY', e.message); }
for (let i = 0; i < 6; i++) { await page.waitForTimeout(1500); console.log(JSON.stringify(await state(page))); }
await page.screenshot({ path: ROOT + '/check/try.png' });
console.log('errs', errs.slice(0, 8));
await browser.close();
