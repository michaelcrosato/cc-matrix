/** Playwright checks for the built HTML. Returns a list of problems. */
import { createServer } from 'node:http';
import { appendFileSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { grab, writePng } from './shot.mjs';

const GPU = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
  '--use-webgpu-adapter=swiftshader',
];

function log(file, line) {
  appendFileSync(file, `${line}\n`);
}

async function waitGame(page) {
  await page.waitForFunction(() => {
    const engine = window.__PIXEL_ENGINE__;
    return !!(engine && engine.started && window.__GAME__);
  }, null, { timeout: 30000 });
}

function watch(page, errors) {
  page.on('pageerror', (err) => errors.push(String(err && err.stack || err)));
}

export async function runBrowser({ devRoot, scratch }) {
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64';
  const problems = [];
  const browserLog = path.join(scratch, 'browser.log');
  const hubLog = path.join(scratch, 'hub.log');
  const noLog = path.join(scratch, 'nosession.log');
  writeFileSync(browserLog, '');
  writeFileSync(hubLog, '');
  writeFileSync(noLog, '');
  mkdirSync(path.join(scratch, 'shots'), { recursive: true });
  const html = path.join(devRoot, '..', 'Mint Dial-Wii Fit-grok-4.7-xhigh-20261104-221607.html');
  const fileUrl = pathToFileURL(html).href;
  const { chromium, firefox, webkit, devices } = await import('playwright');

  const bad = (msg) => {
    problems.push(msg);
    log(browserLog, `FAIL ${msg}`);
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: GPU });
    const signatures = [];
    for (let i = 1; i <= 2; i++) {
      const errors = [];
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      watch(page, errors);
      await page.goto(fileUrl);
      await waitGame(page);
      const early = await page.evaluate(() => {
        const app = window.__GAME__;
        const engine = window.__PIXEL_ENGINE__;
        return {
          title: document.title,
          stateTitle: app.state().title,
          mode: app.state().mode,
          music: app.state().music,
          bus: engine.audio.volume.music,
        };
      });
      log(browserLog, `boot ${i} ${JSON.stringify(early)}`);
      if (early.title !== 'Mint Dial' || early.stateTitle !== 'Mint Dial') bad(`boot ${i} title ${early.title}`);
      if (early.mode !== 'title') bad(`boot ${i} mode ${early.mode}`);
      if (early.music !== 0.1 || early.bus !== 0.1) bad(`boot ${i} music ${early.music} ${early.bus}`);
      const shot = await grab(page);
      if (shot.error) {
        writeFileSync(path.join(scratch, 'capture-error.txt'), shot.error);
        log(browserLog, `capture threw: ${shot.error}`);
      } else {
        writePng(path.join(scratch, `boot-${i}.png`), shot.url);
        const aspect = shot.width / shot.height;
        if (Math.abs(aspect - 1280 / 720) > 0.08) bad(`boot ${i} aspect ${aspect}`);
        if (shot.width * shot.height < 10000) bad(`boot ${i} tiny ${shot.width}x${shot.height}`);
        if (!(shot.span >= 8)) bad(`boot ${i} blank span ${shot.span}`);
        if (!shot.hudCanvases || !shot.navy) bad(`boot ${i} hud missing canvases ${shot.hudCanvases} navy ${shot.navy}`);
        signatures.push({ title: shot.title, mode: shot.mode, music: shot.music, row: shot.row });
        log(browserLog, `boot ${i} shot ${shot.width}x${shot.height} span ${shot.span.toFixed(1)} ${shot.mode} ${shot.row}`);
      }
      if (errors.length) bad(`boot ${i} errors ${errors.join(' | ')}`);
      if (i === 2 && !shot.error) await drive(page, bad, browserLog);
      await page.close();
    }
    if (signatures.length === 2) {
      const same = JSON.stringify(signatures[0]) === JSON.stringify(signatures[1]);
      if (!same) bad(`boots disagree ${JSON.stringify(signatures)}`);
    }

    await phone(browser, devices, fileUrl, bad, browserLog);
    await widgets(browser, fileUrl, bad, browserLog);
    await shots(browser, fileUrl, scratch, browserLog);
  } catch (err) {
    bad(`chromium ${err?.stack || err}`);
  } finally {
    if (browser) await browser.close();
    browser = null;
  }

  await missingGpu(webkit, 'webkit', fileUrl, problems, browserLog);
  await missingGpu(firefox, 'firefox', fileUrl, problems, browserLog);

  let server;
  try {
    const root = path.join(scratch, 'hubserve');
    mkdirSync(root, { recursive: true });
    copyFileSync(path.join(devRoot, 'vendor/hub/harness.html'), path.join(root, 'harness.html'));
    copyFileSync(path.join(devRoot, 'vendor/hub/bridge.js'), path.join(root, 'bridge.js'));
    copyFileSync(path.join(devRoot, 'vendor/hub/round.js'), path.join(root, 'round.js'));
    copyFileSync(html, path.join(root, 'game.html'));
    writeFileSync(path.join(root, 'parent.html'), `<!doctype html><iframe id="g" src="game.html?aihub=1"></iframe><script>
window.__failed = '';
window.addEventListener('message', (e) => {
  const m = e.data;
  if (!m || m.aihub !== 1) return;
  if (m.type === 'hello' && e.source) {
    e.source.postMessage({ aihub: 1, type: 'welcome', me: 'p1', host: 'p1', seed: 1, mode: 'ghost', players: [{ id: 'p1', name: 'Ada' }] }, '*');
  }
  if (m.type === 'error') window.__failed = m.message || 'error';
});
</script>`);
    server = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.join(root, rel || 'harness.html');
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const buf = readFileSync(file);
        const ext = path.extname(file);
        const type = ext === '.js' ? 'text/javascript' : ext === '.html' ? 'text/html' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(buf);
      } catch {
        res.writeHead(404);
        res.end('missing');
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    const js = await fetch(`${base}/round.js`);
    const jsType = js.headers.get('content-type') || '';
    if (!jsType.includes('javascript')) problems.push(`content-type ${jsType}`);
    log(hubLog, `server ${base} js ${jsType}`);

    browser = await chromium.launch({ headless: true, args: GPU });
    const urls = [
      `${base}/harness.html?game=game.html&auto=1&players=1`,
      `${base}/harness.html?game=game.html&auto=1&players=2`,
      `${base}/harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5`,
      `${base}/harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave`,
    ];
    for (const url of urls) {
      const errors = [];
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      watch(page, errors);
      await page.goto(url);
      const titled = await page.waitForFunction(() => {
        const frame = document.querySelector('iframe');
        return frame && frame.contentDocument && frame.contentDocument.title === 'Mint Dial';
      }, null, { timeout: 30000 }).then(() => true).catch(() => false);
      if (!titled) problems.push(`hub title missing ${url}`);
      const done = await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 }).then(() => true).catch(() => false);
      const report = await page.evaluate(() => window.__hubCheck || null);
      const failed = (report?.checks || []).filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`);
      log(hubLog, `${url}\ntitle ${titled} complete ${done} pass ${report?.pass}\n${failed.join('\n')}\nerrors ${errors.join(' | ')}`);
      if (!done || !report?.pass) problems.push(`hub fail ${url} ${failed.join('; ') || 'no report'}`);
      if (errors.some((e) => !e.startsWith('console'))) problems.push(`hub pageerror ${url}`);
      await page.close();
    }

    const quiet = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    watch(page, quiet);
    await page.goto(`${base}/game.html`);
    await waitGame(page);
    const alone = await page.evaluate(() => ({
      title: document.title,
      mode: window.__GAME__.state().mode,
      active: window.AIHub ? window.AIHub.active : false,
      music: window.__GAME__.state().music,
    }));
    log(noLog, JSON.stringify({ alone, errors: quiet }));
    if (alone.mode !== 'title' || alone.active !== false || alone.title !== 'Mint Dial') {
      problems.push(`no-session ${JSON.stringify(alone)}`);
    }
    await page.close();

    const wk = await webkit.launch({ headless: true });
    try {
      const framePage = await wk.newPage();
      const frameErrors = [];
      watch(framePage, frameErrors);
      await framePage.goto(`${base}/parent.html`);
      await framePage.waitForTimeout(8000);
      const failed = await framePage.evaluate(() => window.__failed || '');
      const inner = await framePage.frameLocator('iframe').locator('body').innerText().catch(() => '');
      log(browserLog, `webkit session fail=${failed} body=${inner.slice(0, 180)} errors=${frameErrors.join(' | ')}`);
      if (!String(failed).includes('WebGPU') && !inner.includes('Failed to start: WebGPU unavailable')) {
        problems.push(`webkit session did not report WebGPU (${failed})`);
      }
      if (frameErrors.some((e) => !e.startsWith('console'))) problems.push(`webkit session pageerror ${frameErrors.join(' | ')}`);
      await framePage.close();
    } finally {
      await wk.close();
    }
  } catch (err) {
    problems.push(`hub ${err?.stack || err}`);
    log(hubLog, String(err?.stack || err));
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
  return problems;
}

async function drive(page, bad, browserLog) {
  const out = await page.evaluate(() => {
    const engine = window.__PIXEL_ENGINE__;
    const app = window.__GAME__;
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    const pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
    buttons[0].pressed = true;
    buttons[0].value = 1;
    engine.step(2);
    const cross = app.state().prompt;
    buttons[0].pressed = false;
    buttons[0].value = 0;
    engine.step(1);
    const tap = (code) => {
      engine.input.setKey(code, true);
      engine.step(1);
      engine.input.setKey(code, false);
      engine.step(1);
    };
    const choose = (id) => {
      let guard = 0;
      while (app.state().row !== id && guard++ < 12) tap('ArrowDown');
      tap('Enter');
    };
    if (app.mode === 'title') choose('start');
    choose('settings');
    while (app.state().row !== 'glyphs' && app.state().rows.includes('glyphs')) tap('ArrowDown');
    tap('Enter');
    pad.axes[0] = 0.9;
    engine.step(2);
    const xbox = app.state().prompt;
    pad.axes[0] = 0;
    engine.step(1);
    tap('ArrowDown');
    const key = app.state().prompt;
    engine.input.setPointer(-0.2, 0.2, false);
    engine.input.addPointer(48, 16);
    engine.step(1);
    const mouse = app.state().prompt;
    const widgets = app.state().widgets.filter((w) => String(w.id).startsWith('row-'));
    const before = app.state().row;
    const widget = widgets.find((w) => w.id !== `row-${before}` && w.id === 'row-more')
      || widgets.find((w) => w.id !== `row-${before}`)
      || null;
    let hovered = before;
    let activated = false;
    if (widget) {
      const hud = app.ctx.hud;
      const nx = ((widget.x + widget.w / 2) / hud.width) * 2 - 1;
      const ny = 1 - ((widget.y + widget.h / 2) / hud.height) * 2;
      engine.input.setPointer(nx, ny, false);
      engine.step(1);
      hovered = app.state().row;
      const snap = () => `${app.mode}|${app.setPage || 0}|${app.settings.gentle}|${app.settings.glyphs}|${app.state().rows.join(',')}`;
      const pre = snap();
      engine.input.setPointer(nx, ny, true);
      engine.step(1);
      engine.input.setPointer(nx, ny, false);
      engine.step(1);
      activated = snap() !== pre;
    }
    return { cross, xbox, key, mouse, hovered, before, activated, mode: app.mode, glyphs: app.state().glyphs };
  });
  log(browserLog, `drive ${JSON.stringify(out)}`);
  if (!String(out.cross).includes('Cross')) bad(`pad prompt ${out.cross}`);
  if (!String(out.xbox).includes('A')) bad(`xbox prompt ${out.xbox}`);
  if (!String(out.key).includes('Enter')) bad(`key prompt ${out.key}`);
  if (!String(out.mouse).includes('Click')) bad(`mouse prompt ${out.mouse}`);
  if (!out.before || out.hovered === out.before) bad(`hover did not move focus ${out.before} -> ${out.hovered}`);
  if (!out.activated) bad('click did not activate');
}

async function phone(browser, devices, fileUrl, bad, browserLog) {
  const profile = devices['iPhone 13'] || devices['iPhone 12'] || devices['iPhone 14'];
  const context = await browser.newContext({ ...profile, deviceScaleFactor: 1 });
  const errors = [];
  const page = await context.newPage();
  watch(page, errors);
  await page.goto(fileUrl);
  await waitGame(page);
  const state = await page.evaluate(() => {
    const app = window.__GAME__;
    const engine = window.__PIXEL_ENGINE__;
    return {
      touch: app.state().touchOnly,
      message: app.state().touchMessage,
      engineTouch: engine.touch,
      gear: !!document.querySelector('.settings-button'),
    };
  });
  log(browserLog, `phone ${JSON.stringify(state)}`);
  if (!state.touch || !String(state.message).includes('Controller or keyboard required')) bad(`phone gate ${JSON.stringify(state)}`);
  if (state.engineTouch) bad('phone engine.touch is set');
  if (!state.gear) bad('phone settings button missing');
  await page.evaluate(() => {
    const engine = window.__PIXEL_ENGINE__;
    engine.input.setKey('MouseLeft', true);
    engine.step(1);
    engine.input.setKey('MouseLeft', false);
    engine.step(1);
  });
  const after = await page.evaluate(() => window.__GAME__.state().mode);
  if (after !== 'title') bad(`phone click started ${after}`);
  await page.evaluate(() => window.__PIXEL_ENGINE__.step(700));
  const attracted = await page.evaluate(() => window.__GAME__.state().mode);
  if (attracted !== 'attract') bad(`phone attract ${attracted}`);
  if (errors.length) bad(`phone errors ${errors.join(' | ')}`);
  await context.close();
}

async function widgets(browser, fileUrl, bad, browserLog) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  watch(page, errors);
  await page.goto(fileUrl);
  await waitGame(page);
  for (const [w, h] of [[1920, 1080], [1280, 720], [640, 360]]) {
    await page.setViewportSize({ width: w, height: h });
    const fit = await page.evaluate(() => {
      const app = window.__GAME__;
      const engine = window.__PIXEL_ENGINE__;
      engine.step(1);
      engine.step(1);
      engine.step(1);
      const hudW = app.ctx.hud.width;
      const hudH = app.ctx.hud.height;
      const badRows = app.state().widgets.filter((r) => r.x < -1 || r.y < -1 || r.x + r.w > hudW + 1 || r.y + r.h > hudH + 1);
      return {
        hudW,
        hudH,
        badRows: badRows.map((r) => r.id),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      };
    });
    log(browserLog, `widgets ${w}x${h} ${JSON.stringify(fit)}`);
    if (fit.badRows.length) bad(`widgets outside ${w}x${h} ${fit.badRows.join(',')}`);
    if (fit.overflow) bad(`page overflow ${w}x${h}`);
  }
  await page.mouse.click(200, 200);
  const heard = await page.evaluate(async () => {
    const engine = window.__PIXEL_ENGINE__;
    const audio = engine.audio;
    if (audio.unlock) audio.unlock();
    const ctx = audio.context;
    if (!ctx) return { energy: 0, missing: true, ounce: { rms: 0, pitch: 0 }, coach: { rms: 0, pitch: 0 } };
    if (ctx.state === 'suspended') await ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const bus = audio.master || (audio.buses && (audio.buses.music || audio.buses.sfx));
    bus.connect(analyser);
    engine.step(10);
    if (audio.play) audio.play('chime');
    await new Promise((r) => setTimeout(r, 250));
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let energy = 0;
    for (const v of data) energy += Math.abs(v - 128);
    const voice = window.__VOICE__;
    async function render(speaker) {
      const syl = voice.syllabify('Are you happy?', speaker);
      const offline = new OfflineAudioContext(1, 44100 * 2, 44100);
      voice.renderVoice(offline, offline.destination, syl, 0.05, speaker);
      const buffer = await offline.startRendering();
      const samples = buffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      let best = 0;
      let pitch = 0;
      const rate = buffer.sampleRate;
      for (let freq = 90; freq <= 480; freq += 5) {
        const w = 2 * Math.PI * freq / rate;
        let sr = 0;
        let si = 0;
        for (let i = 0; i < samples.length; i += 8) {
          sr += samples[i] * Math.cos(w * i);
          si -= samples[i] * Math.sin(w * i);
        }
        const power = sr * sr + si * si;
        if (power > best) {
          best = power;
          pitch = freq;
        }
      }
      return { rms, pitch };
    }
    const ounce = await render('ounce');
    const coach = await render('coach');
    return { energy: energy / data.length, ounce, coach };
  });
  log(browserLog, `audio ${JSON.stringify(heard)}`);
  if (!(heard.energy > 0.4)) bad(`analyser silent ${heard.energy}`);
  if (!(heard.ounce.rms > 0.02)) bad(`voice rms ${heard.ounce.rms}`);
  if (!(heard.ounce.pitch > heard.coach.pitch)) bad(`pitch ounce ${heard.ounce.pitch} coach ${heard.coach.pitch}`);

  const lanes = await page.evaluate(() => {
    const engine = window.__PIXEL_ENGINE__;
    const app = window.__GAME__;
    const pads = [null, null, null, null];
    const make = (axis, pressed) => ({
      connected: true,
      axes: [axis, 0, 0, 0],
      buttons: [{ pressed, value: pressed ? 1 : 0 }, ...Array.from({ length: 15 }, () => ({ pressed: false, value: 0 }))],
    });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads });
    const tap = (code) => {
      engine.input.setKey(code, true);
      engine.step(1);
      engine.input.setKey(code, false);
      engine.step(1);
    };
    const choose = (id) => {
      let guard = 0;
      while (app.state().row !== id && guard++ < 12) tap('ArrowDown');
      tap('Enter');
    };
    if (app.mode !== 'title') {
      app.go('title');
      engine.step(1);
    }
    if (app.mode === 'title') choose('start');
    choose('family');
    pads[0] = make(0.85, true);
    engine.step(1);
    pads[1] = make(-0.85, true);
    engine.step(1);
    tap('Enter');
    choose('start');
    engine.input.setKey('ArrowRight', true);
    engine.step(90);
    engine.input.setKey('ArrowRight', false);
    engine.step(1);
    return { mode: app.mode, pos: app.lanes.map((lane) => lane.pos), seats: app.state().seats };
  });
  log(browserLog, `family ${JSON.stringify(lanes)}`);
  if (lanes.mode !== 'medley' || lanes.pos.length < 3) bad(`family lanes ${JSON.stringify(lanes)}`);
  if (new Set(lanes.pos.map((n) => Number(n).toFixed(3))).size < 3) bad(`family positions ${lanes.pos.join(',')}`);
  if (errors.length) bad(`widget page errors ${errors.join(' | ')}`);
  await page.close();
}

async function shots(browser, fileUrl, scratch, browserLog) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(fileUrl);
  await waitGame(page);
  const dir = path.join(scratch, 'shots');
  const title = await grab(page);
  if (title.url) writePng(path.join(dir, 'title.png'), title.url);
  await page.evaluate(() => {
    const app = window.__GAME__;
    const engine = window.__PIXEL_ENGINE__;
    app.setDriver('expert');
    app.go('activity', 'squat');
    engine.step(50);
  });
  const activity = await grab(page);
  if (activity.url) writePng(path.join(dir, 'activity.png'), activity.url);
  const pose = await page.evaluate(() => {
    const app = window.__GAME__;
    const world = window.__PIXEL_ENGINE__.game;
    const state = app.state();
    return {
      mode: state.mode,
      name: state.activityName,
      pose: world?.poseName || '',
      time: world?.poseTime || 0,
      shot: world?.shot || '',
      dial: state.widgets.some((w) => w.id === 'dial'),
      head: state.widgets.some((w) => w.id === 'head'),
    };
  });
  log(browserLog, `activity pose ${JSON.stringify(pose)}`);
  if (pose.name !== 'Squats of Regret') bad(`activity name ${pose.name}`);
  if (pose.pose !== 'SquatRep' || pose.time <= 0.05) bad(`activity clip ${pose.pose} ${pose.time}`);
  if (!pose.dial || !pose.head) bad(`activity hud dial ${pose.dial} head ${pose.head}`);
  if (pose.shot !== 'play') bad(`activity camera ${pose.shot}`);
  await page.evaluate(() => {
    const app = window.__GAME__;
    window.__PIXEL_ENGINE__.step(1);
    app.go('island');
    window.__PIXEL_ENGINE__.step(2);
  });
  const island = await grab(page);
  if (island.url) writePng(path.join(dir, 'island.png'), island.url);
  await page.evaluate(() => {
    const app = window.__GAME__;
    const engine = window.__PIXEL_ENGINE__;
    app.setDriver('expert');
    app.go('activity', 'hoop');
    engine.step(5);
    engine.input.setKey('KeyP', true);
    engine.step(1);
    engine.input.setKey('KeyP', false);
    engine.step(1);
    const tap = (code) => {
      engine.input.setKey(code, true);
      engine.step(1);
      engine.input.setKey(code, false);
      engine.step(1);
    };
    let guard = 0;
    while (app.state().row !== 'dev' && guard++ < 10) tap('ArrowDown');
    tap('Enter');
  });
  const dev = await grab(page);
  if (dev.url) writePng(path.join(dir, 'pause.png'), dev.url);
  log(browserLog, `shots title ${title.mode} activity ${activity.mode} island ${island.mode} dev ${dev.mode}`);
  await page.close();
}

async function missingGpu(launcher, name, fileUrl, problems, browserLog) {
  let browser;
  try {
    browser = await launcher.launch({ headless: true });
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(fileUrl);
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body ? document.body.innerText : '');
    log(browserLog, `${name} ${text.slice(0, 240)} pageerrors ${errors.join(' | ')}`);
    if (!text.includes('Failed to start: WebGPU unavailable')) problems.push(`${name} missing WebGPU message`);
    if (errors.length) problems.push(`${name} pageerror ${errors.join(' | ')}`);
    await page.close();
  } catch (err) {
    problems.push(`${name} ${err?.message || err}`);
  } finally {
    if (browser) await browser.close();
  }
}
