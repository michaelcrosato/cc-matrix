// screenshot a page: node tests/lib/shot.mjs <url-or-path> <out.png> [waitMs] [w h]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const [,, page0, out, wait = '400', w = '1440', h = '810'] = process.argv;
const url = page0.startsWith('http') || page0.startsWith('file:') ? page0 : 'file://' + resolve(page0.split('#')[0].split('?')[0]) + (page0.includes('?') ? '?' + page0.split('?')[1] : '') ;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await p.goto(url);
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
console.log((await p.title()) + (errs.length ? '\nERRORS: ' + errs.join('\n') : ''));
await b.close();
