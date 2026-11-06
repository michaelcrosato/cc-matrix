// node tests/shot.mjs <hash> <out.png> [waitMs] [w] [h] [keys...]
import { chromium } from 'playwright'; import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const [hash, out, wait = '2500', w = '1280', h = '720', ...keys] = process.argv.slice(2);
const file = resolve(new URL('../../WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655.html', import.meta.url).pathname);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(file).href + '#' + hash);
await p.waitForTimeout(+wait);
for (const k of keys) { if (k.startsWith('w')) await p.waitForTimeout(+k.slice(1)); else { await p.keyboard.press(k); await p.waitForTimeout(150); } }
await p.screenshot({ path: out });
console.log('errors:', errs.slice(0, 5), await p.evaluate(() => JSON.stringify(window.G && G.game && G.game.debug.snapshot())));
await b.close();
