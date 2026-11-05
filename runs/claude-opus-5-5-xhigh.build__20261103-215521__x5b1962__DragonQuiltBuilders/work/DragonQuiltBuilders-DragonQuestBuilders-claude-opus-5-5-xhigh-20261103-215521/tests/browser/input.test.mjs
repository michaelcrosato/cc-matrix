// Real input in Chromium on the built file: keyboard movement, breaking and placing with keys and the mouse, the Satchel,
// the pause menu, camera turns and zoom steps in both views, the right-click context menu suppressed.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
process.env.TMPDIR = new URL('../../check-output/tmp/', import.meta.url).pathname;
export default async function ({ check, DEV }) {
  const html = readdirSync(join(DEV, '..')).find(f => f.startsWith('DragonQuiltBuilders') && f.endsWith('.html'));
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(pathToFileURL(join(DEV, '..', html)).href + '#play:banner');
    await p.waitForFunction(() => window.DQ && DQ.ctx && DQ.game.sceneName === 'play', null, { timeout: 30000 });
    await p.waitForTimeout(800); await p.mouse.move(640, 360);
    const snap = () => p.evaluate(() => DQ.game.debug.snapshot());
    const s0 = await snap();
    await p.keyboard.down('KeyD'); await p.waitForTimeout(700); await p.keyboard.up('KeyD'); await p.waitForTimeout(200);
    const s1 = await snap(); check('browser: WASD moves the builder', Math.hypot(s1.builder.x - s0.builder.x, s1.builder.y - s0.builder.y) > 20, JSON.stringify([s0.builder, s1.builder]));
    // break the block in front with J (auto cursor), place one with K
    const before = await p.evaluate(() => DQ.ctx.world.hash());
    await p.evaluate(() => { const b = DQ.ctx.builder; b.facing = 0; b.bag.hotbar[0] = 'earth'; b.hot = 0; });
    for (let i = 0; i < 3; i++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(450); }
    const mid = await p.evaluate(() => DQ.ctx.world.hash());
    check('browser: J swings and breaks the block in front', mid !== before);
    await p.keyboard.press('KeyK'); await p.waitForTimeout(400);
    check('browser: K places a block', (await p.evaluate(() => DQ.ctx.world.hash())) !== mid);
    // the mouse: aim and click
    await p.evaluate(() => { const b = DQ.ctx.builder; b.bag.hotbar[0] = 'earth'; b.hot = 0; });
    const pt = await p.evaluate(() => { const c = DQ.ctx, b = c.builder, r = DQ.game.r, cv = DQ.game.screen.canvas.getBoundingClientRect(), S = DQ.game.screen; const q = r.w(b.x + 40, b.y, b.z - 1); return [cv.left + (q[0] - 1) * S.S / devicePixelRatio, cv.top + (q[1] - 1) * S.S / devicePixelRatio]; });
    await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(150); const hm = await p.evaluate(() => DQ.ctx.world.hash());
    await p.mouse.click(pt[0], pt[1], { button: 'right' }); await p.waitForTimeout(350);
    check('browser: right click places at the mouse cursor', (await p.evaluate(() => DQ.ctx.world.hash())) !== hm, JSON.stringify(await p.evaluate(() => DQ.ctx.builder.cursor)));
    check('browser: the mouse cursor mode takes over', (await p.evaluate(() => DQ.ctx.builder.cursor.mode)) === 'mouse');
    // the satchel and the pause menu
    await p.keyboard.press('Tab'); await p.waitForTimeout(250);
    check('browser: Tab opens the Satchel', await p.evaluate(() => DQ.ctx.ui.open && DQ.ctx.ui.top.id === 'satchel'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    check('browser: Esc closes the Satchel, not the game', await p.evaluate(() => !DQ.ctx.ui.open && !DQ.game.paused));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    check('browser: Esc pauses into the menu', await p.evaluate(() => DQ.game.paused));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    // camera: turns and zoom steps in both views, all drawing without errors
    for (let k = 0; k < 4; k++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(250); }
    check('browser: Q / E turn the camera in 90-degree steps', (await p.evaluate(() => DQ.game.yaw)) % 360 === 0);
    await p.keyboard.press('Equal'); await p.waitForTimeout(250); await p.keyboard.press('Equal'); await p.waitForTimeout(250);
    check('browser: = zooms a step at a time', Math.abs((await p.evaluate(() => DQ.game.zoom)) - 1.5) < .01, await p.evaluate(() => DQ.game.zoom));
    await p.keyboard.press('KeyR'); await p.waitForTimeout(200);
    await p.evaluate(() => DQ.game.settings.set('camView', 'Three-quarter')); await p.waitForTimeout(300);
    for (let k = 0; k < 4; k++) { await p.keyboard.press('KeyQ'); await p.waitForTimeout(250); }
    check('browser: the three-quarter view draws', await p.evaluate(() => DQ.game.baseView.id === 'threequarter' && DQ.ctx.render.runsDrawn > 50), await p.evaluate(() => DQ.ctx.render.runsDrawn));
    const cm = await p.evaluate(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); DQ.game.screen.canvas.dispatchEvent(e); return e.defaultPrevented; });
    check('browser: the right-click menu is suppressed on the canvas', cm);
    const ge = await p.evaluate(() => DQ.game.errors.map(e => e.where + ': ' + e.message));
    check('browser: no errors while playing', !errs.length && !ge.length, errs.concat(ge).slice(0, 4).join(' | '));
    await p.close();
    // the prologue: Enter turns the page (it is also Start on a keyboard), Esc skips
    const q = await b.newPage({ viewport: { width: 1280, height: 720 } }); const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.goto(pathToFileURL(join(DEV, '..', html)).href + '#intro'); await q.waitForFunction(() => window.DQ && DQ.game && DQ.game.sceneName === 'intro', null, { timeout: 30000 });
    await q.waitForTimeout(300); await q.keyboard.press('Enter'); await q.waitForTimeout(150); await q.keyboard.press('Enter'); await q.waitForTimeout(250);
    check('browser: Enter turns the prologue page without skipping it', await q.evaluate(() => DQ.game.sceneName === 'intro' && DQ.SCENES.intro.page === 1), await q.evaluate(() => DQ.game.sceneName + ' ' + DQ.SCENES.intro.page));
    await q.keyboard.press('Escape'); await q.waitForTimeout(600);
    check('browser: Esc skips the prologue into play', await q.evaluate(() => DQ.game.sceneName === 'play') && !qe.length, await q.evaluate(() => DQ.game.sceneName) + ' ' + qe.join(' | '));
    await q.close();
  } finally { await b.close(); }
}
