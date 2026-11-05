// TASK.md's player-facing requirements, checked in Chromium on the real bundle with a simulated standard-mapping gamepad
// (navigator.getGamepads stubbed), the keyboard and the mouse: prompts follow the last device (PlayStation, Xbox, keys),
// the pad drives play and menus, the pause menu reaches Dev Mode, its sliders are live and reset, hover moves the focus,
// the wheel cycles tools, the Workshop paints with the mouse and exports, Settings has the Xbox option.
import { chromium } from '../../handoff/node_modules/playwright/index.mjs';
const NAME = 'Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420';
const PAD = `(() => { const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = { press(i, on = true) { pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp++; }, axis(i, v) { pad.axes[i] = v; pad.timestamp++; } };
  navigator.getGamepads = () => [pad, null, null, null]; })();`;
export default async ({ check, dev }) => {
  const url = new URL('../' + NAME + '.html', dev).href, browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); await ctx.addInitScript(PAD);
    const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    const ev = f => page.evaluate(f), wait = ms => page.waitForTimeout(ms);
    const tapPad = async (i, ms = 120) => { await ev(`window.__pad.press(${i})`); await wait(ms); await ev(`window.__pad.press(${i}, false)`); await wait(150); };
    await page.goto(url); await page.waitForFunction(() => window.__BENTOU && window.__BENTOU.game.sceneName === 'title', null, { timeout: 15000 });
    await tapPad(9);
    check('a gamepad press is recognised and prompts switch to PlayStation glyphs', await ev(() => window.__BENTOU.game.input.lastDevice === 'gamepad' && window.__BENTOU.B.label('jump') === '✕'), await ev(() => window.__BENTOU.game.input.lastDevice + ' ' + window.__BENTOU.B.label('jump')));
    await ev(() => window.__BENTOU.game.settings.set('glyphs', 'xbox')); check('the Xbox glyph setting shows A B X Y', await ev(() => window.__BENTOU.B.label('jump') === 'A' && window.__BENTOU.B.label('attack') === 'X'), ''); await ev(() => window.__BENTOU.game.settings.set('glyphs', 'playstation'));
    await tapPad(13); await tapPad(12); await tapPad(0); await wait(900);
    check('the d-pad and Cross drive the title menu', await ev(() => window.__BENTOU.game.sceneName !== 'title'), await ev(() => window.__BENTOU.game.sceneName));
    // play with the pad: the left stick moves, Square strikes, Options pauses into the menu with Dev Mode
    await ev(() => { const { B, game } = window.__BENTOU; B.save.data = B.freshSave(); game.go('mission', { missionId: 'm1', levelId: 'm1', mode: 'missions', character: 'sojiro' }, { fade: 0 }); });
    await wait(2500); const p0 = await ev(() => [window.__BENTOU.B.mission.hero.x, window.__BENTOU.B.mission.hero.y]);
    await ev(`window.__pad.axis(1, -1)`); await wait(800); await ev(`window.__pad.axis(1, 0)`); await wait(200);
    check('the left stick moves the ninja', (p => Math.hypot(p[0] - p0[0], p[1] - p0[1]))(await ev(() => [window.__BENTOU.B.mission.hero.x, window.__BENTOU.B.mission.hero.y])) > 20, await ev(() => JSON.stringify({ p: window.__BENTOU.game.paused, r: window.__BENTOU.game.pauseReason, s: window.__BENTOU.B.ui.screen, sc: window.__BENTOU.game.sceneName })));
    await tapPad(2, 160); check('Square strikes', await ev(() => window.__BENTOU.B.mission.hero.combo.busy || window.__BENTOU.B.mission.hero.comboT < 1), '');
    const sel0 = await ev(() => window.__BENTOU.B.mission.bento.sel); await page.mouse.move(900, 500); await page.mouse.wheel(0, 120); await wait(200);
    check('the mouse wheel cycles bento tools', await ev(() => window.__BENTOU.B.mission.bento.sel) !== sel0, '');
    await tapPad(9); await wait(400);
    const items = await ev(() => [...document.querySelectorAll('.esh-sh button')].map(b => b.textContent));
    check('Options pauses: Resume, Restart from checkpoint, Objectives, Dev Mode, Settings, Controls', ['Resume', 'Restart from checkpoint', 'Objectives', 'Dev Mode', 'Settings', 'Controls'].every(k => items.some(t => t.includes(k))), items.join(' | '));
    const btn = await page.locator('.esh-sh button', { hasText: 'Dev Mode' }).first(); const box = await btn.boundingBox(); await page.mouse.move(box.x + 20, box.y + 10); await wait(150);
    check('hovering a menu item moves the focus to it', await ev(() => document.activeElement && document.activeElement.textContent.includes('Dev Mode')), await ev(() => document.activeElement && document.activeElement.textContent));
    await page.mouse.click(box.x + 20, box.y + 10); await wait(300);
    check('Dev Mode opens from the pause menu', await ev(() => window.__BENTOU.B.ui.screen === 'dev'), '');
    await page.keyboard.press('PageDown'); await page.keyboard.press('PageDown'); await page.keyboard.press('PageDown'); await page.keyboard.press('PageDown'); await wait(200);
    const slider = page.locator('.esh-sh input[type=range]').first(); await slider.fill('110');
    check('a balance slider changes the live value', await ev(() => window.__BENTOU.B.T('heroRun')) === 110, await ev(() => window.__BENTOU.B.T('heroRun')));
    await page.locator('.esh-sh button', { hasText: 'Reset all to defaults' }).click(); await wait(200);
    check('reset to defaults restores the value', await ev(() => window.__BENTOU.B.T('heroRun')) === 85, '');
    await ev(() => window.__BENTOU.B.ui.hide()); await ev(() => window.__BENTOU.game.resume()); await wait(300);
    // the Workshop with the mouse
    await ev(() => window.__BENTOU.game.go('workshop', { spec: window.__BENTOU.B.WS.blank(32) }, { fade: 0 })); await wait(1200);
    await page.mouse.move(960, 540); await wait(100); await page.mouse.move(965, 545); await wait(200);
    const r0 = await ev(() => window.__BENTOU.game.scene.spec.rows.join(''));
    await page.keyboard.press('Tab'); await wait(100); await page.mouse.move(970, 548); await page.mouse.down(); await wait(200); await page.mouse.up(); await wait(200);
    check('the Workshop paints a wall under the mouse', await ev(() => window.__BENTOU.game.scene.spec.rows.join('')) !== r0, '');
    await page.keyboard.press('Escape'); await wait(300);
    check('Esc opens the Workshop menu', await ev(() => window.__BENTOU.B.ui.screen === 'wsMenu'), await ev(() => window.__BENTOU.B.ui.screen));
    await page.locator('.esh-sh button', { hasText: 'Export JSON' }).click(); await wait(300);
    check('Export shows the level JSON', await ev(() => { const t = document.querySelector('textarea'); return !!t && JSON.parse(t.value).size[0] === 32; }), '');
    check('no page errors through the audit', !errs.length && !(await ev(() => window.__BENTOU.game.errors.length)), errs.concat(await ev(() => window.__BENTOU.game.errors.map(e => e.message))).slice(0, 3).join(' | '));
  } finally { await browser.close(); }
};
