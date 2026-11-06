import { chromium } from 'playwright'; import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const file = pathToFileURL(resolve(new URL('../../WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655.html', import.meta.url).pathname)).href;
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(file + '#act/stork/1/go'); await p.waitForTimeout(5000); await p.evaluate(() => { G.dev.open(); }); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(700);
await p.screenshot({ path: new URL('../shots/dev.png', import.meta.url).pathname }); console.log(errs); await b.close();
