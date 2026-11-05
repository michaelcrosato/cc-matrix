// screenshots of the dev page: node tools/shot.mjs <name> "<js to run in the page>" [waitMs] [WxH]
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const [name = 'shot', js = '', wait = '2500', size = '1280x720', page0 = 'build/index.html'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e))); page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('my-3D2dge'))) errs.push(m.text()); });
await page.goto(pathToFileURL(resolve(page0)).href);
await page.waitForTimeout(800);
if (js) await page.evaluate(js);
for (const [k, t] of (wait + '').split(',').entries()) { await page.waitForTimeout(+t); await page.screenshot({ path: `check-output/${name}${k ? '-' + k : ''}.png` }); }
console.log(JSON.stringify(await page.evaluate(() => window.__bb && __bb.game.debug && __bb.game.debug.snapshot())).slice(0, 600));
console.log('errors:', errs.slice(0, 6).join('\n'));
await browser.close();
