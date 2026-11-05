// The built file in headless Chromium (file://, the CDN routed to vendor/): boot, keyboard play, the pause menu and
// Dev Mode, the mouse on the title, About & Credits (the same text as exit-interview.json), attract mode from idle, controller glyphs (a stand-in DualSense), the touch-only notice, the mouse in the world.
import fs from 'node:fs';
import path from 'node:path';
import { launch, open, fileURL, ROOT } from '../lib/browser.mjs';
import { stats } from '../lib/png.mjs';
const URL = fileURL('../Skiller7-Killer7-claude-opus-5-5-xhigh-20261104-013140.html') + '?backend=webgl';
const ready = page => page.waitForFunction(() => window.S7 && S7.started && S7.pres && S7.sceneName(S7.game) === 'title', null, { timeout: 40000 });
const scene = page => page.evaluate(() => S7.sceneName(S7.game));
export default async (T) => {
  const b = await launch();
  try {
    // ---- boot ----
    {
      const { page, errors, ctx } = await open(b, URL);
      await ready(page); await page.waitForTimeout(2500);
      const st = stats(await page.screenshot());
      T.check('boots to the title', await scene(page) === 'title');
      T.check('the picture is not blank', st.lit > .05 && st.colors >= 16, JSON.stringify(st));
      T.check('the page title starts with Skiller7', (await page.title()).startsWith('Skiller7'));
      // ---- keyboard: new game, skip the cold open from the pause menu, walk ----
      await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
      T.eq('New Game → play', await scene(page), 'play');
      await page.keyboard.press('Escape'); await page.waitForTimeout(600);
      const skip = page.locator('button', { hasText: 'Skip scene' });
      T.check('the pause menu offers Skip scene in a cutscene', await skip.count() > 0);
      if (await skip.count()) await skip.first().click();
      await page.waitForTimeout(900);
      const s0 = await page.evaluate(() => S7.game.debug.snapshot());
      T.eq('the cold open lands in the lobby', s0.area, '00A');
      await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
      const s1 = await page.evaluate(() => S7.game.debug.snapshot());
      T.check('holding W walks the rails', s1.edge !== s0.edge || s1.node !== s0.node || s1.s !== s0.s, JSON.stringify([s0.node, s1.node, s1.edge, s1.s]));
      // ---- the mouse in the world: hover a junction marker, click it ----
      await page.evaluate(() => { const s = S7.sim; s.warp('00A', 'j1'); for (const k of Object.keys(S7.TUTORIALS)) s.st.tut[k] = 2; s.tutorial = null; });
      await page.waitForTimeout(700);
      const mk = await page.evaluate(() => { const m = S7.hud.markers.filter(x => x.kind === 'branch'); const J = S7.sim.junction; const c = S7.game.screen.canvas.getBoundingClientRect(); const k = m.find(x => x.i !== J.i) || m[0]; return k ? { i: k.i, x: c.left + k.x * c.width / S7.game.W, y: c.top + k.y * c.height / S7.game.H, was: J.i } : null; });
      if (mk) {
        await page.mouse.move(mk.x, mk.y); await page.waitForTimeout(250);
        T.eq('hovering a marker highlights its branch', await page.evaluate(() => S7.sim.junction && S7.sim.junction.i), mk.i);
        await page.mouse.click(mk.x, mk.y); await page.waitForTimeout(600);
        T.check('a click takes the branch', await page.evaluate(() => !!S7.sim.W.edge || S7.sim.W.node !== 'j1'));
      } else T.check('junction markers are drawn', false);
      // ---- Dev Mode: open it from the pause menu, change a slider, see it apply ----
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      const dev = page.locator('button', { hasText: 'Dev Mode' });
      T.check('the pause menu has Dev Mode', await dev.count() > 0);
      if (await dev.count()) await dev.first().click();
      await page.waitForTimeout(400);
      T.eq('Dev Mode opens', await page.evaluate(() => S7.ui.kind), 'dev');
      await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); const w0 = await page.evaluate(() => S7.T.walkSpeed);
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
      T.check('a slider changes a live value', await page.evaluate(() => S7.T.walkSpeed) > w0);
      await page.keyboard.down('Backspace'); await page.waitForTimeout(250); await page.keyboard.up('Backspace'); await page.waitForTimeout(150);
      T.eq('reset one value to its default', await page.evaluate(() => S7.T.walkSpeed), 85);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      T.check('no page errors (play)', !errors.length, errors.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ---- the mouse on the title: hover moves the focus, a click picks; prompts name mouse buttons; no audio files ----
    {
      const html = fs.readFileSync(path.resolve(ROOT, '../Skiller7-Killer7-claude-opus-5-5-xhigh-20261104-013140.html'), 'utf8');
      T.check('no audio files: every sound is made in code', !/data:audio|<audio|\.(mp3|ogg|wav|m4a|flac|opus)["'?)]/i.test(html));
      const { page, errors, ctx } = await open(b, URL);
      await ready(page); await page.waitForTimeout(800);
      const at = k => page.evaluate(k => { const bx = S7.titleMenu.boxes[k]; const c = S7.game.screen.canvas.getBoundingClientRect(); return bx ? { x: c.left + (bx[0] + bx[2] / 2) * c.width / S7.game.W, y: c.top + (bx[1] + bx[3] / 2) * c.height / S7.game.H } : null; }, k);
      const echo = await at(3), about = await at(5);
      T.check('the title menu items are laid out', !!echo && !!about);
      if (echo && about) {
        await page.mouse.move(echo.x, echo.y, { steps: 3 });
        await page.waitForFunction(() => S7.titleMenu.i === 3, null, { timeout: 8000 }).catch(() => {});
        T.eq('hovering ECHO RUN moves the focus to it', await page.evaluate(() => S7.titleMenu.i), 3);
        T.check('keyboard and mouse prompts name mouse buttons', /click/i.test(await page.evaluate(() => S7.label('fire'))), await page.evaluate(() => S7.label('fire')));
        await page.mouse.move(about.x, about.y, { steps: 3 }); await page.mouse.down(); await page.mouse.up();
        await page.waitForFunction(() => S7.ui.kind === 'about', null, { timeout: 8000 }).catch(() => {});
        T.eq('a click picks ABOUT & CREDITS', await page.evaluate(() => S7.ui.kind), 'about');
      }
      T.check('no page errors (title mouse)', !errors.length, errors.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ---- About & Credits: from the title by keyboard, every page, the same text as exit-interview.json; a minute to read
    // before attract mode; from the pause menu. Headless frames are slow, so each key waits for the game to step after it
    // (presses inside one step would merge). ----
    {
      const X = JSON.parse(fs.readFileSync(path.resolve(ROOT, '../exit-interview.json'), 'utf8'));
      const SI = X.sourceInformation, src = Object.keys(SI).filter(k => k !== 'perspective').map(k => k === 'genre' ? SI.genre + '. ' + SI.perspective + '.' : SI[k]); // About shows TASK.md's one Genre and Perspective row
      const want = [['SOURCE INFORMATION', src], ['TESTING FEEDBACK', X.testingFeedback], ['ENGINE FEEDBACK', X.engineFeedback], ['PROMPT FEEDBACK', X.promptFeedback]];
      const { page, errors, ctx } = await open(b, URL);
      const tap = async key => { await page.keyboard.press(key); const c = await page.evaluate(() => S7.game.input.clock); await page.waitForFunction(c0 => S7.game.input.clock > c0 + .02, c, { timeout: 10000 }); };
      await ready(page); await page.waitForTimeout(600);
      await tap('ArrowUp'); await tap('Enter');
      T.eq('ABOUT & CREDITS opens from the title', await page.evaluate(() => S7.ui.kind), 'about');
      const seen = [];
      for (let k = 0; k < 5; k++) {
        seen.push(await page.evaluate(() => { const m = S7.ui.modal; const P = m.pages[m.page]; return { page: m.page, title: P.title, texts: P.items.map(x => x[1]) }; }));
        await tap('ArrowRight');
      }
      T.eq('five pages, in order, and right wraps to the first', seen.map(s => s.page).join(',') + '→' + await page.evaluate(() => S7.ui.modal.page), '0,1,2,3,4→0');
      for (let k = 0; k < 4; k++) {
        T.eq('page ' + (k + 1) + ' is ' + want[k][0], seen[k].title, want[k][0]);
        T.eq(want[k][0] + ' matches exit-interview.json', JSON.stringify(seen[k].texts), JSON.stringify(want[k][1]));
      }
      T.eq('the last page is the credits', seen[4].title, 'CREDITS');
      await page.evaluate(() => { S7.Input.lastAt = performance.now() - 15000; });   // 15 s without input
      await page.waitForTimeout(400);
      T.check('reading About for 15 s does not start attract mode', await page.evaluate(() => S7.ui.kind === 'about' && S7.sceneName(S7.game) === 'title'));
      await tap('Escape');
      T.check('Escape closes it, back on the title', await page.evaluate(() => !S7.ui.modal && S7.sceneName(S7.game) === 'title'));
      await tap('ArrowDown');   // the cursor is still on ABOUT & CREDITS: down wraps to NEW GAME
      await tap('Enter'); await tap('Enter');
      await page.waitForFunction(() => S7.sceneName(S7.game) === 'play', null, { timeout: 10000 }).catch(() => {});
      T.eq('then New Game → play', await scene(page), 'play');
      await page.keyboard.press('Escape'); await page.waitForTimeout(600);
      const ab = page.locator('button', { hasText: 'About & Credits' });
      T.check('the pause menu has About & Credits', await ab.count() > 0);
      if (await ab.count()) await ab.first().click();
      await page.waitForFunction(() => S7.ui.kind === 'about', null, { timeout: 8000 }).catch(() => {});
      T.eq('and it opens there too', await page.evaluate(() => S7.ui.kind), 'about');
      T.check('no page errors (about)', !errors.length, errors.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ---- attract: 11 s idle on the title; a key returns to the title and picks nothing ----
    {
      const { page, errors, ctx } = await open(b, URL);
      await ready(page); await page.waitForTimeout(9000);
      T.check('nothing happens for the first nine seconds', await scene(page) === 'title');
      await page.waitForFunction(() => S7.sceneName(S7.game) === 'attract' && S7.attractInfo && S7.attractInfo.armed <= 0, null, { timeout: 20000 }).catch(() => {});
      T.eq('idle on the title starts attract mode', await scene(page), 'attract');
      await page.waitForTimeout(3000);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => S7.sceneName(S7.game) === 'title', null, { timeout: 8000 }).catch(() => {});
      T.eq('a key returns to the title', await scene(page), 'title');
      T.check('and activates no menu item', await page.evaluate(() => !S7.ui.modal && S7.sceneName(S7.game) === 'title'));
      T.check('no page errors (attract)', !errors.length, errors.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ---- controller glyphs: a stand-in DualSense; then the Xbox setting; then the keyboard ----
    {
      const pad = `(() => { const btn = () => ({ pressed: false, touched: false, value: 0 }); const g = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) }; window.__pad = g; navigator.getGamepads = () => [g, null, null, null]; window.addEventListener('load', () => window.dispatchEvent(new Event('gamepadconnected'))); })()`;
      const { page, errors, ctx } = await open(b, URL, { init: pad });
      await ready(page);
      await page.evaluate(() => { __pad.buttons[13].pressed = true; __pad.buttons[13].value = 1; __pad.timestamp++; }); await page.waitForTimeout(200);
      await page.evaluate(() => { __pad.buttons[13].pressed = false; __pad.buttons[13].value = 0; __pad.timestamp++; }); await page.waitForTimeout(200);
      T.eq('the pad becomes the device', await page.evaluate(() => S7.game.input.lastDevice), 'gamepad');
      T.eq('prompts show PlayStation symbols', await page.evaluate(() => S7.label('move')), '✕');
      await page.evaluate(() => S7.game.settings.set('padGlyphs', 'xbox')); await page.waitForTimeout(100);
      T.eq('the Xbox setting shows A B X Y', await page.evaluate(() => S7.label('move')), 'A');
      await page.keyboard.press('KeyW'); await page.waitForTimeout(150);
      T.eq('a key press brings back key names', await page.evaluate(() => S7.label('move')), 'W');
      T.check('no page errors (glyphs)', !errors.length, errors.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ---- touch-only: the notice and SETTINGS, no touch controls; attract still runs; a tap returns ----
    {
      const { page, errors, ctx } = await open(b, URL, { hasTouch: true, isMobile: true, viewport: { width: 900, height: 420 } });
      await ready(page); await page.waitForTimeout(800);
      T.check('a touch-only device is told a controller or keyboard is needed', await page.evaluate(() => S7.touchOnly()));
      T.check('no touch controls', await page.evaluate(() => S7.game.input.touchEnabled === false && !document.querySelector('[data-act]')));
      const drawn = await page.evaluate(() => new Promise(res => { const F = My3D2dge.font, t0 = F.text, seen = []; F.text = function (g, s, ...a) { seen.push(String(s)); return t0.call(this, g, s, ...a); }; setTimeout(() => { F.text = t0; res(seen); }, 1500); }));
      T.check('the title says CONTROLLER OR KEYBOARD REQUIRED', drawn.includes('CONTROLLER OR KEYBOARD REQUIRED'), drawn.slice(0, 6).join(' | '));
      T.check('and draws a SETTINGS button instead of the menu', drawn.includes('SETTINGS') && !drawn.includes('NEW GAME'));
      const sb = await page.evaluate(() => { const bx = S7.scenes.title.setBox; const c = S7.game.screen.canvas.getBoundingClientRect(); return bx && { x: c.left + (bx[0] + bx[2] / 2) * c.width / S7.game.W, y: c.top + (bx[1] + bx[3] / 2) * c.height / S7.game.H }; });
      if (sb) await page.touchscreen.tap(sb.x, sb.y);
      await page.waitForFunction(() => !!(S7.game.shell && S7.game.shell.screen), null, { timeout: 8000 }).catch(() => {});
      T.check('tapping SETTINGS opens the settings', await page.evaluate(() => !!(S7.game.shell && S7.game.shell.screen)));
      await page.evaluate(() => S7.game.shell.hide()); await page.waitForTimeout(300);
      await page.waitForFunction(() => S7.sceneName(S7.game) === 'attract' && S7.attractInfo && S7.attractInfo.armed <= 0, null, { timeout: 25000 }).catch(() => {});
      T.eq('attract mode still runs', await scene(page), 'attract');
      await page.touchscreen.tap(450, 210);
      await page.waitForFunction(() => S7.sceneName(S7.game) === 'title', null, { timeout: 8000 }).catch(() => {});
      T.eq('a tap returns to the notice', await scene(page), 'title');
      T.check('no page errors (touch)', !errors.length, errors.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } finally { await b.close(); }
};
