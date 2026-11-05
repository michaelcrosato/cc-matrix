// node test/shot.mjs <html> <out.png> [hash] [--wait ms] [--js code]  — headless Chromium screenshot + console errors
import { chromium } from '../tools/node_modules/playwright/index.mjs';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const a = process.argv.slice(2), file = a[0], out = a[1], wait = +(a[a.indexOf('--wait') + 1] || 1500), js = a.indexOf('--js') >= 0 ? a[a.indexOf('--js') + 1] : '';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(1200);
if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log('js:', JSON.stringify(r)); }
await p.waitForTimeout(wait); await p.screenshot({ path: out });
console.log('snap', JSON.stringify(await p.evaluate(() => window.__thugby && window.__thugby.game && window.__thugby.game.debug && window.__thugby.game.debug.snapshot())).slice(0, 500));
console.log('errors', errs.length ? errs.join('\n') : 'none'); await b.close();
