// node tools/shot.mjs '#race/D3' name [waitMs] [--keys "KeyW:2000,..."] [--eval "js"]: the built file in headless
// Chromium (file://), a screenshot into check-output/, console errors printed
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OUT_NAME } from './build-name.mjs';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const [hash = '', name = 'shot', wait = '6000'] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +(arg('--w') || 1280), height: +(arg('--h') || 720) } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 300)); });
await page.goto(pathToFileURL(ROOT + '../' + OUT_NAME).href + (arg('--q') || '') + hash);
await page.waitForFunction(() => window.__crack && window.__crack.game && window.__crack.game.sceneName, null, { timeout: 120000 }).catch(e => errs.push('BOOT TIMEOUT'));
if (arg('--pre')) console.log('pre', JSON.stringify(await page.evaluate(arg('--pre')).catch(e => String(e))));
const steps = (arg('--keys') || '').split(',').filter(Boolean);
await page.waitForTimeout(+wait);
for (const s of steps) { const [k, ms] = s.split(':'); if (k === 'wait') { await page.waitForTimeout(+ms); continue; } await page.keyboard.down(k); await page.waitForTimeout(+(ms || 100)); await page.keyboard.up(k); }
if (arg('--eval')) console.log(JSON.stringify(await page.evaluate(arg('--eval'))));
await page.screenshot({ path: ROOT + 'check-output/' + name + '.png' });
if (arg('--then')) { await page.evaluate(arg('--then')); await page.waitForTimeout(+(arg('--then-wait') || 3000)); await page.screenshot({ path: ROOT + 'check-output/' + name + '-2.png' }); }
const snap = await page.evaluate(() => window.__crack && window.__crack.snapshot()).catch(() => null);
console.log(JSON.stringify(snap));
for (const e of errs.filter(e => !/deprecated parameters|No available adapters|WebGPU is not available|GPU stall|Automatic fallback/.test(e))) console.log(e);
await browser.close();
