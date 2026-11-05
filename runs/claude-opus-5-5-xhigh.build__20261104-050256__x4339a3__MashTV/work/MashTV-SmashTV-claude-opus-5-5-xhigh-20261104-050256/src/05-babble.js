// ---- Babble: Animalese/Simlish voices by formant synthesis on the engine's audio context, and the studio crowd ----
// MT.babble.say(text, voiceId) schedules syllables and returns the line's duration (headless: the duration only).
// Voices go through the engine's effects bus (engine patch P4), so they follow volume and mute.
const VOICES = {
  lance: { f0: 135, speed: 13, wave: 'sawtooth', formant: 1, swoop: 1.35, vol: .5 },
  penny: { f0: 300, speed: 12, wave: 'pulse', formant: 1.18, swoop: 1.2, vol: .42, giggle: true },
  annc: { f0: 85, speed: 7, wave: 'sawtooth', formant: .85, swoop: 1.1, vol: .55, echo: true },
  network: { f0: 70, speed: 8, wave: 'square', formant: .8, swoop: 1, vol: .4, crush: true, mono: true },
  mashy: { f0: 110, speed: 9, wave: 'triangle', formant: .9, swoop: 1.5, vol: .6 },
  contestant1: { f0: 170, speed: 12, wave: 'pulse', formant: 1.05, swoop: 1.2, vol: .4 },
  contestant2: { f0: 200, speed: 12, wave: 'pulse', formant: 1.08, swoop: 1.2, vol: .4 },
  contestant3: { f0: 160, speed: 12, wave: 'pulse', formant: 1.02, swoop: 1.2, vol: .4 },
  contestant4: { f0: 240, speed: 12, wave: 'pulse', formant: 1.12, swoop: 1.2, vol: .4 },
  goon: { f0: 95, speed: 10, wave: 'sawtooth', formant: .9, swoop: 1.1, vol: .3 },
  sponsor: { f0: 220, speed: 10, wave: 'square', formant: 1.1, swoop: 1.3, vol: .38, sing: true },
};
const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700] };
const PLOSIVE = 'pbtdkgcq', FRICATIVE = 'fvszhxj', NASAL = 'mnlrwy';
const BAB = MT.babble = { voices: VOICES, active: 0 };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** split a line into syllables: { onset, vowel, word, emph, end ('?', '!', '.', ',', '...' or ''), first } */
function syllables(text) {
  const out = []; const words = String(text).split(/\s+/).filter(Boolean);
  for (const raw of words) {
    const end = /\.\.\.$/.test(raw) ? '...' : /[?]$/.test(raw) ? '?' : /[!]$/.test(raw) ? '!' : /[.]$/.test(raw) ? '.' : /[,;:—-]$/.test(raw) ? ',' : '';
    const w = raw.toLowerCase().replace(/[^a-z]/g, '');
    const emph = /[A-Z]{2,}/.test(raw) && raw === raw.toUpperCase();
    if (!w) { if (end && out.length) out[out.length - 1].end = end; continue; }
    const groups = []; const re = /([^aeiouy]*)([aeiouy]+)/g; let m;
    while ((m = re.exec(w)) && groups.length < 4) groups.push([m[1], m[2]]);
    if (!groups.length) groups.push([w, 'u']);
    const h = hashStr(w);
    groups.forEach(([cons, vow], k) => {
      const c = cons.slice(-1), cls = !c ? 'none' : PLOSIVE.includes(c) ? 'plosive' : FRICATIVE.includes(c) ? 'fric' : NASAL.includes(c) ? 'nasal' : 'none';
      const v = vow[0] === 'y' ? 'i' : vow[0];
      out.push({ onset: cls, vowel: v, h: (h >>> (k * 3)) & 1023, emph, end: k === groups.length - 1 ? end : '', first: k === 0 });
    });
  }
  return out;
}
BAB.syllables = syllables;
const PAUSE = { ',': .08, '.': .16, '!': .16, '?': .16, '...': .3, '': 0 };
/** how long a line takes in a voice (seconds) */
BAB.duration = (text, voiceId = 'lance', o = {}) => {
  const v = VOICES[voiceId] || VOICES.lance, sp = (o.speed || 1) * v.speed;
  let t = 0; for (const s of syllables(text)) t += 1 / sp + PAUSE[s.end];
  return Math.max(.3, t);
};
let BCTX = null;
function bctx() {
  const A = game && game.audio, c = A && A.ctx;
  if (!c || c.state !== 'running' || !A.bus || A.muted) return null;
  if (!BCTX || BCTX.ctx !== c) {
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const pulse = c.createPeriodicWave(...(() => { const n = 24, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .25); return [re, im]; })());
    BCTX = { ctx: c, noise: nb, pulse, chains: {} };
  }
  return BCTX;
}
function chain(B, id) {
  if (B.chains[id]) return B.chains[id];
  const c = B.ctx, v = VOICES[id] || VOICES.lance, inp = c.createGain(); inp.gain.value = 1;
  let last = inp;
  if (v.crush) { const ws = c.createWaveShaper(), n = 256, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.round(x * 4) / 4; } ws.curve = cv; last.connect(ws); last = ws; }
  last.connect(game.audio.bus);
  if (v.echo) { const dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain(); dl.delayTime.value = .19; fb.gain.value = .35; wet.gain.value = .45; last.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(game.audio.bus); }
  return (B.chains[id] = inp);
}
function syllableAt(B, out, v, t, dur, f0, vowel, onset, vol) {
  const c = B.ctx, F = FORMANTS[vowel] || FORMANTS.a;
  if (onset !== 'none') {
    const src = c.createBufferSource(); src.buffer = B.noise; const f = c.createBiquadFilter(), g = c.createGain();
    if (onset === 'plosive') { f.type = 'bandpass'; f.frequency.value = 2000 + Math.random() * 2000; f.Q.value = 1.2; g.gain.setValueAtTime(vol * .7, t); g.gain.exponentialRampToValueAtTime(.001, t + .015); src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * .5); src.stop(t + .03); }
    else if (onset === 'fric') { f.type = 'highpass'; f.frequency.value = 3500; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .35, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .05); src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * .5); src.stop(t + .07); }
    else { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * .9; g.gain.setValueAtTime(vol * .5, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); o.connect(g); g.connect(out); o.start(t); o.stop(t + .05); }
    t += onset === 'plosive' ? .012 : .03;
  }
  const o = c.createOscillator();
  if (v.wave === 'pulse') o.setPeriodicWave(B.pulse); else o.type = v.wave;
  o.frequency.setValueAtTime(f0 * 1.03, t); o.frequency.linearRampToValueAtTime(f0 * (v.mono ? 1 : .97), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, Math.max(t + .006, t + dur - .03)); g.gain.linearRampToValueAtTime(0, t + dur);
  for (const fq of F) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * v.formant; bp.Q.value = 8; o.connect(bp); bp.connect(g); }
  const dry = c.createGain(); dry.gain.value = .12; o.connect(dry); dry.connect(g);
  g.connect(out); o.start(t); o.stop(t + dur + .02);
}
/** say a line: schedules it from now; returns its duration in seconds */
BAB.say = (text, voiceId = 'lance', o = {}) => {
  const dur = BAB.duration(text, voiceId, o);
  const B = bctx(); if (!B) return dur;
  const v = VOICES[voiceId] || VOICES.lance, sp = (o.speed || 1) * v.speed, out = chain(B, voiceId), syl = syllables(text);
  let t = B.ctx.currentTime + .02;
  const n = syl.length;
  syl.forEach((s, i) => {
    const step = 1 / sp, nuc = clamp(step * .82, .06, .12) * (v.sing ? 1.4 : 1);
    let k = 1;
    if (!v.mono) {
      const pos = i / Math.max(1, n - 1);
      k *= 1 + ((s.h % 9) - 4) * .01;                                   // ±4 % jitter
      k *= 1 + .02 * Math.sin(i * 1.7);                                  // vibrato-ish wobble
      if (s.emph) k *= 1.12;
      if (s.end === '!') k *= v.swoop; else if (s.end === '?') k *= 1.25; else if (s.end === '.' || s.end === '...') k *= .85;
      if (v.sing) k *= [1, 1.26, 1.5, 1.33, 1.12][i % 5];
      k *= 1 + .06 * (1 - pos);
    }
    syllableAt(B, out, v, t, nuc, v.f0 * k, s.vowel, s.onset, v.vol * (o.vol || 1) * .5);
    t += step + PAUSE[s.end];
  });
  if (v.giggle) for (let j = 0; j < 4; j++) syllableAt(B, out, v, t + j * .06, .05, v.f0 * (1.5 + j * .12), 'i', 'none', v.vol * .25);
  return dur;
};
/** the studio crowd: 'cheer' | 'ooh' | 'laugh' | 'applause' | 'boo' | 'murmur', intensity 0..1 */
BAB.crowd = (kind, intensity = .6) => {
  MT.lastCrowd = kind;
  const B = bctx(); if (!B) return;
  const c = B.ctx, out = chain(B, 'crowd'), t0 = c.currentTime + .01, I = clamp(intensity, .1, 1);
  const voice = (t, f, f2, d, vw, vol) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f2, t + d); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .05); g.gain.linearRampToValueAtTime(0, t + d); const F = FORMANTS[vw]; for (const fq of F) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 6; o.connect(bp); bp.connect(g); } g.connect(out); o.start(t); o.stop(t + d + .05); };
  const noise = (t, d, f, vol, type = 'bandpass') => { const s = c.createBufferSource(); s.buffer = B.noise; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = .7; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .08); g.gain.linearRampToValueAtTime(0, t + d); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + d + .05); };
  const n = Math.round(4 + 6 * I);
  if (kind === 'cheer') { for (let i = 0; i < n; i++) { const f = 180 + Math.random() * 260, d = .6 + Math.random() * .6; voice(t0 + Math.random() * .2, f, f * (1.2 + Math.random() * .3), d, Math.random() < .5 ? 'o' : 'e', .05 * I); } noise(t0, 1.2, 1800, .06 * I); }
  else if (kind === 'ooh') { for (let i = 0; i < n; i++) { const f = 160 + Math.random() * 200; voice(t0 + Math.random() * .1, f * 1.2, f * .8, .8, 'u', .05 * I); } }
  else if (kind === 'laugh') { for (let v = 0; v < 4; v++) { const f = 150 + Math.random() * 200; for (let k = 0; k < 6; k++) voice(t0 + v * .03 + k * .2, f, f * .9, .12, 'a', .05 * I); } }
  else if (kind === 'applause') { const m = Math.round(12 + 18 * I); for (let k = 0; k < m; k++) noise(t0 + Math.random() * 1.5, .04, 1200 + Math.random() * 1600, .12 * I); noise(t0, 1.6, 2500, .04 * I); }
  else if (kind === 'boo') { for (let i = 0; i < n; i++) { const f = 100 + Math.random() * 80; voice(t0 + Math.random() * .15, f, f * .9, .9, 'u', .05 * I); } }
  else { for (let i = 0; i < 6; i++) { const f = 120 + Math.random() * 120; voice(t0 + Math.random() * 1.5, f, f * .95, .15, 'aeiou'[i % 5], .015 * I); } }
};
