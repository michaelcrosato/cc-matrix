// browser checks (Playwright from engine/node_modules): the bundle from file:// (title, a match, About, the attract
// mode, no errors), then the AI Hub harness's automatic check with 1, 2 and 4 players (latency, jitter, loss)
import { createRequire } from 'node:module';
import { copyFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
export default async ({ suite }) => {
  const s = suite(), dev = new URL('../../', import.meta.url), root = new URL('../../../', import.meta.url);
  const NAME = 'CricketKerfuffle-Cricket-claude-opus-5-5-medium-20261104-062757';
  let chromium; try { chromium = createRequire(new URL('engine/package.json', dev))('playwright').chromium; } catch (e) { s.ok('Playwright is installed (cd engine && npm install)', false, e.message); return; }
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const file = new URL(NAME + '.html', root).href;
    for (const [hash, want] of [['', 'title'], ['#match', 'match'], ['#about', 'about'], ['#attract', 'attract']]) {
      await page.goto('about:blank');
      await page.goto(file + '?b=' + Math.random() + hash); await page.waitForTimeout(4500);
      const snap = await page.evaluate(() => { const g = My3D2dge.current; return { scene: g.sceneName, errors: g.errors.length, W: g.W, H: g.H }; });
      s.ok(`the bundle opens from file:// at ${hash || 'the title'}`, snap.scene === want && !snap.errors, snap);
    }
    // play a little of the match by keys: a few deliveries with the J key
    await page.goto(file + '?b=' + Math.random() + '#match'); await page.waitForTimeout(4000);
    for (let k = 0; k < 12; k++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(700); }
    const st = await page.evaluate(() => { const g = My3D2dge.current, s = g.debug.snapshot(); return { balls: s.match.balls + (s.match.innings * 12), errors: g.errors.map(e => String(e.message || e)) }; });
    s.ok('keys play deliveries in a real browser without errors', st.balls >= 1 && !st.errors.length, st);
    s.ok('no page errors', !errs.length, [...new Set(errs)].slice(0, 3).join(' | '));
    // real browser input paths: a touch-only device (emulated touch, no fine pointer), a gamepad through
    // navigator.getGamepads (what the engine polls), and a real mouse hovering and clicking a menu item
    const toCss = async (pg, bx, by) => pg.evaluate(([x, y]) => { const c = document.getElementById('screen').getBoundingClientRect(), g = My3D2dge.current; return [c.left + x * c.width / g.W, c.top + y * c.height / g.H]; }, [bx, by]);
    const tctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const tp = await tctx.newPage(); await tp.goto(file + '?t=' + Math.random()); await tp.waitForTimeout(4500);
    let ts = await tp.evaluate(() => ({ gate: My3D2dge.current.debug.TOUCH.gate, btn: My3D2dge.current.scene.gateBtn }));
    s.ok('a real touch-only device shows "Controller or keyboard required"', ts.gate === true, ts);
    const tb = ts.btn ? await toCss(tp, ts.btn[0] + ts.btn[2] / 2, ts.btn[1] + ts.btn[3] / 2) : [10, 10];
    await tp.touchscreen.tap(5, 380); await tp.waitForTimeout(500); await tp.touchscreen.tap(tb[0], tb[1]); await tp.waitForTimeout(800);
    s.ok('tapping its Settings button opens the settings', await tp.evaluate(() => document.body.innerText.includes('Settings') && document.body.innerText.includes('DISPLAY')));
    await tp.reload(); await tp.waitForTimeout(16000);
    s.ok('the attract mode runs on the touch-only device', await tp.evaluate(() => My3D2dge.current.sceneName === 'attract'));
    const pre = await tp.evaluate(() => My3D2dge.current.sceneName); await tp.touchscreen.tap(400, 200); await tp.waitForTimeout(1500);
    s.ok('a real tap exits the attract mode', pre === 'attract' && await tp.evaluate(() => My3D2dge.current.sceneName === 'title'));
    await tctx.close();
    const gp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await gp.addInitScript(() => { const pad = { id: 'Fake DualSense (STANDARD GAMEPAD Vendor: 054c)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; window.__press = (b, on) => { pad.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; pad.timestamp++; }; });
    await gp.goto(file + '?g=' + Math.random()); await gp.waitForTimeout(4000);
    await gp.evaluate(() => window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: window.__pad })));
    const tapPad = async b => { await gp.evaluate(b => window.__press(b, true), b); await gp.waitForTimeout(120); await gp.evaluate(b => window.__press(b, false), b); await gp.waitForTimeout(250); };
    await tapPad(0);
    let g1 = await gp.evaluate(() => { const d = My3D2dge.current.debug.snapshot(); return { scene: d.scene, focus: d.ui.menuFocus, dev: d.ui.device, glyph: d.ui.prompts.shot }; });
    s.ok('a real (polled) gamepad: Cross opens the menu, prompts turn into PlayStation glyphs', g1.focus === 0 && g1.dev === 'gamepad' && g1.glyph === 'ps:cross', g1);
    await tapPad(13); await tapPad(0); await gp.waitForTimeout(800);
    s.ok('a real gamepad: d-pad down and Cross reach Quick Match setup', await gp.evaluate(() => My3D2dge.current.sceneName === 'setup'));
    await gp.goto(file + '?m=' + Math.random()); await gp.waitForTimeout(4000); await gp.keyboard.press('Enter'); await gp.waitForTimeout(400);
    const rects = await gp.evaluate(() => My3D2dge.current.scene.menu.rects.map(r => r && r.slice()));
    const it = await toCss(gp, rects[4][0] + rects[4][2] / 2, rects[4][1] + rects[4][3] / 2);
    await gp.mouse.move(it[0] - 30, it[1]); await gp.mouse.move(it[0], it[1], { steps: 4 }); await gp.waitForTimeout(300);
    s.ok('a real mouse hover moves the menu focus', await gp.evaluate(() => My3D2dge.current.scene.menu.i === 4));
    await gp.mouse.click(it[0], it[1]); await gp.waitForTimeout(900);
    s.ok('a real click picks the item (Nets)', await gp.evaluate(() => My3D2dge.current.sceneName === 'netsmenu'));
    await gp.close();
    // the AI Hub harness
    const hubDir = new URL('test/hub/', dev);
    copyFileSync(new URL(NAME + '.html', root), new URL('game.html', hubDir));
    for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('vendor/aihub/' + f, dev), new URL(f, hubDir));
    const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: hubDir.pathname, stdio: ['ignore', 'pipe', 'pipe'] });
    let port; try { port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = /port (\d+)/.exec(buf); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port: ' + buf)), 8000); }); } catch (e) { srv.kill(); throw e; }
    try {
      const base = `http://127.0.0.1:${port}/`;
      const t = await (await fetch(base + 'game.html')).text();
      s.ok('the served page is our game', /<title>Cricket Kerfuffle<\/title>/.test(t));
      for (const q of ['players=1', 'players=2', 'players=4&latency=150&jitter=50&loss=5']) {
        const hp = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await hp.goto(base + 'harness.html?game=game.html&auto=1&' + q);
        let done = false; for (let k = 0; k < 120 && !done; k++) { await hp.waitForTimeout(1000); done = await hp.evaluate(() => document.body.dataset.complete === 'true'); }
        const chk = await hp.evaluate(() => window.__hubCheck || null);
        const failed = chk && chk.checks ? Object.entries(chk.checks).filter(([, v]) => v && v.ok === false).map(([k, v]) => k + (v.detail ? ': ' + v.detail : '')) : [];
        s.ok(`the AI Hub harness passes (${q})`, done && chk && chk.pass === true, { done, pass: chk && chk.pass, failed: failed.slice(0, 6), keys: chk ? Object.keys(chk).slice(0, 8) : null });
        await hp.close();
      }
    } finally { srv.kill(); }
  } finally { await browser.close(); }
};
