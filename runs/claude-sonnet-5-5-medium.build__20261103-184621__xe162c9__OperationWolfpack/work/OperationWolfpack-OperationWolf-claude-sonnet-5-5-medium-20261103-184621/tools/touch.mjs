import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(process.argv[2])).href); await p.waitForTimeout(3500);
console.log('touchOnly detected:', await p.evaluate(() => matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches));
await p.screenshot({ path: 'shots/touch.png' });
await p.waitForTimeout(11000); console.log('scene after 14s idle:', await p.evaluate(() => WP.game.sceneName));
console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
