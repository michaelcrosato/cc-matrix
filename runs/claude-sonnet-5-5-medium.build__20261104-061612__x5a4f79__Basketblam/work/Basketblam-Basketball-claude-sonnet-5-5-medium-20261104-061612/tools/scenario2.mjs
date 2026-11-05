import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = process.argv[2];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 2).join(' | '))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(resolve(file)).href + '#exhibition/dome/cannons-bots');
await page.waitForTimeout(1200);
const ev = f => page.evaluate(f);
await page.screenshot({ path: 'check-output/tip.png' });
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
await page.waitForTimeout(3000); await page.screenshot({ path: 'check-output/dome.png' });
await ev(() => { window.__bb.debug.force('quarterEnd'); }); await page.waitForTimeout(1200); await page.screenshot({ path: 'check-output/break.png' });
await ev(() => { window.__bb.debug.setScore(31, 24); window.__bb.debug.force('end'); }); await page.waitForTimeout(4500); await page.screenshot({ path: 'check-output/results.png' });
console.log(await ev(() => window.__bb.game.sceneName));
await page.goto(pathToFileURL(resolve(file)).href + '#exhibition/lunar/moon-bots'); await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
await page.waitForTimeout(4000); await page.screenshot({ path: 'check-output/lunar.png' });
await page.goto(pathToFileURL(resolve(file)).href + '#exhibition/roof/dogs-cats'); await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
await page.waitForTimeout(4000); await page.screenshot({ path: 'check-output/roof.png' });
console.log(errs.length ? 'ERRORS ' + errs.join(' || ') : 'no errors');
await browser.close();
