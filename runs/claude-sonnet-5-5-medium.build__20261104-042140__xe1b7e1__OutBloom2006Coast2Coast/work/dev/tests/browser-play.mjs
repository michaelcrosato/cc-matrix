// plays the real page with the keyboard: title -> garage -> race, drifts, pauses into dev mode
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), file = readdirSync(root).find(f => /^OutBloom.*\.html$/.test(f));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(new URL(file, root).href); await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title', null, { timeout: 30000 });
await page.waitForTimeout(800);
const scene = () => page.evaluate(() => My3D2dge.current.sceneName);
await page.keyboard.press('Enter'); await page.waitForTimeout(600); console.log('after enter:', await scene());
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); await page.keyboard.press('ArrowUp'); // move the focus about
await page.keyboard.press('Enter'); await page.waitForTimeout(1200); console.log('after start:', await scene());
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(5000);
await page.screenshot({ path: '.cache/shots/play1.png' });
await page.keyboard.down('ArrowRight'); await page.keyboard.press('Space'); await page.keyboard.down('Space'); await page.waitForTimeout(900);
await page.screenshot({ path: '.cache/shots/play2.png' });
await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(1500);
const snap = await page.evaluate(() => My3D2dge.current.debug.snapshot()); console.log(JSON.stringify(snap.race).slice(0, 300));
await page.keyboard.press('Escape'); await page.waitForTimeout(500); await page.screenshot({ path: '.cache/shots/pause.png' });
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
console.log('errors', JSON.stringify(errs.slice(0, 5)), JSON.stringify(await page.evaluate(() => My3D2dge.current.errors.map(e => e.message))));
await browser.close();
