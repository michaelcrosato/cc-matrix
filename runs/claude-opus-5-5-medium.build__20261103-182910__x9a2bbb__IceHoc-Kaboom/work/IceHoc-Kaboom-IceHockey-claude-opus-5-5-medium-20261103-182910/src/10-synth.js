/* ---- Synth: every sound in code. Babble voices, the goal horn, the organ, the crowd bed, sfx and songs (PLAN 10) ---- */
const Synth = (() => {
  // a phrase as sfx voices with delays: notes 'G4 C5 E5 . G5' (a '.' rests), one per step of `step` seconds
  const phrase = (wave, notes, step, vol = .16, o = {}) => notes.split(/\s+/).filter(Boolean).map((n, i) => n === '.' ? null : Object.assign({ wave, freq: n, dur: step * (o.len || .95), vol, delay: i * step, hold: true, attack: .01, vib: o.vib }, o.lp ? { lp: o.lp } : {})).filter(Boolean);
  const SFX = {
    swish: { wave: 'noise', freq: 2400, to: 1400, dur: .09, vol: .07, filter: 'bandpass', q: 1.5 },
    hstop: [{ wave: 'noise', freq: 5000, to: 1800, dur: .32, vol: .18, filter: 'bandpass', q: 2 }, { wave: 'noise', freq: 9000, to: 4000, dur: .2, vol: .06, filter: 'highpass' }],
    tock: { wave: 'triangle', freq: 900, to: 500, dur: .04, vol: .14 },
    thwap: [{ wave: 'noise', freq: 1800, to: 700, dur: .06, vol: .2, filter: 'bandpass', q: 3 }, { wave: 'triangle', freq: 300, to: 160, dur: .05, vol: .12 }],
    snap: [{ wave: 'noise', freq: 3000, to: 900, dur: .07, vol: .26, filter: 'bandpass', q: 2 }, { wave: 'square', freq: 220, to: 90, dur: .05, vol: .08 }],
    slap: [{ wave: 'noise', freq: 4000, to: 600, dur: .12, vol: .34, filter: 'bandpass', q: 1.2 }, { wave: 'square', freq: 160, to: 50, dur: .09, vol: .14 }, { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .1, filter: 'lowpass', delay: .02 }],
    onetimer: [{ wave: 'noise', freq: 5000, to: 500, dur: .14, vol: .4, filter: 'bandpass', q: 1 }, { wave: 'square', freq: 200, to: 45, dur: .12, vol: .18 }],
    ping: [{ wave: 'triangle', freq: 1850, dur: .9, vol: .3 }, { wave: 'triangle', freq: 1862, dur: .7, vol: .14 }, { wave: 'sine', freq: 3700, dur: .25, vol: .05 }],
    bar: [{ wave: 'triangle', freq: 2100, dur: 1, vol: .3 }, { wave: 'triangle', freq: 2114, dur: .8, vol: .14 }],
    boards: [{ wave: 'sine', freq: 110, to: 55, dur: .14, vol: .3 }, { wave: 'noise', freq: 700, to: 200, dur: .16, vol: .14, filter: 'lowpass' }],
    glassclack: [{ wave: 'noise', freq: 3500, dur: .05, vol: .2, filter: 'bandpass', q: 4 }, { wave: 'triangle', freq: 1300, to: 1200, dur: .25, vol: .07 }],
    net: { wave: 'noise', freq: 1500, to: 600, dur: .25, vol: .14, filter: 'bandpass', q: .8 },
    thump: [{ wave: 'sine', freq: 140, to: 60, dur: .12, vol: .32 }, { wave: 'noise', freq: 500, to: 150, dur: .1, vol: .12, filter: 'lowpass' }],
    bighit: [{ wave: 'sine', freq: 90, to: 35, dur: .3, vol: .5 }, { wave: 'noise', freq: 900, to: 120, dur: .3, vol: .24, filter: 'lowpass' }, { wave: 'noise', freq: 3000, to: 2000, dur: .3, vol: .06, filter: 'bandpass', q: 6, delay: .03 }],
    crack: [{ wave: 'noise', freq: 6000, dur: .04, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 1800, to: 900, dur: .05, vol: .06 }],
    shatter: [{ wave: 'noise', freq: 5000, to: 1500, dur: .6, vol: .32, filter: 'bandpass', q: .7 }].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => ({ wave: 'sine', freq: 2400 + ((i * 397) % 2400), to: 1200 + ((i * 211) % 900), dur: .2 + (i % 4) * .08, vol: .04, delay: i * .035 }))),
    whistle: [{ wave: 'square', freq: 2350, vib: [28, .05], dur: .26, vol: .1, hold: true }, { wave: 'square', freq: 2100, vib: [28, .05], dur: .3, vol: .1, hold: true, delay: .28 }],
    whistle1: { wave: 'square', freq: 2300, vib: [28, .05], dur: .4, vol: .1, hold: true },
    horn: [{ wave: 'brass', freq: 98, dur: 3, vol: .22, hold: true, attack: .25, lp: 900 }, { wave: 'brass', freq: 147, dur: 3, vol: .2, hold: true, attack: .25, lp: 900 }, { wave: 'brass', freq: 196, dur: 3, vol: .16, hold: true, attack: .25, lp: 900 }, { wave: 'noise', freq: 400, dur: 3, vol: .05, filter: 'lowpass', hold: true }],
    buzzer: [{ wave: 'square', freq: 220, dur: 1.5, vol: .14, hold: true }, { wave: 'square', freq: 223, dur: 1.5, vol: .1, hold: true }],
    punch: [{ wave: 'sine', freq: 160, to: 60, dur: .1, vol: .36 }, { wave: 'noise', freq: 1200, to: 300, dur: .08, vol: .18, filter: 'lowpass' }],
    whoosh: { wave: 'noise', freq: 400, to: 2400, dur: .18, vol: .1, filter: 'bandpass', q: 1 },
    twinkle: phrase('triangle', 'E6 B6 E7', .05, .06),
    pickup: phrase('square', 'C5 E5 G5 C6', .045, .1),
    throw: { wave: 'noise', freq: 600, to: 2000, dur: .3, vol: .08, filter: 'bandpass' },
    splort: [{ wave: 'noise', freq: 400, to: 120, dur: .2, vol: .24, filter: 'lowpass' }, { wave: 'sine', freq: 220, to: 70, dur: .18, vol: .2 }],
    kaboom: [{ wave: 'noise', freq: 1200, to: 60, dur: 1, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 70, to: 25, dur: 1.2, vol: .6 }, { wave: 'saw', freq: 110, to: 40, dur: .6, vol: .12, lp: 600 }],
    engine: { wave: 'saw', freq: 55, to: 60, dur: .16, vol: .08, lp: 400 },
    aooga: [{ wave: 'saw', freq: 220, to: 320, dur: .35, vol: .14, lp: 1400 }, { wave: 'saw', freq: 320, to: 200, dur: .4, vol: .14, lp: 1400, delay: .36 }],
    splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .6, vol: .3, filter: 'bandpass', q: .6 }, { wave: 'sine', freq: 300, to: 80, dur: .3, vol: .2 }],
    move: { wave: 'organ', freq: 'E5', dur: .06, vol: .07 },
    pick: phrase('organ', 'C5 G5', .06, .09),
    back: phrase('organ', 'G4 C4', .06, .08),
    star: phrase('triangle', 'C6 E6 G6 C7', .07, .1),
    deny: { wave: 'square', freq: 180, to: 140, dur: .15, vol: .1 },
    clack: [{ wave: 'noise', freq: 2400, dur: .03, vol: .14, filter: 'bandpass', q: 5 }, { wave: 'triangle', freq: 700, dur: .03, vol: .08, delay: .05 }],
    zip: { wave: 'saw', freq: 300, to: 1600, dur: .25, vol: .08, lp: 2400 }
  };
  const STINGS = {
    charge: phrase('organ', 'G4 C5 E5 G5 . E5 G5 - -', .12, .14, { vib: [6, .004] }),
    walkup: phrase('organ', 'C4 C#4 D4 D#4 E4 F4 F#4 G4', .09, .1, { vib: [6, .004] }),
    clap: phrase('organ', 'G4 G4 G4 . A4 G4', .14, .12, { vib: [6, .004] }),
    sad: phrase('brass', 'G3 F#3 F3 E3 - -', .28, .14, { lp: 1200 }),
    fight: phrase('organ', 'A3 C4 A3 D#4 A3 C4 B3 G#3', .12, .12, { vib: [6, .004] })
  };
  const VOICES = {   // babble voices (PLAN 10.1)
    marge: { base: 150, range: 3, speed: 9, wave: 'saw', fs: .9, gruff: .35 }, dunny: { base: 210, range: 4, speed: 13, wave: 'pulse', fs: 1.05, gruff: .05 },
    snipes: { base: 320, range: 5, speed: 16, wave: 'pulse', fs: 1.15, gruff: 0 }, lou: { base: 95, range: 2, speed: 8, wave: 'saw', fs: .85, gruff: .1 },
    lemmy: { base: 190, range: 6, speed: 11, wave: 'pulse', fs: 1, gruff: .05, vib: 7 }, glitter: { base: 260, range: 5, speed: 15, wave: 'saw', fs: 1.15, gruff: 0 },
    chuck: { base: 230, range: 4, speed: 18, wave: 'pulse', fs: 1.05, gruff: 0 }, moose: { base: 120, range: 3, speed: 11, wave: 'saw', fs: .9, gruff: .3 },
    ref: { base: 170, range: 2, speed: 8, wave: 'square', fs: 1, gruff: .1 }, gus: { base: 110, range: 1, speed: 6, wave: 'saw', fs: .85, gruff: .4 },
    pete: { base: 140, range: 6, speed: 12, wave: 'saw', fs: .6, gruff: .2 }, mid: { base: 180, range: 4, speed: 13, wave: 'pulse', fs: 1, gruff: .1 },
    low: { base: 125, range: 3, speed: 11, wave: 'saw', fs: .9, gruff: .2 }, gruff: { base: 110, range: 3, speed: 10, wave: 'saw', fs: .85, gruff: .45 },
    nasal: { base: 240, range: 5, speed: 15, wave: 'pulse', fs: 1.2, gruff: 0 }, doris: { base: 280, range: 4, speed: 10, wave: 'pulse', fs: 1.1, gruff: .05 },
    vault: { base: 70, range: 1, speed: 4, wave: 'saw', fs: .7, gruff: .4 }
  };
  const FORM = { a: [800, 1200], e: [500, 1900], i: [300, 2300], o: [500, 900], u: [350, 700], y: [300, 2300] };
  let live = 0, crowd = null;
  function ctxOk() { const c = A.ctx; return c && c.state === 'running' && !A.muted ? c : null; }
  /** a line as gibberish: each sounding letter a 55-85 ms formant blip (vowels; consonants as onsets) */
  function babble(text, vname, o = {}) {
    const c = ctxOk(); if (!c || live > 60) return 0;
    const v = VOICES[vname] || VOICES.mid, bus = A.bus('voice'); if (!bus) return 0;
    const s = String(text).toLowerCase().replace(/\{[^}]*\}/g, '').slice(0, o.max || 60);
    let t = c.currentTime + .01 + (o.delay || 0), n = 0, lastCons = false;
    const sounds = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ',' ) { t += .12; continue; } if (ch === '.' || ch === '?' || ch === '!') { t += .2; continue; }
      if (!/[a-z]/.test(ch)) { if (ch === ' ') t += .025; continue; }
      const vowel = /[aeiouy]/.test(ch);
      if (!vowel && lastCons) continue; lastCons = !vowel;
      let vv = ch; if (!vowel) { for (let k = i + 1; k < s.length; k++) if (/[aeiouy]/.test(s[k])) { vv = s[k]; break; } if (!FORM[vv]) vv = 'a'; }
      const h = (U.hashStr(vname + s.slice(Math.max(0, i - 2), i + 1)) % 1000) / 1000;
      sounds.push({ t, vv, cons: !vowel && /[stkpcfx]/.test(ch), semi: (h * 2 - 1) * v.range, i });
      t += 1 / v.speed + .015; n++;
      if (n > (o.maxSyl || 26)) break;
    }
    const lastQ = /\?\s*$/.test(s), excl = /!\s*$/.test(s);
    sounds.forEach((sd, k) => {
      const end = k >= sounds.length - 4 && excl ? 4 : 0, f = v.base * Math.pow(2, (sd.semi + end) / 12) * (o.pitch || 1), dur = .055 + (sd.i % 3) * .01;
      const osc = c.createOscillator(), g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), mix = c.createGain();
      if (v.wave === 'pulse') osc.setPeriodicWave(A._pulse(.25)); else osc.type = v.wave === 'saw' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(f, sd.t);
      if (lastQ && k === sounds.length - 1) osc.frequency.linearRampToValueAtTime(f * 1.4, sd.t + dur);
      if (v.vib) osc.frequency.setValueAtTime(f * (1 + .03 * Math.sin(sd.t * v.vib * 6)), sd.t + dur * .5);
      const [a, b] = FORM[sd.vv] || FORM.a;
      f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7; f1.frequency.value = a * v.fs; f2.frequency.value = b * v.fs;
      osc.connect(f1); osc.connect(f2); f1.connect(mix); f2.connect(mix); mix.gain.value = 2.2; mix.connect(g);
      g.gain.setValueAtTime(0, sd.t); g.gain.linearRampToValueAtTime(.32 * (o.vol || 1), sd.t + .008); g.gain.exponentialRampToValueAtTime(.001, sd.t + dur);
      g.connect(bus); osc.start(sd.t); osc.stop(sd.t + dur + .02); live++; osc.onended = () => { live--; };
      if (sd.cons || v.gruff > .2) {
        const nz = c.createBufferSource(), ng = c.createGain(), nf = c.createBiquadFilter(); nz.buffer = A._noise; nf.type = 'highpass'; nf.frequency.value = sd.cons ? 3000 : 900;
        ng.gain.setValueAtTime(sd.cons ? .08 : v.gruff * .06, sd.t); ng.gain.exponentialRampToValueAtTime(.001, sd.t + (sd.cons ? .015 : dur));
        nz.connect(nf); nf.connect(ng); ng.connect(bus); nz.start(sd.t, (k * .137) % .5); nz.stop(sd.t + dur);
      }
    });
    return t - c.currentTime;
  }
  /** the Dialog's per-letter voice hook: one blip every second letter in the speaker's voice */
  const dialogVoice = vname => (ch, n) => { if (n % 2 === 0 && /[a-z]/i.test(ch)) babble(ch + 'a', vname, { maxSyl: 1 }); };
  /** the crowd bed: two looped noise bands whose level follows excitement */
  function crowdBed(level) {
    const c = ctxOk(); if (!c) return;
    if (!crowd) {
      const bus = A.bus('sfx'); if (!bus) return;
      const out = c.createGain(); out.gain.value = 0; out.connect(bus);
      for (const [f, q] of [[420, .9], [1250, 1.2]]) { const src = c.createBufferSource(), bf = c.createBiquadFilter(); src.buffer = A._noise; src.loop = true; bf.type = 'bandpass'; bf.frequency.value = f; bf.Q.value = q; src.connect(bf); bf.connect(out); src.start(); }
      crowd = { out };
    }
    const vol = (S().crowd === undefined ? .7 : S().crowd) * level * .5;
    crowd.out.gain.setTargetAtTime(vol, c.currentTime, .3);
  }
  const react = kind => {   // the crowd's one-shot reactions
    const k = (S().crowd === undefined ? .7 : S().crowd) * T.crowdHype; if (k <= 0) return;
    if (kind === 'ohh') A.sfx({ wave: 'noise', freq: 900, to: 300, dur: 1.1, vol: .2 * k, filter: 'bandpass', q: .8 });
    else if (kind === 'ahh') A.sfx({ wave: 'noise', freq: 700, to: 1200, dur: .9, vol: .16 * k, filter: 'bandpass', q: .8 });
    else if (kind === 'cheer') { A.sfx({ wave: 'noise', freq: 1400, to: 900, dur: 2.2, vol: .3 * k, filter: 'bandpass', q: .5 }); for (let i = 0; i < 4; i++) babble('wooo yeah', ['snipes', 'dunny', 'nasal', 'doris'][i], { delay: i * .15, vol: .5 * k, pitch: 1.2 }); }
    else if (kind === 'boo') { A.sfx({ wave: 'noise', freq: 300, to: 220, dur: 1.5, vol: .2 * k, filter: 'lowpass' }); for (let i = 0; i < 3; i++) babble('boooo', ['lou', 'moose', 'gruff'][i], { delay: i * .1, vol: .5 * k, pitch: .8 }); }
    else if (kind === 'chant') { for (let i = 0; i < 6; i++) babble('ka boom ka boom', ['dunny', 'snipes', 'lou', 'moose', 'doris', 'nasal'][i], { delay: i * .02, vol: .35 * k }); }
  };
  /* ---- songs (engine format; the new organ and brass waves) ---- */
  const rep = (s, n) => Array(n).fill(s).join(' | ');
  const SONGS = {
    theme: { bpm: 150, steps: 2, tracks: [
      { wave: 'square', vol: .07, notes: 'A4 . C5 E5 A5 - G5 E5 | F5 - E5 - C5 - A4 . | C5 . E5 G5 C6 - B5 G5 | B5 - A5 - G5 - D5 . | A4 . C5 E5 A5 - G5 E5 | F5 - E5 - C5 - A4 . | C5 . E5 G5 C6 - B5 G5 | A5 - - - - - . .' },
      { wave: 'saw', vol: .05, lp: 1400, notes: 'A3 - - - E4 - - - | F3 - - - C4 - - - | C4 - - - G4 - - - | G3 - - - D4 - - -' },
      { wave: 'triangle', vol: .26, notes: 'A2 A2 A3 A2 A2 A2 A3 A2 | F2 F2 F3 F2 F2 F2 F3 F2 | C3 C3 C4 C3 C3 C3 C4 C3 | G2 G2 G3 G2 G2 G2 G3 G2' },
      { wave: 'drums', vol: .11, notes: 'k . h . s . h . | k k h . s . h h' }] },
    menu: { bpm: 108, steps: 2, tracks: [
      { wave: 'organ', vol: .07, notes: 'A4 - C5 - E5 - . . | F4 - A4 - C5 - . . | C5 - E5 - G5 - . . | B4 - D5 - G4 - . .' },
      { wave: 'triangle', vol: .22, notes: 'A2 . . A2 . . E3 . | F2 . . F2 . . C3 . | C3 . . C3 . . G3 . | G2 . . G2 . . D3 .' },
      { wave: 'drums', vol: .06, notes: 'k . h . s . h . | k . h h s . h .' }] },
    locker: { bpm: 92, steps: 4, tracks: [
      { wave: 'organ', vol: .05, notes: 'E3 - - - - - - - G3 - - - - - - - | A3 - - - - - - - B3 - - - - - - -' },
      { wave: 'saw', vol: .1, lp: 600, notes: 'E2 . . E2 . . G2 . E2 . . E2 . . D2 . | A2 . . A2 . . C3 . B2 . . B2 . . F#2 .' },
      { wave: 'drums', vol: .09, notes: 'k . . h s . h . k . k h s . h h' }] },
    pond: { bpm: 120, steps: 3, tracks: [
      { wave: 'pulse', vol: .07, notes: 'D5 E5 F#5 A5 . F#5 G5 F#5 E5 D5 . . | B4 C#5 D5 E5 . D5 C#5 B4 A4 A4 . . | D5 E5 F#5 A5 . B5 A5 F#5 D5 E5 . . | A4 B4 C#5 D5 . . D5 . . . . .' },
      { wave: 'triangle', vol: .22, notes: 'D3 . . A3 . . D3 . . A3 . . | G2 . . D3 . . A2 . . E3 . .' },
      { wave: 'drums', vol: .05, notes: 'k . . h . . s . . h . .' }] },
    grind: { bpm: 170, steps: 2, tracks: [
      { wave: 'square', vol: .06, notes: 'E5 E5 G5 E5 A5 G5 E5 D5 | E5 E5 G5 E5 B5 A5 G5 . ' },
      { wave: 'saw', vol: .06, lp: 1600, notes: 'E3 E3 E3 E3 G3 G3 A3 A3 | E3 E3 E3 E3 C4 C4 B3 B3' },
      { wave: 'triangle', vol: .24, notes: 'E2 E2 E2 E2 G2 G2 A2 A2 | E2 E2 E2 E2 C3 C3 B2 B2' },
      { wave: 'drums', vol: .12, notes: 'k h s h k k s h' }] },
    mall: { bpm: 118, steps: 2, tracks: [
      { wave: 'pulse12', vol: .07, notes: 'C5 E5 G5 E5 A5 G5 E5 C5 | D5 F5 A5 F5 G5 - - . | C5 E5 G5 E5 A5 G5 E5 C5 | B4 D5 G5 D5 C5 - - .' },
      { wave: 'square', vol: .04, notes: 'C4 . E4 . G4 . E4 . | D4 . F4 . A4 . F4 . | C4 . E4 . G4 . E4 . | G3 . B3 . D4 . B3 .' },
      { wave: 'triangle', vol: .2, notes: 'C3 C3 . C3 C3 . C3 . | F2 F2 . F2 G2 . G2 . | C3 C3 . C3 A2 . A2 . | G2 G2 . G2 C3 . C3 .' },
      { wave: 'drums', vol: .08, notes: 'k . h k s . h . | k . h k s h h .' }] },
    final: { bpm: 132, steps: 2, tracks: [
      { wave: 'brass', vol: .09, lp: 2400, notes: 'D5 - - A4 D5 - F5 - | E5 - - C5 E5 - G5 - | F5 - E5 - D5 - C5 - | A4 - - - - - . . ' },
      { wave: 'organ', vol: .05, notes: 'D4 - - - - - - - | C4 - - - - - - - | Bb3 - - - - - - - | A3 - - - - - - -' },
      { wave: 'triangle', vol: .26, notes: 'D2 D2 D3 D2 D2 D2 D3 D2 | C2 C2 C3 C2 C2 C2 C3 C2 | Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1 | A1 A1 A2 A1 A1 A1 A2 A1' },
      { wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k s s s' }] },
    play: { bpm: 128, steps: 2, tracks: [
      { wave: 'triangle', vol: .16, notes: 'E2 . E2 . . E2 G2 . | A2 . A2 . . A2 B2 .' },
      { wave: 'drums', vol: .05, notes: 'k . h . . . h . | k . h . . h h .' },
      { name: 'drive', on: false, wave: 'saw', vol: .05, lp: 1200, notes: 'E3 E3 G3 E3 A3 A3 B3 A3' },
      { name: 'drive2', on: false, wave: 'drums', vol: .08, notes: 'k h s h k h s h' },
      { name: 'kaboom', on: false, wave: 'saw', vol: .09, lp: 900, notes: 'E2 E2 E3 E2 G2 G2 G3 A2' },
      { name: 'kaboom2', on: false, wave: 'drums', vol: .14, notes: 'k k s k k s s s' },
      { name: 'fight', on: false, wave: 'organ', vol: .07, notes: 'A3 C4 A3 D#4 A3 C4 B3 G#3' }] },
    flood: { bpm: 150, steps: 1, tracks: [
      { wave: 'organ', vol: .09, notes: 'G4 - B4 | D5 - - | C5 - E5 | D5 - - | B4 - G4 | A4 - B4 | C5 - A4 | G4 - - | E5 - G5 | F#5 - - | D5 - F#5 | E5 - - | C5 - E5 | D5 - B4 | A4 - F#4 | G4 - -', vib: [6, .004] },
      { wave: 'triangle', vol: .18, notes: 'G2 D3 D3 | G2 D3 D3 | C3 G3 G3 | G2 D3 D3 | E2 B2 B2 | D2 A2 A2 | D2 A2 A2 | G2 D3 D3' }] },
    victory: { bpm: 140, steps: 2, loop: false, tracks: [
      { wave: 'brass', vol: .12, lp: 2600, notes: 'C5 . C5 . C5 E5 G5 - | E5 - G5 - C6 - - - | - - - - . . . .' },
      { wave: 'organ', vol: .06, notes: 'C4 - - - - - - - | C4 - E4 - G4 - - - | - - - - . . . .' },
      { wave: 'drums', vol: .1, notes: 'k . s . k . s . | k k s . c . . .' }] },
    defeat: { bpm: 80, steps: 2, loop: false, tracks: [{ wave: 'brass', vol: .12, lp: 1200, notes: 'G4 - F#4 - F4 - E4 - - - - - . . . .' }] },
    credits: { bpm: 96, steps: 2, tracks: [
      { wave: 'triangle', vol: .1, notes: 'A4 . C5 E5 A5 - G5 E5 | F5 - E5 - C5 - A4 . | C5 . E5 G5 C6 - B5 G5 | A5 - - - - - . .' },
      { wave: 'organ', vol: .05, notes: 'A3 - - - - - - - | F3 - - - - - - - | C4 - - - - - - - | E4 - - - - - - -' },
      { wave: 'triangle', vol: .18, notes: 'A2 . . . E3 . . . | F2 . . . C3 . . . | C3 . . . G3 . . . | E2 . . . B2 . . .' }] }
  };
  for (const k in SFX) A.define(k, SFX[k]);
  const sting = name => { if (STINGS[name]) A.sfx(STINGS[name]); };
  const goalSting = team => { const t = TEAMS[team]; if (!t) return; A.sfx(phrase('brass', t.song.join(' ') + ' - ' + t.song[3], .16, .12, { lp: 2400, delay: 0 }).map(v => Object.assign(v, { delay: v.delay + .4 }))); };
  let cur = null;
  const music = (name, o) => { if (cur === name && !(o && o.restart)) return; cur = name; A.music(name ? SONGS[name] : null, Object.assign({ fade: .6 }, o || {})); };
  const layer = (name, on) => { if (!A.song) return; try { A.layer(name, on ? 1 : 0, .6); } catch (e) { /* the song playing has no such layer */ } };
  function applyVolumes() { A.voiceVolume = S().voices === undefined ? .8 : S().voices; A.applyVolume(); }
  return { SFX, STINGS, VOICES, SONGS, babble, dialogVoice, crowdBed, react, sting, goalSting, music, layer, applyVolumes, phrase, get current() { return cur; } };
})();
