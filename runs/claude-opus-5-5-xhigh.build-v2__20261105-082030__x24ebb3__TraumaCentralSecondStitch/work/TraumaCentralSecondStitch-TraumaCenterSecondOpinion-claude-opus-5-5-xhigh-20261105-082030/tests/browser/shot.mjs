// node tests/browser/shot.mjs "<query>" out.png [waitMs] [js-to-eval]
import { launch, openGame, ROOT } from './lib.mjs';
const [query, out, wait, code] = process.argv.slice(2);
const b = await launch();
const { page, errors } = await openGame(b, query ?? '', { viewport: { width: 1920, height: 1080 } });
await page.waitForTimeout(Number(wait ?? 3000));
if (code) { console.log(await page.evaluate(code)); await page.waitForTimeout(1500); }
await page.screenshot({ path: out ?? 'tests/tmp/shot.png' });
console.log(await page.evaluate(() => JSON.stringify({ status: window.__PIXEL_ENGINE__.state().status, errs: window.__PIXEL_ENGINE__.errors, gpu: window.__PIXEL_ENGINE__.state().gpuErrors, fps: window.__PIXEL_ENGINE__.fps })));
if (errors.length) console.log('ERRORS', errors.slice(0, 8));
await b.close();
