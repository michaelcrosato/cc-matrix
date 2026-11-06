// node tests/browser/tour.mjs [names...]: screenshots at 1920x1080 of arenas, scenes and screens.
import { launch, open, engineErrors } from './lib.mjs';
const ALL = {
  a1: ['?op=op1&stage=2', 5000], a2: ['?op=op2&stage=5', 5000], a3: ['?op=op3', 5000, 0, 1], a3b: ['?op=op3', 5000, 0, 2], a3c: ['?op=op3', 5000, 0, 3], a4: ['?op=op4&stage=2', 5000], a5: ['?op=op5&stage=1', 11000], a6: ['?op=op6&stage=3', 5000], a7: ['?op=op7&stage=1', 9000], a8: ['?op=op8&stage=1', 6000], a9: ['?op=op9&stage=1', 8000], a10: ['?op=op10&stage=1', 5000],
  s1: ['?scene=ep1', 2500], s2: ['?scene=ep6', 2500], s3: ['?scene=ep4', 2500], s4: ['?scene=ep2', 2500], s5: ['?scene=ep3', 2500], s6: ['?scene=ep7', 2500], s7: ['?scene=ep9', 2500], s8: ['?scene=end', 2500],
  b1: ['?scene=ep1', 2500, 1], b2: ['?scene=ep4', 2500, 6], b3: ['?scene=ep2', 2500, 1], b4: ['?scene=ep5', 2500, 1], b5: ['?scene=ep7', 2500, 1], b6: ['?scene=ep6', 2500, 1], b7: ['?scene=ep4', 2500, 2],
  title: ['', 3500], menu: ['?menu=1', 2500],
  op2: ['?op=op2&stage=5', 5000], op3: ['?op=op3', 5000], op4: ['?op=op4&stage=2', 5000], op5: ['?op=op5&stage=1', 11000], op6: ['?op=op6&stage=3', 5000], op7: ['?op=op7&stage=1', 9000], op8: ['?op=op8&stage=1', 6000], op9: ['?op=op9', 5000], op10: ['?op=op10&stage=1', 5000],
  ep1: ['?scene=ep1', 5000], ep2: ['?scene=ep2', 3000, 1], ep5: ['?scene=ep5', 3000, 1], ep6: ['?scene=ep6', 3000, 1], ep8: ['?scene=ep8', 3000, 1], ep4: ['?scene=ep4', 3000, 3], ep7: ['?scene=ep7', 3000, 2], ep9: ['?scene=ep9', 3000, 1], end: ['?scene=end', 3000, 1],
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ALL);
const b = await launch();
const VP = process.env.VP ? process.env.VP.split('x').map(Number) : [1920, 1080];
for (const n of names) {
  const [q, wait, advance = 0, tabs = 0] = ALL[n];
  const { page, errors, ctx } = await open(b, q, { viewport: { width: VP[0], height: VP[1] } });
  await page.waitForTimeout(wait);
  for (let i = 0; i < advance * 2; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
  for (let i = 1; i < tabs; i++) { await page.keyboard.down('Tab'); await page.waitForTimeout(400); await page.keyboard.up('Tab'); await page.waitForTimeout(1500); }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${n}.png` });
  const errs = [...errors, ...(await engineErrors(page))];
  console.log(n, await page.evaluate(() => window.__PIXEL_ENGINE__?.state?.().status), errs.length ? errs.slice(0, 3) : '');
  await ctx.close();
}
await b.close();
