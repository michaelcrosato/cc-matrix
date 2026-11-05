import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file://' + process.cwd() + '/../IceHoc-Kaboom-IceHockey-claude-opus-5-5-xhigh-20261103-182647.html'); await page.waitForTimeout(2500);
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
console.log(await page.evaluate(() => JSON.stringify({ st: __game.game.scene.state, rects: __game.game.scene.tiles.rects, scr: { S: __game.game.screen.S, dpr: __game.game.screen.dpr, OX: __game.game.screen.OX } })));
await browser.close();
