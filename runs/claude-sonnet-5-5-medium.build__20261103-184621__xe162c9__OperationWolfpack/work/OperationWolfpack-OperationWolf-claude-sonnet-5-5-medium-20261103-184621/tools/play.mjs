// plays the built game in a browser for a while: node tools/play.mjs file.html out.png "js to run after load" [waitMs] [mouse]
import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const [file, out, js = '', wait = '4000', mouse = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(file)).href);
await p.waitForTimeout(2500);
if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log('eval ->', JSON.stringify(r)); }
if (mouse) { const [mx, my] = mouse.split(',').map(Number); await p.mouse.move(mx, my); await p.mouse.down(); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
console.log(JSON.stringify(await p.evaluate(() => { try { return WP.game.debug.snapshot(); } catch (e) { return String(e); } })).slice(0, 700));
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 6).join('\n') : 'no errors');
await b.close();
