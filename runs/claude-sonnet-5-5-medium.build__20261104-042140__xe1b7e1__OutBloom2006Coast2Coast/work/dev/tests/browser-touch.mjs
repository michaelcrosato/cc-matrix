// a real emulated touch-only phone/tablet: notice shown, menu entries disabled, Settings reachable, attract runs after 10 s
import { chromium, devices } from 'playwright';
import { readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), file = readdirSync(root).find(f => /^OutBloom.*\.html$/.test(f));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(new URL(file, root).href); await page.waitForFunction(() => window.My3D2dge && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 }); await page.waitForTimeout(1200);
const info = await page.evaluate(() => { const OB = My3D2dge.current.debug.OB; const rows = My3D2dge.current.scene.list.rows; return { touchOnly: OB.env.touchOnly, disabledGames: rows.slice(0, 5).every(r => r.disabled), settingsEnabled: !rows[5].disabled && rows[5].label === 'Settings' }; });
await page.screenshot({ path: '.cache/shots/touch.png' });
await page.waitForTimeout(11500); const scene = await page.evaluate(() => My3D2dge.current.sceneName);
console.log(JSON.stringify(info), 'after 11 s idle:', scene, 'errors', JSON.stringify(errs));
await browser.close();
