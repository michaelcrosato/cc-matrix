import { chromium } from 'playwright'; import { GAME } from '../lib/browser.mjs';
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
// a touch-only phone
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + GAME + '?backend=webgl'); await page.waitForFunction(() => window.S7 && S7.started && S7.game.sceneName, null, { timeout: 60000 }); await page.waitForTimeout(2500);
console.log('touchOnly:', await page.evaluate(() => S7.touchOnly()), 'scene', await page.evaluate(() => S7.game.sceneName)); await page.screenshot({ path: 'tests/out/d1-touch.png' });
// the glyphs follow the device
const p2 = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p2.on('pageerror', e => errors.push(e.message));
await p2.goto('file://' + GAME + '?backend=webgl'); await p2.waitForFunction(() => window.S7 && S7.started && S7.game.sceneName, null, { timeout: 60000 });
await p2.evaluate(() => { S7.newGame(); }); await p2.waitForTimeout(800); await p2.evaluate(() => { S7.game.debug.skipCutscene(); S7.game.debug.teleport('00A', 'j2'); S7.st.done['00A:tw1'] = true; S7.game.debug.skipCutscene(); S7.st.mode = 'rail'; });
console.log('default glyphs setting:', await p2.evaluate(() => S7.game.settings.glyphs + ' / input ' + S7.game.input.glyphs)); await p2.evaluate(() => { S7.game.input.lastDevice = 'gamepad'; }); await p2.waitForTimeout(600); await p2.screenshot({ path: 'tests/out/d2-ps.png' });
console.log('ps labels', await p2.evaluate(() => ['go', 'turn', 'aim', 'fire', 'scan', 'skill', 'ring'].map(a => S7.game.input.label(a)).join(' ')));
await p2.evaluate(() => { S7.game.settings.set('glyphs', 'xbox'); }); await p2.waitForTimeout(600); await p2.screenshot({ path: 'tests/out/d3-xbox.png' });
console.log('xbox labels', await p2.evaluate(() => ['go', 'turn', 'aim', 'fire', 'scan', 'skill', 'ring'].map(a => S7.game.input.label(a)).join(' ')));
console.log('default glyph setting', await p2.evaluate(() => { const g = S7.game.settings; return JSON.stringify(Object.keys(g).slice(0, 3)); }));
console.log('errors', errors.length, errors.slice(0, 3).join('|')); await browser.close();
