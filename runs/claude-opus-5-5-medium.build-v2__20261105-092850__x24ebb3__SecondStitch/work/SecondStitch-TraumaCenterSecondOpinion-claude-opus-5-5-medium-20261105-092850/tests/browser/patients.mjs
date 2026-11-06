// The four patients' busts, in their scenes, at 1080p.
import { launch, open, tap, engineErrors } from './lib.mjs';
const b = await launch();
for (const [who, scene] of [['tomasz', 'ep1'], ['zamboni', 'ep2'], ['ollie', 'ep4'], ['ottilie', 'ep7']]) {
  const { page, errors, ctx } = await open(b, `?scene=${scene}`, { viewport: { width: 1920, height: 1080 } });
  await page.waitForFunction(() => window.__GAME__?.stage?.name === 'story');
  for (let i = 0; i < 80; i++) { if (await page.evaluate((w) => window.__GAME__.stage.scene.beats[window.__GAME__.stage.i]?.who === w, who)) break; await tap(page, 'Enter'); }
  await page.waitForTimeout(1500);
  const seen = await page.evaluate((w) => { const s = window.__GAME__.stage; return { speaker: s.scene.beats[s.i]?.who, visible: s.busts[w]?.root.visible }; }, who);
  await page.screenshot({ path: `shots/patient-${who}.png` });
  console.log(who, JSON.stringify(seen), [...errors, ...(await engineErrors(page))].length ? 'ERRORS' : 'no errors');
  await ctx.close();
}
await b.close();
