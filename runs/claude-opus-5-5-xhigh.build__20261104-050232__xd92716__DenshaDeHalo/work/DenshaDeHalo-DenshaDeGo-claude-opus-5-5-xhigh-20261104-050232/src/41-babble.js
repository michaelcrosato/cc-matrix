/* 41-babble: gibberish voices in the Animalese / Simlish way. Each word becomes consonant-vowel syllables from a hash
 * of the word (the same line always sounds the same), about one syllable for two letters, with Japanese-like sounds;
 * punctuation shapes the pitch (? rises, ! stresses and falls, . drops, , pauses; capitals stress). Each syllable: a
 * consonant burst (noise through a band by consonant class), then a vowel (a pulse or saw at f0 through two formant
 * bands, a scaled by the voice's size), 6 ms attack, 30 ms release, on the engine's sfx bus. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, A = game.audio;
const CONS = ['k', 's', 't', 'n', 'h', 'm', 'r', 'g', 'z', 'd', 'b', 'p', 'sh', 'ch', 'ts', 'y', 'w', ''];
const VOW = ['a', 'i', 'u', 'e', 'o'];
const FORM = { a: [800, 1200], i: [300, 2300], u: [350, 1300], e: [500, 1900], o: [500, 900] };
const BURST = { k: 2400, g: 1800, s: 6000, sh: 4200, z: 4800, t: 3500, d: 2800, ts: 5200, ch: 4000, n: 400, m: 300, h: 1600, b: 600, p: 900, r: 1200, y: 2200, w: 500, '': 0 };
DH.VOICES = {
  hoshino: { f0: 95, rate: 9, src: 'sawtooth', size: .92, contour: -1 }, mika: { f0: 260, rate: 13, src: 'pulse', duty: .25, size: 1.12, contour: .6 },
  pa: { f0: 190, rate: 10, src: 'pulse', duty: .3, size: 1.05, contour: 0, pa: true }, haro: { f0: 420, rate: 14, src: 'pulse', duty: .12, size: 1.3, contour: .8, wobble: 3 },
  driver: { f0: 150, rate: 11, src: 'square', size: 1, contour: -.3, loud: true }, kota: { f0: 340, rate: 13, src: 'pulse', duty: .3, size: 1.25, contour: .7 },
  fuji: { f0: 230, rate: 8, src: 'triangle', size: 1.08, contour: -.4 }, kenji: { f0: 140, rate: 15, src: 'sawtooth', size: .98, contour: .3 },
  ren: { f0: 165, rate: 12, src: 'square', size: 1, contour: .5 }, sato: { f0: 110, rate: 8, src: 'sawtooth', size: .9, contour: -.8 },
  ota: { f0: 120, rate: 9, src: 'square', size: .94, contour: -.5 }, crowd: { f0: 200, rate: 10, src: 'triangle', size: 1, contour: 0 }
};
/** the syllables of a text: [{ c, v, stress, pitch (semitones), pause (s after) }] (deterministic) */
function syllabify(text, voice = 'pa') {
  const V = DH.VOICES[voice] || DH.VOICES.pa, out = [], words = String(text).split(/(\s+)/).filter(w => w.trim());
  words.forEach((w, wi) => {
    const clean = w.replace(/[^A-Za-z0-9']/g, ''), punct = w.replace(/[A-Za-z0-9']/g, ''), h = DH.hash(clean.toLowerCase()), n = Math.max(1, Math.round(clean.length / 2));
    const r = E.rng(h || 7), caps = /^[A-Z]/.test(clean);
    for (let i = 0; i < n; i++) {
      const last = i === n - 1, decl = -wi / Math.max(1, words.length) * 2 * (V.contour < 0 ? 1.4 : .6);
      let pitch = decl + (r() - .5) * 2 + (caps && i === 0 ? 2 : 0) + (V.contour || 0) * (wi === words.length - 1 && last ? 2 : 0);
      let pause = 0;
      if (last) { if (punct.includes('?')) pitch += 4; if (punct.includes('!')) pitch += 2.5; if (punct.includes('.') || punct.includes('…')) pitch -= 2; if (/[,.!?…]/.test(punct)) pause = punct.includes(',') ? .12 : .22; }
      out.push({ c: CONS[Math.floor(r() * CONS.length)], v: VOW[Math.floor(r() * VOW.length)], stress: caps && i === 0 || punct.includes('!') && last, pitch, pause: pause + (last ? .04 : 0) });
    }
  });
  return out;
}
DH.syllabify = syllabify;
class Babble {
  constructor() { this.live = []; this._pulse = {}; }
  wave(c, duty) { if (this._pulse[duty]) return this._pulse[duty]; const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) { const a = 2 / (n * Math.PI) * Math.sin(n * Math.PI * duty); re[n] = a * Math.cos(n * Math.PI * duty); im[n] = a * Math.sin(n * Math.PI * duty); } return (this._pulse[duty] = c.createPeriodicWave(re, im)); }
  /** speak a line; o: { vol, onDone } -> its length in seconds */
  say(text, voice = 'pa', o = {}) {
    const syl = syllabify(text, voice), V = DH.VOICES[voice] || DH.VOICES.pa; let len = 0; for (const s of syl) len += 1 / V.rate + s.pause;
    if (game.headless || A.failed || !A.ctx || A.muted) return len;
    const c = A.ctx, bus = A.bus && A.bus('sfx'); if (!bus || c.state !== 'running') return len;
    this.stop();
    const out = c.createGain(); out.gain.value = (o.vol || 1) * (V.loud ? .5 : .38);
    if (V.pa) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = .5; const dl = c.createDelay(.3); dl.delayTime.value = .12; const fb = c.createGain(); fb.gain.value = .25; out.connect(bp); bp.connect(bus); bp.connect(dl); dl.connect(fb); fb.connect(bus); }
    else out.connect(bus);
    let t = c.currentTime + .03; const nb = A.noiseBuffer(), dur = 1 / V.rate;
    for (const s of syl) {
      const f0 = V.f0 * Math.pow(2, (s.pitch + (V.wobble ? Math.sin(t * 20) * V.wobble * .3 : 0)) / 12), d = dur * (s.stress ? 1.15 : 1);
      if (s.c && BURST[s.c]) { const src = c.createBufferSource(); src.buffer = nb; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = BURST[s.c]; f.Q.value = 1.4; const gg = c.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.22, t + .004); gg.gain.exponentialRampToValueAtTime(.001, t + .03); src.connect(f); f.connect(gg); gg.connect(out); src.start(t, (t * 7.3) % .5); src.stop(t + .04); }
      const vt = t + (s.c ? .022 : 0), osc = c.createOscillator();
      if (V.src === 'pulse') osc.setPeriodicWave(this.wave(c, V.duty || .25)); else osc.type = V.src;
      osc.frequency.setValueAtTime(f0, vt); osc.frequency.linearRampToValueAtTime(f0 * (s.stress ? .94 : .985), vt + d);
      const [F1, F2] = FORM[s.v], f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), gv = c.createGain(), mixer = c.createGain();
      f1.type = f2.type = 'bandpass'; f1.frequency.value = F1 * V.size; f2.frequency.value = F2 * V.size; f1.Q.value = 5; f2.Q.value = 7;
      gv.gain.setValueAtTime(0, vt); gv.gain.linearRampToValueAtTime(s.stress ? 1 : .8, vt + .006); gv.gain.setValueAtTime(s.stress ? 1 : .8, vt + Math.max(.01, d - .03)); gv.gain.linearRampToValueAtTime(0, vt + d);
      osc.connect(f1); osc.connect(f2); f1.connect(mixer); f2.connect(mixer); mixer.gain.value = 1.6; mixer.connect(gv); gv.connect(out);
      osc.start(vt); osc.stop(vt + d + .02); this.live.push(osc);
      t += d + s.pause;
    }
    if (this.live.length > 400) this.live = this.live.slice(-200);
    return len;
  }
  stop() { if (!A.ctx) return; const now = A.ctx.currentTime; for (const o of this.live) try { o.stop(now + .01); } catch (e) { /* already stopped */ } this.live = []; }
}
DH.Babble = new Babble();
/** a Dialog voice hook: each typed character of a word starts that word's syllables once */
DH.dialogVoice = voice => { let lastWord = -1; return (ch, k, text) => { if (k === 0) lastWord = -1; const before = text.slice(0, k + 1), wi = before.split(/\s+/).length - 1; if (wi !== lastWord && /\w/.test(ch || '')) { lastWord = wi; const w = text.split(/\s+/)[wi] || ''; DH.Babble.sayWord && DH.Babble.sayWord(w, voice); } }; };
DH.Babble.sayWord = function (w, voice) { const keep = this.live; this.live = []; this.say(w, voice, { vol: .9 }); this.live = keep.concat(this.live); };
})();
