// Touch-only check: opens the single HTML as a phone (touch, no fine pointer), and reports the notice and the gear, and
// that the attract mode runs after 10 s. Usage: node tools/touchcheck.mjs
import { chromium } from 'playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const file = resolve(root, '..', 'SublimeCrisis3-TimeCrisis3-claude-haiku-5-5-medium-20261103-183312.html');
const out = join(root, 'check-output'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.TC && TC.game && TC.game.scene, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({ touchOnly: TC.touchOnly(), scene: TC.game.scene && (TC.game.scene.name || TC.game.sceneName || ''), touchEnabled: TC.game.input.touchEnabled }));
await page.screenshot({ path: join(out, 'touch-title.png') });
let after = '';
for (let i = 0; i < 60 && after !== 'attract'; i++) {
  await page.waitForTimeout(1000);
  after = await page.evaluate(() => TC.game.scene && (TC.game.scene.name || TC.game.sceneName || ''));
}
info.touchEnabledAfter = await page.evaluate(() => TC.game.input.touchEnabled);
await browser.close();
console.log(JSON.stringify({ info, sceneAfter10s: after, errors: errors.slice(0, 3) }));
process.exit(errors.length ? 1 : (info.touchOnly && info.touchEnabledAfter === false && after === 'attract' ? 0 : 1));
