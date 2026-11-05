import { chromium, devices } from '../pw/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const c = await b.newContext({ ...devices['Pixel 7'] }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(pathToFileURL(resolve('../Bentou2-Tenchu2-claude-sonnet-5-5-medium-20261103-183530.html')).href); await p.waitForTimeout(2000);
console.log(JSON.stringify(await p.evaluate(() => ({ touchOnly: __bentou.B.touchOnly(), rows: __bentou.game.scene && 1 }))));
await p.screenshot({ path: 'shots/touch.png' }); console.log('errors', errs.length); await b.close();
