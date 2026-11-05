// Real keyboard/mouse input in the real page: move, camera, hotbar, swing, menus, title -> new game flow.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url'; import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.resolve(root, '..', path.basename(root) + '.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
const fails = []; let n = 0; const check = (w, ok, d = '') => { n++; if (!ok) fails.push(w + ' ' + d); };
await page.goto(pathToFileURL(html).href); await page.waitForTimeout(1500);
const snap = () => page.evaluate(() => JSON.parse(JSON.stringify(DQ.game.debug.snapshot())));
// title -> new game with the keyboard only
await page.keyboard.press('Enter'); await page.waitForTimeout(300);
check('Enter on New Game opens the name screen', (await snap()).scene === 'title' && await page.evaluate(() => DQ.ui.top() && DQ.ui.top().panel === 'newgame'));
await page.keyboard.type('Ada'); await page.waitForTimeout(200);
check('typing fills the name', await page.evaluate(() => DQ.ui.top().name === 'Ada'), await page.evaluate(() => DQ.ui.top().name));
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100);
for (let i = 0; i < 6 && await page.evaluate(() => DQ.ui.top() && DQ.ui.top().focus !== 'start'); i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); }
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
check('Begin goes to the intro', (await snap()).scene === 'intro');
for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
await page.waitForTimeout(800); check('intro leads to play', (await snap()).scene === 'play', JSON.stringify(await snap()));
for (let i = 0; i < 30 && (await snap()).dialog; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
check('granny dialog dismissed with Enter', !(await snap()).dialog);
const p0 = await snap();
await page.keyboard.down('KeyD'); await page.waitForTimeout(900); await page.keyboard.up('KeyD'); const p1 = await snap();
check('WASD moves the builder', Math.abs(p1.builder.x - p0.builder.x) + Math.abs(p1.builder.y - p0.builder.y) > 20, JSON.stringify([p0.builder, p1.builder]));
const y0 = await page.evaluate(() => DQ.game.yaw); await page.keyboard.press('KeyE'); await page.waitForTimeout(400); const y1 = await page.evaluate(() => DQ.game.yaw);
check('E turns the camera 90 degrees', Math.abs(y1 - y0) >= 89, y0 + '->' + y1);
await page.keyboard.press('Digit3'); await page.waitForTimeout(100); check('1-8 select the hotbar', await page.evaluate(() => DQ.S.sel === 2));
await page.keyboard.press('Tab'); await page.waitForTimeout(300); check('Tab opens the satchel', (await snap()).ui === 'satchel');
await page.keyboard.press('Escape'); await page.waitForTimeout(300); check('Escape closes it without pausing', (await snap()).ui === undefined && !(await page.evaluate(() => DQ.game.paused)), JSON.stringify(await snap()).slice(0, 80));
await page.keyboard.press('Escape'); await page.waitForTimeout(300); check('Escape in play pauses', await page.evaluate(() => DQ.game.paused));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.evaluate(() => { DQ.inv.add('felt', 5, true); DQ.S.hotbar[0] = 'felt'; DQ.S.sel = 0; });
await page.mouse.move(700, 300); await page.waitForTimeout(100); await page.mouse.move(720, 330); await page.waitForTimeout(100);
const before = await page.evaluate(() => DQ.S.stats.placed); await page.mouse.click(720, 330, { button: 'right' }); await page.waitForTimeout(300);
check('right click places a block', (await page.evaluate(() => DQ.S.stats.placed)) === before + 1, await page.evaluate(() => JSON.stringify(DQ.S.stats.placed)));
const b0 = await page.evaluate(() => DQ.S.stats.broken); for (let i = 0; i < 5; i++) { await page.mouse.click(720, 330); await page.waitForTimeout(450); }
check('left click swings and breaks it', (await page.evaluate(() => DQ.S.stats.broken)) > b0);
await page.mouse.wheel(0, 100); await page.waitForTimeout(200); check('wheel cycles the hotbar', await page.evaluate(() => DQ.S.sel === 1), await page.evaluate(() => DQ.S.sel));
await page.keyboard.press('KeyM'); await page.waitForTimeout(300); check('M opens the map', (await snap()).ui === 'satchel'); await page.keyboard.press('Backspace'); await page.waitForTimeout(200);
console.log(errs.length || fails.length ? 'FAIL ' + JSON.stringify(fails.concat(errs)) : n + ' input checks ok');
await browser.close();
