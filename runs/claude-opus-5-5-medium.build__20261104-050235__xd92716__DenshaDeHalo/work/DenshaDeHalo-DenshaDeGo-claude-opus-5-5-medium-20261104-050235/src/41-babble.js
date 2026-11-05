/* DENSHA DE HALO! · Babble: gibberish voices in the Animalese / Simlish style. Each word becomes Japanese-like CV
 * syllables from a hash of the word (the same line always sounds the same); punctuation shapes the pitch (? rises,
 * ! stresses and falls, . drops, , pauses); each syllable is a consonant burst (filtered noise) then a vowel (a pulse
 * or saw through two formant band-passes). DH.Babble.say(text, voice) speaks a whole line; DH.Babble.dialogHook(voice)
 * is a Dialog voice function (one syllable every second letter as the text types). */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, A = game.audio;
const CONS = ['k', 's', 't', 'n', 'h', 'm', 'r', 'y', 'w', 'g', 'b', 'p', 'sh', 'ts', 'ch', 'd', 'z', ''];
const VOW = ['a', 'i', 'u', 'e', 'o'];
const FORM = { a: [800, 1200], i: [300, 2300], u: [350, 1300], e: [500, 1900], o: [500, 900] };
const CCLASS = { k: 2400, g: 1800, t: 3500, d: 2800, s: 6000, sh: 4500, z: 5000, ts: 5500, ch: 4200, h: 1500, p: 1200, b: 900, n: 0, m: 0, r: 0, y: 0, w: 0, '': 0 };
DH.VOICES = {
  hoshino: { f0: 95, rate: 9, src: 'sawtooth', size: .85, contour: -.25 }, mika: { f0: 260, rate: 13, src: 'pulse25', size: 1.15, contour: .15 },
  pa: { f0: 190, rate: 10, src: 'pulse25', size: 1.0, contour: 0, pa: true }, haro: { f0: 420, rate: 14, src: 'pulse12', size: 1.3, contour: .2, wobble: 3 },
  driver: { f0: 150, rate: 11, src: 'square', size: 1, contour: -.05, loud: 1.4 }, kota: { f0: 340, rate: 13, src: 'pulse25', size: 1.25, contour: .2 },
  fuji: { f0: 230, rate: 8, src: 'triangle', size: 1.05, contour: -.1 }, kenji: { f0: 140, rate: 15, src: 'sawtooth', size: .95, contour: .1 },
  ren: { f0: 165, rate: 12, src: 'square', size: .95, contour: .05 }, sato: { f0: 110, rate: 8, src: 'sawtooth', size: .85, contour: -.2 },
  ota: { f0: 120, rate: 9, src: 'sawtooth', size: .9, contour: -.1 }, crowd: { f0: 200, rate: 10, src: 'triangle', size: 1, contour: 0, quiet: .3 }
};
/** the syllables of a text: [{ c, v, stress, pitch (semitones), pause }] (deterministic) */
const syllabify = (text, voice = 'mika') => {
  const out = [], words = String(text).split(/(\s+)/).filter(w => w.trim());
  const V = DH.VOICES[voice] || DH.VOICES.mika;
  words.forEach((w, wi) => {
    const clean = w.replace(/[^A-Za-z0-9-]/g, ''), punct = w.replace(/[A-Za-z0-9-]/g, ''), h0 = DH.fnv(clean.toLowerCase() || w);
    const n = Math.max(1, Math.round(clean.length / 2));
    for (let i = 0; i < n; i++) {
      const h = DH.fnv(h0 + ':' + i), c = CONS[h % CONS.length], v = VOW[(h >>> 5) % 5];
      const u = (wi + i / n) / Math.max(1, words.length);   // place in the line
      let pitch = V.contour * 12 * u - u * 2 + ((h >>> 9) % 5 - 2) * .5;
      const last = i === n - 1;
      if (last && punct.includes('?')) pitch += 5;
      if (last && punct.includes('!')) pitch -= 2;
      if (last && punct.includes('.')) pitch -= 3;
      out.push({ c: (c === 'y' && (v === 'i' || v === 'e')) ? 'k' : c, v, stress: (i === 0 && /[A-Z]/.test(clean[0] || '')) || (last && punct.includes('!')), pitch, pause: last && /[,;:.!?]/.test(punct) ? (punct.includes(',') ? .12 : .22) : last ? .04 : 0 });
    }
  });
  return out;
};
let live = 0;
const syl = (sy, V, t0, k = 1) => {
  const c = A.ctx, bus = A.bus('sfx'); if (!c || !bus || live > 40) return .08;
  const dur = Math.max(.06, Math.min(.11, 1 / V.rate)) * (sy.stress ? 1.2 : 1), f0 = V.f0 * Math.pow(2, (sy.pitch + (V.wobble ? Math.sin(t0 * 30) * V.wobble : 0)) / 12);
  const vol = .12 * (V.loud || 1) * (V.quiet || 1) * k * (sy.stress ? 1.25 : 1);
  const g = c.createGain(); g.gain.value = 0; g.connect(V.pa ? paChain(c, bus) : bus);
  live++; setTimeout(() => { live--; }, (t0 - c.currentTime + dur + .2) * 1000);
  // consonant burst
  const cf = CCLASS[sy.c] || 0;
  if (cf) { const ns = c.createBufferSource(); ns.buffer = A.noiseBuffer(); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = cf; bp.Q.value = 2; const ng = c.createGain(); ng.gain.setValueAtTime(0, t0); ng.gain.linearRampToValueAtTime(vol * .7, t0 + .004); ng.gain.linearRampToValueAtTime(0, t0 + .03); ns.connect(bp); bp.connect(ng); ng.connect(g); ns.start(t0, Math.random() * .3); ns.stop(t0 + .05); g.gain.setValueAtTime(1, t0); }
  // the vowel
  const v0 = t0 + (cf ? .022 : 0), o = c.createOscillator();
  if (V.src.startsWith('pulse')) o.setPeriodicWave(A._pulse(V.src === 'pulse12' ? .125 : .25)); else o.type = V.src;
  o.frequency.setValueAtTime(f0, v0); o.frequency.linearRampToValueAtTime(f0 * (sy.pitch < -1 ? .94 : 1.03), v0 + dur);
  const [f1, f2] = FORM[sy.v], sz = V.size || 1, b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), env = c.createGain();
  b1.type = b2.type = 'bandpass'; b1.frequency.value = f1 * sz; b2.frequency.value = f2 * sz; b1.Q.value = 5; b2.Q.value = 7;
  env.gain.setValueAtTime(0, v0); env.gain.linearRampToValueAtTime(vol, v0 + .006); env.gain.setValueAtTime(vol, v0 + dur - .03); env.gain.linearRampToValueAtTime(0, v0 + dur);
  o.connect(b1); o.connect(b2); const mixg = c.createGain(); mixg.gain.value = 2.2; b1.connect(mixg); b2.connect(mixg); mixg.connect(env); env.connect(g); g.gain.setValueAtTime(1, t0);
  o.start(v0); o.stop(v0 + dur + .02);
  return (cf ? .022 : 0) + dur;
};
let paNode = null;
const paChain = (c, bus) => {   // the station PA: a band-pass and a 120 ms echo
  if (paNode) return paNode;
  const inp = c.createGain(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), d = c.createDelay(.5), fb = c.createGain();
  hp.type = 'highpass'; hp.frequency.value = 300; lp.type = 'lowpass'; lp.frequency.value = 3000; d.delayTime.value = .12; fb.gain.value = .3;
  inp.connect(hp); hp.connect(lp); lp.connect(bus); lp.connect(d); d.connect(fb); fb.connect(d); d.connect(bus);
  return (paNode = inp);
};
DH.Babble = {
  syllabify,
  /** speak a whole line now; returns its length in seconds (0 headless) */
  say(text, voice = 'mika', o = {}) {
    const sy = syllabify(text, voice); let len = 0;
    for (const q of sy) len += 1 / ((DH.VOICES[voice] || DH.VOICES.mika).rate) + q.pause;
    if (game.headless || !A.ready || !A.bus) return len;
    const V = DH.VOICES[voice] || DH.VOICES.mika; let t = A.ctx.currentTime + .02;
    for (const q of sy) { const d = syl(q, V, t, o.vol || 1); t += Math.max(d, 1 / V.rate) + q.pause; }
    return len;
  },
  /** a Dialog voice function: a syllable every second letter, taken from the word under the cursor */
  dialogHook(voice) {
    return (ch, i, txt) => {
      if (game.headless || !A.ready || !/[A-Za-z0-9]/.test(ch) || i % 2) return;
      const V = DH.VOICES[voice] || DH.VOICES.mika;
      let a = i; while (a > 0 && /[A-Za-z0-9'-]/.test(txt[a - 1])) a--; let b = i; while (b < txt.length && /[A-Za-z0-9'-]/.test(txt[b])) b++;
      const word = txt.slice(a, b), after = txt[b] || '', sy = syllabify(word + after, voice), k = Math.min(sy.length - 1, Math.floor((i - a) / 2));
      const q = sy[Math.max(0, k)]; if (q) syl(q, V, A.ctx.currentTime + .01);
    };
  },
  /** the platform crowd's murmur: a few quiet voices */
  murmur(n = 3) { if (game.headless || !A.ready) return; const rr = DH.rng('murmur:' + Math.floor(game.real)); for (let i = 0; i < n; i++) { const V = Object.assign({}, DH.VOICES.crowd, { f0: 120 + rr() * 180 }); syl({ c: CONS[Math.floor(rr() * 17)], v: VOW[Math.floor(rr() * 5)], pitch: rr() * 4 - 2, pause: 0 }, V, A.ctx.currentTime + i * .13 + rr() * .1, .5); } }
};
})();
