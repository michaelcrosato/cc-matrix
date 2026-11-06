import { chromium } from 'playwright'; import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const f = pathToFileURL(resolve(new URL('../../WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655.html', import.meta.url).pathname)).href;
const b = await chromium.launch({ args: ['--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(f + '#act/stork/1/go'); await p.waitForFunction(() => G.curRun && G.curRun.time > .5, null, { timeout: 30000 });
await p.evaluate(() => { const r = G.curRun; r.cs[0].pct = .8; r.done = true; }); await p.waitForTimeout(4500);
await p.screenshot({ path: new URL('../shots/f_results.png', import.meta.url).pathname }); await b.close();
