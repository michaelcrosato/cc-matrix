import { launch, open, engineErrors } from './lib.mjs';
const b = await launch();
const S = [['a1', '?op=op1&stage=3', 8000, 0.6], ['a2', '?op=op6&stage=7', 12000, 0.9], ['a3', '?op=op5&stage=1', 16000, 0.8, true], ['a4', '?op=op9&stage=3', 14000, 0.8], ['a5', '?op=op7&stage=1', 26000, 0.8], ['a6', '?op=op1&stage=4', 5000, 0.5]];
for (const [n, q, w, skill, quiet] of S) {
  const { page, errors, ctx } = await open(b, q, { viewport: { width: 1920, height: 1080 } });
  await page.waitForFunction(() => window.__GAME__?.stage?.intro <= 0);
  await page.evaluate((s) => { const st = window.__GAME__.stage; st.botOn = true; st.botSkill = s; st.sim.cheats.god = true; }, skill);
  if (quiet) await page.evaluate(() => { window.__GAME__.sim.composure = 100; });
  await page.waitForTimeout(w);
  if (quiet) { await page.evaluate(() => { const st = window.__GAME__.stage; st.sim.quiet = true; st.sim.quietSeat = 0; }); await page.waitForTimeout(800); }
  await page.screenshot({ path: `shots/${n}.png` });
  console.log(n, await page.evaluate(() => window.__GAME__.stage.status?.()), errors, await engineErrors(page));
  await ctx.close();
}
await b.close();
