// Screenshot helper: node tests/browser/shot.mjs <name> "<js to run in page before the shot>" [waitMs]
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.resolve(root, '..', path.basename(root) + '.html');
const [name, code, wait] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(html).href);
await page.waitForTimeout(1500);
if (code) { try { await page.evaluate(code); } catch (e) { errs.push('EVAL: ' + e.message); } }
await page.waitForTimeout(+wait || 800);
await page.screenshot({ path: path.join(root, 'check-output', name + '.png') });
const snap = await page.evaluate(() => { try { return JSON.stringify(DQ.game.debug.snapshot()).slice(0, 500); } catch (e) { return 'nosnap ' + e.message; } });
console.log(snap); console.log('errors:', errs.length ? errs : 'none', await page.evaluate(() => DQ.errors.slice(0, 3)));
await browser.close();
