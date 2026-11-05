import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page } = await open('', { w: 960, h: 540 }); const ev = f => page.evaluate(f);
await waitStarted(page); await page.waitForTimeout(800);
console.log(await ev(() => { const t = S7.scenes.title, u0 = t.t; return JSON.stringify({ t: u0, idle: t.idle, same: S7.game.scene === t, name: S7.game.sceneName }); }));
await page.waitForTimeout(600); console.log(await ev(() => JSON.stringify({ t: S7.scenes.title.t, idle: S7.scenes.title.idle })));
await page.mouse.move(60, 440, { steps: 5 }); await page.waitForTimeout(300);
console.log('manual', await ev(() => JSON.stringify(S7.ui.readNav(S7.game))));
console.log(await ev(() => JSON.stringify({ nav: S7.ui.nav, focus: S7.scenes.title.list.i, ptr: S7.game.input.pointer() })));
await browser.close();
