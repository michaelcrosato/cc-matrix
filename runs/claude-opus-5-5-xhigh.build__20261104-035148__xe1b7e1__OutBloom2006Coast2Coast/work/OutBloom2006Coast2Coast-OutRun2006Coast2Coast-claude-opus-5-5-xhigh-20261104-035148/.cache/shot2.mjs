import { chromium } from 'playwright';
const [url, out, w = 1800, h = 600] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('PAGEERR', e.message)); await p.goto(url); await p.waitForTimeout(500); console.log(await p.title()); await p.screenshot({ path: out }); await b.close();
