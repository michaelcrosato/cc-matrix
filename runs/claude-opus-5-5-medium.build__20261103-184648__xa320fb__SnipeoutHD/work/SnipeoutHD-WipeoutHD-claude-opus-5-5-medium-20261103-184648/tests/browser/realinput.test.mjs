// Plays the bundle through real input events only (keyboard, mouse, touch): no game calls drive it. Reads state to check.
import { chromium } from 'playwright';
import { test, check, done } from '../lib/t.mjs';
const root = new URL('../../', import.meta.url).pathname, url = 'file://' + root + '../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html?backend=webgl';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message));
const st = f => page.evaluate(f), until = (f, ms = 60000) => page.waitForFunction(f, null, { timeout: ms }), key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(250); } };
const shot = n => page.screenshot({ path: root + 'tests/out/real-' + n + '.png' });
await page.goto(url); await until(() => window.__game && window.__game.sceneName === 'title', 90000);
await test('attract: idle 10 s, then a key exits', async () => {
  await until(() => window.__game.sceneName === 'attract', 60000); check(true, 'attract started with no input'); await page.waitForTimeout(3000); await shot('attract');
  await key('KeyM'); await until(() => window.__game.sceneName === 'title', 10000).catch(() => {}); check(await st(() => window.__game.sceneName) === 'title', 'an unbound key returned to the title');
});
await test('academy with the keyboard', async () => {
  await until(() => window.__game.sceneName === 'title' && SN.scenes.title.t > .6); await key('Enter'); await until(() => window.__game.sceneName === 'menu'); await until(() => SN.UI.t > 0 && SN.UI.rects.length >= 6);
  await key('ArrowDown', 4); check(await st(() => SN.UI.items()[SN.UI.focus].id) === 'academy', 'arrows reach ACADEMY');
  await key('Enter'); await until(() => window.__game.sceneName === 'race' && SN.Academy.phase === 'card'); await shot('academy-card');
  await key('Enter'); await page.keyboard.down('KeyW'); await until(() => SN.Academy.i >= 1, 90000).catch(() => {}); await page.keyboard.up('KeyW');
  check(await st(() => SN.Academy.passed) >= 1, 'holding W passes the THRUST drill', await st(() => SN.Academy.passed)); await shot('academy-pass');
});
await test('pause menu to dev mode, a slider, reset, close', async () => {
  await key('Escape'); await page.waitForTimeout(500); check(await st(() => window.__game.paused), 'Esc pauses');
  await page.getByText('Dev mode', { exact: false }).first().click(); await page.waitForTimeout(500); check(await st(() => SN.Dev.open), 'clicking Dev mode opens the panel');
  await key('KeyE'); check(await st(() => SN.Dev.tab) === 1, 'E switches to TUNING'); await key('ArrowDown', 2); await key('ArrowRight', 3);
  check(await st(() => SN.Tune.changed().length) >= 1, 'arrows move a live slider', await st(() => SN.Tune.changed())); await shot('dev-slider');
  await key('ArrowUp', 2); await key('Enter'); check(await st(() => SN.Tune.changed().length) === 0, 'RESET ALL with Enter restores defaults');
  await key('Escape'); check(await st(() => !SN.Dev.open && window.__game.paused), 'Esc closes back to the pause menu');
  await page.getByText('Quit to menu', { exact: false }).first().click(); await page.waitForTimeout(500); await page.getByRole('button', { name: 'Quit', exact: true }).click(); await until(() => window.__game.sceneName === 'menu'); check(true, 'quit to the menu');
});
await test('season with the mouse: team pick, prologue, hub', async () => {
  await until(() => window.__game.sceneName === 'menu' && SN.UI.rects.length >= 6); await page.waitForTimeout(800); const S = 1280 / await st(() => window.__game.W), r = await st(() => SN.UI.rects[0]);
  await page.mouse.move((r[0] + 30) * S, (r[1] + 8) * S); await page.mouse.move((r[0] + 34) * S, (r[1] + 9) * S); await page.mouse.click((r[0] + 34) * S, (r[1] + 9) * S); await page.waitForTimeout(600);
  check(await st(() => SN.UI.top().id) === 'team', 'clicking SEASON opens the team pick'); await key('KeyE'); await page.waitForTimeout(300);
  const c = await st(() => { SN.UI.draw && 0; return SN.UI.rects[3]; }); await page.mouse.move((c[0] + 20) * S, (c[1] + 6) * S); await page.mouse.click((c[0] + 20) * S, (c[1] + 6) * S); await page.waitForTimeout(800);
  check(await st(() => SN.Story.open), 'CONFIRM starts the prologue'); await shot('prologue');
  for (let i = 0; i < 40 && await st(() => SN.Story.open); i++) await key('Enter');
  check(await st(() => SN.UI.top().id) === 'season', 'the season hub after the prologue'); await shot('season-hub');
  await key('Enter'); await page.waitForTimeout(500); for (let i = 0; i < 10 && await st(() => SN.Story.open); i++) await key('Enter');
  await until(() => window.__game.sceneName === 'race' && SN.scenes.race.S.event === 'e1', 60000).catch(() => {}); check(await st(() => SN.scenes.race.S && SN.scenes.race.S.event) === 'e1', 'Enter on ACADEMY starts season event E1 after its briefing');
});
await page.close();
await test('touch-only phone: notice, SETTINGS by tap, no touch controls', async () => {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } }); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /any-pointer: fine/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); });
  await p.goto(url); await p.waitForFunction(() => window.__game && window.__game.sceneName === 'title', null, { timeout: 90000 }); await p.waitForTimeout(1500);
  check(await p.evaluate(() => SN.isTouchOnly()), 'touch-only detected'); check(!(await p.evaluate(() => document.querySelector('[data-sys="touch"] button[data-act]:not([data-act="menu"])'))), 'no touch controls');
  const r = await p.evaluate(() => SN.scenes.title.settingsRect), k = 844 / await p.evaluate(() => window.__game.W); await p.touchscreen.tap((r[0] + r[2] / 2) * k, (r[1] + r[3] / 2) * k); await p.waitForTimeout(800);
  check(await p.evaluate(() => !!document.querySelector('[class*="esh"]') && window.__game.shell && !!window.__game.shell.screen), 'tapping SETTINGS opens the settings screen'); await p.screenshot({ path: root + 'tests/out/real-touch-settings.png' });
  await ctx.close();
});
check(!errors.length, 'no page errors', errors.slice(0, 3));
await browser.close(); done();
