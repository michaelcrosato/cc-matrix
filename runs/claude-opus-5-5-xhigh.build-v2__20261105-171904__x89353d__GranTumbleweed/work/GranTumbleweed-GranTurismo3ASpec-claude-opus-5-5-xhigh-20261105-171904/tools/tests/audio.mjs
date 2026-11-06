// The sound, measured. enginesynth rendered offline: non-silent, centroid rises with rpm. The live mix in a race. Music at 10% well under effects.
import { suite } from './_lib.mjs';
import { launch, open, waitFor } from './_browser.mjs';
import { renderSound } from '../../src/pixel-engine.js';
import { SONGS } from '../../src/game/data/songs.js';
import { SFX } from '../../src/game/audio/sfx.js';
const t = suite(), b = await launch();
const { page, errors, ctx } = await open(b);
await page.waitForTimeout(1000); await page.keyboard.press('KeyK'); await page.waitForTimeout(300);
t.ok(await page.evaluate(() => window.__APP__.mix.audio.unlocked), 'a key unlocks sound');
const render = await page.evaluate(async () => {
  const { EngineSynthClass } = window.__APP__.mix.testHooks();
  const renderAt = async (rpm, throttle) => { const c = new OfflineAudioContext(1, 22050, 44100), s = new EngineSynthClass(c, c.destination, { cylinders: 6, filter: 1400, exhaust: 1, turbo: false, sportExhaust: false, redline: 8000, idle: 900 }); s.set({ rpm, throttle, gain: 1, pan: 0 }); const buf = await c.startRendering(), d = buf.getChannelData(0); let rms = 0; for (const v of d) rms += v * v; rms = Math.sqrt(rms / d.length); const N = 2048, seg = d.subarray(8000, 8000 + N); let num = 0, den = 0; for (let f = 40; f < 9000; f *= 1.08) { const w0 = (2 * Math.PI * f) / 44100; let re = 0, im = 0; for (let i = 0; i < N; i++) { const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N); re += seg[i] * w * Math.cos(w0 * i); im += seg[i] * w * Math.sin(w0 * i); } const m = re * re + im * im; num += m * f; den += m; } return { rms, centroid: num / (den || 1) }; };
  return { low: await renderAt(1500, 0.7), high: await renderAt(7500, 0.7), lift: await renderAt(7500, 0) };
});
t.ok(render.low.rms > 0.005, `engine is not silent at low rpm: ${render.low.rms}`); t.ok(render.high.rms > 0.005, 'nor at high rpm'); t.ok(render.high.centroid > render.low.centroid * 1.3, `spectral centroid rises with rpm: ${render.low.centroid.toFixed(0)} to ${render.high.centroid.toFixed(0)}`); t.ok(render.high.rms > render.lift.rms, 'throttle is louder than lift');
// The engine sound's rules, each one rendered and measured.
const rules = await page.evaluate(async () => {
  const { EngineSynthClass } = window.__APP__.mix.testHooks();
  const data = (o) => ({ cylinders: 6, filter: 1400, exhaust: 1, turbo: false, sportExhaust: false, redline: 8000, idle: 900, ...o });
  const render = async (o, set, secs = 0.5, frames = 1) => { const c = new OfflineAudioContext(1, 44100 * secs, 44100), s = new EngineSynthClass(c, c.destination, data(o)); for (let k = 0; k < frames; k++) s.set({ rpm: 4000, throttle: 0.7, spool: 0, gain: 1, pan: 0, dt: 1 / 60, ...set }); const b = await c.startRendering(), a = b.getChannelData(0); let e = 0; for (let i = 8000; i < a.length; i++) e += a[i] * a[i]; const rms = Math.sqrt(e / (a.length - 8000));
    const band = (f0, f1) => { const N = 8192, off = a.length - N; let sum = 0; for (let f = f0; f <= f1; f += 25) { let re = 0, im = 0; const w = (2 * Math.PI * f) / 44100; for (let i = 0; i < N; i++) { const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N), v = a[off + i] * h; re += v * Math.cos(w * i); im += v * Math.sin(w * i); } sum += Math.hypot(re, im); } return sum; };
    let peakF = 0, best = 0; const N = 8192, off = a.length - N; for (let f = 40; f <= 900; f += 5) { let re = 0, im = 0; const w = (2 * Math.PI * f) / 44100; for (let i = 0; i < N; i++) { const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N), v = a[off + i] * h; re += v * Math.cos(w * i); im += v * Math.sin(w * i); } const m = Math.hypot(re, im); if (m > best) { best = m; peakF = f; } } return { rms, peakF, high: band(4700, 5100), mid: band(3000, 3400) }; };
  const open = await render({}, { throttle: 1 }), shut = await render({}, { throttle: 0 });
  const three = await render({ cylinders: 3 }), v8 = await render({ cylinders: 8 }), v12 = await render({ cylinders: 12 });
  const quiet = await render({ turbo: true }, { spool: 0 }), whistle = await render({ turbo: true }, { spool: 1 }), half = await render({ turbo: true }, { spool: 0.5 });
  // The limiter stutters: the gain moves frame by frame at the redline, and holds still below it.
  const limit = (rpm) => { const c = new OfflineAudioContext(1, 4410, 44100), s = new EngineSynthClass(c, c.destination, data({ redline: 7000 })), seen = new Set(); for (let k = 0; k < 40; k++) { s.set({ rpm, throttle: 1, spool: 0, gain: 1, pan: 0, dt: 1 / 60 }); seen.add(Math.round((s.limT ?? 0) * 100)); seen.add(s.limOn ? 1 : 0); } return seen.size; };
  // Overrun crackle only with the sport exhaust.
  const crack = (sport) => { const c = new OfflineAudioContext(1, 4410, 44100), s = new EngineSynthClass(c, c.destination, data({ sportExhaust: sport })); for (let k = 0; k < 20; k++) s.set({ rpm: 6500, throttle: 1, spool: 0, gain: 1, pan: 0, dt: 1 / 60 }); for (let k = 0; k < 120; k++) s.set({ rpm: 6000, throttle: 0, spool: 0, gain: 1, pan: 0, dt: 1 / 60 }); return s.crackle ?? 0; };
  return { open: open.rms, shut: shut.rms, three: three.peakF, v8: v8.peakF, v12: v12.peakF, quiet: quiet.high, whistle: whistle.high, halfMid: half.mid, quietMid: quiet.mid, limitHi: limit(7000), limitLo: limit(4000), crackOn: crack(true), crackOff: crack(false) };
});
t.ok(rules.open > rules.shut * 1.5, `full throttle is louder than a closed one: ${rules.open.toFixed(3)} against ${rules.shut.toFixed(3)}`);
// f0 = rpm / 60 x cylinders / 2, and the square at f0 / 2 carries the most.
t.near(rules.three, 50, 6, `three cylinders at 4,000 rpm: f0 is 100 Hz, the square under it 50: ${rules.three}`); t.near(rules.v8, 133.3, 8, `eight: f0 is 267 Hz, the square 133: ${rules.v8}`); t.near(rules.v12, 200, 8, `twelve: f0 is 400 Hz, the square 200: ${rules.v12}`);
t.ok(rules.whistle > rules.quiet * 1.2, `a spooled turbo whistles: ${rules.quiet.toFixed(1)} against ${rules.whistle.toFixed(1)}`); t.ok(rules.halfMid > rules.quietMid * 1.05, `and the whistle rises with spool: ${rules.quietMid.toFixed(1)} against ${rules.halfMid.toFixed(1)}`);
t.ok(rules.limitHi > rules.limitLo, `the limiter stutters at the redline: ${rules.limitHi} against ${rules.limitLo}`);
t.ok(rules.crackOn > 0, `overrun crackle with the sport exhaust: ${rules.crackOn}`); t.eq(rules.crackOff, 0, 'and none without it');
// Voice and songs render to sound.
const voice = await page.evaluate(async () => { const { speak, noiseBuffer } = window.__APP__.mix.testHooks(); const c = new OfflineAudioContext(1, 44100 * 3, 44100), n = noiseBuffer(c), s = speak(c, c.destination, n, 'THANK YOU. THAT WAS CORRECT.', 'arai', 0.5), d = (await c.startRendering()).getChannelData(0); let e = 0; for (const v of d) e = Math.max(e, Math.abs(v)); const c2 = new OfflineAudioContext(1, 44100 * 3, 44100); speak(c2, c2.destination, noiseBuffer(c2), 'THANK YOU. THAT WAS CORRECT.', 'arai', 0.5); const d2 = (await c2.startRendering()).getChannelData(0); let same = true; for (let i = 0; i < d.length; i += 97) if (Math.abs(d[i] - d2[i]) > 1e-4) { same = false; break; } return { peak: e, same, until: s.until }; });
t.ok(voice.peak > 0.01, `a voice is audible: ${voice.peak}`); t.ok(voice.same, 'the same words make the same sound');
// A race: analyser on the live mix is non-silent; counts move.
await page.evaluate(() => window.__APP__.startQuick({ track: 'kestrel', carId: 'ginga', laps: 1, field: 3, difficulty: 'normal' })); await waitFor(page, () => window.__GAME__.state().scene === 'race', null, 60000); await page.keyboard.down('KeyW'); await page.waitForTimeout(6000);
const level = await page.evaluate(() => { const m = window.__APP__.mix; return { lvl: m.level(), loops: m.audio.loops.length, loopPitch: m.loopVoices?.[0]?.settings.pitch, synths: m.synths.length, master: m.master.gain.value, rpm: m.synths[0]?.synth.lastRpm, counts: m.audio.counts, musicVol: m.audio.volume.music, playing: m.audio.playing }; });
t.ok(level.lvl > 0.005, `the live mix is non-silent in a race: ${level.lvl}`); t.ok(level.synths >= 1, 'engine voices run'); t.ok(level.loops >= 1 && Number.isFinite(level.loopPitch), `other cars are looping voices pitched by rpm: ${level.loops}, ${level.loopPitch}`); t.ok(level.rpm > 1000, `the synth follows the car: ${level.rpm}`); t.near(level.musicVol, 0.1, 1e-6, 'music stays at 10% in a race'); t.ok(level.playing, 'race music plays');
const kicks = await page.evaluate(async () => { const s = window.__APP__.scene, sim = s.sim, a = window.__APP__; sim.events.push({ type: 'shift', car: sim.players[0].i, up: true }, { type: 'kerb', car: sim.players[0].i }, { type: 'wallHit', car: sim.players[0].i, v: 5 }); a.mix.say('THE LIGHTS ARE ON THE GANTRY.', 'dell'); await new Promise((r) => setTimeout(r, 400)); return a.mix.audio.counts; });
t.ok((kicks.gear ?? 0) >= 1, 'gear shifts are counted'); t.ok((kicks.kerb ?? 0) >= 1, 'kerbs are counted'); t.ok((kicks.thump ?? 0) + (kicks.thumpBig ?? 0) >= 1, 'wall hits are counted'); t.ok((kicks.voice ?? 0) >= 1, 'voices are counted');
await page.keyboard.up('KeyW');
// Tyres squeal: a handbrake slide at speed.
await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await page.keyboard.down('Space'); await page.keyboard.down('KeyD'); await waitFor(page, () => (window.__APP__.mix.audio.counts.tyre ?? 0) >= 1, null, 15000).catch(() => {}); await page.keyboard.up('Space'); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
{ const n = await page.evaluate(() => window.__APP__.mix.audio.counts.tyre ?? 0); t.ok(n >= 1, `tyre squeal is counted: ${n}`); }
// Music at 10% is well under effects: every song's loudest instrument, rendered and scaled to 10%, against a wall thump at full effects.
{ const peak = (a) => { let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); return m; }, thump = peak(renderSound(SFX.thump)); for (const [id, s] of Object.entries(SONGS)) { const loudest = Math.max(...Object.values(s.tracks).map((k) => peak(renderSound({ ...k, freq: k.wave === 'noise' ? 4000 : 220, sustain: 0.1 })))); t.ok(loudest * 0.1 < thump * 0.2, `${id} at 10% is well under a thump: ${(loudest * 0.1).toFixed(3)} against ${thump.toFixed(3)}`); } }
const mixLevels = await page.evaluate(() => { const a = window.__APP__.mix.audio, v = a.volume; return { music: v.master * v.music, sfx: v.master * v.sfx }; }); t.ok(mixLevels.music < mixLevels.sfx * 0.2, `music is far under effects: ${JSON.stringify(mixLevels)}`);
{ const { engineData } = await import('../../src/game/audio/mix.js').catch(() => ({})); if (engineData) { const { PHYSICS } = await import('../../src/game/data/cars.js'); const cyl = (id) => engineData(id, PHYSICS[id]).cylinders; t.eq(cyl('pico'), 3, 'the Pico has three cylinders'); t.eq(cyl('longhorn'), 8, 'the Longhorn a V8'); t.eq(cyl('corsa'), 10, 'the Corsa a V10'); t.eq(cyl('type9'), 12, 'the Type 9 a V12'); } }
t.eq(errors.filter((e) => !/vertex count of 0/.test(e)).length, 0, `audio page errors: ${errors.slice(0, 3).join(' | ')}`);
await ctx.close(); await b.close();
t.done();
