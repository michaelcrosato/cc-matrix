import { launch, ROOT, waitReady, state } from './lib.mjs';
const [q, secs = '6', name = 'shot', vw = '960', vh = '540'] = process.argv.slice(2);
const { browser, page, errs } = await launch({ viewport: { width: +vw, height: +vh } });
await page.goto('file://' + ROOT + '/dist/game.html' + q);
try { await waitReady(page); } catch (e) { console.log('NOT READY', e.message); }
await page.waitForTimeout(+secs * 1000);
console.log(JSON.stringify(await state(page)));
await page.screenshot({ path: ROOT + '/check/' + name + '.png' });
console.log('errs', errs.slice(0, 8));
await browser.close();
