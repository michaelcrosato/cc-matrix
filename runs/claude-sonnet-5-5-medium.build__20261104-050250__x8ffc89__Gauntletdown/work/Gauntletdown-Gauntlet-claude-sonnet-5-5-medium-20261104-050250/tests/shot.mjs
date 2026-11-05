// usage: node tests/shot.mjs <name> "<js to eval before shot>" [waitMs]  -- loads game/index.html, runs js, screenshots shots/<name>.png
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const [name, js = '', wait = '800', url = 'game/index.html'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + (e.stack || e).toString().slice(0, 500))); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 400)); });
await p.goto(pathToFileURL(resolve(url)).href); await p.waitForTimeout(1500);
if (js) { const out = await p.evaluate(js); if (out !== undefined) console.log('EVAL', JSON.stringify(out)); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: `shots/${name}.png` });
const st = await p.evaluate(() => window.__gd ? { scene: __gd.game.sceneName, errors: __gd.game.errors.map(e => e.message) } : null);
console.log(JSON.stringify(st), errs.length ? '\n' + errs.join('\n') : 'no page errors');
await b.close();
