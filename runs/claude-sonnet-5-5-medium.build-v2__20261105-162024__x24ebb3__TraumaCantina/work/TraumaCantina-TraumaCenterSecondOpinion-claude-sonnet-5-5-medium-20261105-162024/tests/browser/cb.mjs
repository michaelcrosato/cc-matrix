import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 960, height: 540 } });
await page.goto('file://' + ROOT + '/dist/game.html?op=op1'); await waitReady(page); await page.waitForTimeout(3000);
await page.evaluate(() => { const op = window.__GAME__.op; op.devAct(op.ctx, 'cb'); });
await page.mouse.move(400, 300); await page.mouse.down(); await page.keyboard.down('KeyK'); await page.waitForTimeout(900);
await page.screenshot({ path: ROOT + '/check/cb.png' }); console.log(await page.evaluate(() => JSON.stringify(window.__GAME__.op.sim.cb)), errs);
await browser.close();
