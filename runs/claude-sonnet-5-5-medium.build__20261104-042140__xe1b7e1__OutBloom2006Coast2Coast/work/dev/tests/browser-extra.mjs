// real browser: manual gears by keyboard, a faked second gamepad driving Versus player 2, bloom/flare draw without errors
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), file = readdirSync(root).find(f => /^OutBloom.*\.html$/.test(f));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(new URL(file, root).href); await page.waitForFunction(() => window.My3D2dge && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 }); await page.waitForTimeout(500);
await page.evaluate(() => { const g = My3D2dge.current; g.settings.set('transmission', 'Manual'); g.debug.go('race', { mode: 'drive', car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 5 }); });
await page.waitForTimeout(4200); await page.evaluate(() => { My3D2dge.current.scene.race.god = true; window.__fix = setInterval(() => { const R = My3D2dge.current.scene.race; if (R) { R.x = 0; R.crash = 0; } }, 20); }); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(4500);
const g1 = await page.evaluate(() => { const R = My3D2dge.current.scene.race; return [R.gear, Math.round(R.speed), R.manual]; });
for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyR'); await page.waitForTimeout(2500); }
const g2 = await page.evaluate(() => { const R = My3D2dge.current.scene.race; return [R.gear, Math.round(R.speed)]; });
await page.screenshot({ path: '.cache/shots/manual.png' }); await page.keyboard.up('ArrowUp');
console.log('manual: gear/speed in 1st', JSON.stringify(g1), 'after 3 upshifts', JSON.stringify(g2));
await page.evaluate(() => { const g = My3D2dge.current; g.settings.set('transmission', 'Automatic'); const mk = i => ({ id: 'fake ' + i, index: i, connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }); window.__p0 = mk(0); window.__pad = mk(1); navigator.getGamepads = () => [window.__p0, window.__pad]; g.debug.go('versus', { car: 'orchidea', color: 0, pass: 0, station: 0, stage: 0, seed: 3 }); });
await page.waitForTimeout(4200); await page.evaluate(() => { window.__pad.buttons[7].pressed = true; window.__pad.axes[0] = .5; }); await page.waitForTimeout(3000);
const v = await page.evaluate(() => { const s = My3D2dge.current.scene; return [Math.round(s.r2.speed), +s.r2.x.toFixed(2), Math.round(s.r1.speed)]; });
await page.screenshot({ path: '.cache/shots/versus2.png' });
console.log('versus P2 via second pad: speed/x, P1 speed', JSON.stringify(v), 'errors', JSON.stringify(errs), JSON.stringify(await page.evaluate(() => My3D2dge.current.errors.map(e => e.message))));
await browser.close();
