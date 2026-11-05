// node tools/shot.mjs <page.html[#hash]> <out.png> [--wait ms] [--eval "js"] [--size 960x540] [--snap]
// Opens the page over file:// in headless Chromium, waits, optionally runs JS, screenshots, prints errors (+ snapshot).
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const a = process.argv.slice(2), opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const [page0, out] = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--') && !['--snap'].includes(a[i - 1])));
const [file0, hash] = page0.split('#'), [file, query] = file0.split('?');
const url = pathToFileURL(resolve(file)).href + (query ? '?' + query : '') + (hash ? '#' + hash : '');
const [w, h] = (opt('size', '960x540')).split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto(url);
await page.waitForTimeout(+opt('wait', 1500));
const ev = opt('eval', null);
if (ev) { const r = await page.evaluate(ev); if (r !== undefined) console.log('eval:', JSON.stringify(r)); await page.waitForTimeout(+opt('after', 300)); }
await page.screenshot({ path: out });
if (a.includes('--snap')) console.log(JSON.stringify(await page.evaluate(() => { const g = My3D2dge.current; if (!g) return { snap: 'no game' }; return { snap: g.debug && g.debug.snapshot ? g.debug.snapshot() : null, errors: (g.errors || []).map(e => String(e.stack || e.message || e).slice(0, 400)) }; }).catch(e => String(e))));
for (const e of errs) console.log(e);
await browser.close();
