import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 1280, h: 720 }); const ev = f => page.evaluate(f);
try {
  await waitStarted(page); await page.waitForTimeout(800);
  await ev(() => S7.newGame()); await page.waitForTimeout(800); await ev(() => { S7.game.debug.skipCutscene(); S7.st.flags.intro_done = true; S7.st.red = 77; });
  await page.waitForTimeout(300);
  await ev(() => S7.bus.emit('open', { screen: 'save' })); await page.waitForTimeout(800); await page.screenshot({ path: 'tests/out/sv1.png' });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(600); await page.screenshot({ path: 'tests/out/sv2.png' });
  console.log('slots', JSON.stringify(await ev(() => S7.game.saves.list().map(s => [s.slot, s.empty, s.place]))));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await ev(() => { S7.game.resume(); S7.game.go('title'); }); await page.waitForTimeout(1200); await page.screenshot({ path: 'tests/out/sv3.png' });
  console.log('continue:', await ev(() => { S7.st.red = 1; return S7.continueGame(); })); await page.waitForTimeout(1000);
  console.log(JSON.stringify(await ev(() => ({ scene: S7.game.sceneName, red: S7.st.red, area: S7.st.area }))));
} catch (e) { console.log('FAILED', e.message); await page.screenshot({ path: 'tests/out/fail.png' }); }
console.log('errors', errors.length, errors.slice(0, 3).join('|')); await browser.close();
