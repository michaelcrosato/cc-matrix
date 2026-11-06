import { launch, ROOT, waitReady } from './lib.mjs';
const { browser, page, errs } = await launch({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + ROOT + '/dist/game.html?scene=ep6'); await waitReady(page); await page.waitForTimeout(4000);
await page.evaluate(() => { const g = window.__PIXEL_ENGINE__.game; g.mode = 'wide'; g.cam.pos.set(0, 2.2, 3); g.cam.tgt.set(0, 2.4, -3.7); g.cam.fov = 50; g.set.figures.forEach((f) => (f.group.position.z += 0)); });
await page.waitForTimeout(3000); await page.screenshot({ path: ROOT + '/check/mirror.png' }); console.log('errs', errs); await browser.close();
