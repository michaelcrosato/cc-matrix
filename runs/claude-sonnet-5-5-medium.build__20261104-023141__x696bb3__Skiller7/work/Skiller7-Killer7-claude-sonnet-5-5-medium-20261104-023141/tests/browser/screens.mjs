import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 1280, h: 720 });
const snap = async n => { await page.screenshot({ path: `tests/out/${n}.png` }); };
const ev = f => page.evaluate(f);
try {
  await waitStarted(page); await page.waitForTimeout(1200);
  await ev(() => S7.newGame()); await page.waitForTimeout(1200); await ev(() => { S7.st.flags.intro_done = true; S7.st.beat = null; S7.st.talk = null; S7.st.card = null; S7.st.mode = 'rail'; });
  await page.waitForTimeout(500); await snap('s0-room7');
  await ev(() => { S7.ui.push(new S7.screens.Wardrobe()); }); await page.waitForTimeout(500); await snap('s1-wardrobe'); await ev(() => S7.ui.pop());
  await ev(() => { S7.st.rime = 9; S7.ui.push(new S7.screens.Bench()); }); await page.waitForTimeout(400); await snap('s2-bench'); await ev(() => S7.ui.pop());
  await ev(() => { S7.ui.push(new S7.screens.Notes(0)); }); await page.waitForTimeout(400); await snap('s3-notes'); await ev(() => { S7.ui.top().tab = 1; S7.st.dossier.push('d_oma', 'd_foehn'); }); await page.waitForTimeout(300); await snap('s4-dossier'); await ev(() => S7.ui.pop());
  await ev(() => { S7.ui.push(new S7.screens.Dev()); }); await page.waitForTimeout(400); await snap('s5-dev'); await ev(() => { S7.ui.top().tab = 3; }); await page.waitForTimeout(300); await snap('s6-tuning'); await ev(() => S7.ui.pop());
  await ev(() => { S7.ui.push(new S7.screens.About(false)); }); await page.waitForTimeout(400); await snap('s7-about'); await ev(() => S7.ui.pop());
  await ev(() => { S7.ui.push(new S7.screens.Results({ target: 0, stats: { kills: 23, crits: 14, damage: 40, time: 512, acc: 61, pins: 2 }, rank: 'A' })); }); await page.waitForTimeout(1800); await snap('s8-results'); await ev(() => S7.ui.pop());
  await ev(() => { S7.sim.playBeat('murmel_00A'); }); await page.waitForTimeout(2500); await snap('s9-dialog');
  await ev(() => { S7.game.debug.skipCutscene(); S7.game.debug.teleport('00A', 'j2'); S7.st.done['00A:tw1'] = true; S7.st.mode = 'junction'; S7.sim.setupJunction(S7.graph().nodes.j2, null); S7.st.jLock = false; }); await page.waitForTimeout(800); await snap('s10-junction');
  await page.keyboard.down('Tab'); await page.waitForTimeout(500); await snap('s11-ring'); await page.keyboard.up('Tab');
  await ev(() => { S7.ui.push(new S7.screens.GameOver()); }); await page.waitForTimeout(1200); await snap('s12-gameover'); await ev(() => S7.ui.pop());
  await ev(() => { S7.game.go('title'); }); await page.waitForTimeout(1200);
  console.log('scene', await ev(() => S7.game.sceneName));
} catch (e) { console.log('FAILED', e.message); await snap('fail'); }
console.log('errors', errors.length); console.log(errors.slice(0, 10).join('\n'));
await browser.close();
