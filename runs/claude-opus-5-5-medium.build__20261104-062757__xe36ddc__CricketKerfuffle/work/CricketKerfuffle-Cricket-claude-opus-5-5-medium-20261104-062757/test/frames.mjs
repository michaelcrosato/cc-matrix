// a burst of frames around a moment (what scripts can't judge: the swing, the bowling action): test/out/f_<tag>_<n>.png
import { createRequire } from 'node:module';
const require = createRequire(new URL('../engine/package.json', import.meta.url));
const { chromium } = require('playwright');
const [tag, setup, waitFor, n = '10', gap = '60', clip] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(new URL('../dist/index.html', import.meta.url).href + '?r=' + Math.random()); await p.waitForTimeout(3500);
await p.evaluate(setup);
await p.waitForFunction(waitFor, null, { timeout: 30000, polling: 5 });
const c = clip ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(clip.split(',').map(Number)) : undefined;
for (let k = 0; k < +n; k++) { await p.screenshot({ path: new URL(`out/f_${tag}_${k}.png`, import.meta.url).pathname, clip: c }); await p.waitForTimeout(+gap); }
await b.close();
