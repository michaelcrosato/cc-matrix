// node tests/browser/gallery.mjs op2:4:8 op5:3:12 ...  : op:stage:seconds; screenshots to tests/tmp/g-*.png at 1080p
import { launch, openGame } from './lib.mjs';
const b = await launch();
for (const spec of process.argv.slice(2)) {
  const [op, stage, secs, skill] = spec.split(':');
  const { page, errors, ctx } = await openGame(b, `?op=${op}&stage=${stage}&bot=${skill ?? 0.6}&god=1`, { viewport: { width: 1920, height: 1080 } });
  await page.evaluate(() => { const g = window.__TRAUMA_APP__; g.cheats.freezeClock = true; });
  await page.waitForTimeout(Number(secs ?? 8) * 1000);
  await page.screenshot({ path: `tests/tmp/g-${op}-${stage}.png` });
  const st = await page.evaluate(() => window.__PIXEL_ENGINE__.state().status);
  console.log(spec, st, errors.slice(0, 3), await page.evaluate(() => window.__PIXEL_ENGINE__.errors.slice(0, 3)));
  await ctx.close();
}
await b.close();
