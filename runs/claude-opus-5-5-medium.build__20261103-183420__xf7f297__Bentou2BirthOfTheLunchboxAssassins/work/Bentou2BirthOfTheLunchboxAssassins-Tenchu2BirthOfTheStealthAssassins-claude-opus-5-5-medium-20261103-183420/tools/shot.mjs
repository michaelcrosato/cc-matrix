// node tools/shot.mjs <name> "<js to run in the page after boot>" [waitMs] [WxH]
// Opens the bundle from file://, runs the script (it may call window.__BENTOU), waits, saves shots/<name>.png and prints
// console errors. Used for the looks only scripts can't judge.
import { chromium } from '../handoff/node_modules/playwright/index.mjs';
const NAME = 'Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420';
const [name = 'shot', js = '', wait = '1500', size = '1280x720'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const url = new URL('../../' + NAME + '.html', import.meta.url).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__BENTOU && window.__BENTOU.game.sceneName, null, { timeout: 15000 });
await page.waitForTimeout(600);
if (js) { try { await page.evaluate(js); } catch (e) { errs.push('eval: ' + e.message); } }
await page.waitForTimeout(+wait);
await page.screenshot({ path: new URL('../shots/' + name + '.png', import.meta.url).pathname });
const ge = await page.evaluate(() => window.__BENTOU.game.errors.map(e => (e.message || String(e)) + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
console.log(JSON.stringify({ scene: await page.evaluate(() => window.__BENTOU.game.sceneName), errors: errs.concat(ge).slice(0, 8), info: await page.evaluate(() => window.__s || null) }));
await browser.close();
