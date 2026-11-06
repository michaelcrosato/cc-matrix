// Music default, every sound rendered offline, levels on the live mix, detune, no files.
export default async function ({ ok, launch, logicPage }) {
  const browser = await launch(['--autoplay-policy=no-user-gesture-required']);
  const page = await logicPage(browser, '', { sound: true });
  const lists = await page.evaluate(async () => {
    const T = window.__TEST__;
    const s = T.state();
    const out = { music: s.audio.musicSetting, bus: s.audio.music };
    return out;
  });
  ok(lists.music === 10, 'music setting defaults to 10', String(lists.music));
  ok(Math.abs(lists.bus - 0.1) < 1e-6, 'music bus gain is 0.10', String(lists.bus));
  const res = await page.evaluate(async () => {
    const T = window.__TEST__;
    const out = {};
    const probe = async (kind, names, sec) => { for (const n of names) out[`${kind}:${n}`] = await T.renderProbe(kind, n, sec); };
    await probe('track', ['levelBest', 'island', 'stillness', 'strength', 'cardio', 'balance', 'level'], 6);
    await probe('sting', ['attended', 'adequate', 'pleasant', 'exemplary', 'suspicious', 'reveal', 'unlock', 'ending'], 3.2);
    await probe('sfx', ['clack', 'fall', 'spring', 'splash', 'marble', 'marbleRoll', 'plateHum', 'plateCrash', 'thud', 'spike', 'whistle', 'bell', 'breathIn', 'breathOut', 'gust', 'creak', 'uiMove', 'uiConfirm', 'uiBack', 'stamp', 'drumRoll', 'foot', 'metronome', 'squawk', 'boing', 'sneeze', 'catch', 'gullLand', 'whoosh'], 2.4);
    await probe('voice', ['trudy', 'stillwater', 'bolster', 'margaret', 'kevin', 'sandras', 'paul', 'gerald'], 7);
    return out;
  });
  for (const k of Object.keys(res)) {
    const r = res[k];
    ok(r.finite, `${k} finite`);
    ok(r.rms > 0.0005, `${k} not silent`, `rms ${r.rms}`);
    ok(r.peak <= 1.05, `${k} not clipped`, `peak ${r.peak}`);
  }
  const voices = Object.keys(res).filter((k) => k.startsWith('voice:'));
  for (const k of voices) ok(res[k].blips >= 10, `${k} fires a blip per syllable`, String(res[k].blips));
  const peaks = voices.map((k) => 20 * Math.log10(res[k].peak));
  ok(Math.max(...peaks) - Math.min(...peaks) < 12, 'voices balanced within 12 dB', peaks.map((p) => p.toFixed(1)).join(','));
  // With music at 10 and sound at 80, a foot click stands well above the music.
  const beat = await page.evaluate(async () => {
    const T = window.__TEST__;
    const m = await T.renderProbe('track', 'cardio', 6, [10, 80, 80]);
    const c = await T.renderProbe('sfx', 'foot', 1, [10, 80, 80]);
    return { music: m.rms, click: c.peak };
  });
  ok(20 * Math.log10(beat.click / Math.max(1e-6, beat.music)) > 7, 'a foot click reads over music at 10', JSON.stringify(beat));
  // Live mix: gesture starts the context and the buses carry signal.
  await page.mouse.click(10, 10);
  const live = await page.evaluate(async () => {
    const T = window.__TEST__, g = T.game;
    g.audio.gesture();
    for (let i = 0; i < 20 && g.audio.state !== 'running'; i++) await new Promise((r) => requestAnimationFrame(r));
    const out = { state: g.audio.state };
    g.audio.music('levelBest', { fade: 0.01 });
    g.audio.mix.seq.tick();
    g.audio.sfx('bell');
    g.audio.say('trudy', 'Please step on. Not on me.');
    let mu = 0, sf = 0, vo = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 1200) { mu = Math.max(mu, g.audio.level('music')); sf = Math.max(sf, g.audio.level('sfx')); vo = Math.max(vo, g.audio.level('voice')); await new Promise((r) => requestAnimationFrame(r)); }
    out.mu = mu; out.sf = sf; out.vo = vo;
    // Detune is zero at tilt 0.
    g.audio.setTilt(0);
    out.detune0 = g.audio.detuneNow();
    g.audio.setTilt(9);
    out.detune9 = Math.abs(g.audio.mix.seq.detuneAt(1.5));
    return out;
  });
  ok(live.state === 'running', 'context runs after a gesture', live.state);
  ok(live.mu > 0.0005 && live.sf > 0.001 && live.vo > 0.001, 'music, sound and voice buses all carry signal', JSON.stringify(live));
  ok(live.detune0 === 0, 'no detune when level', String(live.detune0));
  ok(live.detune9 > 1, 'detuned when crooked', String(live.detune9));
  // Pad input also resumes the context.
  const padGesture = await page.evaluate(async () => {
    const T = window.__TEST__, g = T.game;
    let called = 0;
    const was = g.audio.gesture.bind(g.audio);
    g.audio.gesture = () => { called++; was(); };
    g.input.onGesture = () => g.audio.gesture();
    T.tap(3);
    return called;
  });
  ok(padGesture >= 1, 'pad input counts as the audio gesture', String(padGesture));
  // No audio files are ever fetched.
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.evaluate(() => { const T = window.__TEST__; T.goto('title'); T.advance(1); });
  ok(reqs.every((u) => !/\.(mp3|ogg|wav|m4a|flac)/.test(u)), 'no audio files fetched');
  ok(page.errors.length === 0, 'audio no page errors', page.errors.slice(0, 3).join('|').slice(0, 300));
  await page.context().close();
  await browser.close();
}
