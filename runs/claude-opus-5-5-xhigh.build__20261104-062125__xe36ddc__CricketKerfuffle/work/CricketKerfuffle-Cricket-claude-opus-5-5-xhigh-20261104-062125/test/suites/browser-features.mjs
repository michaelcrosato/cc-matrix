import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
/* in a real browser: the touch-only gate on an emulated touch phone (no touch buttons, the Settings button, the attract
 * mode still runs, a tap leaves it), dev mode opened from the pause menu's Dev Mode item (tabs drawn, a slider changed and
 * reset), and Thrumpton Hall's art (terraces, the peacock, the Hall's facade, the fountain) on screen without errors */
export async function run(check) {
  let chromium; try { chromium = createRequire(new URL('../../engine/package.json', import.meta.url))('playwright').chromium; } catch (e) { check('Playwright is installed', false, e.message); return; }
  const file = new URL('../../../CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125.html', import.meta.url).href, out = new URL('../out/', import.meta.url); mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  // the touch-only gate
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); });
    await page.goto(file); await page.waitForTimeout(2000);
    const s = await page.evaluate(() => { const g = window.__game, s = g.debug.snapshot(); return { scene: s.scene, gate: s.ui.touchGate, fine: matchMedia('(any-pointer: fine)').matches, touchBtns: document.querySelectorAll('[data-act]').length, btn: window.__kerfuffle.scenes.title.gateBtn || null }; });
    check('touch phone: the title shows the "Controller or keyboard required" gate', s.scene === 'title' && s.gate === true && s.fine === false, s);
    check('touch phone: no touch control buttons are made', s.touchBtns === 0, s.touchBtns);
    check('touch phone: the gate has its Settings button', Array.isArray(s.btn) && s.btn[2] > 0, s.btn);
    await page.screenshot({ path: new URL('feat-touch-gate.png', out).pathname });
    await page.waitForTimeout(10500);
    const a = await page.evaluate(() => window.__game.debug.snapshot().scene); check('touch phone: the attract mode still runs after 10 s', a === 'attract', a);
    await page.screenshot({ path: new URL('feat-touch-attract.png', out).pathname });
    await page.touchscreen.tap(195, 420); await page.waitForTimeout(900);
    const b = await page.evaluate(() => window.__game.debug.snapshot().scene); check('touch phone: a tap leaves the attract mode', b === 'title', b);
    check('touch phone: no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 3)); await ctx.close(); }
  // dev mode from the pause menu's item, in a match
  { const page = await browser.newPage({ viewport: { width: 854, height: 480 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); });
    await page.goto(file + '#match'); await page.waitForTimeout(2500);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    const paused = await page.evaluate(() => window.__game.paused); check('Escape pauses the match (the pause menu)', paused === true, paused);
    await page.evaluate(() => window.__game.o.menu.items.find(i => i[0] === 'Dev Mode')[1]()); await page.waitForTimeout(500);
    const d = await page.evaluate(() => window.__game.debug.snapshot().dev); check('the pause menu\'s Dev Mode item opens dev mode', d.open === true, d);
    await page.screenshot({ path: new URL('feat-dev-tuning.png', out).pathname });
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    const ch = await page.evaluate(() => window.__game.debug.snapshot().dev.changed); check('keys move and change a live slider', ch.includes('ballSpeed'), ch);
    await page.keyboard.press('KeyI'); await page.waitForTimeout(200);
    const ch2 = await page.evaluate(() => window.__game.debug.snapshot().dev.changed); check('Triangle / I resets the row to its default', !ch2.includes('ballSpeed'), ch2);
    for (const [k, name, key] of [[1, 'toggles', 'Space'], [2, 'jump', 'Tab'], [3, 'info', 'Space']]) { await page.keyboard.press(key); await page.waitForTimeout(250); const t = await page.evaluate(() => window.__game.debug.snapshot().dev.tab); check(key + ' moves to the ' + name.toUpperCase() + ' tab', t === k, t); await page.screenshot({ path: new URL('feat-dev-' + name + '.png', out).pathname }); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const closed = await page.evaluate(() => ({ open: window.__game.debug.snapshot().dev.open, paused: window.__game.paused })); check('Escape closes dev mode (and does not open the pause menu)', closed.open === false && closed.paused === false, closed);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300); const p2 = await page.evaluate(() => window.__game.paused); check('after dev mode, Escape pauses the match again', p2 === true, p2);
    check('dev mode: no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 3)); await page.close(); }
  // Thrumpton Hall's art in the wide camera and the story's three-quarter view
  { const page = await browser.newPage({ viewport: { width: 854, height: 480 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); });
    await page.goto(file); await page.waitForTimeout(1200);
    await page.evaluate(() => { const g = window.__game, K = window.__kerfuffle; g.go('cutscene', { scene: 'c2pre', then: () => {} }, { fade: 0 }); });
    await page.waitForTimeout(1500); await page.screenshot({ path: new URL('feat-hall-cutscene.png', out).pathname });
    await page.evaluate(() => { const g = window.__game, D = g.debug; D.startMatch({ ground: 'hall', teams: ['ker', 'gen'], humans: {} }); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__game, K = window.__kerfuffle, V = K.MatchView; V.direct = () => {}; V.setCam('wide'); g.focus(V.B.OX + 420, V.B.OY + 600, 0); });
    await page.waitForTimeout(400); await page.screenshot({ path: new URL('feat-hall-wide.png', out).pathname });
    const sc = await page.evaluate(() => window.__game.debug.snapshot().scene); check('Thrumpton Hall draws (wide camera, terraces, facade, peacock, fountain) without errors', sc === 'match' && !errs.length, { sc, errs: errs.slice(0, 3) });
    await page.close(); }
  await browser.close();
}
