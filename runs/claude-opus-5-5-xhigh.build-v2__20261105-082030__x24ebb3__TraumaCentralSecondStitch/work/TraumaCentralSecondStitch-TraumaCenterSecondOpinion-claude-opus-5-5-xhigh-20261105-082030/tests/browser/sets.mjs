// Sets and busts at 1080p, for looking at. node tests/browser/sets.mjs ep7:0 ep7:1 ep9:0 ...
import { launch, openGame } from './lib.mjs';
const b = await launch();
for (const spec of process.argv.slice(2)) {
  const [id, beat] = spec.split(':');
  const { page, errors, ctx } = await openGame(b, `?scene=${id}`, { viewport: { width: 1920, height: 1080 } });
  await page.waitForFunction(() => window.__GAME__?.stage?.name === 'story', null, { timeout: 40000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async (n) => { const st = window.__GAME__.stage; for (let i = 0; i < n; i++) st.next(); st.chars = 999; }, Number(beat));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `tests/tmp/set-${id}-${beat}.png` });
  console.log(spec, errors.slice(0, 2));
  await ctx.close();
}
await b.close();
