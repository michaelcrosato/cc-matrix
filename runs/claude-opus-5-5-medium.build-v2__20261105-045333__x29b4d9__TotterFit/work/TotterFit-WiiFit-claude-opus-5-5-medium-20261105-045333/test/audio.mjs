export default async function ({ T, openPage, getBrowser, RENDER }) {
  const b = await getBrowser(); const page = await openPage(b);
  const L = await page.evaluate(() => __TEST__.audioLists());
  const check = async (kind, name, sec, opts) => { const r = await page.evaluate(([k, n, s, o]) => __TEST__.audioRender(k, n, s, o), [kind, name, sec, opts || {}]); T.ok(r.finite, `${kind} ${name} not finite`); T.ok(r.rms > 1e-4, `${kind} ${name} silent, rms ${r.rms}`); T.ok(r.peak <= 1.01, `${kind} ${name} clipped, peak ${r.peak}`); T.note(`${kind} ${name} rms ${r.rms.toFixed(4)} peak ${r.peak.toFixed(3)} blips ${r.blips}`); return r; };
  for (const n of L.tracks) await check('track', n, 8);
  for (const n of L.stings) await check('sting', n, 3);
  for (const n of L.sfx) await check('sfx', n, 2.6);
  for (const n of L.inst) await check('inst', n, 1.2);
  const line = 'Please step on. Not on me. On the island! Would you like to?'; const pk = {};
  for (const n of L.voices) { const r = await check('voice', n, 8, { text: line }); T.ok(r.blips >= 8, `voice ${n} blips ${r.blips}`); pk[n] = r.peak; }
  const db = (v) => 20 * Math.log10(v); const ps = Object.values(pk).map(db); T.ok(Math.max(...ps) - Math.min(...ps) < 12, `voices unbalanced: ${JSON.stringify(pk)}`);
  // Live buses. A real context needs a gesture: Playwright clicks.
  await page.mouse.click(200, 200); await page.waitForTimeout(200);
  const live = await page.evaluate(async () => { const g = __TEST__.g; await g.audio.ctx.resume(); g.audio.setVolume('music', 100); g.audio.playTrack('cardio', { bpm: 112 }); g.audio.sfx('clatter'); g.audio.speak('trudy', 'Please step on. Not on me.'); await new Promise(r => setTimeout(r, 900)); const out = { music: g.audio.level('music'), sfx: g.audio.level('sfxBus'), voice: g.audio.level('voice'), state: g.audio.ctx.state }; g.audio.setVolume('music', 10); return out; });
  T.eq(live.state, 'running', 'context runs'); T.ok(live.music > 1e-4, `live music level ${live.music}`); T.ok(live.voice > 1e-5 || live.sfx > 1e-5, `live sfx/voice ${JSON.stringify(live)}`);
  const det = await page.evaluate(() => { const a = __TEST__.g.audio; a.tiltDeg = 0; const z = a.detuneAt(2.2); a.tiltDeg = 9; const n = a.detuneAt(2.2); return { z, n }; }); T.eq(det.z, 0, 'detune at level'); T.ok(Math.abs(det.n) > 1, 'detune off level');
  const fetched = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /\.(mp3|ogg|wav|m4a|flac)/.test(e.name)).length); T.eq(fetched, 0, 'no audio files fetched');
  // Foot click stands above the music at default settings.
  const click = await page.evaluate(async () => { const r = await __TEST__.audioRender('sfx', 'foot', .3, { gain: .8 }); const m = await __TEST__.audioRender('track', 'cardio', 4, { gain: .1 }); return { c: r.peak, m: m.peak }; }); T.ok(click.c > click.m * 2, `click readable over music: ${click.c} vs ${click.m}`);
  T.ok(!page.errors.length, `audio errors ${page.errors.slice(0, 2).join('|').slice(0, 300)}`);
  await page.context().close();
}
