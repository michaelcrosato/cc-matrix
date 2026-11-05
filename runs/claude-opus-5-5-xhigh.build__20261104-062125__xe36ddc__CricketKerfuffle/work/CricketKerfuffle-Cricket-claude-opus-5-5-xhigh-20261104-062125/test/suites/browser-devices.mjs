import { createRequire } from 'node:module';
/* Devices through the browser's own interfaces, in three browser engines:
 * - Chromium with a controller on the standard Gamepad API (navigator.getGamepads, the 'gamepadconnected' event), the
 *   path a real pad takes: no engine input is injected. A DualShock 4 drives the title, menus, Quick Match setup and a
 *   match; PlayStation prompts, then keyboard prompts after a key, then back; Options pauses; a pad leaves the attract
 *   mode; a second pad's Options joins Versus.
 * - WebKit as an iPhone (touch only): the gate, its Settings button, no touch controls, the attract mode, a tap leaving
 *   it, and a controller connecting lifting the gate.
 * - Firefox on a desktop: the game boots, a match plays, no errors. */
export async function run(check) {
  let pw; try { pw = createRequire(new URL('../../engine/package.json', import.meta.url))('playwright'); } catch (e) { check('Playwright is installed', false, e.message); return; }
  const file = new URL('../../../CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125.html', import.meta.url).href;
  // a scripted controller behind navigator.getGamepads: standard mapping, 17 buttons, 4 axes
  const PADS = () => {
    window.__pads = [null, null, null, null];
    const mk = (index, id) => ({ id, index, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: null });
    window.__plug = (i, id) => { window.__pads[i] = mk(i, id); const e = new Event('gamepadconnected'); e.gamepad = window.__pads[i]; window.dispatchEvent(e); };
    window.__btn = (i, b, on) => { const p = window.__pads[i]; p.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; p.timestamp++; };
    Object.defineProperty(navigator, 'getGamepads', { value: () => window.__pads.slice(), configurable: true });
  };
  const DS4 = 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)';
  const watch = page => { const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); }); return errs; };
  const snap = page => page.evaluate(() => { const g = window.__game, s = g.debug.snapshot(), K = window.__kerfuffle; return { scene: s.scene, title: s.ui.titleState, gate: s.ui.touchGate, device: s.ui.device, confirm: s.ui.prompts.find(p => p.a === 'confirm').info.kind, menuI: K.scenes.title.menu ? K.scenes.title.menu.i : null, paused: !!g.paused, players: (g.players || [g.input]).length }; });
  const tap = async (page, b, i = 0) => { await page.evaluate(([i, b]) => window.__btn(i, b, true), [i, b]); await page.waitForTimeout(120); await page.evaluate(([i, b]) => window.__btn(i, b, false), [i, b]); await page.waitForTimeout(160); };
  const CROSS = 0, CIRCLE = 1, OPTIONS = 9, DOWN = 13, RIGHT = 15;

  // ---- Chromium: a controller through the Gamepad API ----
  { const browser = await pw.chromium.launch();
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await ctx.newPage(), errs = watch(page);
      await ctx.addInitScript(PADS); await page.goto(file); await page.waitForTimeout(1500);
      await page.evaluate(id => window.__plug(0, id), DS4); await page.waitForTimeout(200);
      let s = await snap(page); check('pad: a desktop with a controller has no touch gate', s.gate === false, s);
      await tap(page, CROSS); s = await snap(page);
      check('pad: Cross on the title opens the menu, and the device is the gamepad', s.title === 'menu' && s.device === 'gamepad', s);
      check('pad: prompts show PlayStation symbols by default', s.confirm === 'ps', s);
      const i0 = s.menuI; await tap(page, DOWN); s = await snap(page); check('pad: the d-pad moves the menu focus', s.menuI === i0 + 1, { i0, s });
      await page.evaluate(() => window.__game.settings.set('glyphs', 'xbox')); await page.waitForTimeout(100); s = await snap(page);
      check('pad: with the Xbox setting the prompts turn to Xbox letters', s.confirm === 'xbox', s);
      await page.evaluate(() => window.__game.settings.set('glyphs', 'playstation'));
      await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150); s = await snap(page);
      check('prompts follow the last device: a key turns them to keycaps', s.device === 'keyboard' && s.confirm === 'key', s);
      await tap(page, DOWN); s = await snap(page); check('prompts follow the last device: a pad press turns them back to PlayStation symbols', s.device === 'gamepad' && s.confirm === 'ps', s);
      // Quick Match by pad: setup, a team change, down to PLAY, Cross
      await tap(page, CROSS); await page.waitForTimeout(400); s = await snap(page); check('pad: Cross on QUICK MATCH opens the setup', s.scene === 'setup', s);
      const team0 = await page.evaluate(() => window.__kerfuffle.scenes.setup.list.items[0].value());
      await tap(page, RIGHT); const team1 = await page.evaluate(() => window.__kerfuffle.scenes.setup.list.items[0].value());
      check('pad: d-pad right changes YOUR TEAM', team1 !== team0, { team0, team1 });
      for (let k = 0; k < 9; k++) await tap(page, DOWN);
      const row = await page.evaluate(() => { const L = window.__kerfuffle.scenes.setup.list; return L.items[L.i].label; }); check('pad: the d-pad reaches PLAY', row === 'PLAY', row);
      await tap(page, CROSS); await page.waitForTimeout(1500); s = await snap(page); check('pad: Cross on PLAY starts the match', s.scene === 'match', s);
      for (let k = 0; k < 6; k++) { await tap(page, CROSS); await page.waitForTimeout(300); }   // the toss and the first balls, by pad
      await tap(page, OPTIONS); await page.waitForTimeout(200); s = await snap(page); check('pad: Options pauses the match', s.paused === true, s);
      await tap(page, CIRCLE); await page.waitForTimeout(300); s = await snap(page); check('pad: Circle closes the pause menu', s.paused === false, s);
      const balls = await page.evaluate(() => { const m = window.__game.debug.match(); return m ? m.innings.reduce((t, i) => t + i.balls, 0) + (m.phase !== 'setup' ? 1 : 0) : -1; });
      check('pad: the match is under way', balls > 0, balls);
      check('pad: no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 4)); await ctx.close(); }
    // the attract mode left by a pad, and a second pad joining Versus
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await ctx.newPage(), errs = watch(page);
      await ctx.addInitScript(PADS); await page.goto(file); await page.waitForTimeout(1200);
      await page.evaluate(id => window.__plug(0, id), DS4); await page.waitForTimeout(10600);
      let s = await snap(page); check('pad: after 10 s idle the attract mode plays', s.scene === 'attract', s);
      await tap(page, CROSS); await page.waitForTimeout(500); s = await snap(page); check('pad: a pad button leaves the attract mode', s.scene === 'title', s);
      await tap(page, CROSS); await tap(page, DOWN); await tap(page, DOWN); await tap(page, CROSS); await page.waitForTimeout(400); s = await snap(page);
      check('pad: VERSUS opens its setup', s.scene === 'setup', s);
      await page.evaluate(id => window.__plug(1, id), 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'); await page.waitForTimeout(200);
      await tap(page, OPTIONS, 1); await page.waitForTimeout(300); s = await snap(page);
      const p2 = await page.evaluate(() => { const P = window.__game.players || []; return P.map(q => q.pad); });
      check('pad: a second controller\'s Options joins Versus as player 2 on its own pad', s.players === 2 && p2.includes(1), { s, p2 });
      check('pad (attract, versus): no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 4)); await ctx.close(); }
    await browser.close(); }

  // ---- WebKit as an iPhone: touch only ----
  { const browser = await pw.webkit.launch(), ctx = await browser.newContext(Object.assign({}, pw.devices['iPhone 13'])), page = await ctx.newPage(), errs = watch(page);
    await ctx.addInitScript(PADS); await page.goto(file); await page.waitForTimeout(2000);
    let s = await snap(page); const env = await page.evaluate(() => ({ fine: matchMedia('(any-pointer: fine)').matches, touch: navigator.maxTouchPoints, ua: navigator.userAgent.slice(0, 60) }));
    check('iPhone (WebKit): the title shows the "Controller or keyboard required" gate', s.scene === 'title' && s.gate === true, { s, env });
    const ui = await page.evaluate(() => ({ touchBtns: document.querySelectorAll('[data-touch], .touch-controls, .my3d2dge-touch').length, btn: window.__kerfuffle.scenes.title.gateBtn || null }));
    check('iPhone (WebKit): no touch controls, and the gate has its Settings button', ui.touchBtns === 0 && Array.isArray(ui.btn) && ui.btn[2] > 0, ui);
    await page.waitForTimeout(10500); s = await snap(page); check('iPhone (WebKit): the attract mode still runs', s.scene === 'attract', s);
    await page.touchscreen.tap(195, 420); await page.waitForTimeout(900); s = await snap(page); check('iPhone (WebKit): a tap leaves the attract mode', s.scene === 'title', s);
    await page.evaluate(id => window.__plug(0, id), DS4); await page.waitForTimeout(200); await tap(page, CROSS); s = await snap(page);
    check('iPhone (WebKit): connecting a controller lifts the gate and Cross opens the menu', s.gate === false && s.title === 'menu', s);
    check('iPhone (WebKit): no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 4)); await browser.close(); }

  // ---- Firefox on a desktop ----
  { const browser = await pw.firefox.launch(), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = watch(page);
    await page.goto(file); await page.waitForTimeout(2000);
    let s = await snap(page); check('Firefox: the game boots to the title, no touch gate', s.scene === 'title' && s.gate === false, s);
    await page.keyboard.press('Enter'); await page.waitForTimeout(200); s = await snap(page); check('Firefox: a key opens the menu with keycap prompts', s.title === 'menu' && s.confirm === 'key', s);
    await page.evaluate(() => { window.__t0 = performance.now(); window.__f0 = window.__game.frame || 0; window.__game.debug.startMatch({ humans: {}, cheat: { autoBat: true, autoBowl: true } }); });
    const ballsBowled = () => { const m = window.__game.debug.match(); return m ? m.innings.reduce((t, i) => t + i.balls, 0) : 0; };
    let ok = true; try { await page.waitForFunction(ballsBowled, null, { timeout: 40000, polling: 250 }); } catch (e) { ok = false; }
    const r = await page.evaluate(b => ({ balls: eval(b)(), seconds: +((performance.now() - window.__t0) / 1000).toFixed(1), gameTime: +window.__game.time.toFixed(1), phase: window.__game.debug.match() && window.__game.debug.match().phase }), '(' + ballsBowled.toString() + ')');
    check('Firefox: a match plays (the first ball is bowled within 40 s)', ok && r.balls > 0, r);
    check('Firefox: no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 4)); await browser.close(); }
}
