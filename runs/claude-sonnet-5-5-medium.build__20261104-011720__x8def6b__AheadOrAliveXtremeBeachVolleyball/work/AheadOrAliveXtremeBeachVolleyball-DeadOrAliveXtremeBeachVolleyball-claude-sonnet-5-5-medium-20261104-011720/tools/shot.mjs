import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const [,, file, out, ...rest] = process.argv; const js = rest.join(' ');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(800);
if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log(JSON.stringify(r)); }
await p.waitForTimeout(1500);
await p.screenshot({ path: out }); console.log('errors:', errs.slice(0, 5)); await b.close();
