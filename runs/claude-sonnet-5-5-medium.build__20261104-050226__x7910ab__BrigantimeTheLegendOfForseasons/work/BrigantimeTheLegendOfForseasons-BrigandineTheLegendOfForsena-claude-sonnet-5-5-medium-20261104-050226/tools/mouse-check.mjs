import { chromium } from '../engine/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(pathToFileURL(resolve('dist/index.html')).href); await p.waitForTimeout(1200);
const sc = () => p.evaluate(() => My3D2dge.current.sceneName);
await p.mouse.move(600, 500); await p.waitForTimeout(300); await p.mouse.move(610, 505); await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/mouse1.png' });
await p.mouse.click(620, 440); await p.waitForTimeout(800); console.log('after click:', await sc());
await p.mouse.move(300, 200); await p.waitForTimeout(200); await p.mouse.click(300, 200); await p.waitForTimeout(1200); console.log('after realm click:', await sc());
console.log(errs.join('\n') || 'no errors'); await b.close();
