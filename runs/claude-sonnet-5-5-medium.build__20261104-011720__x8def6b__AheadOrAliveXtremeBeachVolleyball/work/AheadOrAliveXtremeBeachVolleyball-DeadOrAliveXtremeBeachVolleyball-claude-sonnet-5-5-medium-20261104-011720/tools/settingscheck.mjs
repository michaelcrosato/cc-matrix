import { chromium } from 'playwright'; import { resolve, basename, dirname } from 'node:path'; import { pathToFileURL, fileURLToPath } from 'node:url';
const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..'), file = resolve(DEV, '..', basename(DEV) + '.html');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.goto(pathToFileURL(file).href); await p.waitForTimeout(600);
await p.evaluate(() => My3D2dge.current.menu('settings')); await p.waitForTimeout(500);
const t = await p.evaluate(() => document.body.innerText); console.log(/Button symbols/.test(t), /PlayStation/.test(t), /CPU difficulty/.test(t)); await b.close();
