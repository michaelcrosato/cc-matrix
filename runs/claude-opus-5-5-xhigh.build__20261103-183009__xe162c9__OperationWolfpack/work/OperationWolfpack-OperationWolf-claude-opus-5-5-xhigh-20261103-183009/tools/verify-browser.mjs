// End-to-end checks on the shipped .html in Chromium, driven like a player: a touch-only phone, two DualSense pads (the
// second presses Options mid-operation to join), and Settings > Button symbols switched to Xbox by clicking the real
// Settings screen. Screenshots into shots/verify-*.png.
import { chromium, devices } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const URL0 = pathToFileURL(resolve('../OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009.html')).href;
const browser = await chromium.launch();
const out = (k, ok, ev) => console.log((ok ? 'PASS ' : 'FAIL ') + k + ' -- ' + ev);
// 1. a touch-only phone (coarse pointer, touch points, no keyboard or pad)
{
  const ctx = await browser.newContext({ ...devices['Pixel 7'] }), page = await ctx.newPage();
  await page.goto(URL0); await page.waitForTimeout(2500);
  const a = await page.evaluate(() => ({ touch: WP.Touch.on, buttons: document.querySelectorAll('[data-sys="touch"] button').length, scene: My3D2dge.current.sceneName }));
  await page.screenshot({ path: 'shots/verify-touch.png' });
  const box = await page.locator('#screen').boundingBox();
  const k = Math.min(box.width / 480, box.height / 270), ox = box.x + (box.width - 480 * k) / 2, oy = box.y + (box.height - 270 * k) / 2;   // (the picture letterboxed inside the page)
  await page.touchscreen.tap(ox + 240 * k, oy + 185 * k);
  await page.waitForTimeout(600);
  const s = await page.evaluate(() => My3D2dge.current.shell.screen);
  await page.screenshot({ path: 'shots/verify-touch-settings.png' });
  out('touch-only: the notice, no touch controls', a.touch && a.buttons === 0 && a.scene === 'title', JSON.stringify(a));
  out('touch-only: tapping SETTINGS opens the settings', s === 'settings', 'shell.screen = ' + s);
  await page.evaluate(() => My3D2dge.current.shell.hide()); await page.waitForTimeout(11500);
  const d = await page.evaluate(() => ({ scene: My3D2dge.current.sceneName, demo: WP.ctx.demo }));
  await page.screenshot({ path: 'shots/verify-touch-attract.png' });
  out('touch-only: the attract mode runs', d.scene === 'play' && d.demo, JSON.stringify(d));
  await ctx.close();
}
// 2. two DualSense pads: pad 2 presses Options in play and joins as WOLF 2
{
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }), page = await ctx.newPage();
  await page.addInitScript(() => {
    const mk = i => ({ id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: i, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
    window.__pads = [mk(0), mk(1)];
    navigator.getGamepads = () => window.__pads;
    window.__press = (i, b, on) => { window.__pads[i].buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; window.__pads[i].timestamp++; };
  });
  await page.goto(URL0 + '#op1'); await page.waitForTimeout(2500);
  await page.evaluate(() => { for (const p of window.__pads) window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: p })); });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => WP.Flow.sim.players.length);
  await page.evaluate(() => window.__press(1, 9, true)); await page.waitForTimeout(250); await page.evaluate(() => window.__press(1, 9, false)); await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({ players: WP.Flow.sim.players.map(p => [p.pid, p.name, p.mag, p.damage]), local: Object.keys(WP.ctx.locals), inputs: My3D2dge.current.players.length }));
  // move WOLF 2's crosshair with its left stick and fire with R2
  await page.evaluate(() => { window.__pads[1].axes = [1, 0, 0, 0]; window.__press(1, 7, true); }); await page.waitForTimeout(700);
  const moved = await page.evaluate(() => { const p = WP.Flow.sim.players[1]; window.__pads[1].axes = [0, 0, 0, 0]; window.__press(1, 7, false); return { x: Math.round(p.x), shots: p.shots, mag: p.mag }; });
  await page.screenshot({ path: 'shots/verify-coop.png' });
  out('local co-op: Options on a second controller joins mid-operation', before === 1 && after.players.length === 2 && after.inputs === 2, JSON.stringify({ before, after }));
  out('local co-op: WOLF 2 aims with its stick and fires with R2', moved.x > 300 && moved.shots > 0, JSON.stringify(moved));
  // 3. the controller's prompts: PlayStation by default; Settings > Button symbols > Xbox by clicking the real screen
  const ps = await page.evaluate(() => { const I = My3D2dge.current.input; return [I.label('fire', 'gamepad'), I.label('reload', 'gamepad'), My3D2dge.current.settings.symbols]; });
  await page.evaluate(() => My3D2dge.current.menu('settings')); await page.waitForTimeout(500);
  const row = page.locator('.esh-row', { hasText: 'Button symbols' }); await row.scrollIntoViewIfNeeded();
  await row.locator('button').click(); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/verify-xbox-setting.png' });
  const xb = await page.evaluate(() => { const I = My3D2dge.current.input; return [I.label('fire', 'gamepad'), I.label('reload', 'gamepad'), My3D2dge.current.settings.symbols, My3D2dge.current.settings.glyphs]; });
  out('prompts: PlayStation glyphs by default', ps[0] === 'R2' && ps[1] === '□' && ps[2] === 'playstation', ps.join(' '));
  out('prompts: clicking Settings > Button symbols switches to Xbox glyphs', xb[0] === 'RT' && xb[1] === 'X' && xb[2] === 'xbox' && xb[3] === 'xbox', xb.join(' '));
  const errs = await page.evaluate(() => My3D2dge.current.errors.length); out('no errors on the page', errs === 0, errs + ' errors');
  await ctx.close();
}
await browser.close();
