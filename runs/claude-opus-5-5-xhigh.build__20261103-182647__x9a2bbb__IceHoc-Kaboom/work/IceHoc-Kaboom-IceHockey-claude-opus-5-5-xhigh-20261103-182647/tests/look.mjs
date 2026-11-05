// node tests/look.mjs <hash> <out> <x> <y> [view] [zoom] [extra js]: a still of the world at a point (AI frozen)
import { chromium } from 'playwright';
const [hash, out, x, y, view = 'threequarter', zoom = '.72', js = '', size = '1280x720'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto('file://' + new URL('../build/dev.html', import.meta.url).pathname + '#' + hash); await page.waitForTimeout(2500);
await page.evaluate(([x, y, view, zoom, js]) => { const G = __game; if (js) eval(js); if (+x) { G.Dev.cheat('freezeAI', true); G.Cam.lookAt(+x, +y, +zoom); } G.game.setView(view); G.game.setZoom(+zoom); }, [x, y, view, zoom, js]);
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
console.log(errs.join(' | ') || 'ok', await page.evaluate(() => __game.game.errors.length));
await browser.close();
