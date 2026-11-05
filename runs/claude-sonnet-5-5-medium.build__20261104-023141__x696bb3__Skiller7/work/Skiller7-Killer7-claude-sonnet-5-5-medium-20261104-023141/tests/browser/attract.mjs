import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 1280, h: 720 });
const snap = async n => { await page.screenshot({ path: `tests/out/${n}.png` }); };
const ev = f => page.evaluate(f);
try {
  await waitStarted(page); await page.waitForTimeout(1000);
  const t0 = Date.now(); let scene = 'title';
  while (Date.now() - t0 < 30000) { await page.waitForTimeout(500); scene = await ev(() => S7.game.sceneName); if (scene === 'attract') break; }
  console.log('attract started after', ((Date.now() - t0) / 1000).toFixed(1), 's, scene', scene);
  for (let i = 0; i < 6; i++) { await ev(i => { S7.bot.setup(i); S7.pres.load(S7.st.area); }, i).catch(() => {}); await page.evaluate(i => { S7.bot.setup(i); S7.pres.load(S7.st.area); }, i); await page.waitForTimeout(7000); await snap('a' + i); console.log(i, JSON.stringify(await ev(() => { const s = S7.game.debug.snapshot(); return { area: s.area, mode: s.mode, e: s.enemies, boss: s.boss }; }))); }
  await page.keyboard.press('Space'); await page.waitForTimeout(1500); console.log('after key:', await ev(() => S7.game.sceneName));
} catch (e) { console.log('FAILED', e.message); await snap('fail'); }
console.log('errors', errors.length); console.log(errors.slice(0, 10).join('\n'));
await browser.close();
