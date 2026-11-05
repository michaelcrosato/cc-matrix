import { open } from './lib.mjs';
const { browser, page, errors } = await open({ q: '?debug' });
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
const ev = async (f) => page.evaluate(f);
// pitch
await ev(() => { const S = __M.S; S.flags = { gwen: 1, joyce: 1, margie: 1, dunn: 1, roland: 1, percy: 1, pitch1: 1, margie_credit: 1 }; __M.giveSlide('martini'); __M.giveSlide('quiet'); __M.giveSlide('headline'); __M.startPitch('teague'); });
await page.waitForTimeout(2200);
await page.screenshot({ path: '/tmp/dw_pitch1.png' });
await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/dw_pitch2.png' });
await page.waitForTimeout(2500);
// journal
await ev(() => { __M.mode = 'world'; __M.openJournal(); }); await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/dw_journal.png' });
// ending
await ev(() => { __M.mode = 'world'; __M.S.flags.won1 = 1; __M.S.flags.won2 = 1; __M.endDay(); }); await page.waitForTimeout(16000);
await page.screenshot({ path: '/tmp/dw_end.png' });
console.log(errors.slice(0, 15).join('\n'));
await browser.close();
