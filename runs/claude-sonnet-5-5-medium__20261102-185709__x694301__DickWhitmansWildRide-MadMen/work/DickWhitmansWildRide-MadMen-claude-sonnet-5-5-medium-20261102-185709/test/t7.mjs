import { open } from './lib.mjs';
let { browser, page, errors } = await open({ q: '?debug' });
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
const ev = f => page.evaluate(f);
await ev(() => { __M.S.composure = 0; }); await page.waitForTimeout(600);
console.log('meltdown', await ev(() => JSON.stringify({ talk: __M.talkRef().open, m: __M.S.meltdowns, c: __M.S.composure })));
for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(500); }
await ev(() => { __M.S.haze = 98; }); await page.waitForTimeout(600);
console.log('blackout', await ev(() => JSON.stringify({ talk: __M.talkRef().open, b: __M.S.blackouts, h: __M.S.haze, clk: Math.round(__M.S.clock) })));
for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(500); }
await ev(() => { __game.saves.save(0); }); await page.waitForTimeout(300);
console.log('saves', await ev(() => JSON.stringify(__game.saves.list().slice(0, 2)).slice(0, 300)));
await ev(() => { __M.S.rep = 77; __game.saves.load(0); }); await page.waitForTimeout(1200);
console.log('loaded', await ev(() => JSON.stringify({ rep: __M.S.rep, sc: !!__game.scene, mode: __M.mode })));
// smoke + drink + cart
await page.keyboard.press('KeyF'); await page.waitForTimeout(300);
console.log('smoke', await ev(() => JSON.stringify({ cigs: __M.S.cigs, comp: __M.S.composure })));
console.log(errors.join('\n'));
await browser.close();
