import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { OUT } from './build.mjs';
const url = pathToFileURL(new URL('../../' + OUT + '.html', import.meta.url).pathname).href;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(url + '?p=1#' + (process.argv[2] || 'room=1-1&god=1')); await p.waitForTimeout(3000);
console.log(await p.evaluate(process.argv[3] || '1'));
if (process.argv[4]) { await p.waitForTimeout(800); await p.screenshot({ path: 'shots/' + process.argv[4] + '.png' }); }
await b.close();
