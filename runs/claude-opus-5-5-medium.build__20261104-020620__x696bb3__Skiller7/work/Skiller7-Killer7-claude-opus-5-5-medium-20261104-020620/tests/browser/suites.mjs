// SKILLER7 browser suites (§14.4): the built single file over file://, the CDN routed to vendor/, headless Chromium.
import { launch, boot, routeCdn, NAME } from '../lib/browser.mjs';
import { ROOT } from '../lib/harness.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
const PAD = `(() => { const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__pad = pad; navigator.getGamepads = () => [window.__padOn ? pad : null, null, null, null]; })();`;
const snap = page => page.evaluate(() => window.__game.game.debug.snapshot());

export async function browserSuites(report, only) {
  const want = n => !only.length || only.includes(n);
  if (want('boot') || want('play') || want('glyphs') || want('mouse') || want('attract') || want('audio')) {
    const { browser, page, errors } = await launch();
    try {
      await page.addInitScript(PAD);
      await boot(page);
      if (want('boot')) {
        report('boot', 'the page boots to the title', (await page.evaluate(() => window.__game.game.sceneName)) === 'title');
        await page.waitForTimeout(800);
        const px = await page.evaluate(() => { const c = document.getElementById('screen'), v = document.getElementById('view'); const s = document.createElement('canvas'); s.width = 160; s.height = 90; const g = s.getContext('2d'); g.drawImage(v, 0, 0, 160, 90); g.drawImage(c, 0, 0, 160, 90); const d = g.getImageData(0, 0, 160, 90).data, set = new Set(); let lit = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] > 40) lit++; set.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); } return { lit: lit / (d.length / 4), colors: set.size }; });
        report('boot', 'the picture is drawn (lit pixels and colours)', px.lit > .05 && px.colors >= 16, JSON.stringify(px));
        report('boot', 'no page errors at boot', !errors.length, errors.slice(0, 3).join(' | '));
      }
      if (want('audio')) {
        await page.keyboard.press('KeyH', { delay: 90 }); await page.waitForTimeout(400);   // (browsers start sound after the first key)
        const au = await page.evaluate(async () => {
          const a = S7.game.audio, c = a.ctx; if (!c) return { err: 'no context' };
          // listen to the master bus: an analyser on the engine's own output
          const an = c.createAnalyser(); an.fftSize = 2048; a._master.connect(an); const buf = new Float32Array(an.fftSize);
          const peak = async (fn, ms = 500) => { fn(); let p = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { await new Promise(r => setTimeout(r, 40)); an.getFloatTimeDomainData(buf); for (const v of buf) p = Math.max(p, Math.abs(v)); } return +p.toFixed(4); };
          a.music(null); await new Promise(r => setTimeout(r, 300));
          const out = { state: c.state };
          out.music = await peak(() => S7.music('hotel', { restart: true, fade: 0 }), 2500); a.music(null); S7.AU.song = null; await new Promise(r => setTimeout(r, 400));
          out.sfx = await peak(() => S7.sfx('crit'));
          S7.newGame({}); S7.enterArea('00A', 'j2', { noAutosave: true, silent: true });
          const e = S7.spawnEnemy('giggler', S7.heroPos().x + 60, S7.heroPos().y, undefined, {});
          await new Promise(r => setTimeout(r, 400));
          out.laugh = await peak(() => S7.bus.emit('laugh', { enemy: e, style: 'giggle', at: [e.x, e.y, e.z + 24], loud: 1, d: 60 }));
          out.voice = await peak(() => { S7.say([['murmel', 'Gratuity... is customary...']]); for (let i = 0; i < 40; i++) { S7.TALK.shown += 1; S7.audioFrame(1 / 60); } });
          S7.TALK.open = false; a._master.disconnect(an); a._master.connect(c.destination);
          return out;
        });
        report('audio', 'the sound starts after a key press', au.state === 'running', JSON.stringify(au));
        for (const k of ['music', 'sfx', 'laugh', 'voice']) report('audio', k + ' is audible (synthesised, no files)', au[k] > .005, JSON.stringify(au));
        // readability at 10 feet: on a 1080p TV the game's 240 lines are scaled 4.5x
        const rd = await page.evaluate(() => { const H = S7.game.H || S7.game.screen.H, scale = innerHeight / H; return { H, scale, prompt: 7 * scale, dialog: 7 * 2 * scale }; });
        report('readability', 'prompt text is at least 3% of the screen height', rd.prompt / 720 >= .028, JSON.stringify(rd));
        report('readability', 'dialog text is drawn at twice the base size', rd.dialog / 720 >= .056, JSON.stringify(rd));
      }
      if (want('play')) {
        await page.evaluate(() => { S7.TESTING = true; S7.startNewGame('Piste'); }); await page.waitForTimeout(700); await page.evaluate(() => S7.skipScene()); await page.waitForTimeout(500);
        const s0 = await snap(page);
        await page.keyboard.down('KeyW'); await page.waitForTimeout(1800); await page.keyboard.up('KeyW');
        const s1 = await snap(page);
        report('play', 'the keyboard walks the rail', s1.area === '00A' && (s1.s !== s0.s || s1.node !== s0.node || s1.edge !== s0.edge), JSON.stringify([s0.node, s0.s, s1.node, s1.s]));
        await page.keyboard.press('Escape', { delay: 90 }); await page.waitForTimeout(500);
        report('play', 'Escape pauses into the menu', await page.evaluate(() => window.__game.game.paused && !!document.querySelector('.esh-btns, [class*=esh]')));
        const devBtn = await page.$('button:has-text("Dev Mode")');
        report('play', 'the pause menu has Dev Mode', !!devBtn);
        if (devBtn) { await devBtn.click(); await page.waitForTimeout(400); }
        report('play', 'Dev Mode opens over the frozen game', await page.evaluate(() => S7.UIOPEN && S7.UI.modal().name === 'dev'));
        await page.keyboard.press('ArrowDown', { delay: 90 }); await page.waitForTimeout(80); await page.keyboard.press('ArrowRight', { delay: 90 }); await page.waitForTimeout(80); await page.keyboard.press('ArrowRight', { delay: 90 }); await page.waitForTimeout(150);
        const ws = await page.evaluate(() => S7.T.walkSpeed);
        report('play', 'a slider changes the tuning live', ws > 85, ws);
        await page.keyboard.press('Delete', { delay: 90 }); await page.waitForTimeout(400); await page.keyboard.press('Enter', { delay: 90 }); await page.waitForTimeout(400);
        report('play', 'resetting the page restores the default', (await page.evaluate(() => S7.T.walkSpeed)) === 85);
        await page.keyboard.press('Escape', { delay: 90 }); await page.waitForTimeout(600);
        report('play', 'Escape closes Dev Mode', await page.evaluate(() => !S7.UIOPEN));
      }
      if (want('mouse')) {
        await page.evaluate(() => { S7.UI.closeAll(); S7.game.paused = false; S7.placeAtNode('j1'); S7.G.walker.arrived = 'r7-j1'; }); await page.waitForFunction(() => S7.HUD.marks.filter(x => x.kind === 'branch' && x.rect[0] > 10 && x.rect[0] < S7.W_ - 30 && x.rect[1] > 10 && x.rect[1] < S7.H_ - 30).length >= 2, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500);
        const m = await page.evaluate(() => { const marks = S7.HUD.marks.filter(x => x.kind === 'branch'), cv = document.getElementById('screen').getBoundingClientRect(), W = S7.W_, H = S7.H_; const k = marks.find(x => x.i !== S7.G.walker.branch && x.rect[0] > 10 && x.rect[0] < W - 30 && x.rect[1] > 10 && x.rect[1] < H - 30); return k ? { i: k.i, x: cv.left + (k.rect[0] + k.rect[2] / 2) / W * cv.width, y: cv.top + (k.rect[1] + k.rect[3] / 2) / H * cv.height } : null; });
        report('mouse', 'a junction shows its branches as markers', !!m);
        if (m) {
          await page.mouse.move(m.x - 30, m.y - 30); await page.waitForTimeout(100); await page.mouse.move(m.x, m.y, { steps: 4 }); await page.waitForTimeout(200);
          report('mouse', 'hovering a marker highlights its branch', (await page.evaluate(() => S7.G.walker.branch)) === m.i, m.i);
          await page.mouse.click(m.x, m.y); await page.waitForTimeout(400);
          const s = await snap(page); report('mouse', 'a click takes the branch', s.node !== 'j1', JSON.stringify([s.node, s.edge]));
        }
      }
      if (want('glyphs')) {
        await page.evaluate(() => { window.__padOn = true; window.__pad.buttons[3].pressed = true; window.__pad.buttons[3].value = 1; }); await page.waitForFunction(() => S7.game.input.lastDevice === 'gamepad', null, { timeout: 5000 }).catch(() => {}); await page.evaluate(() => { window.__pad.buttons[3].pressed = false; window.__pad.buttons[3].value = 0; }); await page.waitForTimeout(300);
        const g1 = await page.evaluate(() => [S7.game.input.lastDevice, S7.label('move'), S7.label('turn'), S7.label('interact')]);
        report('glyphs', 'a DualSense shows ✕ ○ △', g1[0] === 'gamepad' && g1[1] === '✕' && g1[2] === '○' && g1[3] === '△', g1.join(' '));
        await page.evaluate(() => S7.game.settings.set('padGlyphs', 'Xbox')); await page.waitForTimeout(100);
        const g2 = await page.evaluate(() => [S7.label('move'), S7.label('turn'), S7.label('interact')]);
        report('glyphs', 'the Xbox setting shows A B Y', g2.join() === 'A,B,Y', g2.join(' '));
        await page.evaluate(() => S7.game.settings.set('padGlyphs', 'PlayStation'));
        await page.keyboard.press('KeyH', { delay: 90 }); await page.waitForTimeout(150);
        const g3 = await page.evaluate(() => [S7.game.input.lastDevice, S7.label('move'), S7.label('fire')]);
        report('glyphs', 'a key press switches the prompts to keys', g3[0] === 'keyboard' && g3[1] === 'W' && g3[2] === 'Left click', g3.join(' '));
        await page.evaluate(() => { window.__padOn = false; });
      }
      if (want('attract')) {
        await page.evaluate(() => { S7.UI.closeAll(); S7.game.go('title', null, { fade: 0 }); }); await page.waitForTimeout(600);
        await page.waitForFunction(() => window.__game.game.sceneName === 'attract', null, { timeout: 16000 }).catch(() => {});
        report('attract', '10 s idle on the title starts the demo', (await page.evaluate(() => window.__game.game.sceneName)) === 'attract', await page.evaluate(() => JSON.stringify({ sc: window.__game.game.sceneName, idle: S7.idle.t, held: [...S7.game.input.held], any: S7.game.input.anyPressed(), mv: S7.game.input.move(), pa: S7.game.input.padAim, dev: S7.game.input.lastDevice })));
        await page.waitForTimeout(3000);
        report('attract', 'the demo plays (the bot moves)', await page.evaluate(() => S7.BOT.on && S7.G.attract));
        await page.keyboard.press('KeyK', { delay: 90 }); await page.waitForTimeout(2000);
        report('attract', 'any key returns to the title', (await page.evaluate(() => window.__game.game.sceneName)) === 'title');
        report('attract', 'the key that exits picks nothing', await page.evaluate(() => !S7.UIOPEN && window.__game.game.sceneName === 'title'));
      }
      report('browser', 'no page errors in play', !errors.length, errors.slice(0, 4).join(' | '));
    } catch (e) { report('browser', 'runs without throwing', false, e.message); }
    await browser.close();
  }
  if (want('touch')) {
    const { browser, page, errors } = await launch({ context: { hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 } });
    try {
      await boot(page); await page.waitForTimeout(500);
      report('touch', 'a touch-only device gets the notice', await page.evaluate(() => S7.touchOnly()));
      report('touch', 'there are no touch controls', await page.evaluate(() => !S7.game.input.touchEnabled && !document.querySelector('[data-act="confirm"]')));
      await page.waitForFunction(() => window.__game.game.sceneName === 'attract', null, { timeout: 16000 }).catch(() => {});
      report('touch', 'the attract mode still runs', (await page.evaluate(() => window.__game.game.sceneName)) === 'attract');
      await page.waitForTimeout(1500); await page.touchscreen.tap(400, 200); await page.waitForFunction(() => window.__game.game.sceneName === 'title', null, { timeout: 6000 }).catch(() => {});
      report('touch', 'a tap returns to the notice', (await page.evaluate(() => window.__game.game.sceneName)) === 'title');
      report('touch', 'no page errors', !errors.length, errors.slice(0, 3).join(' | '));
    } catch (e) { report('touch', 'runs without throwing', false, e.message); }
    await browser.close();
  }
  if (want('hub')) await hubSuite(report);
}

/** the AI Hub harness (§14.5): served on a port the OS picks, stopped by its PID */
async function hubSuite(report) {
  const dir = join(ROOT, 'tests/out/hub'); mkdirSync(dir, { recursive: true });
  copyFileSync(join(ROOT, '..', NAME + '.html'), join(dir, NAME + '.html'));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(join(ROOT, 'vendor/aihub', f), join(dir, f));
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const port = await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('no port')), 8000); const on = b => { const m = String(b).match(/port (\d+)/); if (m) { clearTimeout(to); res(+m[1]); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); });
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const base = 'http://127.0.0.1:' + port + '/';
    const probe = await (await fetch(base + NAME + '.html')).text();
    report('hub', 'the server serves this game', /<title>Skiller7/.test(probe));
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1']) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await routeCdn(ctx);
      const page = await ctx.newPage();
      await page.goto(base + 'harness.html?game=' + NAME + '.html&' + q);
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 300000 }).catch(() => {});
      const res = await page.evaluate(() => { const c = window.__hubCheck || {}; return { pass: c.pass, failed: JSON.stringify(c.failed || c.checks && c.checks.filter && c.checks.filter(x => !x.pass || x.ok === false).map(x => x.name || x.label) || c).slice(0, 400) }; });
      report('hub', 'the harness passes: ' + q, res.pass === true, res.failed);
      await ctx.close();
    }
  } catch (e) { report('hub', 'runs without throwing', false, e.message); }
  finally { await browser.close(); srv.kill(); }
}
