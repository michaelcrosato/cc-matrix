// node tools/shot.mjs <name> [--size 1920x1080] [--frames 60] [--eval "js"]  -> shots/<name>.png
import { openGame, shot } from './lib.mjs';
const a = process.argv.slice(2); const name = a[0] ?? 'title';
const get = (f, d) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
const size = get('--size', '1280x720').split('x').map(Number);
const g = await openGame({ size });
console.log('ready', g.ready, g.errors);
const ev = get('--eval', null);
if (ev) { await g.page.evaluate(new Function('return (async()=>{' + ev + '})()')); }
await shot(g.page, `shots/${name}.png`, +get('--frames', 60));
console.log(await g.page.evaluate(() => JSON.stringify(window.__GAME__?.state?.() ?? null)).then((s) => s.slice(0, 600)));
console.log('errors', g.errors);
await g.browser.close();
