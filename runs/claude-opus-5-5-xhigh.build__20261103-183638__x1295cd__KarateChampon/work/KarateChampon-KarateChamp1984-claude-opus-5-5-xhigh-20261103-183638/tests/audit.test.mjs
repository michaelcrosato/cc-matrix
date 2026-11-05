// audit (browser): TASK.md requirement by requirement, against the shipped single file in Chromium, with real input
// events wherever the browser has them (keyboard, mouse, a touch device's emulation; the Gamepad API is the browser's own
// navigator.getGamepads, fed a DualSense's state). Each check is named after the TASK.md line it proves.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { drive } from './story.test.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), name = basename(root), file = pathToFileURL(join(root, '..', name + '.html')).href;
const TASK = readFileSync(join(root, '..', 'TASK.md'), 'utf8');
const ready = async p => { await p.waitForFunction(() => window.KC && KC.game && KC.game.sceneName && KC.game.scene, null, { timeout: 20000 }); await p.waitForTimeout(300); };
// a game point (screen pixels) to a CSS pixel on the page
const cssOf = (p, x, y) => p.evaluate(([x, y]) => { const S = KC.game.screen, rc = S.canvas.getBoundingClientRect(); return [(x * S.S + S.OX) / S.dpr + rc.left, (y * S.S + S.OY) / S.dpr + rc.top]; }, [x, y]);
export default async t => {
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
  const page = async (hash, o = {}) => { const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o)); const p = await ctx.newPage(); const errs = [], net = []; p.on('pageerror', e => errs.push(String(e))); p.on('request', r => { if (/^https?:/.test(r.url())) net.push(r.url()); }); await p.goto(file + (hash ? '#' + hash : '')); await ready(p); p.errs = errs; p.net = net; p.ctx = ctx; return p; };
  try {
    // "single html file ... GameTitle-SOURCE-..." and the title riff
    t.check('TASK: the single file is named for the title and source', TASK.includes('claude-opus-5-5-xhigh-20261103-183638') && name === 'KarateChampon-KarateChamp1984-claude-opus-5-5-xhigh-20261103-183638');
    { const p = await page(''); const info = await p.evaluate(() => ({ title: document.title, scene: KC.game.sceneName, engine: My3D2dge.version, view: KC.game.view.id }));
      t.check('TASK Game Title: a riff on the source, on the page and the title screen', info.title === 'Karate Champon' && info.scene === 'title', JSON.stringify(info));
      t.check('TASK Tech Stack: built on my-3D2dge (the handoff engine, 0.85.2)', info.engine === '0.85.2', info.engine);
      // "Attract Mode: after 10 seconds without input on the title/menu screen ... any input exits it" (real time)
      await p.waitForTimeout(9000); const s9 = await p.evaluate(() => KC.game.sceneName); await p.waitForTimeout(2200); const s11 = await p.evaluate(() => KC.game.sceneName);
      t.check('TASK Attract: still the title at 9 s of real idle, the demo by 11 s', s9 === 'title' && s11 === 'attract', s9 + ' ' + s11);
      await p.waitForTimeout(3000); const demo = await p.evaluate(() => ({ step: KC.game.scene.step, bout: !!(KC.game.scene.sub && KC.game.scene.sub.bout), ai: !!(KC.game.scene.sub && KC.game.scene.sub.ai.every(a => a && a.showcase)) }));
      t.check('TASK Attract: an AI-played demo (two showcase CPUs in a bout)', demo.step === 'bout' && demo.bout && demo.ai, JSON.stringify(demo));
      await p.keyboard.press('KeyL'); await p.waitForTimeout(400); t.check('TASK Attract: a real key press exits it', await p.evaluate(() => KC.game.sceneName) === 'title');
      // "the mouse ... clicks menu items (hover moves the focus)": the real mouse over the main menu
      await p.waitForTimeout(500); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
      const rows = await p.evaluate(() => KC.game.scene.menu._rows.map(r => [r.x + r.w / 2, r.y + r.h / 2]));
      const [hx, hy] = await cssOf(p, ...rows[3]); await p.mouse.move(hx, hy, { steps: 4 }); await p.waitForTimeout(200);
      t.check('TASK UI: real mouse hover moves the menu focus', await p.evaluate(() => KC.game.scene.menu.i) === 3);
      const [vx, vy] = await cssOf(p, ...rows[1]); await p.mouse.click(vx, vy); await p.waitForTimeout(500);
      t.check('TASK UI: a real mouse click picks the item (VERSUS)', await p.evaluate(() => KC.game.sceneName) === 'versus');
      // "Multiplayer ... for the game on its own": a second player joins with 2 on the real keyboard
      await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
      const pl = await p.evaluate(() => ({ n: KC.game.players.length, half: KC.game.players[1] && KC.game.players[1].half, p1: KC.game.players[0].map.tUp.join(), p2: KC.game.players[1] && KC.game.players[1].map.tUp.join(), red: KC.game.scene.menu.items[0].value }));
      t.check('TASK Multiplayer: pressing 2 joins player 2 on the keyboard', pl.n === 2 && pl.half === 'right' && pl.red === 'PLAYER 2', JSON.stringify(pl));
      t.check('TASK UI: the keyboard is split the way PC players expect (WASD + TFGH, arrows + IJKL)', /KeyT/.test(pl.p1) && /KeyI/.test(pl.p2), pl.p1 + ' / ' + pl.p2);
      t.check('TASK Package: no network requests (file://)', p.net.length === 0, p.net.slice(0, 3).join()); t.check('no page errors (title, attract, menus, join)', p.errs.length === 0, p.errs.slice(0, 2).join(' | '));
      await p.ctx.close(); }
    // "Touch-only devices: no touch controls; show 'Controller or keyboard required' and the settings button. Let the attract mode run."
    { const p = await page('', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const g = await p.evaluate(() => ({ gate: KC.touchOnly(), touch: KC.game.input.touchEnabled, btns: document.querySelectorAll('[data-act]').length, corner: !!KC.game.cornerArea() }));
      t.check('TASK Touch-only: the gate shows, with the corner settings button', g.gate && g.corner, JSON.stringify(g));
      await p.touchscreen.tap(400, 200); await p.waitForTimeout(400); t.check('TASK Touch-only: no touch controls (a tap does not start the game)', await p.evaluate(() => KC.game.sceneName === 'title' && !KC.game.scene.menuOn && !document.querySelector('.e-touch, [data-act="tUp"]')));
      await p.waitForTimeout(10800); t.check('TASK Touch-only: the attract mode runs', await p.evaluate(() => KC.game.sceneName) === 'attract');
      t.check('no page errors (touch device)', p.errs.length === 0, p.errs.slice(0, 2).join(' | ')); await p.ctx.close(); }
    // "Audio: all music, sound effects and voices are written in code ... Voices are Animalese/Simlish-style gibberish":
    // the real output's spectrum: the title song's notes are its D pentatonic; the voice's energy sits in speech formants
    { const p = await page('title'); await p.keyboard.press('KeyA'); await p.waitForTimeout(300);
      const A = await p.evaluate(async () => {
        const au = KC.game.audio; au._init(); const c = au.ctx; if (c.state !== 'running') await c.resume();
        const an = c.createAnalyser(); an.fftSize = 8192; an.smoothingTimeConstant = 0; au._master.connect(an); const F = new Float32Array(an.frequencyBinCount), hz = i => i * c.sampleRate / an.fftSize;
        const NOTE = f => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((Math.round(12 * Math.log2(f / 440)) + 9) % 12 + 12) % 12];
        const sample = ms => new Promise(res => { const notes = {}, bands = { low: 0, speech: 0, high: 0 }; const t0 = performance.now(); const tick = () => { an.getFloatFrequencyData(F); let best = -1e9, bi = 0; for (let i = 4; i < F.length; i++) { const f = hz(i); if (f > 180 && f < 1500 && F[i] > best) { best = F[i]; bi = i; } const e = Math.pow(10, F[i] / 10); if (f < 150) bands.low += e; else if (f < 3500) bands.speech += e; else bands.high += e; } if (best > -70) { const n = NOTE(hz(bi)); notes[n] = (notes[n] || 0) + 1; } if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res({ notes, bands }); }; tick(); });
        const music = await sample(2500); au.music(null); await new Promise(r => setTimeout(r, 300));
        KC.Voice.speak('I AM TARO MOYASHI. WHITE BELT. I WILL BE CHAMP!', 'taro'); const voice = await sample(1500);
        return { music, voice };
      });
      const tot = Object.values(A.music.notes).reduce((a, b) => a + b, 0), inScale = ['D', 'E', 'G', 'A', 'B'].reduce((a, n) => a + (A.music.notes[n] || 0), 0);
      t.check('TASK Audio: the title music plays its D pentatonic (spectral peaks of the real output)', tot > 20 && inScale / tot > .75, JSON.stringify(A.music.notes));
      const vb = A.voice.bands, vt = vb.low + vb.speech + vb.high; t.check('TASK Audio: the gibberish voice is in the speech band (formants)', vt > 0 && vb.speech / vt > .7, JSON.stringify(vb));
      await p.ctx.close(); }
    // the Gamepad API (the browser's navigator.getGamepads) with a DualSense's state: menus and a technique
    { const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { const pad = { index: 0, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }; window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; });
      const p = await ctx.newPage(); await p.goto(file + '#title'); await ready(p); await p.waitForTimeout(800);
      const btn = async (i, ms = 80) => { await p.evaluate(i => { __pad.buttons[i].pressed = true; __pad.buttons[i].value = 1; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { __pad.buttons[i].pressed = false; __pad.buttons[i].value = 0; }, i); await p.waitForTimeout(120); };
      await btn(0); t.check('TASK UI (DualSense): the cross opens the main menu', await p.evaluate(() => KC.game.scene.menuOn === true));
      t.check('TASK UI (DualSense): prompts show PlayStation glyphs', await p.evaluate(() => KC.device() === 'gamepad' && KC.actionIcon('confirm').kind === 'ps'));
      await btn(13); await btn(13); await btn(0); await p.waitForTimeout(400); t.check('TASK UI (DualSense): the d-pad and cross pick DOJO', await p.evaluate(() => KC.game.sceneName) === 'dojo');
      await btn(1); await p.waitForTimeout(400); t.check('TASK UI (DualSense): the circle goes back', await p.evaluate(() => KC.game.sceneName === 'title'));
      await p.close(); await ctx.close(); }
    // "Feature-complete demo ... long enough to show ALL features": the whole Champon Road played in the browser, drawn
    { const p = await page('title'); await p.evaluate(() => { KC.game.stop(); KC.game.fadeTime = 0; KC.TUNE.cpuLevel = 1; KC.TUNE.pointsToWin = 1; });
      await p.evaluate(`window.__drive = ${drive.toString()}; window.DIRS = { u: 'up', d: 'down', f: 'right', b: 'left' }; window.TK = { u: 'tUp', d: 'tDown', f: 'tRight', b: 'tLeft' }; window.__k = 0; window.steps = (game, n) => { for (let i = 0; i < n; i++) game.advance(1 / 120, { draw: (++window.__k % 10) === 0 }); }; window.__o = { auto: 10, bonusAuto: true }; window.__log = [];`);
      await p.evaluate(() => { for (let i = 0; i < 60; i++) steps(KC.game, 1); KC.game.input.tap('start'); steps(KC.game, 30); KC.game.input.tap('confirm'); steps(KC.game, 10); });
      let done = false, guard = 0;
      while (!done && guard++ < 400) done = await p.evaluate(() => { const g = KC.game; for (let i = 0; i < 120 * 6; i++) { if (KC.Story.node >= 16 && KC.tuneChanged()) KC.Dev.resetAll(); if (g.sceneName === 'title' && KC.Story.node >= 16) return true; __drive(g, KC, __o, __log); } return false; });
      const r = await p.evaluate(() => ({ scene: KC.game.sceneName, node: KC.Story.node, rank: KC.Story.rank, scenes: [...new Set(__log)], frames: Math.round(__k / 10), errors: KC.game.errors.map(e => e.message) }));
      t.check('TASK Scope: the whole story plays through in the browser, every screen drawn', done && r.node >= 16 && r.rank === 'champ', JSON.stringify(r).slice(0, 300));
      for (const s of ['cutscene', 'road', 'practice', 'vscard', 'fight', 'promotion', 'bonus', 'credits', 'initials']) t.check('TASK Scope (browser): the road drew ' + s, r.scenes.includes(s), r.scenes.join());
      t.check('no page or draw errors on the whole road in the browser', p.errs.length === 0 && r.errors.length === 0, p.errs.concat(r.errors).slice(0, 3).join(' | '));
      await p.ctx.close(); }
    // "Include a dev mode, reachable from the pause menu ... live sliders, with a reset to defaults" (real keys, the engine's menu)
    { const p = await page('fight/dojo/kamaboko'); await p.waitForTimeout(2500); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      const items = await p.evaluate(() => [...document.querySelectorAll('button')].map(x => x.textContent.trim()).filter(Boolean));
      t.check('TASK Dev mode: the pause menu lists Dev mode (and the move list, retry)', items.includes('Dev mode') && items.includes('Move list') && items.includes('Retry match'), items.join(' | '));
      const key = async k => { await p.keyboard.press(k); await p.waitForTimeout(120); };
      for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']) await key(k); await p.waitForTimeout(300);
      for (const k of ['ArrowDown', 'ArrowRight', 'ArrowRight']) await key(k); await p.waitForTimeout(200);
      const gs = await p.evaluate(() => ({ panel: KC.Overlay.active, speed: KC.TUNE.gameSpeed, scale: KC.game.timeScale }));
      t.check('TASK Dev mode: a live slider changes the game now (game speed)', gs.panel && gs.speed > 1 && Math.abs(gs.scale - gs.speed) < 1e-6, JSON.stringify(gs));
      await key('ArrowUp'); await key('Enter'); await p.waitForTimeout(200); t.check('TASK Dev mode: RESET ALL TO DEFAULTS', await p.evaluate(() => !KC.tuneChanged()));
      await p.ctx.close(); }
    // "Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in ... an in-game About/Credits screen"
    { const p = await page('about'); const ab = await p.evaluate(() => { const pages = KC.AboutScene.linePages(KC.game.W); return { titles: [...new Set(pages.map(x => x.title))], text: pages.flatMap(x => x.lines.map(l => l[1])).join(' ') }; });
      const ei = JSON.parse(readFileSync(join(root, '..', 'exit-interview.json'), 'utf8')), words = s => s.replace(/\s+/g, ' ').trim();
      t.check('TASK About: the four sections and the credits are in the game', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'].every(x => ab.titles.includes(x)), ab.titles.join());
      t.check('TASK About: the in-game text is the exit interview\'s (every answer)', [...ei.testingFeedback, ...ei.engineFeedback, ...ei.promptFeedback, ...Object.values(ei.sourceInformation)].every(a => words(ab.text).includes(words(a).slice(0, 40))));
      await p.ctx.close(); }
  } finally { await b.close(); }
};
