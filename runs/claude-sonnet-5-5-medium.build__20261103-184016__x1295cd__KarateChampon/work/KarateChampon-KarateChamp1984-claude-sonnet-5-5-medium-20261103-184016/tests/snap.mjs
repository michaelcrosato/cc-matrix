// node tests/snap.mjs "#fight/dojo/ebi" out-name "wait:1500 press:Enter wait:500 shot:name2" [W H]
import { chromium } from '../engine/node_modules/playwright/index.mjs'; import path from 'node:path'; import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), name = path.basename(root);
const [hash, out, steps = 'wait:1500', W = 1280, H = 720] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const page = await browser.newPage({ viewport: { width: +W, height: +H } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400))); page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /my-3D2dge/.test(m.text()))) errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(path.join(root, '..', name + '.html')).href + (hash || ''));
for (const s of steps.split(/\s+/)) { const [k, v, v2] = s.split(':'); if (k === 'wait') await page.waitForTimeout(+v); else if (k === 'press') await page.keyboard.press(v); else if (k === 'down') await page.keyboard.down(v); else if (k === 'up') await page.keyboard.up(v); else if (k === 'shot') await page.screenshot({ path: path.join(root, 'tests/out', v + '.png') }); else if (k === 'click') await page.mouse.click(+v, +v2); else if (k === 'eval') console.log(JSON.stringify(await page.evaluate(v)).slice(0, 1500)); }
await page.screenshot({ path: path.join(root, 'tests/out', (out || 'snap') + '.png') });
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors'); await browser.close();
