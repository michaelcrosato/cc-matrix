/* =====================================================================================================================
 * AUDIO: all of it written in code. KC.Voice is an Animalese/Simlish-style gibberish voice on Web Audio (a pulse, saw or
 * triangle source at the speaker's pitch through two formant band-passes, a consonant burst per syllable, prosody over the
 * line); the referee's calls have fixed rhythms; kiai shouts; a crowd of tiny voices over a noise bed. Songs use the
 * engine's sequencer (Japanese pentatonic: the in and yo scales); effects are audio.define voices.
 * Headless, nothing sounds, but speak() still returns a line's length (it drives dialog mouths and timings).
 * ===================================================================================================================== */
const VOWELS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
const CONS = c => 'pbtdkgcq'.includes(c) ? 'plosive' : 'fvszhjx'.includes(c) ? 'fricative' : 'mnlrwy'.includes(c) ? 'nasal' : null;
KC.Voice = {
  bus: null, vol: .8, muted: false,
  /** a line's syllables: [{ v: vowel, c: consonant class, stress, len }], the same every time for the same line */
  plan(text, rate = 14) {
    const words = String(text).toLowerCase().replace(/[^a-z!?.\s]/g, '').split(/\s+/).filter(Boolean), R = KC.rng(KC.hash(text)), out = [];
    for (const w of words) {
      const letters = w.replace(/[^a-z]/g, ''); if (!letters) continue;
      const n = Math.max(1, Math.min(5, Math.round(letters.length / 2)));
      for (let i = 0; i < n; i++) {
        const chunk = letters.slice(Math.floor(i * letters.length / n), Math.floor((i + 1) * letters.length / n)) || letters;
        const v = (chunk.match(/[aeiou]/) || [null])[0] || 'aeiou'[Math.floor(R() * 5)], c = CONS((chunk.match(/[^aeiou]/) || [''])[0]);
        out.push({ v, c, stress: i === 0 && n > 1 && R() < .7, len: 1 / rate * (.85 + R() * .3), jit: (R() * 2 - 1) * .03 });
      }
      if (out.length) out[out.length - 1].gap = /[!?.]$/.test(w) ? 2.2 / rate : .6 / rate;
    }
    return out;
  },
  /** speak text as speaker who (a roster id, 'genkotsu' or a voice object); returns its seconds */
  speak(text, who, o = {}) {
    const V = typeof who === 'object' && who ? who : who === 'genkotsu' ? KC.DATA.referee.voice : (KC.FIGHTER[who] && KC.FIGHTER[who].voice) || KC.DATA.narrator.voice;
    const P = this.plan(text, o.rate || V.rate), dur = P.reduce((s, p) => s + p.len + (p.gap || 0), 0);
    this._play(P, V, text, o);
    return dur;
  },
  /** a referee call: a fixed rhythm per call (syllables and the stressed one), slower and louder than speech */
  call(id, text) {
    const [n, st] = KC.CALL_RHYTHM[id] || [Math.max(1, Math.round(String(text).length / 3)), 0], V = KC.DATA.referee.voice, vs = (String(text).toLowerCase().match(/[aeiou]/g) || ['a']);
    const P = Array.from({ length: n }, (_, i) => ({ v: vs[i % vs.length], c: i === 0 ? 'plosive' : i % 2 ? 'nasal' : 'fricative', stress: i === st, len: (i === st ? .16 : .11) * (id === 'stop' || id === 'begin' ? 1.1 : 1), jit: 0 }));
    P[P.length - 1].len *= 1.6;
    this._play(P, Object.assign({}, V, { loud: 1.5, reverb: KC.scene && KC.scene.stage === 'stadium' }), text, { exclaim: /!/.test(text) });
    return P.reduce((s, p) => s + p.len, 0);
  },
  /** a kiai: one or two loud syllables with a pitch drop ('light' or 'heavy') */
  kiai(weight, who) {
    const V = (KC.FIGHTER[who] && KC.FIGHTER[who].voice) || KC.DATA.narrator.voice, heavy = weight === 'heavy';
    const P = heavy ? [{ v: 'i', c: 'plosive', stress: false, len: .05, jit: 0 }, { v: 'a', c: null, stress: true, len: .16, jit: 0, drop: true }] : [{ v: 'a', c: 'fricative', stress: true, len: .09, jit: 0, drop: true }];
    this._play(P, Object.assign({}, V, { loud: heavy ? 1.6 : 1.2, shout: true }), 'kiai', {});
  },
  ctx() { const A = KC.game && KC.game.audio; if (!A || !A._init || !A._init() || A.muted) return null; const c = A.ctx; if (!c || c.state !== 'running') return null; if (!this.bus) { this.bus = c.createGain(); this.bus.connect(A._master); } this.bus.gain.value = this.muted ? 0 : this.vol; return c; },
  _play(P, V, text, o) {
    const c = this.ctx(); if (!c) return;
    const A = KC.game.audio, f0 = V.f0 * (o.pitch || 1), fm = V.formant || 1, loud = (V.loud || 1) * .5, n = P.length;
    let t = c.currentTime + .01;
    const out = c.createGain(); out.gain.value = 1;
    if (V.reverb) { const d = c.createDelay(), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = .09; fb.gain.value = .35; wet.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(this.bus); setTimeout(() => { try { d.disconnect(); fb.disconnect(); wet.disconnect(); } catch (e) { /* gone */ } }, 3000); }
    out.connect(this.bus);
    P.forEach((p, i) => {
      // prosody: the line falls; an exclaim rises then falls hard, a question rises; the stressed syllable is louder and higher
      const k = n > 1 ? i / (n - 1) : 0, q = /\?\s*$/.test(text), ex = o.exclaim || /!\s*$/.test(text);
      let pitch = 1 - .12 * k + (p.stress ? .15 : 0) + p.jit; if (q && k > .7) pitch += .25 * (k - .7) / .3; if (ex) pitch += k < .7 ? .08 : -.18 * (k - .7) / .3;
      const f = f0 * pitch, len = p.len, vol = loud * (p.stress ? 1.25 : 1) * .9;
      const src = c.createOscillator();
      if (V.wave === 'pulse' || V.wave === 'pulse12') src.setPeriodicWave(A._pulse(V.wave === 'pulse' ? .25 : .125)); else src.type = V.wave === 'saw' ? 'sawtooth' : V.wave === 'square' ? 'square' : 'triangle';
      src.frequency.setValueAtTime(f, t); src.frequency.linearRampToValueAtTime(f * (p.drop ? .72 : .97), t + len);
      if (V.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = V.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + len + .05); }
      const [F1, F2] = VOWELS[p.v] || VOWELS.a, env = c.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + .005); env.gain.setValueAtTime(vol, t + Math.max(.006, len - .03)); env.gain.linearRampToValueAtTime(0, t + len);
      for (const [F, g2] of [[F1 * fm, 1], [F2 * fm, .6]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = F; b.Q.value = V.shout ? 3 : 5; const gg = c.createGain(); gg.gain.value = g2 * 2.2; src.connect(b); b.connect(gg); gg.connect(env); }
      if (V.shout) { const ws = c.createWaveShaper(), cv = new Float32Array(256); for (let j = 0; j < 256; j++) { const x = j / 128 - 1; cv[j] = Math.tanh(x * 2.5); } ws.curve = cv; env.connect(ws); ws.connect(out); } else env.connect(out);
      src.start(t); src.stop(t + len + .02);
      // the consonant: a burst of noise (plosive), a hiss (fricative), a hum (nasal); clicks for a clam
      if (p.c || V.rough || V.breath || V.clicks) {
        const nz = c.createBufferSource(); nz.buffer = A._noise; const nf = c.createBiquadFilter(), ng = c.createGain();
        const cd = p.c === 'plosive' ? .008 : p.c === 'fricative' ? .025 : p.c === 'nasal' ? .02 : len;
        nf.type = p.c === 'fricative' ? 'highpass' : 'bandpass'; nf.frequency.value = p.c === 'fricative' ? 3500 : p.c === 'nasal' ? 300 : 1800;
        const nv = p.c ? vol * (p.c === 'nasal' ? .25 : .5) : vol * ((V.rough || 0) + (V.breath || 0)) * .6;
        ng.gain.setValueAtTime(nv, t); ng.gain.linearRampToValueAtTime(0, t + cd); nz.connect(nf); nf.connect(ng); ng.connect(out); nz.start(t, Math.random() * .5); nz.stop(t + cd + .01);
        if (V.clicks && i % 2 === 0) { const ck = c.createOscillator(), cg = c.createGain(); ck.type = 'square'; ck.frequency.value = 2400; cg.gain.setValueAtTime(vol * .3, t); cg.gain.linearRampToValueAtTime(0, t + .006); ck.connect(cg); cg.connect(out); ck.start(t); ck.stop(t + .01); }
      }
      t += len + (p.gap || 0);
    });
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, (t - c.currentTime + 1) * 1000);
  },
  /** the crowd: tiny voices at random pitches over a band-passed bed, n of them over dur seconds */
  crowd(level = .5, dur = 1.2) {
    const c = this.ctx(); if (!c) return;
    const A = KC.game.audio, R = Math.random, t0 = c.currentTime + .01, out = c.createGain(); out.gain.value = .5 * level; out.connect(A._sfxBus);
    const nz = c.createBufferSource(); nz.buffer = A._noise; nz.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .7; const ng = c.createGain();
    ng.gain.setValueAtTime(0, t0); ng.gain.linearRampToValueAtTime(.35 * level, t0 + .15); ng.gain.linearRampToValueAtTime(0, t0 + dur); nz.connect(bp); bp.connect(ng); ng.connect(out); nz.start(t0); nz.stop(t0 + dur + .05);
    const n = Math.round(6 + 18 * level);
    for (let i = 0; i < n; i++) {
      const t = t0 + R() * dur * .8, f = 120 + R() * 180, o = c.createOscillator(), g = c.createGain(), b = c.createBiquadFilter();
      o.type = R() < .5 ? 'sawtooth' : 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (1.1 + R() * .3), t + .12);
      b.type = 'bandpass'; b.frequency.value = 600 + R() * 1400; b.Q.value = 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .02); g.gain.linearRampToValueAtTime(0, t + .14 + R() * .1);
      o.connect(b); b.connect(g); g.connect(out); o.start(t); o.stop(t + .3);
    }
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, (dur + 1) * 1000);
  }
};

/* ---- SOUND EFFECTS ---- */
KC.SFX = {
  whooshL: [{ wave: 'noise', freq: 1800, to: 600, dur: .12, vol: .22, filter: 'bandpass', q: 1.4 }],
  whooshH: [{ wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .3, filter: 'bandpass', q: 1.2 }],
  thwackHalf: [{ wave: 'noise', freq: 2400, to: 500, dur: .09, vol: .45, filter: 'bandpass', q: .9 }, { wave: 'sine', freq: 180, to: 70, dur: .12, vol: .45 }],
  thwackFull: [{ wave: 'noise', freq: 3000, to: 300, dur: .16, vol: .6, filter: 'bandpass', q: .7 }, { wave: 'sine', freq: 150, to: 40, dur: .25, vol: .7 }, { wave: 'square', freq: 90, to: 40, dur: .08, vol: .2 }],
  clack: [{ wave: 'square', freq: 1400, to: 900, dur: .03, vol: .25 }, { wave: 'noise', freq: 2600, dur: .05, vol: .3, filter: 'bandpass', q: 6 }],
  thudFall: [{ wave: 'sine', freq: 110, to: 40, dur: .22, vol: .6 }, { wave: 'noise', freq: 400, to: 120, dur: .2, vol: .35, filter: 'lowpass' }],
  land: [{ wave: 'sine', freq: 140, to: 60, dur: .08, vol: .3 }, { wave: 'noise', freq: 700, dur: .05, vol: .15, filter: 'lowpass' }],
  stepWood: [{ wave: 'noise', freq: 900, dur: .03, vol: .08, filter: 'bandpass', q: 3 }],
  pivot: [{ wave: 'noise', freq: 3000, to: 1500, dur: .05, vol: .06, filter: 'highpass' }],
  flagSnap: [{ wave: 'noise', freq: 2000, to: 4000, dur: .06, vol: .25, filter: 'bandpass', q: 2 }],
  whistle: [{ wave: 'sine', freq: 2500, dur: .5, vol: .22, vib: [28, .02], hold: true }],
  gong: [{ wave: 'sine', freq: 110, dur: 1.4, vol: .5 }, { wave: 'sine', freq: 164, dur: 1.2, vol: .25 }, { wave: 'triangle', freq: 233, dur: .9, vol: .15 }, { wave: 'noise', freq: 600, dur: .2, vol: .15, filter: 'bandpass' }],
  taikoHit: [{ wave: 'sine', freq: 90, to: 50, dur: .35, vol: .7 }, { wave: 'noise', freq: 300, to: 100, dur: .12, vol: .35, filter: 'lowpass' }],
  boardCrack: [{ wave: 'noise', freq: 2600, to: 400, dur: .18, vol: .55, filter: 'bandpass', q: .8 }, { wave: 'square', freq: 220, to: 60, dur: .08, vol: .25 }],
  potShatter: [{ wave: 'noise', freq: 4000, to: 1200, dur: .22, vol: .45, filter: 'highpass' }, { wave: 'triangle', freq: 1600, to: 900, dur: .1, vol: .15 }],
  bowlDing: [{ wave: 'sine', freq: 'E6', dur: .5, vol: .25 }, { wave: 'sine', freq: 'B6', dur: .4, vol: .12 }],
  bowlSplash: [{ wave: 'noise', freq: 1200, to: 300, dur: .3, vol: .35, filter: 'lowpass' }],
  bullSnort: [{ wave: 'noise', freq: 700, to: 300, dur: .35, vol: .4, filter: 'bandpass', q: 1.5 }],
  bullStomp: [{ wave: 'sine', freq: 80, to: 40, dur: .15, vol: .5 }],
  bullBellow: [{ wave: 'saw', freq: 120, to: 80, dur: .7, vol: .3, vib: [6, .04] }, { wave: 'saw', freq: 180, to: 120, dur: .6, vol: .15 }],
  bullThud: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .8 }, { wave: 'noise', freq: 500, to: 100, dur: .3, vol: .4, filter: 'lowpass' }],
  dizzy: [{ wave: 'triangle', freq: 'C6', dur: .5, vol: .15, arp: [0, 4, 7, 12, 7, 4], step: .06, loop: true }],
  gull: [{ wave: 'triangle', freq: 1400, to: 1900, dur: .12, vol: .08 }, { wave: 'triangle', freq: 1900, to: 1300, dur: .18, vol: .07, delay: .12 }],
  waves: [{ wave: 'noise', freq: 500, to: 300, dur: 1.4, vol: .12, filter: 'lowpass', attack: .5 }],
  creak: [{ wave: 'saw', freq: 90, to: 70, dur: .4, vol: .06 }],
  steamHiss: [{ wave: 'noise', freq: 5000, dur: .5, vol: .06, filter: 'highpass', attack: .1 }],
  cameraFlash: [{ wave: 'noise', freq: 6000, dur: .03, vol: .1, filter: 'highpass' }, { wave: 'sine', freq: 3000, to: 5000, dur: .08, vol: .04, delay: .02 }],
  bird: [{ wave: 'sine', freq: 2600, to: 3400, dur: .07, vol: .05 }, { wave: 'sine', freq: 3200, to: 2800, dur: .07, vol: .04, delay: .09 }],
  beltTie: [{ wave: 'noise', freq: 1500, dur: .1, vol: .2, filter: 'bandpass' }, { wave: 'square', freq: 'C6', dur: .08, vol: .12, delay: .12, arp: [0, 7, 12], step: .05 }],
  scoreTick: [{ wave: 'square', freq: 'A6', dur: .02, vol: .08 }],
  menuMove: [{ wave: 'pulse', freq: 'E5', dur: .04, vol: .12 }],
  menuOk: [{ wave: 'pulse', freq: 'A5', dur: .06, vol: .15, arp: [0, 7], step: .04 }],
  menuBack: [{ wave: 'pulse', freq: 'A4', to: 'E4', dur: .08, vol: .12 }],
  countBeep: [{ wave: 'square', freq: 'D6', dur: .08, vol: .15 }],
  chopWhoosh: [{ wave: 'noise', freq: 800, to: 200, dur: .25, vol: .35, filter: 'bandpass', q: 1 }]
};

/* ---- MUSIC (the engine's sequencer: steps per beat, tokens per step; drums k s h o c t) ---- */
const SONG = (bpm, steps, tracks) => ({ bpm, steps, tracks: tracks.map(([wave, vol, notes, name]) => ({ wave, vol, notes, name })) });
KC.SONGS = {
  title: SONG(132, 2, [
    ['square', .13, 'D5 . E5 G5 A5 . G5 E5 | D5 . E5 G5 B5 - A5 . | G5 . A5 B5 D6 - B5 A5 | G5 E5 D5 E5 G5 - - . | D5 . E5 G5 A5 . G5 E5 | D5 . E5 G5 B5 - A5 . | D6 . B5 A5 G5 . E5 G5 | A5 - - - D5 - - .'],
    ['pulse12', .07, 'A4 . . A4 . . A4 . | B4 . . B4 . . A4 . | B4 . . D5 . . D5 . | B4 . . A4 . . B4 . | A4 . . A4 . . A4 . | B4 . . B4 . . D5 . | E5 . . D5 . . B4 . | E5 . . . A4 . . .'],
    ['triangle', .3, 'D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . A2 . | E3 . E3 B2 G2 . G2 . | A2 . A2 E3 A2 . A2 . | D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . A2 . | E3 . E3 B2 G2 . A2 . | A2 . A2 E3 D3 . . .'],
    ['drums', .12, 't . h k s . h . | k . h k s . h h | t . h k s . h . | k k h . s . o . | t . h k s . h . | k . h k s . h h | t . h k s . h k | c . h . s s t t']]),
  dojo: SONG(96, 2, [
    ['pulse12', .12, 'D5 . . G5 A5 . . . | B5 . A5 . G5 . . . | E5 . . G5 D5 . . . | E5 . D5 . B4 . . . | D5 . . G5 A5 . . . | D6 . B5 . A5 . . . | G5 . E5 . D5 . E5 . | D5 . . . . . . .'],
    ['triangle', .25, 'D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . B2 . . . | A2 . . . E3 . . . | D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . A2 . . . | D3 . . . D3 . . .'],
    ['drums', .1, 't . . . . . k . | t . . . s . . . | t . . . . . k . | t . . t s . . .']]),
  harbor: SONG(120, 2, [
    ['square', .11, 'G5 . A5 B5 D6 . B5 A5 | G5 . E5 . D5 . . . | E5 . G5 A5 B5 . A5 G5 | A5 . . . . . . . | G5 . A5 B5 D6 . E6 D6 | B5 . A5 . G5 . E5 . | D5 . E5 G5 A5 . B5 A5 | G5 . . . . . . .'],
    ['triangle', .28, 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | E2 . B2 . E2 . B2 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . . .'],
    ['drums', .1, 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k k h . s . o .']]),
  bamboo: SONG(84, 2, [
    ['triangle', .2, 'A5 - - - G5 . E5 . | D5 - - - . . . . | E5 . G5 . A5 - - - | B5 . A5 . G5 - - - | A5 - - - D6 - B5 . | A5 - - - G5 . . . | E5 . D5 . E5 . G5 . | D5 - - - . . . .', 'flute'],
    ['sine', .2, 'D3 - - - - - - - | A2 - - - - - - - | E3 - - - - - - - | G2 - - - - - - -'],
    ['drums', .05, 'h . . h . . h . | h . h . . . h .']]),
  gorge: SONG(140, 2, [
    ['pulse', .12, 'D4 D4 Eb4 D4 G4 D4 Eb4 D4 | D4 D4 Eb4 D4 A4 G4 Eb4 D4 | Bb3 Bb3 D4 Bb3 Eb4 D4 Bb3 A3 | D4 D4 Eb4 D4 G4 A4 Bb4 A4'],
    ['square', .1, 'D5 - - - . . Eb5 D5 | G5 - - - A5 - G5 . | Bb5 - A5 - G5 - Eb5 . | D5 - - - . . . .'],
    ['drums', .12, 'k . t . s t t . | k . t k s . t t | k . t . s t t . | k k t . s . c .']]),
  ship: SONG(110, 3, [
    ['square', .11, 'D5 . E5 G5 . E5 | D5 . . B4 . . | G4 . A4 B4 . D5 | E5 . . D5 . . | D5 . E5 G5 . A5 | B5 . . A5 . . | G5 . E5 D5 . E5 | D5 . . . . .'],
    ['pulse', .07, 'B4 . . B4 . . | G4 . . G4 . . | D4 . . D4 . . | A4 . . A4 . . | B4 . . B4 . . | D5 . . D5 . . | B4 . . A4 . . | B4 . . . . .'],
    ['triangle', .28, 'G2 . . D3 . . | G2 . . D3 . . | E2 . . B2 . . | A2 . . E3 . . | G2 . . D3 . . | G2 . . D3 . . | C3 . . D3 . . | G2 . . . . .'],
    ['drums', .1, 'k . h s . h | k . h s . h | k . h s . h | k . h s s h']]),
  market: SONG(124, 2, [
    ['sine', .18, 'A5 B5 A5 G5 E5 . G5 . | A5 . D6 . B5 A5 G5 . | E5 G5 A5 B5 A5 . G5 E5 | D5 . E5 . G5 . . . | A5 B5 A5 G5 E5 . G5 . | A5 . D6 . E6 D6 B5 . | A5 G5 E5 G5 A5 . B5 A5 | G5 . . . . . . .', 'flute'],
    ['triangle', .25, 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E3 . B2 . E3 . B2 . | A2 . E3 . A2 . E3 .'],
    ['drums', .13, 't . h t s . h h | t . h t s . h . | t t h t s . h h | t . h t s s o .']]),
  fuji: SONG(100, 4, [
    ['square', .08, 'D5 G5 B5 G5 D5 G5 B5 G5 E5 A5 C6 A5 E5 A5 C6 A5 | B4 E5 G5 E5 B4 E5 G5 E5 A4 D5 F#5 D5 A4 D5 F#5 D5'],
    ['triangle', .22, 'G2 - - - - - - - A2 - - - - - - - | E2 - - - - - - - D2 - - - - - - -'],
    ['pulse12', .09, 'B5 - - - - - - - C6 - - - A5 - - - | G5 - - - - - - - F#5 - - - - - - -'],
    ['drums', .06, 't . . . h . . . s . . . h . . . | t . . . h . . . s . . . h . h .']]),
  stadium: SONG(150, 2, [
    ['square', .12, 'D5 D5 . D5 A5 . G5 . | F5 . E5 . D5 . C5 . | D5 D5 . D5 A5 . C6 . | A5 - - - G5 . A5 . | Bb5 . A5 . G5 . F5 . | E5 . F5 . G5 . A5 . | D6 . C6 . A5 . G5 . | A5 - - - - - . .'],
    ['pulse', .08, 'A4 A4 . A4 D5 . D5 . | D5 . C5 . A4 . G4 . | A4 A4 . A4 D5 . E5 . | E5 - - - D5 . E5 . | F5 . F5 . D5 . D5 . | C5 . C5 . D5 . E5 . | F5 . E5 . D5 . D5 . | E5 - - - - - . .'],
    ['triangle', .3, 'D3 D3 D3 D3 D3 D3 D3 D3 | Bb2 Bb2 Bb2 Bb2 C3 C3 C3 C3 | D3 D3 D3 D3 D3 D3 D3 D3 | A2 A2 A2 A2 A2 A2 A2 A2 | Bb2 Bb2 Bb2 Bb2 G2 G2 G2 G2 | C3 C3 C3 C3 A2 A2 A2 A2 | D3 D3 D3 D3 F3 F3 F3 F3 | A2 A2 A2 A2 A2 A2 A2 A2'],
    ['drums', .13, 'k h s h k k s h | k h s h k k s o | k h s h k k s h | k h s h s s t t']]),
  bonus: SONG(160, 2, [
    ['square', .1, 'G5 . G5 . A5 . G5 . | E5 . D5 . E5 . . . | G5 . G5 . A5 . B5 . | D6 . B5 . A5 . . . | G5 . G5 . A5 . G5 . | E5 . D5 . E5 . G5 . | A5 . B5 . A5 . G5 . | E5 . D5 . G5 . . .'],
    ['triangle', .25, 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | D3 . A2 . D3 . A2 .'],
    ['drums', .11, 'k h s h k h s h | k h s h k k s h']]),
  practice: SONG(90, 2, [
    ['pulse', .09, 'D5 . E5 . G5 . . . | A5 . G5 . E5 . . . | D5 . E5 . G5 . A5 . | B5 . . . A5 . . .'],
    ['triangle', .22, 'D3 . . . A2 . . . | G2 . . . A2 . . .'],
    ['drums', .05, 'k . h . . . h . | k . h . s . h .']]),
  select: SONG(128, 2, [
    ['square', .1, 'A4 . D5 . E5 . G5 . | A5 . G5 E5 D5 . . . | A4 . D5 . E5 . G5 . | B5 . A5 G5 A5 . . .'],
    ['triangle', .28, 'D3 . D3 . D3 . D3 . | G2 . G2 . G2 . G2 . | D3 . D3 . D3 . D3 . | A2 . A2 . A2 . A2 .'],
    ['drums', .1, 'k . h k s . h . | k . h k s . h h']]),
  session: SONG(110, 2, [
    ['pulse12', .1, 'D5 . G5 . A5 . . . | B5 . A5 . G5 . . . | E5 . G5 . A5 . . . | G5 . E5 . D5 . . .'],
    ['triangle', .24, 'D3 . . . G2 . . . | E3 . . . A2 . . .'],
    ['drums', .07, 't . . . s . . . | t . t . s . h .']]),
  continue: SONG(120, 2, [
    ['square', .1, 'D5 . . . D5 . . . | Eb5 . . . Eb5 . . . | D5 . . . D5 . . . | A4 . . . A4 . . .'],
    ['triangle', .26, 'D3 . D3 . D3 . D3 . | Eb3 . Eb3 . Eb3 . Eb3 . | D3 . D3 . D3 . D3 . | A2 . A2 . A2 . A2 .'],
    ['drums', .08, 'h . h . h . h . | h . h . h . h h']]),
  gameover: Object.assign(SONG(80, 2, [
    ['triangle', .22, 'A4 - G4 - Eb4 - - - | D4 - - - - - - - | Bb3 - A3 - G3 - - - | D3 - - - - - - -'],
    ['pulse12', .07, 'D4 - - - - - - - | Bb3 - - - - - - - | G3 - - - - - - - | D3 - - - - - - -']]), { loop: false }),
  ending: SONG(104, 2, [
    ['square', .1, 'D5 . E5 G5 A5 - G5 E5 | D5 . E5 G5 B5 - A5 - | G5 . A5 B5 D6 - B5 A5 | G5 - E5 - D5 - - - | D5 . E5 G5 A5 - G5 E5 | D5 . E5 G5 B5 - A5 - | D6 - B5 - A5 - G5 - | A5 - - - D6 - - -'],
    ['triangle', .25, 'D3 - - - A2 - - - | G2 - - - D3 - - - | E3 - - - B2 - - - | A2 - - - D3 - - -'],
    ['pulse12', .06, 'F#4 - - - A4 - - - | B4 - - - D5 - - - | G4 - - - B4 - - - | A4 - - - F#4 - - -'],
    ['drums', .07, 'k . h . s . h . | k . h . s . h h']])
};
KC.STINGS = {
  promotion: Object.assign(SONG(140, 4, [['square', .14, 'D5 . F#5 . A5 . D6 - - - - . A5 . D6 - - - - - - -'], ['triangle', .25, 'D3 - - - A3 - - - D3 - - - D4 - - - - - - - - - - -'], ['drums', .12, 'k . . . s . . . k . . . c . . . . . . . . . . .']]), { loop: false }),
  victory: Object.assign(SONG(150, 4, [['square', .13, 'G5 . A5 . B5 . D6 - - - B5 . D6 - - - - - - -'], ['triangle', .25, 'G2 - - - D3 - - - G3 - - - - - - - - - - -']]), { loop: false }),
  defeat: Object.assign(SONG(90, 2, [['triangle', .22, 'A4 - Eb4 - D4 - - -'], ['pulse12', .06, 'Eb4 - Bb3 - A3 - - -']]), { loop: false }),
  perfect: Object.assign(SONG(160, 4, [['square', .12, 'D6 . A5 . D6 . E6 . F#6 - - - - - - .'], ['pulse12', .08, 'A5 . F#5 . A5 . B5 . D6 - - - - - - .']]), { loop: false }),
  round: Object.assign(SONG(130, 4, [['triangle', .2, 'D4 - - - A4 - - - D5 - - -'], ['drums', .12, 't . . . t . . . c . . .']]), { loop: false })
};
KC.sfx = (name, o) => { const g = KC.game; if (g && g.audio) g.audio.sfx(name, o); };
KC.music = (id, o) => { const g = KC.game; if (!g || !g.audio) return; if (!id) { g.audio.music(null); return; } const s = KC.SONGS[id]; if (s) g.audio.music(s, o); };
KC.sting = id => { const g = KC.game, s = KC.STINGS[id]; if (g && g.audio && s) g.audio.sting(s); };
KC.defineSfx = game => { for (const k in KC.SFX) game.audio.define(k, KC.SFX[k]); };
