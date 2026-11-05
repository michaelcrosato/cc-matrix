// Pause menu items, attract screenshot, touch-only title.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url'; import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.resolve(root, '..', path.basename(root) + '.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const fails = []; let n = 0; const check = (w, ok, d = '') => { n++; if (!ok) fails.push(w + ' ' + d); }; const errs = [];
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(pathToFileURL(html).href); await page.waitForTimeout(1200);
  await page.evaluate(() => DQ.game.go('play', { new: true, name: 'Menu' })); await page.waitForTimeout(500);
  for (let i = 0; i < 20 && await page.evaluate(() => DQ.dialogOpen()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const txt = await page.evaluate(() => document.body.innerText);
  check('pause menu lists Dev Tools, Satchel, About', /Dev Tools/i.test(txt) && /Satchel/i.test(txt) && /About/i.test(txt), txt.slice(0, 200));
  check('pause menu has Settings and Controls', /Settings/i.test(txt) && /Controls/i.test(txt));
  await page.screenshot({ path: path.join(root, 'check-output', 'm_pause.png') });
  const dev = page.getByText(/dev tools/i); await dev.first().click(); await page.waitForTimeout(500);
  check('Dev Tools opens from the pause menu', await page.evaluate(() => DQ.ui.top() && DQ.ui.top().panel === 'dev' && !DQ.game.paused));
  await page.screenshot({ path: path.join(root, 'check-output', 'm_dev.png') });
  await page.evaluate(() => { DQ.ui.closeAll(); DQ.game.go('title'); }); await page.waitForTimeout(11500);
  check('attract starts in the real page', await page.evaluate(() => DQ.game.sceneName === 'attract'), await page.evaluate(() => DQ.game.sceneName));
  await page.waitForTimeout(9000); await page.screenshot({ path: path.join(root, 'check-output', 'm_attract.png') });
  await page.mouse.move(100, 100); await page.waitForTimeout(300); await page.mouse.move(300, 200); await page.waitForTimeout(500);
  check('mouse move leaves attract', await page.evaluate(() => DQ.game.sceneName === 'title'), await page.evaluate(() => DQ.game.sceneName));
  await page.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.goto(pathToFileURL(html).href); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(root, 'check-output', 'm_touch.png') });
  check('touch-only device is detected', await page.evaluate(() => DQ.touchOnly === true), await page.evaluate(() => String(DQ.touchOnly)));
  await page.waitForTimeout(11000); check('attract runs on touch devices', await page.evaluate(() => DQ.game.sceneName === 'attract'), await page.evaluate(() => DQ.game.sceneName));
  await page.close();
}
console.log(errs.length || fails.length ? 'FAIL ' + JSON.stringify(fails.concat(errs)) : n + ' misc checks ok'); await browser.close();
