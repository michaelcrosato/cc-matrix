// node tests/browser/shot.mjs out.png "?op=op1" [waitMs] [js to eval first] -- a look at one screen at 1080p.
import { launch, open, engineErrors } from './lib.mjs';
const [out, q = '', wait = '3000', js = ''] = process.argv.slice(2);
const b = await launch();
const { page, errors } = await open(b, q, { viewport: { width: 1920, height: 1080 } });
if (js) await page.evaluate(js);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
const st = await page.evaluate(() => window.__PIXEL_ENGINE__?.state?.().status);
console.log('status:', st, 'errors:', [...errors, ...(await engineErrors(page))].slice(0, 6));
await b.close();
