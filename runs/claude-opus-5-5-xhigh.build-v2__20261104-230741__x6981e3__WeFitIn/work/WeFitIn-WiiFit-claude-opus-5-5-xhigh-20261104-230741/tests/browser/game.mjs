// 14 boot, 15 devices and prompts, 17 Family Hour, 18 audio, on the built html via file://.
import { assert, done, eq, near, test } from '../lib-pure.mjs';
import { bootPage, FILE_URL, launch, PAD_INIT } from './_lib.mjs';

const browser = await launch();
const errors = [];
async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return p;
}
const state = (p) => p.evaluate(() => window.__GAME__.state());
const frames = (p, n = 30) => p.waitForFunction(([start, want]) => window.__PIXEL_ENGINE__.frame >= start + want, [0, 0]).then(async () => {
  const start = await p.evaluate(() => window.__PIXEL_ENGINE__.frame);
  await p.waitForFunction(([s, w]) => window.__PIXEL_ENGINE__.frame >= s + w, [start, n], { timeout: 60000 });
});
const SETTLE = () => !window.__GAME__.loading;
async function go(p, id, args = {}) {
  await p.evaluate(([i, a]) => window.__GAME__.go(i, a), [id, args]);
  await p.waitForFunction(SETTLE, null, { timeout: 60000 });
}

await test('14 boots on WebGPU with no errors, title visible, music exactly 0.10 on first run', async () => {
  const p = await page();
  await bootPage(p);
  const s = await p.evaluate(() => {
    const e = window.__PIXEL_ENGINE__;
    return { backend: e.state().backend, ok: e.state().errors.length, music: window.__GAME__.engine.audio.volume.music, scene: window.__GAME__.state().scene, active: !!window.AIHub?.active, gpu: e.state().gpuErrors.length };
  });
  eq(s.backend.toLowerCase(), 'webgpu');
  eq(s.ok, 0);
  eq(s.gpu, 0);
  eq(s.music, 0.1);
  eq(s.scene, 'title');
  await frames(p, 20);
  const seen = await p.evaluate(() => {
    const c = window.__PIXEL_ENGINE__.hud.canvas;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });
  assert(seen > 500, `HUD pixels: ${seen}`);
  eq(errors.length, 0, errors.join(' | '));
  await p.context().close();
});

await test('14 the engine\'s stored volume can\'t move ours: music is 0.10 at every boot', async () => {
  const p = await page();
  await p.addInitScript(() => localStorage.setItem('pixel-engine:audio', JSON.stringify({ master: 0.8, sfx: 1, music: 0.9, muted: false })));
  await bootPage(p);
  eq(await p.evaluate(() => window.__GAME__.engine.audio.volume.music), 0.1);
  await p.context().close();
});

await test('15 pad stub: Cross confirms, PlayStation glyphs, Settings gives Xbox, keys give keycaps, mouse gives mouse prompts, hover and click', async () => {
  const p = await page();
  await p.addInitScript(PAD_INIT);
  await bootPage(p);
  await frames(p, 5);
  const press = async (i) => { await p.evaluate((b) => { window.__pads[0].buttons[b].pressed = true; window.__pads[0].buttons[b].value = 1; }, i); await frames(p, 4); await p.evaluate((b) => { window.__pads[0].buttons[b].pressed = false; window.__pads[0].buttons[b].value = 0; }, i); await frames(p, 4); };
  await press(0);
  let s = await state(p);
  eq(s.stack.join(), 'main', 'Cross opened the menu');
  eq(s.device, 'pad');
  eq(s.column, 'ps');
  assert(s.prompts.some((x) => x.startsWith('ps:cross')), `prompts ${s.prompts}`);
  // The option in Settings swaps the glyphs.
  await p.evaluate(() => { const G = window.__GAME__; G.settings.glyphs = 'xbox'; G.saveSettings(); });
  await frames(p, 3);
  s = await state(p);
  eq(s.column, 'xbox');
  assert(s.prompts.some((x) => x.startsWith('xbox:a')), `prompts ${s.prompts}`);
  await p.evaluate(() => { const G = window.__GAME__; G.settings.glyphs = 'ps'; G.saveSettings(); });
  // A key press switches to keycaps.
  await p.keyboard.press('ArrowDown');
  await frames(p, 4);
  s = await state(p);
  eq(s.device, 'keyboard');
  eq(s.column, 'key');
  assert(s.prompts.some((x) => x.startsWith('key:Enter')), `prompts ${s.prompts}`);
  // A mouse move switches to mouse prompts, and hover moves the focus.
  const rect = await p.evaluate(() => {
    const G = window.__GAME__; const m = G.stack.top.menu; const r = m.rects[3];
    const h = G.engine.hud; const c = h.canvas.getBoundingClientRect();
    return { x: c.left + ((r.x + 20) / h.width) * c.width, y: c.top + ((r.y + 6) / h.height) * c.height };
  });
  await p.mouse.move(rect.x, rect.y);
  await frames(p, 4);
  await p.mouse.move(rect.x + 3, rect.y + 1);
  await frames(p, 4);
  s = await state(p);
  eq(s.device, 'mouse');
  eq(s.column, 'mouse');
  assert(s.prompts.some((x) => x.startsWith('mouse:mouseL')), `prompts ${s.prompts}`);
  eq(await p.evaluate(() => window.__GAME__.stack.top.menu.focus), 3, 'hover moved the focus');
  // A click activates.
  await p.mouse.down();
  await frames(p, 3);
  await p.mouse.up();
  await frames(p, 4);
  s = await state(p);
  eq(s.stack.join(), 'main,settings', 'click opened Settings');
  // Stick navigates with repeat.
  await p.evaluate(() => { window.__pads[0].axes[1] = 1; });
  await frames(p, 10);
  await p.evaluate(() => { window.__pads[0].axes[1] = 0; });
  await frames(p, 3);
  s = await state(p);
  eq(s.device, 'pad', 'the stick counts as the pad');
  eq(errors.length, 0, errors.join(' | '));
  await p.context().close();
});

await test('15 lean: stick, keys and mouse all drive the Dot; the mouse takes over when it moves', async () => {
  const p = await page();
  await p.addInitScript(PAD_INIT);
  await bootPage(p);
  await go(p, 'activity', { id: 'tree', mode: 'dropin', noPractice: true });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__GAME__.scene.phase === 'play', null, { timeout: 30000 });
  const dotOf = () => p.evaluate(() => { const l = window.__GAME__.scene.playerLane; return { x: l.dot.x, ux: l.inp.x, uy: l.inp.y }; });
  await p.evaluate(() => { window.__pads[0].axes[0] = 0.8; window.__pads[0].axes[1] = -0.6; });
  await frames(p, 10);
  let d = await dotOf();
  assert(d.ux > 0.6 && d.uy > 0.4, `stick ${JSON.stringify(d)}`);
  await p.evaluate(() => { window.__pads[0].axes[0] = 0; window.__pads[0].axes[1] = 0; });
  await frames(p, 4);
  await p.keyboard.down('KeyD');
  await frames(p, 14);
  d = await dotOf();
  await p.keyboard.up('KeyD');
  assert(d.ux > 0.5, `keys ${JSON.stringify(d)}`);
  await p.mouse.move(100, 100);
  await frames(p, 3);
  await p.mouse.move(900, 200);
  await frames(p, 6);
  d = await dotOf();
  assert(d.ux > 0.5, `mouse ${JSON.stringify(d)}`);
  eq((await state(p)).device, 'mouse');
  await p.context().close();
});

await test('17 Family Hour with 2 stub pads plus keyboard: three lanes move independently', async () => {
  const p = await page();
  await p.addInitScript(PAD_INIT);
  await p.addInitScript(() => { window.__padCount = 2; });
  await bootPage(p);
  await go(p, 'join');
  await frames(p, 5);
  const padDown = async (i, b, on) => p.evaluate(([pi, bi, o]) => { window.__pads[pi].buttons[bi].pressed = o; }, [i, b, on]);
  await padDown(0, 0, true); await frames(p, 3); await padDown(0, 0, false); await frames(p, 3);
  await padDown(1, 0, true); await frames(p, 3); await padDown(1, 0, false); await frames(p, 3);
  await p.keyboard.press('Enter');
  await frames(p, 4);
  const seats = await p.evaluate(() => window.__GAME__.scene.seats.map((s) => (s ? `${s.kind}${s.index ?? ''}` : null)));
  eq(seats.slice(0, 3).join(), 'pad0,pad1,keyboard', 'seats');
  await p.keyboard.press('KeyB'); // no bots
  await frames(p, 3);
  await p.keyboard.press('Enter'); // the keyboard's second press starts it
  await p.waitForFunction(() => window.__GAME__.scene.id === 'medley' && !window.__GAME__.loading, null, { timeout: 60000 });
  eq(await p.evaluate(() => window.__GAME__.scene.lanes.length), 3);
  await p.waitForFunction(() => window.__GAME__.scene.phase === 'play' && window.__GAME__.scene.current, null, { timeout: 30000 });
  // Pad 0 leans left, pad 1 leans right, keys lean forward: three different Dots.
  await p.evaluate(() => { window.__pads[0].axes[0] = -1; window.__pads[1].axes[0] = 1; });
  await p.keyboard.down('KeyW');
  await frames(p, 40);
  const dots = await p.evaluate(() => window.__GAME__.scene.lanes.map((l) => ({ x: l.dot.x, y: l.dot.y, ux: l.inp.x, uy: l.inp.y, kind: l.driver.kind })));
  await p.keyboard.up('KeyW');
  assert(dots[0].x < -0.2 && dots[0].kind === 'pad', `pad 0 ${JSON.stringify(dots[0])}`);
  assert(dots[1].x > 0.2 && dots[1].kind === 'pad', `pad 1 ${JSON.stringify(dots[1])}`);
  assert(dots[2].y > 0.2 && Math.abs(dots[2].x) < 0.3 && dots[2].kind === 'keyboard', `keys ${JSON.stringify(dots[2])}`);
  eq(errors.length, 0, errors.join(' | '));
  await p.context().close();
});

await test('15 mouse details: slider drags, right click goes back, the wheel changes tabs, the pause icon opens pause', async () => {
  const p = await page();
  await bootPage(p);
  await frames(p, 5);
  const artToPage = (x, y) => p.evaluate(([ax, ay]) => { const h = window.__GAME__.engine.hud; const c = h.canvas.getBoundingClientRect(); return { x: c.left + (ax / h.width) * c.width, y: c.top + (ay / h.height) * c.height }; }, [x, y]);
  await p.keyboard.press('Enter');
  await frames(p, 4);
  await p.evaluate(() => { const m = window.__GAME__.stack.top.menu; m.focus = 3; });
  await p.keyboard.press('Enter');
  await frames(p, 4);
  eq(await p.evaluate(() => window.__GAME__.stack.top.name), 'settings');
  // Drag the music slider all the way right, then put it back.
  const r = await p.evaluate(() => { const row = window.__GAME__.stack.top.menu.rects[0]; return { sx: row.sx, sw: row.sw, y: row.y + row.h / 2 }; });
  const from = await artToPage(r.sx + 2, r.y);
  const to = await artToPage(r.sx + r.sw, r.y);
  await p.mouse.move(from.x, from.y);
  await frames(p, 3);
  await p.mouse.down();
  await frames(p, 2);
  await p.mouse.move(to.x, to.y);
  await frames(p, 4);
  await p.mouse.up();
  await frames(p, 3);
  const after = await p.evaluate(() => window.__GAME__.engine.audio.volume.music);
  assert(after > 0.8, `slider dragged to ${after}`);
  await p.evaluate(() => { const G = window.__GAME__; G.settings.music = 0.1; G.saveSettings(); });
  await p.mouse.wheel(0, 120);
  await frames(p, 4);
  eq(await p.evaluate(() => window.__GAME__.stack.top.tabs.i), 1, 'wheel changed tab');
  await p.mouse.click(to.x, to.y, { button: 'right' });
  await frames(p, 4);
  eq(await p.evaluate(() => window.__GAME__.stack.top.name), 'main', 'right click is Back');
  // The pause icon, top right, while the mouse moves.
  await go(p, 'activity', { id: 'tree', mode: 'dropin', noPractice: true });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__GAME__.scene.phase === 'play', null, { timeout: 30000 });
  await p.mouse.move(300, 300);
  await frames(p, 2);
  await p.mouse.move(320, 310);
  await frames(p, 2);
  const icon = await p.evaluate(() => window.__GAME__.scene.pauseIconHit);
  assert(icon, 'icon shown while the mouse moves');
  const at = await artToPage(icon.x + 8, icon.y + 8);
  await p.mouse.move(at.x, at.y);
  await frames(p, 2);
  await p.mouse.down();
  await frames(p, 3);
  await p.mouse.up();
  await frames(p, 3);
  eq(await p.evaluate(() => window.__GAME__.stack.top?.name), 'pause', 'icon opens pause');
  eq(errors.length, 0, errors.join(' | '));
  await p.context().close();
});

for (const [W, H, artW, artH] of [[1920, 1080, 480, 270], [1280, 720, 427, 240], [640, 360, 640, 360]]) {
  await test(`19 no layout overflow in a real page at ${W}x${H}`, async () => {
    const p = await page({ viewport: { width: W, height: H } });
    await bootPage(p);
    await frames(p, 6);
    const size = await p.evaluate(() => { const h = window.__GAME__.engine.hud; return `${h.width}x${h.height}`; });
    eq(size, `${artW}x${artH}`, 'art size');
    const check = async (where) => {
      await frames(p, 4);
      const bad = await p.evaluate(() => { const G = window.__GAME__; const h = G.engine.hud; return G.layout.overflow(h.width, h.height).filter((r) => r.name !== 'dial').slice(0, 3).map((r) => `${r.name} "${r.text}" ${r.x},${r.y} ${r.w}x${r.h}`); });
      assert(!bad.length, `${where}: ${bad.join('; ')}`);
    };
    await p.evaluate(() => { window.__GAME__.layout.record = true; });
    await check('title');
    await p.keyboard.press('Enter');
    await check('main menu');
    await p.evaluate(() => { const G = window.__GAME__; G.store.create(0, 'Kimberly', { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' }); G.slot.phase = 'day'; G.slot.heardBeat = 7; });
    for (const [id, args] of [['hub', {}], ['activity', { id: 'warrior', mode: 'week', noPractice: true }], ['activity', { id: 'step', mode: 'week', noPractice: true }], ['medley', { family: [{ kind: 'keyboard' }, { kind: 'bot' }, { kind: 'bot' }, { kind: 'bot' }] }], ['records', {}], ['locker', {}]]) {
      await go(p, id, args);
      await check(`${id} ${args.id ?? ''}`);
      if (id === 'activity') { await p.keyboard.press('Enter'); await check(`${args.id} countdown`); await p.waitForFunction(() => window.__GAME__.scene.phase === 'play', null, { timeout: 30000 }); await check(`${args.id} play`); }
    }
    eq(errors.length, 0, errors.join(' | '));
    await p.context().close();
  });
}

await test('20 About: every section is there, and CREDITS.md is shipped in full and scrolls', async () => {
  const p = await page();
  await bootPage(p);
  await frames(p, 5);
  await p.keyboard.press('Enter');
  await frames(p, 4);
  await p.evaluate(() => { window.__GAME__.stack.top.menu.focus = 4; });
  await p.keyboard.press('Enter');
  await frames(p, 4);
  const info = await p.evaluate(() => {
    const s = window.__GAME__.stack.top;
    const titles = s.pages.map((pg) => pg.title);
    const text = (t) => s.pages.find((pg) => pg.title === t).rows.map((r) => r.h ?? r.t).join(' ');
    const answers = ['Testing Feedback', 'Engine Feedback', 'Prompt Feedback'].flatMap((t) => s.pages.find((pg) => pg.title === t).rows.filter((r) => r.t).map((r) => r.t));
    return { name: s.name, titles, answers, note: text('Please Note'), source: text('Source Information'), testing: text('Testing Feedback'), engine: text('Engine Feedback'), prompt: text('Prompt Feedback'), credits: text('CREDITS.md').length };
  });
  eq(info.name, 'about');
  for (const t of ['Credits', 'Please Note', 'Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Engine Kit Credits', 'CREDITS.md']) assert(info.titles.includes(t), `page ${t}`);
  assert(info.note.includes('This is not medical advice. Ounce is a scale.'), 'disclaimer');
  for (const f of ['Date', 'Source', 'Plan', 'Genre', 'Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage', 'added on import']) assert(info.source.includes(f), `field ${f}`);
  eq(info.answers.length, 14, 'answers');
  for (const a of info.answers) assert(a !== 'unknown' && a.length > 3, 'every answer filled in');
  assert(info.credits > 30000, `CREDITS.md text is ${info.credits} chars`);
  await p.evaluate(() => { const s = window.__GAME__.stack.top; s.i = s.pages.findIndex((pg) => pg.title === 'CREDITS.md'); });
  await frames(p, 3);
  await p.keyboard.down('ArrowDown');
  await frames(p, 30);
  await p.keyboard.up('ArrowDown');
  assert(await p.evaluate(() => window.__GAME__.stack.top.scroll > 3), 'it scrolls');
  await p.keyboard.press('ArrowRight');
  await frames(p, 3);
  eq(await p.evaluate(() => window.__GAME__.stack.top.i), 0, 'arrows page round');
  await p.context().close();
});

await test('5.4 Step Class on the real audio clock: it tracks the song in real time, and judging against it is exact', async () => {
  const p = await page();
  await bootPage(p);
  await p.mouse.click(640, 360); // unlocks audio
  await frames(p, 5);
  await go(p, 'activity', { id: 'step', mode: 'dropin', noPractice: true });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__GAME__.scene.phase === 'play', null, { timeout: 40000 });
  await p.waitForFunction(() => { const a = window.__GAME__.engine.audio; return a.song && a.song.start >= 0 && a.context?.state === 'running'; }, null, { timeout: 15000 });
  // Hands on a timer, not on rendered frames: software rendering on a shared machine is too slow to press to the frame.
  const r = await p.evaluate(() => new Promise((resolve) => {
    const G = window.__GAME__, s = G.scene, ev = s.event, lane = s.playerLane;
    const a = G.engine.audio;
    const t0 = performance.now(), c0 = s.beatClock();
    let i = ev.notes.findIndex((n) => n.t > c0 + 0.2), pressed = 0, last = c0, backwards = 0;
    const iv = setInterval(() => {
      const now = s.beatClock();
      if (now < last - 1e-6) backwards++;
      last = now;
      while (i < ev.notes.length && ev.notes[i].t <= now) {
        if (now - ev.notes[i].t < 0.04) { ev.press(lane, ev.notes[i].foot, now); pressed++; }
        i++;
      }
      if (performance.now() - t0 > 12000 || s.phase !== 'play') {
        clearInterval(iv);
        const st = lane.state;
        const expected = a.context.currentTime - a.song.start;
        resolve({ pressed, P: st.P, G: st.G, O: st.O, seconds: (performance.now() - t0) / 1000, clockRan: now - c0, clock: now, expected, offset: s.offset, stepTime: a.song.parsed.stepTime, backwards });
      }
    }, 4);
  }));
  near(r.stepTime * 16, (60 / 104) * 4, 1e-6, 'a bar of the song is a bar of the chart');
  // A slow frame makes the engine re-anchor the song, so the clock may step back with it: it stays with what you hear.
  assert(r.clockRan <= r.seconds + 0.25 && r.clockRan >= r.seconds * 0.5, `the clock runs in real time: ${r.clockRan} in ${r.seconds}`);
  near(r.clock, r.expected + r.offset, 0.02, 'the clock is the song');
  assert(r.pressed >= 4, `pressed ${r.pressed}`); // the opening bars are sparse: two notes a bar
  assert(r.P >= r.pressed * 0.9, `Perfect on the song's clock: ${JSON.stringify(r)}`);
  eq(errors.length, 0, errors.join(' | '));
  await p.context().close();
});

await test('5.4 Step Class: pause stops the song, resume counts in and restarts at the current bar, on the real clock', async () => {
  const p = await page();
  await bootPage(p);
  await p.mouse.click(640, 360);
  await frames(p, 5);
  await go(p, 'activity', { id: 'step', mode: 'dropin', noPractice: true });
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__GAME__.scene.phase === 'play', null, { timeout: 40000 });
  await p.waitForFunction(() => window.__GAME__.scene.localClock > 5, null, { timeout: 40000 });
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => window.__GAME__.stack.top?.name === 'pause', null, { timeout: 20000 });
  eq(await p.evaluate(() => window.__GAME__.engine.audio.song), null, 'the song stopped');
  const before = await p.evaluate(() => window.__GAME__.scene.localClock);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => !window.__GAME__.stack.open, null, { timeout: 20000 });
  const bar = (60 / 104) * 4;
  await p.waitForFunction(() => window.__GAME__.scene.counting <= 0 && window.__GAME__.engine.audio.song?.start >= 0, null, { timeout: 30000 });
  const after = await p.evaluate(() => { const s = window.__GAME__.scene; return { clock: s.beatClock(), order: window.__GAME__.engine.audio.song.def.order.length }; });
  assert(after.order <= 32 - Math.floor(before / bar), `song restarted at the bar: ${after.order} bars left`);
  assert(after.clock >= Math.floor(before / bar) * bar - 0.05, `clock ${after.clock} from ${before}`);
  await p.context().close();
});

await test('18 audio after a real click: an AnalyserNode on the destination reads non-silent, for SFX and for music', async () => {
  const p = await page();
  await bootPage(p);
  await p.mouse.click(640, 360);
  await frames(p, 20);
  const levels = await p.evaluate(async () => {
    const G = window.__GAME__; const a = G.engine.audio; const ctx = a.context;
    if (ctx.state !== 'running') await ctx.resume();
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    // Tap whatever goes out, at the buses' shared gain.
    a.buses.music.connect(an);
    a.buses.sfx.connect(an);
    const buf = new Float32Array(an.fftSize);
    const peak = async (ms) => { let m = 0; const end = performance.now() + ms; while (performance.now() < end) { an.getFloatTimeDomainData(buf); for (const v of buf) m = Math.max(m, Math.abs(v)); await new Promise((r) => setTimeout(r, 25)); } return m; };
    G.music('title');
    const music = await peak(2200);
    G.music(null);
    await new Promise((r) => setTimeout(r, 500));
    G.sfx('splash');
    const sfx = await peak(500);
    return { music, sfx, state: ctx.state, musicVol: a.volume.music };
  });
  eq(levels.state, 'running');
  assert(levels.music > 0.003, `music peak ${levels.music}`);
  assert(levels.sfx > 0.02, `sfx peak ${levels.sfx}`);
  await p.context().close();
});

await test('18 voice in an OfflineAudioContext: RMS over .02, and Ounce\'s mean pitch exceeds Coach\'s', async () => {
  const p = await page();
  await bootPage(p);
  const r = await p.evaluate(async () => {
    const { syllabify, renderVoice } = window.__GAME__.voiceApi;
    const render = async (who) => {
      const syl = syllabify('Thank you. I have written that down. Is that close?', who);
      const len = Math.max(1, syl[syl.length - 1].t + 0.4);
      const off = new OfflineAudioContext(1, Math.ceil(44100 * len), 44100);
      renderVoice(off, off.destination, syl, 0.01, who);
      const buf = await off.startRendering();
      const d = buf.getChannelData(0);
      let s = 0;
      for (let i = 1; i < d.length; i++) { s += d[i] * d[i]; }
      // Autocorrelation over the voiced part gives the pitch.
      const start = Math.floor(44100 * 0.02), n = 4096;
      let best = 0, bestLag = 1;
      for (let lag = 60; lag < 600; lag++) {
        let c = 0;
        for (let i = 0; i < n; i++) c += d[start + i] * d[start + i + lag];
        if (c > best) { best = c; bestLag = lag; }
      }
      return { rms: Math.sqrt(s / d.length), pitch: 44100 / bestLag, mean: syl.filter((x) => !x.tick).reduce((a, x) => a + x.f0, 0) / syl.filter((x) => !x.tick).length };
    };
    return { ounce: await render('ounce'), coach: await render('coach'), june: await render('june') };
  });
  assert(r.ounce.rms > 0.02, `ounce rms ${r.ounce.rms}`);
  assert(r.coach.rms > 0.02, `coach rms ${r.coach.rms}`);
  assert(r.ounce.mean > r.coach.mean, 'mean f0');
  assert(r.ounce.pitch > r.coach.pitch, `rendered pitch ${r.ounce.pitch} vs ${r.coach.pitch}`);
  await p.context().close();
});

await browser.close();
done();
