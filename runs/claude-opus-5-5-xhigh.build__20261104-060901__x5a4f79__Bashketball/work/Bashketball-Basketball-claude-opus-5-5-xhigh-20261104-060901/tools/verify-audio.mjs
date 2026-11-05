// Audio check in Chromium (I can't listen, so measure): tap the engine's master output with an analyser and a
// recorder, play the title song, a gibberish voice line, a slam and the crowd bed, and report each one's level and
// spectral centroid; save the recording as check-output/audio-sample.webm for a person to listen to.
import { chromium } from 'playwright'; import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1500); await p.keyboard.press('KeyA'); await p.waitForTimeout(400);
const res = await p.evaluate(async () => {
  const bb = window.__bb, A = bb.game.audio, c = A.ctx, an = c.createAnalyser(); an.fftSize = 4096; A._master.connect(an);
  const dest = c.createMediaStreamDestination(); A._master.connect(dest); const rec = new MediaRecorder(dest.stream); const chunks = []; rec.ondataavailable = e => chunks.push(e.data); rec.start();
  const buf = new Float32Array(an.fftSize), spec = new Float32Array(an.frequencyBinCount), wait = ms => new Promise(r => setTimeout(r, ms));
  const measure = async ms => { let rms = 0, n = 0, cen = 0, cw = 0; const end = performance.now() + ms; while (performance.now() < end) { an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; rms += Math.sqrt(s / buf.length); n++; an.getFloatFrequencyData(spec); for (let i = 1; i < spec.length; i++) { const m = Math.pow(10, spec[i] / 20); cen += m * i * c.sampleRate / an.fftSize; cw += m; } await wait(50); } return { rms: +(rms / n).toFixed(4), centroidHz: Math.round(cen / Math.max(1e-9, cw)) }; };
  const out = {}; out.silence = await measure(300);
  bb.playMusic('title', { restart: true }); out.titleSong = await measure(2500);
  A.music(null); await wait(400); out.afterStop = await measure(300);
  bb.Voice.say('GOOD EVENING, BALL FANS! THIS IS CHANNEL BLAM!', 'vinnie'); out.voiceVinnie = await measure(1800);
  bb.Voice.say('NO FOULS! NO MERCY! ALL BLAM!', 'deedee'); out.voiceDeeDee = await measure(1500);
  bb.Voice.say('BEEP. YOUR. CAREER. IS. DEPRECATED.', 'dunkatron'); out.voiceRobot = await measure(1800);
  bb.sfx('slam'); out.slam = await measure(500);
  bb.sfx('shatter'); out.shatter = await measure(600);
  bb.playMusic('dome', { restart: true }); out.domeSong = await measure(2500);
  rec.stop(); await wait(300); const blob = new Blob(chunks, { type: 'audio/webm' }), bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { out, state: c.state, webm: btoa(bin) };
});
writeFileSync('check-output/audio-sample.webm', Buffer.from(res.webm, 'base64'));
console.log('AudioContext:', res.state); for (const [k, v] of Object.entries(res.out)) console.log(k.padEnd(12), JSON.stringify(v));
console.log('recording: check-output/audio-sample.webm', Buffer.from(res.webm, 'base64').length, 'bytes; page errors:', errs.length ? errs : 'none'); await b.close();
