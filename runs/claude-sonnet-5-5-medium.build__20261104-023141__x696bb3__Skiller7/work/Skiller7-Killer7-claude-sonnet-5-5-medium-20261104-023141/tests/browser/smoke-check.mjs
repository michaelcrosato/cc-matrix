// Browser smoke: the built file boots from file://, plays the title, starts a game, walks, aims and fires with real keys, with no page errors.
import { open, waitStarted } from '../lib/browser.mjs';
let n = 0, bad = 0; const fails = []; const check = (w, ok, d = '') => { n++; if (!ok) { bad++; fails.push('FAIL ' + w + (d ? ': ' + d : '')); } };
const { browser, page, errors } = await open('', { w: 960, h: 540 });
try {
  await waitStarted(page); await page.waitForTimeout(1500);
  const ev = f => page.evaluate(f);
  check('boots to the title', (await ev(() => S7.game.sceneName)) === 'title');
  await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  const sc = await ev(() => S7.game.sceneName); check('Enter on the title starts something', sc === 'play', sc);
  await ev(() => { S7.game.debug.skipCutscene(); S7.st.flags.intro_done = true; S7.game.debug.teleport('00A', 'start'); S7.st.done['00A:card'] = true; S7.st.done['00A:tut_scan'] = true; S7.game.debug.skipCutscene(); }); await page.waitForTimeout(400);
  const s0 = await ev(() => S7.st.s); await page.keyboard.down('w'); await page.waitForTimeout(1200); await page.keyboard.up('w'); const s1 = await ev(() => S7.st.s);
  check('holding W walks the rail', Math.abs(s1 - s0) > 1, s0 + ' -> ' + s1);
  await page.keyboard.down('Shift'); await page.waitForTimeout(400); check('holding Shift aims', (await ev(() => S7.st.mode)) === 'aim'); await page.keyboard.up('Shift');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500); check('Escape pauses', await ev(() => S7.game.paused)); await page.keyboard.press('Escape');
  await ev(() => S7.game.go('title')); await page.waitForTimeout(800);
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) { check('browser smoke', false, e.message); }
await browser.close(); for (const f of fails) console.log(f); console.log(bad ? `${bad} of ${n} checks failed` : `all ${n} checks passed`);
