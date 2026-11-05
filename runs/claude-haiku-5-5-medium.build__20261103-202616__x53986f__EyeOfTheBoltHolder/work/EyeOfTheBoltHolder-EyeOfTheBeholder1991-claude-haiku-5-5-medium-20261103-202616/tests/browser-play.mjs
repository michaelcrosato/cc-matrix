// Drives the bundled game in headless Chromium: New Game, Quick Start, the intro, then play. Prints failures and a count.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '..', '..', 'EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-haiku-5-5-medium-20261103-202616.html');
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await page.goto(pathToFileURL(file).href + '?backend=webgl', { waitUntil: 'load' });
await page.waitForTimeout(6000);
const scene = () => page.evaluate(() => { const g = window.__game.game; return g.debug ? g.debug.snapshot().scene : (g.scene && g.scene.name); }).catch(e => 'err:' + e.message);
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
console.log('after New Game:', await scene());
for (let k = 0; k < 4; k++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); }
await page.keyboard.press('Enter'); await page.waitForTimeout(800);
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
console.log('after Quick Start:', await scene());
for (let i = 0; i < 40 && (await scene()) !== 'play'; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
console.log('scene now:', await scene());
await page.waitForTimeout(1500);
const snap = await page.evaluate(() => window.__game.B.sim.snapshot()).catch(e => ({ err: e.message }));
console.log('snapshot:', JSON.stringify({ floor: snap.floor, x: snap.x, y: snap.y, party: snap.party && snap.party.length, err: snap.err }));
await page.screenshot({ path: path.resolve(here, '..', 'shots', 'play.png') });
await browser.close();
for (const e of errs.slice(0, 15)) console.log('FAIL ' + e);
console.log(errs.length + ' error(s)');
