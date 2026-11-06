// node tools/dbg.mjs '<js evaluated in the page; return JSON>'
import { chromium } from 'playwright'; import { dirname, join } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(dirname(fileURLToPath(import.meta.url))); const NAME = here.split('/').pop(); const url = pathToFileURL(join(here, '..', `${NAME}.html`)).href + '?test=1&render=0&manual=1';
const b = await chromium.launch({ args: ['--no-sandbox'] }); const p = await b.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message)); await p.goto(url); await p.waitForFunction(() => window.__TEST__, null, { timeout: 60000 });
console.log(JSON.stringify(await p.evaluate(`(()=>{${process.argv[2]}})()`))); await b.close();
