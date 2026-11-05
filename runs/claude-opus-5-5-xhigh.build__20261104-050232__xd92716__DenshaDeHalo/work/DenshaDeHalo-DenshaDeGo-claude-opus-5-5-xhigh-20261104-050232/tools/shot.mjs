// screenshots of the page: node tools/shot.mjs <page#hash> <out.png> [w h] [waitMs] [steps...]
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const [page0, out, w = 1280, h = 720, wait = 1500] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const [file, hash] = page0.split('#');
await page.goto('file://' + resolve(file) + (hash ? '#' + hash : ''));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
if (errs.length) console.log('ERRORS:', errs.slice(0, 5).join(' | '));
await browser.close();
