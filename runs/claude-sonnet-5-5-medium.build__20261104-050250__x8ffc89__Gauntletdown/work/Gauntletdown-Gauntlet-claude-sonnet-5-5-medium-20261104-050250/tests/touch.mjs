import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + (e.stack || e).toString().slice(0, 500))); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/touch1.png' });
console.log('touch only:', await p.evaluate(() => matchMedia('(pointer: fine)').matches), await p.evaluate(() => __gd.game.sceneName));
await p.waitForTimeout(11500); console.log('after 11s:', await p.evaluate(() => __gd.game.sceneName)); await p.waitForTimeout(6000); await p.screenshot({ path: 'shots/touch2.png' });
console.log(errs.length ? errs.join('\n') : 'no page errors'); await b.close();
