// node tools/shot.mjs <name> <hash> [js-to-eval] [waitMs] [WxH]  -> shots/<name>.png ; prints errors
import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const [name, hash = '', js = '', wait = '1500', size = '1280x720'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const p = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(process.env.PAGE || 'dist/index.html')).href + (hash ? '#' + hash : ''));
await p.waitForTimeout(800);
if (js) await p.evaluate(js);
await p.waitForTimeout(+wait);
await p.screenshot({ path: `shots/${name}.png` });
const dbg = await p.evaluate(() => { try { return JSON.stringify(My3D2dge.current.debug.snapshot()).slice(0, 400) + ' ERR:' + My3D2dge.current.errors.map(e => e.message).join('|'); } catch (e) { return 'no debug ' + e; } });
console.log(dbg); if (errs.length) console.log('PAGE ERRORS:\n' + errs.slice(0, 5).join('\n'));
await b.close();
