import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 1280, h: 720 });
const snap = async n => { await page.screenshot({ path: `tests/out/${n}.png` }); };
const ev = f => page.evaluate(f);
try {
  await waitStarted(page); await page.waitForTimeout(1500);
  await ev(() => S7.newGame()); await page.waitForTimeout(2500); await snap('1-intro');
  await ev(() => S7.game.debug.skipCutscene()); await page.waitForTimeout(800); await snap('2-room7');
  await ev(() => { S7.st.flags.intro_done = true; S7.game.debug.teleport('00A', 'j2'); S7.st.done['00A:tw1'] = true; S7.game.debug.skipCutscene(); }); await page.waitForTimeout(1200); await snap('3-lobby');
  await ev(() => { S7.sim.spawnEnemy('giggler', S7.st.x - 6, S7.st.y - 3); S7.sim.spawnEnemy('bellhop', S7.st.x - 5, S7.st.y + 4); S7.game.debug.revealAll(); });
  await page.keyboard.down('Shift'); await page.waitForTimeout(900); await snap('4-aim'); await page.keyboard.up('Shift');
  await ev(() => { S7.game.debug.teleport('00C', 'n0'); S7.game.debug.skipCutscene(); S7.game.debug.boss('grau'); }); await page.waitForTimeout(1500); await snap('5-boss');
  await ev(() => { S7.game.debug.teleport('01A', 'v2'); S7.st.done['01A:card'] = true; S7.game.debug.skipCutscene(); }); await page.waitForTimeout(1500); await snap('6-village');
  await ev(() => { S7.game.debug.teleport('01C', 'base'); S7.game.debug.skipCutscene(); }); await page.waitForTimeout(6000); await snap('7-lift'); await ev(() => { S7.game.debug.teleport('01C', 'top'); }); await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w'); await page.waitForTimeout(4000); await snap('8-ski'); await ev(() => { S7.game.debug.teleport('01F', 'f0'); S7.game.debug.boss('king'); }); await page.waitForTimeout(2500); await snap('9-king'); await ev(() => { S7.game.debug.teleport('room7', 'c'); }); await page.waitForTimeout(1500); await snap('10-room7');
} catch (e) { console.log('FAILED', e.message); await snap('fail'); }
console.log('errors', errors.length); console.log(errors.slice(0, 10).join('\n'));
await browser.close();
