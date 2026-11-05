// node test/shot.mjs <page> <hash> <out> [waitMs] [keys...]   screenshots a page and prints console errors
import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const [page0, hash = '', out = 'shots/a.png', wait = '1500', ...keys] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
await p.goto('file://' + resolve(page0) + (hash ? '#' + hash : ''));
await p.waitForTimeout(+wait);
for (const k of keys) { if (k.startsWith('wait:')) await p.waitForTimeout(+k.slice(5)); else if (k.startsWith('down:')) await p.keyboard.down(k.slice(5)); else if (k.startsWith('up:')) await p.keyboard.up(k.slice(3)); else if (k.startsWith('shot:')) await p.screenshot({ path: k.slice(5) }); else if (k.startsWith('eval:')) console.log(JSON.stringify(await p.evaluate(k.slice(5)))); else await p.keyboard.press(k); await p.waitForTimeout(80); }
await p.screenshot({ path: out });
console.log(JSON.stringify(await p.evaluate(() => window.__dh && window.__dh.snapshot())));
console.log(errs.slice(0, 12).join('\n') || 'no errors');
await b.close();
