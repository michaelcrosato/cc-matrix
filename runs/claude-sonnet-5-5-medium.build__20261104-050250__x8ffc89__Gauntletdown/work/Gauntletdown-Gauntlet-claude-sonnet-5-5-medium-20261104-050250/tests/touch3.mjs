// touch-only device without any script override: Chromium told it has a coarse primary pointer
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=1,availableHoverTypes=1', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(2500);
console.log('pointer:fine =', await p.evaluate(() => matchMedia('(pointer: fine)').matches), '| pointer:coarse =', await p.evaluate(() => matchMedia('(pointer: coarse)').matches), '| touch points', await p.evaluate(() => navigator.maxTouchPoints));
await p.screenshot({ path: 'shots/touch-native.png' });
await p.tap('canvas'); await p.waitForTimeout(400); console.log('scene after tap:', await p.evaluate(() => __gd.game.sceneName));
await p.waitForTimeout(11000); console.log('scene after 11 s idle:', await p.evaluate(() => __gd.game.sceneName)); console.log(errs.join('') || 'no page errors'); await b.close();
