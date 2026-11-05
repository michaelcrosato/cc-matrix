import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const [file, out, wait = '1500', extra = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(+wait);
if (extra) { await p.evaluate(extra); await p.waitForTimeout(800); }
await p.screenshot({ path: out }); console.log(errs.join('\n') || 'no errors'); await b.close();
