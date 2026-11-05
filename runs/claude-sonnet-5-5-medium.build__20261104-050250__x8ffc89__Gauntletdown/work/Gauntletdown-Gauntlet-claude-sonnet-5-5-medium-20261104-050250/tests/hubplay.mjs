// plays a 2-player session through the harness for a while; drives the copies with keys inside their frames; screenshots
import { chromium } from 'playwright';
const port = process.argv[2];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1500, height: 800 } }); const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + (e.stack || e).toString().slice(0, 400)));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&players=2&limit=120`);
await p.waitForTimeout(3000);
const frames = () => p.frames().filter(f => f !== p.mainFrame());
console.log('frames', frames().length);
await p.screenshot({ path: 'shots/hubplay0.png' });
for (const f of frames()) await f.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })); });
await p.waitForTimeout(9000);
// drive: p1 holds right + fire for a few seconds via the game's own input
for (const [i, f] of frames().entries()) await f.evaluate(i => { const I = __gd.game.input; I.hold && I.hold('right', true); I.hold && I.hold('fire', true); }, i);
await p.waitForTimeout(8000);
await p.screenshot({ path: 'shots/hubplay1.png' });
for (const f of frames()) console.log(await f.evaluate(() => JSON.stringify({ scene: __gd.game.sceneName, snap: __gd.game.debug.snapshot() })));
console.log(errs.length ? errs.slice(0, 6).join('\n') : 'no page errors');
await b.close();
