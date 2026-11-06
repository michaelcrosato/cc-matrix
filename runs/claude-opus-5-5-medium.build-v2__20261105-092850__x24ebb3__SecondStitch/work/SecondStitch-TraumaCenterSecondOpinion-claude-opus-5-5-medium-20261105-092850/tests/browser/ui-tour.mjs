// Screens reached by play: pause, dev, settings, fail, results, consult, about, code blue, massage, a client's view of a hub round.
import { launch, open, tap, engineErrors } from './lib.mjs';
const b = await launch();
const vp = { viewport: { width: 1920, height: 1080 } };
const snap = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: `shots/${name}.png` }); };
{ const { page, errors, ctx } = await open(b, '?op=op5&stage=1', vp);
  await page.waitForFunction(() => window.__GAME__?.stage?.intro <= 0);
  await tap(page, 'Escape'); await snap(page, 'pause');
  for (let i = 0; i < 5; i++) await tap(page, 'ArrowDown');
  await tap(page, 'Enter'); await snap(page, 'dev');
  await tap(page, 'Escape');
  await page.evaluate(() => { const m = window.__GAME__.stage.pause.menu; m.focus = 4; });
  await tap(page, 'Enter'); await snap(page, 'settings');
  await tap(page, 'Escape'); await tap(page, 'Escape');
  await page.evaluate(() => window.__GAME__.stage.sim.phase === 'play' && (window.__GAME__.stage.sim.codeBlue = null));
  await page.evaluate(async () => { const st = window.__GAME__.stage; const { } = st; st.sim.tables[0].vitals = 0; });
  await page.waitForFunction(() => window.__GAME__.stage.sim.phase === 'codeblue', null, { timeout: 8000 }).catch(() => {});
  await snap(page, 'codeblue');
  await page.waitForFunction(() => window.__GAME__.stage.fail, null, { timeout: 60000 });
  await snap(page, 'fail');
  console.log('A', errors, await engineErrors(page));
  await ctx.close(); }
{ const { page, errors, ctx } = await open(b, '?op=op10&stage=5', vp);
  await page.waitForFunction(() => window.__GAME__?.stage?.intro <= 0);
  await page.evaluate(() => { const st = window.__GAME__.stage; st.botOn = true; st.botSkill = 1; });
  await page.waitForFunction(() => window.__GAME__?.stage?.name === 'results', null, { timeout: 60000 });
  await tap(page, 'Enter'); await page.waitForTimeout(800); await snap(page, 'results');
  console.log('B', errors);
  await ctx.close(); }
{ const { page, errors, ctx } = await open(b, '?op=op8&stage=1', vp);
  await page.waitForFunction(() => window.__GAME__?.stage?.intro <= 0);
  await page.evaluate(() => { const st = window.__GAME__.stage; st.botOn = true; st.botSkill = 1; });
  await page.waitForFunction(() => window.__GAME__.sim.massage, null, { timeout: 120000 }).catch(() => {});
  await snap(page, 'massage');
  console.log('C', errors, await page.evaluate(() => window.__GAME__.stage.status()));
  await ctx.close(); }
{ const { page, errors, ctx } = await open(b, '?menu=1', vp);
  await page.evaluate(() => { const st = window.__GAME__.stage, i = st.menu.items.findIndex((x) => x.id === 'about'); st.menu.focus = i; });
  await tap(page, 'Enter');
  await page.waitForFunction(() => window.__GAME__?.stage?.name === 'about');
  await snap(page, 'about');
  console.log('D', errors);
  await ctx.close(); }
await b.close();
