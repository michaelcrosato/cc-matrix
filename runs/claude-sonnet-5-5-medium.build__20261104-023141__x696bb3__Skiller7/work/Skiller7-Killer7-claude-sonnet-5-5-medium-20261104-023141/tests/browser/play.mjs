import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 1280, h: 720 });
const snap = async n => { await page.screenshot({ path: `tests/out/${n}.png` }); };
const ev = f => page.evaluate(f);
try {
  await waitStarted(page); await page.waitForTimeout(1000);
  // pause menu
  await ev(() => { S7.newGame(); }); await page.waitForTimeout(800); await ev(() => { S7.game.debug.skipCutscene(); S7.st.flags.intro_done = true; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(700); await snap('p1-pause');
  // find dev mode item: navigate
  const info = await ev(() => JSON.stringify({ paused: S7.game.paused, scene: S7.game.sceneName }));
  console.log('pause', info);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  // combat in the browser: real keys
  await ev(() => { S7.game.debug.teleport('00A', 'start'); S7.st.done['00A:card'] = true; S7.st.done['00A:tut_scan'] = true; S7.game.debug.skipCutscene(); });
  await page.waitForTimeout(500);
  await ev(() => { const e = S7.sim.spawnEnemy('giggler', S7.st.x - 8, S7.st.y - 1); e.spawnT = 0; e.stun = 99; S7.sim.spawnEnemy('bellhop', S7.st.x - 7, S7.st.y + 2).stun = 99; });
  await page.keyboard.down('Shift'); await page.waitForTimeout(500);
  await page.keyboard.press('Space'); await page.waitForTimeout(900); await snap('p2-scanned');
  await ev(() => { const e = S7.st.enemies[0]; const eye = S7.st.z + 1.55; const w = e.def.warm; const bx = e.x + Math.cos(e.face) * e.def.r * .6, by = e.y + Math.sin(e.face) * e.def.r * .6; S7.st.aim.yaw = Math.atan2(by - S7.st.y, bx - S7.st.x); S7.st.aim.pitch = Math.atan2(e.z + w[1] - eye, Math.hypot(bx - S7.st.x, by - S7.st.y)); });
  await page.waitForTimeout(100); await snap('p3-aimed');
  await page.keyboard.down('j'); await page.waitForTimeout(150); await page.keyboard.up('j'); await page.waitForTimeout(250); await snap('p4-fired');
  console.log(JSON.stringify(await ev(() => S7.game.debug.snapshot().enemies)));
  await page.keyboard.up('Shift');
  // echo run
  await ev(() => S7.startEchoRun()); await page.waitForTimeout(4500); await snap('p5-echo');
  await page.keyboard.down('w'); await page.waitForTimeout(5000); await snap('p6-echo-run'); await page.keyboard.up('w');
  console.log(JSON.stringify(await ev(() => S7.game.debug.snapshot())));
} catch (e) { console.log('FAILED', e.message); await snap('fail'); }
console.log('errors', errors.length); console.log(errors.slice(0, 10).join('\n'));
await browser.close();
