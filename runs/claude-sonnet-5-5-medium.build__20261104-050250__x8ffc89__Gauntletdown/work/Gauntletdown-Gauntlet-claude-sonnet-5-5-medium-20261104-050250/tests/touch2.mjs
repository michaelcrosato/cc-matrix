import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }); const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /pointer:\s*fine/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {} } : mm(q); Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 }); });
await p.goto(pathToFileURL(resolve('game/index.html')).href); await p.waitForTimeout(2500);
await p.screenshot({ path: 'shots/touch-notice.png' });
console.log('scene', await p.evaluate(() => __gd.game.sceneName));
await p.tap('canvas'); await p.waitForTimeout(500); console.log('after tap', await p.evaluate(() => __gd.game.sceneName));
await p.waitForTimeout(11500); console.log('after idle', await p.evaluate(() => __gd.game.sceneName));
// Xbox glyphs
const q = new URL(pathToFileURL(resolve('game/index.html')).href);
await p.evaluate(() => __gd.game.settings.set('glyphs', 'xbox')); console.log('xbox', await p.evaluate(() => ['fire', 'magic', 'plant', 'confirm', 'cancel'].map(a => __gd.game.input.label(a)).join(' ')));
await p.evaluate(() => { __gd.game.input.lastDevice = 'gamepad'; }); console.log('xbox pad', await p.evaluate(() => ['fire', 'magic', 'plant', 'confirm', 'cancel'].map(a => __gd.game.input.label(a)).join(' ')));
await p.evaluate(() => __gd.game.settings.set('glyphs', 'playstation')); console.log('ps pad', await p.evaluate(() => ['fire', 'magic', 'plant', 'confirm', 'cancel'].map(a => __gd.game.input.label(a)).join(' ')));
console.log(errs.join('\n') || 'no page errors'); await b.close();
