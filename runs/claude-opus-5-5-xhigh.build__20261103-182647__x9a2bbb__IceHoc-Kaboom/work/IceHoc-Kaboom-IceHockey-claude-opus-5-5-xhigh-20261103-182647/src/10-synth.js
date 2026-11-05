/* ---- SYNTH (section 10): everything heard is made here, in code. Babble voices (Animalese / Simlish style: each
 * sounding letter a 55-85 ms blip through two formant filters, pitch from the voice and a letter hash), the goal horn
 * (three detuned brass oscillators through a lowpass, plus air), the crowd bed (two looped noise bands that follow the
 * crowd's excitement) and its reactions, the arena organ (original stings only), the sound effects and the songs.
 * Randomness here comes from RNG.fx, never the simulation's stream ---- */
const Synth = (() => {
  const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2300] };
  const VOWELS = 'aeiouy';
  const ctx = () => (A.ctx && A.ctx.state === 'running' ? A.ctx : null);
  let pulseWave = null, last = new Map();
  const pw = c => pulseWave || (pulseWave = (() => { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) { const a = 2 / (n * PI) * Math.sin(n * PI * .3); re[n] = a * Math.cos(n * PI * .3); im[n] = a * Math.sin(n * PI * .3); } return c.createPeriodicWave(re, im); })());
  /** one syllable: f0 Hz, vowel, at time t (context seconds), for dur */
  function blip(c, t, f0, vowel, dur, v, vol = .22, click = false, glide = 0) {
    const bus = A.bus('voice'); if (!bus) return;
    const fm = FORM[vowel] || FORM.a, k = v.fmt || 1;
    const o = c.createOscillator(); if (v.wave === 'pulse') o.setPeriodicWave(pw(c)); else o.type = v.wave === 'square' ? 'square' : 'sawtooth';
    o.frequency.setValueAtTime(f0, t); if (glide) o.frequency.linearRampToValueAtTime(f0 * glide, t + dur);
    if (v.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = v.vib[0]; lg.gain.value = f0 * v.vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    for (const [fq, q, gv] of [[fm[0] * k, 6, 1], [fm[1] * k, 9, .7]]) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; const fg = c.createGain(); fg.gain.value = gv * 2.4; o.connect(f); f.connect(fg); fg.connect(g); }
    if (v.gruff && A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = fm[0] * k; nf.Q.value = 2; const ng = c.createGain(); ng.gain.value = v.gruff * 1.6; n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t, RNG.fx() * .5); n.stop(t + dur + .02); }
    if (click && A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; const hf = c.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 3200; const cg = c.createGain(); cg.gain.setValueAtTime(vol * .7, t); cg.gain.exponentialRampToValueAtTime(.0005, t + .012); n.connect(hf); hf.connect(cg); cg.connect(bus); n.start(t, RNG.fx() * .5); n.stop(t + .02); }
    g.connect(bus); o.start(t); o.stop(t + dur + .03);
  }
  const semis = (base, n) => base * Math.pow(2, n / 12);
  const hashOff = (ch, i, range) => { const h = (ch.charCodeAt(0) * 31 + i * 7) % 13; return (h / 12 - .5) * 2 * range; };
  /** speak a whole line in a voice (returns its length in seconds); o: { vol, pitch, delay } */
  function say(text, v, o = {}) {
    const c = ctx(); if (!c || !v) return 0;
    const s = String(text).toLowerCase(), sp = 1 / (v.speed || 10), out = [];
    let t = c.currentTime + .02 + (o.delay || 0), onset = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (VOWELS.includes(ch)) { out.push({ t, ch, click: onset }); t += sp * (.8 + RNG.fx() * .4); onset = false; while (VOWELS.includes(s[i + 1])) i++; }
      else if (/[a-z]/.test(ch)) { onset = onset || 'stkpcfx'.includes(ch); }
      else if (ch === ',') t += .12; else if (ch === '.' || ch === '…') t += .22; else if (ch === '!' || ch === '?') t += .08;
    }
    const excl = /!/.test(s), q = /\?\s*$/.test(s);
    out.forEach((sy, k) => {
      let f = semis(v.base * (o.pitch || 1), hashOff(sy.ch, k, v.range || 3));
      if (excl && k >= out.length - 4) f = semis(f, 4);
      blip(c, sy.t, f, sy.ch, Math.min(.085, sp * .9 + .02), v, (o.vol || 1) * .2, sy.click, q && k === out.length - 1 ? 1.35 : 0);
    });
    return t - c.currentTime;
  }
  /** one letter as it types (E.Dialog's voice hook): vowels sound, at most voice.speed a second */
  function letter(ch, i, text, v) {
    const c = ctx(); if (!c || !v) return;
    const l = String(ch).toLowerCase(); if (!/[a-z]/.test(l)) return;
    const now = c.currentTime, lt = last.get(v) || 0; if (now - lt < 1 / (v.speed || 10)) return;
    if (!VOWELS.includes(l) && RNG.fx() < .55) return;
    last.set(v, now);
    const vow = VOWELS.includes(l) ? l : 'aeiou'[(l.charCodeAt(0) * 7) % 5];
    blip(c, now + .005, semis(v.base, hashOff(l, i, v.range || 3)), vow, .07, v, .2, !VOWELS.includes(l) && 'stkp'.includes(l));
  }
  const voiceFn = v => (ch, i, text) => letter(ch, i, text, v);

  /* ---- the goal horn: a custom graph (3 detuned brass oscillators at 98, 147, 196 Hz, lowpass 900, air) ---- */
  function horn(double = false, len = 2.6) {
    const c = ctx(); if (!c) return; const bus = A.bus('sfx');
    for (let rep = 0; rep < (double ? 2 : 1); rep++) {
      const t = c.currentTime + .02 + rep * (len + .5), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32, t + .25); g.gain.setValueAtTime(.32, t + .25 + len); g.gain.linearRampToValueAtTime(0, t + .75 + len);
      for (const [fq, dt] of [[98, 0], [147, 2], [196, -3], [98.6, 5]]) { const o = c.createOscillator(); o.setPeriodicWave(A._harm('brass')); o.frequency.value = fq; o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + len + .9); }
      if (A._noise) { const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; const ng = c.createGain(); ng.gain.value = .25; n.connect(nf); nf.connect(ng); ng.connect(f); n.start(t); n.stop(t + len + .9); }
      f.connect(g); g.connect(bus);
    }
  }
  /* ---- the crowd: a bed of two noise bands following excitement; reactions on top ---- */
  let bed = null, bedLevel = 0;
  function crowd(level) {
    const c = ctx(); bedLevel = level; if (!c || !A._noise) return;
    if (!bed) {
      const g = c.createGain(); g.gain.value = 0; g.connect(A.bus('sfx'));
      const mk = (fq, q) => { const n = c.createBufferSource(); n.buffer = A._noise; n.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q; n.connect(f); f.connect(g); n.start(0, Math.random() * .5); return f; };
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .23; lg.gain.value = 120; lfo.connect(lg); const f1 = mk(400, .9); lg.connect(f1.frequency); mk(1200, 1.4); lfo.start();
      bed = { g };
    }
    const vol = (S('crowdVol') === undefined ? .8 : S('crowdVol')) * T.crowdHype;
    bed.g.gain.setTargetAtTime(clamp(level, 0, 1.4) * .16 * vol, c.currentTime, .25);
  }
  function crowdOff() { const c = ctx(); if (bed && c) bed.g.gain.setTargetAtTime(0, c.currentTime, .2); }
  function swell(kind) {
    const c = ctx(); if (!c || !A._noise) return; const vol = (S('crowdVol') === undefined ? .8 : S('crowdVol')) * T.crowdHype; if (vol <= 0) return;
    const t = c.currentTime + .01, bus = A.bus('sfx'), n = c.createBufferSource(); n.buffer = A._noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1; const g = c.createGain();
    const spec = { ohh: [700, 300, .45, 1.4], ahh: [900, 1400, .3, 1.1], cheer: [1100, 1700, .55, 2.4], roar: [900, 1500, .7, 3.6], boo: [300, 220, .35, 1.6], gasp: [1300, 900, .25, .5] }[kind] || [800, 800, .3, 1];
    f.frequency.setValueAtTime(spec[0], t); f.frequency.exponentialRampToValueAtTime(spec[1], t + spec[3]);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(spec[2] * vol * .6, t + .12); g.gain.exponentialRampToValueAtTime(.001, t + spec[3]);
    n.connect(f); f.connect(g); g.connect(bus); n.start(t, Math.random() * .5); n.stop(t + spec[3] + .1);
    if (kind === 'cheer' || kind === 'roar') for (let k = 0; k < 5; k++) say('wooo yeah', { base: 280 + k * 40, range: 5, speed: 9, wave: 'pulse', fmt: 1.1 }, { vol: .25 * vol, delay: k * .09 });
    if (kind === 'boo') for (let k = 0; k < 4; k++) say('boooo', { base: 110 + k * 12, range: 1, speed: 3, wave: 'saw', fmt: .8 }, { vol: .3 * vol, delay: k * .1 });
    if (kind === 'ohh') for (let k = 0; k < 3; k++) say('ohhh', { base: 160 + k * 30, range: 1, speed: 3, wave: 'saw', fmt: .9 }, { vol: .25 * vol, delay: k * .05 });
  }
  function chant(word = 'ka boom') { const vol = (S('crowdVol') === undefined ? .8 : S('crowdVol')) * T.crowdHype; for (let k = 0; k < 6; k++) say(word + '! ' + word + '!', { base: 150 + k * 35, range: 1, speed: 4, wave: k % 2 ? 'saw' : 'pulse', fmt: 1 }, { vol: .22 * vol, delay: k * .015 }); claps(6, .25); }
  function claps(n = 4, gap = .3, delay = 0) { const c = ctx(); if (!c || !A._noise) return; for (let k = 0; k < n; k++) A.sfx({ wave: 'noise', freq: 2400, dur: .05, vol: .16, filter: 'bandpass', q: .8, delay: delay + k * gap }); }

  /* ---- the organ: original stings, a drawbar organ with a Leslie-like wobble ---- */
  const ORG = (notes, step = .14, o = {}) => notes.map((n, i) => n ? { wave: 'organ', freq: n, dur: (o.len || step) * (n.endsWith && n.endsWith('-') ? 2 : 1), vol: o.vol || .16, vib: [6, .004], hold: true, attack: .01, delay: i * step } : null).filter(Boolean);
  const STINGS = {
    charge: ORG(['G4', 'C5', 'E5', 'G5', null, 'E5', 'G5', 'G5'], .16, { vol: .18 }),
    walkup: ORG(['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4'], .1),
    clap: ORG(['G4', 'G4', 'A4', null, 'G4', null, 'C5', 'B4'], .17),
    sad: [{ wave: 'brass', freq: 'G3', to: 'F#3', dur: .35, vol: .2, lp: 900, hold: true }, { wave: 'brass', freq: 'F#3', to: 'F3', dur: .35, vol: .2, lp: 900, hold: true, delay: .4 }, { wave: 'brass', freq: 'F3', to: 'E3', dur: .35, vol: .2, lp: 900, hold: true, delay: .8 }, { wave: 'brass', freq: 'E3', to: 'D#3', dur: 1, vol: .2, lp: 700, hold: true, vib: [7, .03], delay: 1.2 }],
    fight: ORG(['E4', 'G4', 'Bb4', 'E4', 'G4', 'B4', 'E4', 'G4', 'Bb4', 'A4'], .12, { vol: .15 }),
    period: ORG(['C5', 'G4', 'E4', 'C4'], .25)
  };
  const organ = name => { const s = STINGS[name]; if (s) A.sfx(s, { vary: 0 }); Bus.emit('organ', { name }); };

  /* ---- sound effects (audio.define) ---- */
  const FX = {
    stride: { wave: 'noise', freq: 2600, to: 1400, dur: .12, vol: .07, filter: 'bandpass', q: 1.2 },
    stop: [{ wave: 'noise', freq: 5200, to: 900, dur: .32, vol: .2, filter: 'bandpass', q: 1.5 }, { wave: 'noise', freq: 1800, to: 600, dur: .25, vol: .1, filter: 'lowpass' }],
    tock: { wave: 'triangle', freq: 900, to: 500, dur: .04, vol: .14 },
    pass: [{ wave: 'noise', freq: 1800, to: 700, dur: .06, vol: .2, filter: 'bandpass' }, { wave: 'triangle', freq: 600, to: 300, dur: .05, vol: .15 }],
    wrist: [{ wave: 'noise', freq: 3000, to: 900, dur: .07, vol: .22, filter: 'bandpass' }, { wave: 'square', freq: 520, to: 200, dur: .05, vol: .1 }],
    slap: [{ wave: 'noise', freq: 4200, to: 500, dur: .12, vol: .32, filter: 'bandpass', q: .7 }, { wave: 'square', freq: 320, to: 90, dur: .1, vol: .16 }, { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .12, filter: 'lowpass', delay: .03 }],
    onetimer: [{ wave: 'noise', freq: 5000, to: 400, dur: .14, vol: .38, filter: 'bandpass', q: .6 }, { wave: 'square', freq: 360, to: 80, dur: .12, vol: .2 }],
    post: [{ wave: 'triangle', freq: 1850, dur: .9, vol: .3 }, { wave: 'triangle', freq: 1862, dur: .8, vol: .18 }, { wave: 'sine', freq: 3700, dur: .4, vol: .08 }],
    bar: [{ wave: 'triangle', freq: 2100, dur: .9, vol: .3 }, { wave: 'triangle', freq: 2114, dur: .7, vol: .16 }],
    boards: [{ wave: 'sine', freq: 140, to: 60, dur: .16, vol: .32 }, { wave: 'noise', freq: 500, to: 200, dur: .2, vol: .14, filter: 'lowpass' }],
    glass: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .2, filter: 'bandpass' }, { wave: 'triangle', freq: 2600, to: 2400, dur: .25, vol: .08 }],
    net: { wave: 'noise', freq: 1400, to: 500, dur: .25, vol: .18, filter: 'bandpass', q: .7 },
    check: [{ wave: 'sine', freq: 120, to: 50, dur: .18, vol: .4 }, { wave: 'noise', freq: 700, to: 200, dur: .14, vol: .18, filter: 'lowpass' }],
    bighit: [{ wave: 'sine', freq: 90, to: 32, dur: .35, vol: .5 }, { wave: 'noise', freq: 900, to: 150, dur: .3, vol: .26, filter: 'lowpass' }, { wave: 'noise', freq: 3000, to: 1500, dur: .2, vol: .12, filter: 'bandpass', delay: .04 }],
    crack: [{ wave: 'noise', freq: 6000, to: 3000, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 2400, to: 1800, dur: .04, vol: .08 }],
    shatter: [{ wave: 'noise', freq: 5000, to: 900, dur: .7, vol: .38, filter: 'bandpass', q: .5 }].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => ({ wave: 'sine', freq: 3200 - k * 160, to: 2600 - k * 140, dur: .25, vol: .05, delay: .03 + k * .045 }))),
    whistle: [{ wave: 'square', freq: 2300, dur: .32, vol: .1, vib: [32, .05], lp: 4200 }, { wave: 'square', freq: 2900, dur: .32, vol: .06, vib: [30, .05], lp: 4200 }],
    whistle2: [{ wave: 'square', freq: 2300, dur: .18, vol: .1, vib: [32, .05], lp: 4200 }, { wave: 'square', freq: 2300, dur: .4, vol: .1, vib: [32, .05], lp: 4200, delay: .24 }],
    buzzer: { wave: 'square', freq: 220, dur: 1.5, vol: .18, hold: true, lp: 1600 },
    punch: [{ wave: 'sine', freq: 150, to: 60, dur: .12, vol: .4 }, { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .2, filter: 'bandpass' }],
    whiff: { wave: 'noise', freq: 1200, to: 2600, dur: .16, vol: .12, filter: 'bandpass' },
    stars: { wave: 'sine', freq: 2400, dur: .5, vol: .06, arp: [0, 7, 12, 7, 0, 7, 12], step: .07, loop: true },
    pickup: { wave: 'pulse', freq: 'C5', dur: .35, vol: .14, arp: [0, 4, 7, 12, 16], step: .06 },
    throw: { wave: 'noise', freq: 600, to: 1800, dur: .4, vol: .1, filter: 'bandpass' },
    splort: [{ wave: 'sine', freq: 300, to: 80, dur: .2, vol: .3 }, { wave: 'noise', freq: 800, to: 200, dur: .2, vol: .16, filter: 'lowpass' }],
    kaboom: [{ wave: 'noise', freq: 1600, to: 60, dur: 1.1, vol: .55, filter: 'lowpass', q: .6 }, { wave: 'sine', freq: 70, to: 24, dur: 1.2, vol: .55 }, { wave: 'square', freq: 110, to: 30, dur: .6, vol: .15, lp: 600 }],
    blast: [{ wave: 'noise', freq: 1200, to: 80, dur: .7, vol: .45, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .7, vol: .4 }],
    aooga: [{ wave: 'saw', freq: 'D4', to: 'A4', dur: .35, vol: .14, lp: 1400, hold: true }, { wave: 'saw', freq: 'A4', to: 'F4', dur: .45, vol: .14, lp: 1400, hold: true, delay: .38 }],
    putter: { wave: 'saw', freq: 55, dur: .09, vol: .08, lp: 400 },
    splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .6, vol: .32, filter: 'bandpass', q: .6 }, { wave: 'sine', freq: 400, to: 120, dur: .3, vol: .2 }],
    freeze: { wave: 'triangle', freq: 'C6', dur: .6, vol: .1, arp: [0, -5, -12, -17], step: .12 },
    crate: [{ wave: 'noise', freq: 900, to: 200, dur: .3, vol: .3, filter: 'lowpass' }, { wave: 'square', freq: 200, to: 80, dur: .15, vol: .1 }],
    menuMove: { wave: 'organ', freq: 'G4', dur: .06, vol: .1, hold: true },
    menuSel: [{ wave: 'organ', freq: 'C5', dur: .08, vol: .12, hold: true }, { wave: 'organ', freq: 'G5', dur: .12, vol: .12, hold: true, delay: .07 }],
    menuBack: [{ wave: 'organ', freq: 'G4', dur: .08, vol: .1, hold: true }, { wave: 'organ', freq: 'C4', dur: .12, vol: .1, hold: true, delay: .07 }],
    star: { wave: 'pulse', freq: 'E6', dur: .5, vol: .12, arp: [0, 5, 7, 12], step: .08 },
    tick: { wave: 'square', freq: 1200, dur: .03, vol: .06 },
    countdown: { wave: 'square', freq: 'A5', dur: .2, vol: .12, lp: 3000 },
    go: { wave: 'square', freq: 'A6', dur: .5, vol: .14, lp: 4000, hold: true },
    glove: { wave: 'noise', freq: 600, to: 300, dur: .12, vol: .14, filter: 'lowpass' },
    catch: [{ wave: 'noise', freq: 900, to: 300, dur: .08, vol: .26, filter: 'lowpass' }, { wave: 'sine', freq: 180, to: 90, dur: .06, vol: .2 }],
    pad: [{ wave: 'sine', freq: 200, to: 90, dur: .08, vol: .3 }, { wave: 'noise', freq: 700, to: 300, dur: .06, vol: .14, filter: 'lowpass' }],
    clack: { wave: 'noise', freq: 2400, to: 1400, dur: .03, vol: .14, filter: 'bandpass' },
    fire: { wave: 'noise', freq: 700, to: 200, dur: .5, vol: .18, filter: 'lowpass' },
    deke: { wave: 'noise', freq: 1200, to: 3000, dur: .2, vol: .1, filter: 'bandpass' }
  };
  for (const k in FX) A.define(k, FX[k]);
  const sfx = (name, o) => A.sfx(name, o);

  /* ---- MUSIC: original songs in the engine's song format (the organ and brass waves are engine patches) ---- */
  const D = { bpm: 150, steps: 2 };
  const SONGS = {
    theme: { bpm: 150, steps: 2, tracks: [
      { name: 'lead', wave: 'square', vol: .075, lp: 3400, notes: 'E5 . E5 G5 . A5 B5 . | D6 - B5 - A5 . G5 . | E5 . E5 G5 . A5 B5 . | G5 - A5 - B5 - - . | C6 . B5 . A5 . G5 . | A5 - G5 - E5 . D5 . | E5 . G5 . B5 . D6 . | E6 - - - B5 . E6 .' },
      { name: 'root', wave: 'saw', vol: .06, lp: 1300, notes: 'E3 E3 E3 E3 E3 E3 D3 D3 | C3 C3 C3 C3 D3 D3 D3 D3 | E3 E3 E3 E3 E3 E3 D3 D3 | C3 C3 D3 D3 E3 E3 E3 E3 | A2 A2 A2 A2 G2 G2 G2 G2 | F2 F2 F2 F2 G2 G2 G2 G2 | E3 E3 E3 E3 G3 G3 G3 G3 | B2 B2 B2 B2 B2 B2 B2 B2' },
      { name: 'fifth', wave: 'saw', vol: .045, lp: 1300, notes: 'B3 B3 B3 B3 B3 B3 A3 A3 | G3 G3 G3 G3 A3 A3 A3 A3 | B3 B3 B3 B3 B3 B3 A3 A3 | G3 G3 A3 A3 B3 B3 B3 B3 | E3 E3 E3 E3 D3 D3 D3 D3 | C3 C3 C3 C3 D3 D3 D3 D3 | B3 B3 B3 B3 D4 D4 D4 D4 | F#3 F#3 F#3 F#3 F#3 F#3 F#3 F#3' },
      { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E2 E2 . E2 D2 . | C2 . C2 C2 . D2 D2 . | E2 . E2 E2 . E2 D2 . | C2 . D2 . E2 . E2 . | A1 . A1 A1 . G1 G1 . | F1 . F1 F1 . G1 G1 . | E2 . E2 . G2 . G2 . | B1 . B1 B1 B1 . B1 .' },
      { name: 'drums', wave: 'drums', vol: .12, notes: 'k h s h k k s h | k h s h k k s o' }] },
    menu: { bpm: 112, steps: 2, tracks: [
      { wave: 'organ', vol: .07, notes: 'E4 - - - G4 - - - | C4 - - - D4 - - - | E4 - - - B3 - - - | C4 - - - D4 - - -' },
      { wave: 'organ', vol: .05, notes: 'B4 - - - D5 - - - | G4 - - - A4 - - - | G4 - - - F#4 - - - | E4 - - - F#4 - - -' },
      { wave: 'pulse', vol: .05, lp: 2400, notes: 'E5 . G5 . B5 . G5 . | E5 . G5 . A5 . F#5 . | G5 . E5 . D5 . B4 . | C5 . E5 . F#5 . D5 .' },
      { wave: 'triangle', vol: .26, notes: 'E2 . . E2 . . B1 . | C2 . . C2 . . D2 . | E2 . . E2 . . B1 . | C2 . . C2 . . D2 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h h' }] },
    locker: { bpm: 96, steps: 4, tracks: [
      { wave: 'saw', vol: .09, lp: 700, notes: 'A1 . . A1 . . C2 . D2 . . D2 . E2 . G1 | A1 . . A1 . . C2 . D2 . . E2 . C2 . G1' },
      { wave: 'organ', vol: .05, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - G3 - - - - - - -' },
      { wave: 'organ', vol: .04, notes: 'E4 - - - - - - - - - - - - - - - | C4 - - - - - - - D4 - - - - - - -' },
      { wave: 'drums', vol: .09, notes: 'k . h s . h k h . h s . h . s h' }] },
    pond: { bpm: 104, steps: 3, tracks: [
      { wave: 'pulse', vol: .08, lp: 3000, vib: [5, .01], notes: 'D5 E5 F#5 A5 . F#5 | G5 F#5 E5 D5 . . | B4 D5 E5 F#5 . E5 | D5 - - . . A4 | D5 E5 F#5 A5 . B5 | A5 F#5 D5 E5 . . | F#5 E5 D5 B4 . A4 | D5 - - - . .' },
      { wave: 'triangle', vol: .28, notes: 'D3 . A2 D3 . A2 | G2 . D3 G2 . D3 | B2 . F#2 B2 . F#2 | A2 . E3 A2 . C#3 | D3 . A2 D3 . A2 | G2 . D3 A2 . E3 | B2 . F#2 G2 . A2 | D3 . A2 D3 . .' },
      { wave: 'square', vol: .03, lp: 1800, notes: 'F#4 . F#4 . F#4 . | G4 . G4 . G4 . | F#4 . F#4 . F#4 . | E4 . E4 . E4 . | F#4 . F#4 . F#4 . | G4 . G4 . A4 . | F#4 . F#4 . E4 . | F#4 . . . . .' },
      { wave: 'drums', vol: .06, notes: 'k . h s . h' }] },
    grind: { bpm: 176, steps: 2, tracks: [
      { wave: 'saw', vol: .07, lp: 1800, notes: 'E3 E3 E3 E3 G3 G3 A3 A3 | E3 E3 E3 E3 Bb3 Bb3 A3 G3' },
      { wave: 'saw', vol: .05, lp: 1800, notes: 'B3 B3 B3 B3 D4 D4 E4 E4 | B3 B3 B3 B3 F4 F4 E4 D4' },
      { wave: 'square', vol: .05, lp: 2600, notes: 'E5 - - . G5 . A5 . | B5 - Bb5 - A5 . G5 . | E5 - - . G5 . A5 . | D6 - B5 - A5 - - .' },
      { wave: 'triangle', vol: .3, notes: 'E2 E2 E2 E2 G2 G2 A2 A2 | E2 E2 E2 E2 Bb2 Bb2 A2 G2' },
      { wave: 'drums', vol: .13, notes: 'k s k s k s k s | k s k s k k s s' }] },
    mall: { bpm: 122, steps: 4, tracks: [
      { wave: 'pulse', vol: .06, lp: 4000, notes: 'C5 E5 G5 C6 G5 E5 C5 E5 | A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | G4 B4 D5 G5 D5 B4 G4 B4' },
      { wave: 'square', vol: .06, lp: 3000, notes: 'E5 - - - D5 - C5 - | C5 - - - . . E5 - | F5 - - - E5 - D5 - | D5 - - - G5 - - -' },
      { wave: 'triangle', vol: .28, notes: 'C3 . C3 . C4 . C3 . | A2 . A2 . A3 . A2 . | F2 . F2 . F3 . F2 . | G2 . G2 . G3 . G2 .' },
      { wave: 'drums', vol: .1, notes: 'k . h . s . h . k k h . s . h h' }] },
    final: { bpm: 92, steps: 2, tracks: [
      { wave: 'brass', vol: .1, lp: 2200, notes: 'D4 - - - A4 - - - | G4 - F4 - E4 - D4 - | C4 - - - G4 - - - | A4 - - - - - - - | D4 - - - A4 - - - | Bb4 - A4 - G4 - F4 - | E4 - F4 - G4 - A4 - | D5 - - - - - - -' },
      { wave: 'brass', vol: .07, lp: 1600, notes: 'A3 - - - F4 - - - | D4 - - - C4 - - - | G3 - - - E4 - - - | E4 - - - C#4 - - - | A3 - - - F4 - - - | F4 - - - D4 - - - | C4 - - - E4 - - - | F#4 - - - - - - -' },
      { wave: 'triangle', vol: .3, notes: 'D2 . D2 . D2 . A1 . | G1 . G1 . A1 . A1 . | C2 . C2 . C2 . G1 . | A1 . A1 . A1 . C#2 . | D2 . D2 . D2 . A1 . | Bb1 . Bb1 . G1 . G1 . | C2 . C2 . E2 . E2 . | D2 . D2 . D2 . D2 .' },
      { wave: 'drums', vol: .12, notes: 'k . . k s . . . | k . k . s . o .' }] },
    play: { bpm: 128, steps: 4, tracks: [
      { name: 'pulse', wave: 'triangle', vol: .22, notes: 'E2 . . . E2 . . . E2 . . . G2 . . . | A2 . . . A2 . . . B2 . . . B2 . . .' },
      { name: 'hats', wave: 'drums', vol: .05, notes: 'h . . . h . . . h . . . h . h .' },
      { name: 'drive', wave: 'saw', vol: .05, lp: 1400, on: false, notes: 'E3 E3 . E3 E3 . E3 . G3 G3 . G3 A3 . B3 . | A3 A3 . A3 A3 . A3 . B3 B3 . B3 D4 . B3 .' },
      { name: 'beat', wave: 'drums', vol: .1, on: false, notes: 'k . . k s . . . k . k . s . . h' },
      { name: 'kaboom', wave: 'saw', vol: .1, lp: 600, on: false, notes: 'E1 E1 E1 E1 E1 E1 G1 G1 E1 E1 E1 E1 Bb1 Bb1 A1 A1' },
      { name: 'toms', wave: 'drums', vol: .14, on: false, notes: 'k o k o s o k o k o k o s s s s' },
      { name: 'fight', wave: 'organ', vol: .08, on: false, notes: 'E4 . G4 . Bb4 . A4 . E4 . G4 . B4 . Bb4 .' }] },
    flood: { bpm: 156, steps: 1, tracks: [
      { wave: 'organ', vol: .09, vib: [6, .004], notes: 'G4 - B4 | D5 - - | C5 - B4 | A4 - - | F#4 - A4 | C5 - - | B4 - A4 | G4 - - | E5 - D5 | C5 - B4 | A4 - G4 | F#4 - - | G4 - B4 | D5 - G5 | F#5 - E5 | D5 - -' },
      { wave: 'organ', vol: .05, notes: 'G2 B3 D4 | G2 B3 D4 | A2 C4 E4 | D2 C4 F#4 | D2 C4 F#4 | D2 A3 C4 | G2 B3 D4 | G2 B3 D4 | C3 E4 G4 | G2 D4 G4 | D2 C4 F#4 | D2 C4 F#4 | G2 B3 D4 | G2 B3 D4 | D2 C4 F#4 | G2 B3 D4' }] },
    victory: { bpm: 140, steps: 2, loop: false, tracks: [
      { wave: 'brass', vol: .12, lp: 2600, notes: 'C5 . C5 . C5 . E5 - | G5 - - . E5 . G5 - | C6 - - - - - - .' },
      { wave: 'brass', vol: .08, lp: 2000, notes: 'G4 . G4 . G4 . C5 - | E5 - - . C5 . E5 - | G5 - - - - - - .' },
      { wave: 'triangle', vol: .28, notes: 'C3 . C3 . C3 . C3 . | C3 . . . G2 . . . | C3 - - - - - - .' },
      { wave: 'drums', vol: .12, notes: 'k . k . k . s . | k . . . s . s s | o - - - . . . .' }] },
    defeat: { bpm: 70, steps: 2, loop: false, tracks: [
      { wave: 'brass', vol: .12, lp: 900, notes: 'G3 - F#3 - F3 - E3 - | - - - - . . . .' },
      { wave: 'triangle', vol: .2, notes: 'C2 - - - B1 - - - | Bb1 - - - - - - .' }] },
    credits: { bpm: 84, steps: 2, tracks: [
      { wave: 'organ', vol: .08, vib: [5, .004], notes: 'E5 - - - G5 - A5 - | B5 - - - A5 - G5 - | E5 - - - G5 - A5 - | G5 - - - - - - - | C6 - B5 - A5 - G5 - | A5 - G5 - E5 - D5 - | E5 - G5 - B5 - D6 - | E6 - - - - - - -' },
      { wave: 'organ', vol: .045, notes: 'G3 - B3 - E4 - - - | G3 - B3 - D4 - - - | G3 - B3 - E4 - - - | A3 - C4 - E4 - - - | A3 - C4 - E4 - - - | F3 - A3 - C4 - - - | G3 - B3 - D4 - - - | G#3 - B3 - E4 - - -' },
      { wave: 'triangle', vol: .24, notes: 'E2 - - - - - - - | G2 - - - - - - - | E2 - - - - - - - | A1 - - - - - - - | A1 - - - G1 - - - | F1 - - - G1 - - - | E2 - - - G2 - - - | E2 - - - - - - -' }] },
    card: { bpm: 120, steps: 2, tracks: [
      { wave: 'organ', vol: .07, notes: 'E4 - G4 - B4 - A4 - | G4 - E4 - D4 - E4 -' },
      { wave: 'triangle', vol: .24, notes: 'E2 . E2 . G2 . A2 . | C2 . C2 . D2 . E2 .' },
      { wave: 'drums', vol: .07, notes: 'k . h . s . h .' }] }
  };
  /* goal stings: two bars per team, played over the horn */
  const STING_NOTES = { muk: 'G4 B4 D5 G5 - E5 G5 -', dry: 'E4 G4 A4 B4 - D5 B4 -', log: 'D4 F#4 A4 D5 - A4 D5 -', grd: 'E4 E4 G4 Bb4 - A4 E5 -', meg: 'C5 E5 G5 C6 - G5 C6 -', gld: 'D5 F#5 A5 D6 - A5 D6 -' };
  for (const k in STING_NOTES) SONGS['sting-' + k] = { bpm: 160, steps: 2, loop: false, tracks: [{ wave: 'brass', vol: .11, lp: 2600, notes: STING_NOTES[k] + ' | . . . . . . . .' }, { wave: 'organ', vol: .06, notes: STING_NOTES[k].replace(/(\d)/g, m => String(+m - 1)) + ' | . . . . . . . .' }, { wave: 'drums', vol: .1, notes: 'k . s . k k s . | o . . . . . . .' }] };
  let current = null;
  function music(name, o = {}) {
    if (HUB && Net && Net.ended) return;
    if (name === current && !o.restart) return; current = name;
    A.music(name ? SONGS[name] || null : null, Object.assign({ fade: .8 }, o));
  }
  const layer = (n, v, f) => { if (current === 'play') A.layer(n, v, f); };
  const sting = name => { if (SONGS[name]) A.sting(SONGS[name], { at: 'beat', duck: .25 }); };
  return { say, letter, voiceFn, horn, crowd, crowdOff, swell, chant, claps, organ, STINGS, sfx, music, layer, sting, SONGS, FX, get song() { return current; }, get bed() { return bedLevel; } };
})();
