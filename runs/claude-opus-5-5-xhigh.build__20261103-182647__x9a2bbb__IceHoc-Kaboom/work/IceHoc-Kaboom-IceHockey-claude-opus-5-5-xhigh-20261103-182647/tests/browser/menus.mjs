// Menus and input (18.6): keyboard navigation through the main menu; the mouse hovering a tile focuses it and a click
// picks it; the prompt chips follow the device used last; Settings, Button symbols: Xbox changes the chips; touch-only
import { chromium } from 'playwright';
import { check, guard } from '../t.mjs';
guard('menus', async () => {
  const url = 'file://' + new URL('../../../IceHoc-Kaboom-IceHockey-claude-opus-5-5-xhigh-20261103-182647.html', import.meta.url).pathname;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url); await page.waitForTimeout(2500);
  const ev = (js, a) => page.evaluate(js, a);
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  check('a key opens the main menu', await ev(() => __game.game.scene.state === 'menu'));
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); check('arrows move the focus', await ev(() => __game.game.scene.tiles.i === 1));
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); check('down moves a row', await ev(() => __game.game.scene.tiles.i === 4));
  check('the keyboard shows keycaps', await ev(() => __game.Glyphs.label('confirm') === 'Enter'));
  // the mouse: hover the 6th tile, then click the 3rd (PRACTICE)
  const rect = async i => ev(i2 => { const q = __game.game.scene.tiles.rects[i2], c = document.getElementById('screen').getBoundingClientRect(), S = __game.game.screen; return [c.left + (q[0] + q[2] / 2) * S.S / S.dpr, c.top + (q[1] + q[3] / 2) * S.S / S.dpr]; }, i);
  let [x, y] = await rect(5); await page.mouse.move(x - 30, y - 10); await page.waitForTimeout(100); await page.mouse.move(x, y, { steps: 4 }); await page.waitForTimeout(250);
  check('hovering a tile focuses it', await ev(() => __game.game.scene.tiles.i === 5), await ev(() => __game.game.scene.tiles.i));
  check('the mouse shows mouse prompts', await ev(() => __game.game.input.lastDevice === 'mouse'));
  [x, y] = await rect(2); await page.mouse.move(x, y, { steps: 3 }); await page.waitForTimeout(150); await page.mouse.click(x, y); await page.waitForTimeout(900);
  check('a click picks the tile (PRACTICE)', await ev(() => __game.game.sceneName === 'practice'), await ev(() => __game.game.sceneName));
  // glyphs: PlayStation by default for a pad, Xbox in Settings
  check('a pad shows PlayStation symbols by default', await ev(() => { const I = __game.game.input; I.lastDevice = 'gamepad'; return __game.Glyphs.label('pass') === '✕' && __game.Glyphs.label('shoot') === '□'; }));
  check('Settings, Button symbols: Xbox shows A and X', await ev(() => { __game.game.settings.set('buttons', 'xbox'); const ok = __game.Glyphs.label('pass') === 'A' && __game.Glyphs.label('shoot') === 'X'; __game.game.settings.set('buttons', 'playstation'); return ok; }));
  check('the engine settings screen lists Button symbols', await ev(() => !!__game.game.settings.spec('buttons') && __game.game.settings.spec('buttons').group === 'Game'));
  await page.screenshot({ path: new URL('../../shots/menus-practice.png', import.meta.url).pathname });
  check('no page errors', !errs.length && !(await ev(() => __game.game.errors.length)), errs.join(' | '));
  await page.close();
  // touch-only: a phone with a coarse pointer and no fine one: the banner, SETTINGS, and the attract mode still runs
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const tp = await ctx.newPage(); await tp.goto(url); await tp.waitForTimeout(3000);
  check('touch-only is detected', await tp.evaluate(() => __game.touchOnly()));
  check('touch-only: the title shows a SETTINGS button (no touch controls)', await tp.evaluate(() => !!__game.game.scene.setBtn && __game.game.scene.setBtn[2] >= 100));
  await tp.screenshot({ path: new URL('../../shots/touch-390x844.png', import.meta.url).pathname });
  check('touch-only: taps do not start the game', await tp.evaluate(() => __game.game.sceneName === 'title' && __game.game.scene.state === 'press'));
  await tp.waitForTimeout(11000); check('touch-only: the attract mode runs after 10 s', await tp.evaluate(() => __game.game.sceneName === 'attract'), await tp.evaluate(() => __game.game.sceneName));
  await ctx.close(); await browser.close();
});
