// balance: a human-like bot (re-aims a few times a second, aims with error, never leads) stands in for a player
import { chromium } from 'playwright';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from '../tools/build.mjs';
function playOne(t, id, players = 1, seed = 9) {
  const { MT, game } = t.boot(); MT.newRun({ mode: 'rehearsal', diff: 'CONTESTANT', seed });
  for (let i = 0; i < players; i++) MT.addRunPlayer({ slot: i, ctl: 'bot', bot: { human: true } });
  let deaths = 0, primes = 0; MT.on('ev:died', () => deaths++); MT.on('ev:prime', () => primes++);
  game.go('play', { room: id }); game.advance(.4); const w = MT.play.world;
  for (let s = 0; s < 300 && !['CLEAR', 'EXIT', 'DONE'].includes(w.phase) && !(MT.play.overlay && MT.play.overlay.cont); s += .5) game.advance(.5);
  return { time: Math.round(w.time), deaths, primes, cleared: ['CLEAR', 'EXIT', 'DONE'].includes(w.phase), errors: game.errors.length };
}
export const suites = {
  balance(t) {
    let primes = 0;
    for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']) {
      const r = playOne(t, id); primes += r.primes;
      t.check(id + ': one human-like player clears it in 45-90 s', r.cleared && r.time >= 45 && r.time <= 90, r);
      t.check(id + ': with at most 2 deaths', r.deaths <= 2, r);
    }
    t.check('Prime Time comes at least once in Episode 1', primes >= 1, primes);
    const m = playOne(t, '1-B');
    t.check('Mashy: one human-like player beats him with lives to spare (90-200 s)', m.cleared && m.deaths <= 2 && m.time >= 90 && m.time <= 200, m);
    const m2 = playOne(t, '1-B', 2);
    t.check('Mashy with two players (HP scaled) is beaten too', m2.cleared && m2.time <= 200, m2);
  },
  async 'audio-browser'(t) {
    const url = pathToFileURL(join(t.root, '..', OUT + '.html')).href + '?audio=1';
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    try {
      const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(url); await p.waitForTimeout(1200); await p.mouse.click(200, 200); await p.keyboard.press('KeyX'); await p.waitForTimeout(300);
      const r = await p.evaluate(async () => {
        const A = MT.game.audio; A._init(); const c = A.ctx; if (c.state !== 'running') await c.resume();
        const an = c.createAnalyser(); an.fftSize = 4096; A._master.connect(an); const buf = new Float32Array(an.fftSize);
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const measure = async ms => { let sum = 0, n = 0, peak = 0; const end = performance.now() + ms; while (performance.now() < end) { an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; n++; peak = Math.max(peak, Math.abs(v)); } await wait(30); } return { rms: Math.sqrt(sum / n), peak }; };
        const pitch = () => {   // normalized autocorrelation; the first strong peak (guards against octave errors)
          an.getFloatTimeDomainData(buf); const sr = c.sampleRate, lo = Math.floor(sr / 600), hi = Math.floor(sr / 55), N = 2048, R = [];
          let e0 = 0; for (let i = 0; i < N; i++) e0 += buf[i] * buf[i]; if (e0 < 1e-5) return 0;
          for (let lag = lo; lag < hi; lag++) { let s = 0, e1 = 0; for (let i = 0; i < N; i++) { s += buf[i] * buf[i + lag]; e1 += buf[i + lag] * buf[i + lag]; } R[lag] = s / Math.sqrt(e0 * e1 + 1e-12); }
          let mx = 0; for (let lag = lo; lag < hi; lag++) mx = Math.max(mx, R[lag]);
          for (let lag = lo + 1; lag < hi - 1; lag++) if (R[lag] >= mx * .88 && R[lag] >= R[lag - 1] && R[lag] >= R[lag + 1]) return sr / lag;
          return 0; };
        const out = { state: c.state, songs: {}, sfxSilent: [], voices: {} };
        A.musicVolume = .5; A.volume = .7; A.applyVolume();
        for (const id in MT.SONGS) { MT.music.play(id, { fade: 0, restart: true }); await wait(250); out.songs[id] = await measure(1200); }
        MT.music.play(null, { fade: 0 }); await wait(400);
        for (const k of Object.keys(MT.SFX)) { MT.sfx(k); const m = await measure(220); if (m.rms < .002) out.sfxSilent.push(k); await wait(40); }
        await wait(400);
        // the voices' pitch, as scheduled on the real oscillators, and their brightness (spectral centroid) as heard
        const mkO = c.createOscillator.bind(c); let rec = null;
        c.createOscillator = () => { const o = mkO(), sv = o.frequency.setValueAtTime.bind(o.frequency); o.frequency.setValueAtTime = (v, t2) => { if (rec && o.type !== 'sine') rec.push(v); return sv(v, t2); }; return o; };
        const fb = new Float32Array(an.frequencyBinCount), centroid = () => { an.getFloatFrequencyData(fb); let a = 0, w = 0; for (let i = 2; i < fb.length; i++) { const m = Math.pow(10, fb[i] / 20); a += m * i; w += m; } return w ? a / w * c.sampleRate / an.fftSize : 0; };
        out.bright = {};
        for (const v of ['lance', 'penny', 'annc', 'network', 'mashy']) { rec = []; MT.babble.say('AAAH OOOH AAAH OOOH AAAH OOOH AAAH', v); const f0 = rec.slice().sort((a, b) => a - b); rec = null; out.voices[v] = Math.round(f0[Math.floor(f0.length / 2)] || 0); await wait(120); const cs = []; for (let i = 0; i < 8; i++) { cs.push(centroid()); await wait(60); } cs.sort((a, b) => a - b); out.bright[v] = Math.round(cs[4]); await wait(900); }
        c.createOscillator = mkO;
        out.errors = MT.game.errors.map(e => e.message); return out;
      });
      t.check('the audio context runs after a key press', r.state === 'running', r.state);
      for (const id in r.songs) t.check('song ' + id + ' is audible and does not clip', r.songs[id].rms > .01 && r.songs[id].peak < 1, r.songs[id]);
      t.check('every sound effect makes sound', !r.sfxSilent.length, r.sfxSilent);
      t.check('Penny\'s voice is pitched well above Lance\'s', r.voices.penny > r.voices.lance * 1.6, r.voices);
      t.check('the Announcer and The Network are the lowest voices', r.voices.annc < r.voices.lance && r.voices.network < r.voices.annc, r.voices);
      t.check('every voice is heard (a real spectrum)', Object.values(r.bright).every(v => v > 100), r.bright);
      t.check('no audio errors', !r.errors.length && !errs.length, [r.errors, errs]);
      t.audioReport = r;
      if (process.env.AUDIO_REPORT) console.log(JSON.stringify(r));
    } finally { await b.close(); }
  },
};
