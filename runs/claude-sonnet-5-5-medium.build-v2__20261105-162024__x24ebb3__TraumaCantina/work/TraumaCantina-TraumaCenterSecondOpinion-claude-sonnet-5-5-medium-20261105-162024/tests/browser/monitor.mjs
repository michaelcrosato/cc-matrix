import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html?scene=ep1'); await waitReady(page); await page.waitForTimeout(4000);
await page.evaluate(() => { const g = window.__PIXEL_ENGINE__.game; g.mode = 'wide'; g.cam.pos.set(3.6, 2.6, 2.2); g.cam.tgt.set(3.6, 2.6, -1); g.cam.fov = 40; g.set.figures.forEach((f) => (f.group.visible = false)); });
await page.waitForTimeout(3000); await page.screenshot({ path: ROOT + '/check/monitor.png' }); console.log('errs', errs); await browser.close();
