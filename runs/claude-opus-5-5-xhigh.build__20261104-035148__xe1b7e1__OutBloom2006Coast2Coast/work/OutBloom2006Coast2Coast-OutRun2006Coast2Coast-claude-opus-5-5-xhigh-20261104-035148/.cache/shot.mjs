import { chromium } from 'playwright';
const [url, out, w = 1400, h = 760, wait = 300] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url); await p.waitForTimeout(+wait); await p.screenshot({ path: out });
if (errs.length) console.log('ERRORS', errs.slice(0, 5).join('\n')); await b.close();
