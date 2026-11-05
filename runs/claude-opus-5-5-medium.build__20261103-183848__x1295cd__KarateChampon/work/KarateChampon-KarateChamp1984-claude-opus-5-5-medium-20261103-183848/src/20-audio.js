/* ---- AUDIO: everything is synthesized. KC.Voice (Animalese/Simlish-style gibberish), the songs, the sound effects ---- */
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
const CONS = c => 'PBTDKGCQ'.includes(c) ? 'plo' : 'SFZXHJV'.includes(c) ? 'fri' : 'MNLRWY'.includes(c) ? 'nas' : null;
KC.Voice = {
  log: [],   // the last plans spoken (tests read them)
  /** the syllable plan for a line (deterministic: a hash of the line): [{ v, c, stress }], and its pace */
  plan(text, who, call) {
    const prof = (KC.ROSTER[who] || (who === 'genkotsu' ? KC.DATA.genkotsu : null) || { voice: { f0: 180, formant: 1, rate: 14, wave: 'square' } }).voice;
    const clean = String(text).toUpperCase().replace(/[^A-Z]/g, ''), vow = clean.replace(/[^AEIOU]/g, '') || 'A', h = U.hash(text + who);
    let n = call && KC.CALL_RHYTHM[call] ? KC.CALL_RHYTHM[call][0] : clamp(Math.ceil(clean.length / 2), 1, 26), stress = call && KC.CALL_RHYTHM[call] ? KC.CALL_RHYTHM[call][1] : h % Math.max(1, n);
    const syl = [];
    for (let i = 0; i < n; i++) { const ch = clean[(i * 2 + (h >> 3)) % Math.max(1, clean.length)] || 'A'; syl.push({ v: vow[(i + h) % vow.length].toLowerCase(), c: CONS(ch), stress: i === stress }); }
    const rate = call ? 9 : prof.rate, end = /\?\s*$/.test(text) ? 'q' : /!\s*$/.test(text) ? 'x' : /\.\.\.|…/.test(text) ? 's' : '.';
    return { syl, rate: end === 's' ? rate * .7 : rate, prof, end, dur: n / (end === 's' ? rate * .7 : rate) + .1 };
  },
  /** speak a line in a speaker's gibberish voice; returns its length in seconds (headless too: it drives timings) */
  speak(text, who, o = {}) {
    const P = this.plan(text, who, o.call); this.log.push({ text, who, n: P.syl.length, dur: P.dur }); if (this.log.length > 20) this.log.shift();
    if (DEV.muteVoices) return P.dur;
    const A = game.audio, c = A.ctx || (A._init && A._init()), bus = c && A.bus && A.bus('voice');
    if (!c || !bus || A.muted) return P.dur;
    try {
      let t = c.currentTime + .02; const step = 1 / P.rate, pr = P.prof, n = P.syl.length;
      const out = o.reverb ? this._reverb(c, bus) : bus;
      P.syl.forEach((s, i) => {
        const decl = 1 - .18 * i / Math.max(1, n - 1), endK = i === n - 1 ? (P.end === 'q' ? 1.25 : P.end === 'x' ? .82 : P.end === 's' ? .85 : .95) : 1;
        const jitter = 1 + ((U.hash(text + i) % 60) - 30) / 1000, f = pr.f0 * decl * endK * jitter * (s.stress ? 1.15 : 1) * (o.call ? 1.05 : 1);
        const vol = (o.call ? .5 : .32) * (s.stress ? 1.25 : 1), hold = step * .72;
        if (s.c) this._cons(c, out, t, s.c, vol);
        const osc = c.createOscillator(); osc.type = pr.wave === 'sawtooth' ? 'sawtooth' : pr.wave === 'triangle' ? 'triangle' : 'square'; osc.frequency.setValueAtTime(f, t);
        if (P.end === 'x' && i === n - 1) osc.frequency.linearRampToValueAtTime(f * .7, t + hold);
        if (P.end === 'q' && i === n - 1) osc.frequency.linearRampToValueAtTime(f * 1.3, t + hold);
        if (pr.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = pr.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + hold + .05); }
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, t + hold - .03); g.gain.linearRampToValueAtTime(0, t + hold);
        const [F1, F2] = FORMANTS[s.v] || FORMANTS.a;
        for (const [F, q, k] of [[F1 * pr.formant, 6, 1], [F2 * pr.formant, 9, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F; bp.Q.value = q; const gg = c.createGain(); gg.gain.value = k * 2.2; osc.connect(bp); bp.connect(gg); gg.connect(g); }
        if (pr.rough) { const ns = c.createBufferSource(); ns.buffer = A._noise; const ng = c.createGain(); ng.gain.value = pr.rough; ns.connect(ng); ng.connect(g); ns.start(t); ns.stop(t + hold); }
        g.connect(out); osc.start(t); osc.stop(t + hold + .02);
        t += step;
      });
    } catch (e) { game.fail('voice', e); }
    return P.dur;
  },
  _cons(c, out, t, kind, vol) {
    const A = game.audio;
    if (kind === 'nas') { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 160; const g = c.createGain(); g.gain.setValueAtTime(vol * .6, t); g.gain.linearRampToValueAtTime(0, t + .02); o.connect(g); g.connect(out); o.start(t); o.stop(t + .03); return; }
    const s = c.createBufferSource(); s.buffer = A._noise; const f = c.createBiquadFilter(); f.type = kind === 'fri' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'fri' ? 3500 : 1800;
    const g = c.createGain(), d = kind === 'fri' ? .025 : .008; g.gain.setValueAtTime(vol * .7, t); g.gain.linearRampToValueAtTime(0, t + d); s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + .01);
  },
  _reverb(c, bus) {
    if (this._rv && this._rv.c === c) return this._rv.input;
    const input = c.createGain(), d = c.createDelay(), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = .09; fb.gain.value = .35; wet.gain.value = .45;
    input.connect(bus); input.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(bus); this._rv = { c, input }; return input;
  },
  /** a kiai: one or two loud syllables with a pitch drop */
  kiai(who, heavy) {
    if (DEV.muteVoices) return;
    const A = game.audio, c = A.ctx, bus = c && A.bus && A.bus('voice'); if (!c || !bus || A.muted) return;
    const pr = (KC.ROSTER[who] || { voice: { f0: 180, formant: 1, wave: 'square' } }).voice, t = c.currentTime + .005, d = heavy ? .2 : .11;
    const o = c.createOscillator(); o.type = pr.wave === 'sawtooth' ? 'sawtooth' : 'square'; o.frequency.setValueAtTime(pr.f0 * 1.35, t); o.frequency.exponentialRampToValueAtTime(pr.f0 * .8, t + d);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 * pr.formant; bp.Q.value = 3; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(heavy ? .6 : .4, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(bp); bp.connect(g); g.connect(bus); o.start(t); o.stop(t + d + .02);
    this._cons(c, bus, t, 'plo', .5);
  },
  /** the crowd: tiny random blips over a noise bed, k 0..1 */
  crowd(k = .5, kind = 'cheer') {
    const A = game.audio, c = A.ctx, bus = c && A.bus && A.bus('voice'); if (!c || !bus || A.muted || DEV.muteVoices) return;
    const t = c.currentTime + .01, dur = .6 + k * 1.2, s = c.createBufferSource(); s.buffer = A._noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'ooh' ? 500 : 1100; f.Q.value = .8;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12 * k + .04, t + .15); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur);
    const r = U.rng((game.time * 1000) | 0);
    for (let i = 0; i < 6 + k * 14; i++) {
      const o = c.createOscillator(); o.type = 'square'; const tt = t + r() * dur * .7, f0 = 120 + r() * 180; o.frequency.setValueAtTime(f0, tt); o.frequency.linearRampToValueAtTime(f0 * (kind === 'ooh' ? .8 : 1.2), tt + .08);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'ooh' ? 450 : 900; bp.Q.value = 4; const gg = c.createGain(); gg.gain.setValueAtTime(0, tt); gg.gain.linearRampToValueAtTime(.05, tt + .01); gg.gain.linearRampToValueAtTime(0, tt + .09);
      o.connect(bp); bp.connect(gg); gg.connect(bus); o.start(tt); o.stop(tt + .1);
    }
  }
};

/* SONGS (Japanese pentatonic colour: in D Eb G A Bb, yo D E G A B), steps per beat 2 unless said */
const S = (bpm, tracks, steps = 2) => ({ bpm, steps, tracks });
const tr = (wave, vol, notes, o) => Object.assign({ wave, vol, notes }, o || {});
KC.SONGS = {
  title: S(132, [tr('square', .1, 'D5 - E5 G5 A5 - G5 E5 | D5 - B4 - A4 - . . | G4 A4 B4 D5 E5 - D5 B4 | A4 - - - D5 . D5 . | D5 - E5 G5 A5 - B5 A5 | G5 - E5 - D5 - . . | E5 G5 A5 B5 D6 - B5 A5 | G5 - - - . . D5 E5'),
    tr('triangle', .26, 'D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . D3 . | E2 . E2 B2 E2 . B2 . | A2 . A2 E3 A2 . A2 . | D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . D3 . | C3 . C3 G2 A2 . A2 . | D3 . A2 . D3 . . .'),
    tr('drums', .1, 'k h s h k k s h | k h s h k h s s')]),
  dojo: S(96, [tr('pulse12', .11, 'D5 . A4 . G4 A4 D5 . | Eb5 . D5 . A4 . . . | G4 . A4 Bb4 A4 . G4 . | D4 . . . . . . . | D5 . Eb5 D5 A4 . G4 . | A4 . Bb4 . A4 G4 D4 . | G4 A4 D5 . Eb5 . D5 . | A4 - - - . . . .'),
    tr('triangle', .22, 'D2 . . . A2 . . . | Bb2 . . . A2 . . . | G2 . . . A2 . . . | D2 . . . D2 . . .'), tr('drums', .09, 'k . . . o . . . | k . k . o . . t')]),
  harbor: S(120, [tr('square', .09, 'G4 A4 B4 D5 E5 . D5 B4 | A4 . G4 . E4 . . . | G4 A4 B4 D5 G5 . E5 D5 | E5 - - - . . . . | D5 E5 G5 . E5 D5 B4 . | A4 B4 D5 . B4 A4 G4 . | E4 G4 A4 . G4 E4 D4 . | G4 - - - . . . .'),
    tr('triangle', .26, 'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 .'), tr('drums', .1, 'k h s h k h s h')]),
  bamboo: S(84, [tr('triangle', .16, 'D5 - - - Eb5 - D5 - | A4 - - - - - . . | G4 - A4 - Bb4 - A4 - | D4 - - - - - . . | A4 - - - Bb4 - A4 G4 | D5 - - - - - . . | Eb5 - D5 - A4 - G4 - | A4 - - - - - - -', { vib: [5, .012] }),
    tr('sine', .16, 'D3 - - - - - - - | G2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - -'), tr('drums', .05, 'h . . h . . h . | h . h . . . h .')]),
  gorge: S(140, [tr('pulse', .1, 'D4 D4 A4 D4 Bb4 D4 A4 G4 | D4 D4 A4 D4 Eb5 D5 A4 G4 | C4 C4 G4 C4 A4 C4 G4 F4 | D4 D4 A4 D4 Bb4 A4 G4 A4'),
    tr('square', .07, 'D5 - - - Eb5 - D5 - | A5 - - - G5 - - - | C5 - - - D5 - Eb5 - | D5 - - - - - . .'), tr('drums', .1, 'k t k t s t k t | k t k k s t t t')]),
  ship: S(110, [tr('square', .09, 'D5 . A4 D5 E5 F#5 | G5 . F#5 E5 . D5 | A4 . F#4 A4 B4 C#5 | D5 - - . . . | F#5 . E5 D5 . A4 | B4 . A4 G4 . F#4 | E4 F#4 G4 A4 . C#5 | D5 - - . . .'),
    tr('pulse', .1, 'D3 . A3 . A3 . | G2 . G3 . G3 . | A2 . E3 . E3 . | D3 . A3 . A3 .'), tr('drums', .09, 'k . h s . h | k . h s h h')], 3),
  market: S(124, [tr('sine', .13, 'A5 G5 E5 D5 E5 . G5 . | A5 . B5 A5 G5 E5 D5 . | E5 G5 A5 . G5 E5 D5 B4 | D5 - - - . . . . | G5 A5 B5 . A5 G5 E5 . | D5 E5 G5 . E5 D5 B4 . | A4 B4 D5 E5 G5 E5 D5 B4 | D5 - - - . . . .', { vib: [6, .01] }),
    tr('triangle', .24, 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E2 . B2 . A2 . E3 . | D3 . A2 . D3 . . .'), tr('drums', .11, 'k h h k s h h h | k h k h s h c h')]),
  fuji: S(100, [tr('square', .07, 'D4 G4 B4 D5 D4 G4 B4 D5 | C4 E4 A4 C5 C4 E4 A4 C5 | B3 D4 G4 B4 B3 D4 G4 B4 | A3 D4 F#4 A4 A3 D4 F#4 A4'),
    tr('triangle', .2, 'G2 - - - - - - - | A2 - - - - - - - | E2 - - - - - - - | D2 - - - - - - -'), tr('pulse12', .08, 'D5 - - - B4 - - - | E5 - - - C5 - - - | D5 - B4 - G4 - - - | A4 - - - - - - -'), tr('drums', .06, 'k . . . s . . . ')]),
  stadium: S(150, [tr('square', .1, 'D5 D5 A5 . G5 . F5 E5 | D5 . C5 . A4 . . . | D5 D5 A5 . G5 . A5 C6 | D6 - - - . . . . | F5 . E5 . D5 . C5 . | D5 . E5 . F5 . A5 . | G5 . F5 . E5 . C5 . | D5 - - - . . D5 E5'),
    tr('pulse', .07, 'A4 A4 F5 . E5 . D5 C5 | A4 . G4 . F4 . . . | A4 A4 F5 . E5 . F5 A5 | A5 - - - . . . .'), tr('triangle', .26, 'D2 D3 D2 D3 D2 D3 D2 D3 | Bb1 Bb2 Bb1 Bb2 C2 C3 C2 C3'), tr('drums', .12, 'k h s h k k s h | k h s k k h s s')]),
  bonus: S(160, [tr('square', .09, 'G4 . B4 . D5 . B4 . | C5 . E5 . G5 . E5 . | D5 . F#5 . A5 . F#5 . | G5 . . . D5 . G4 .'), tr('triangle', .22, 'G2 . G3 . C3 . C3 . | D3 . D3 . G2 . . .'), tr('drums', .1, 'k h s h')]),
  practice: S(90, [tr('pulse', .08, 'D5 . . A4 . . G4 . | A4 . . . . . . . | B4 . . A4 . . G4 . | E4 . . . D4 . . .'), tr('triangle', .18, 'D3 - - - G2 - - - | A2 - - - D3 - - -'), tr('drums', .05, 'h . . . h . . .')]),
  select: S(128, [tr('square', .09, 'D5 . A4 . D5 E5 G5 . | A5 . G5 . E5 . D5 . | B4 . G4 . B4 D5 E5 . | D5 - - - . . . .'), tr('triangle', .24, 'D3 D3 . D3 A2 A2 . A2 | G2 G2 . G2 A2 A2 . A2'), tr('drums', .1, 'k . s . k k s .')]),
  session: S(110, [tr('pulse', .09, 'G4 . D5 . B4 . A4 . | G4 . E4 . D4 . . . | G4 . A4 . B4 . D5 . | E5 - - - D5 . . .'), tr('triangle', .22, 'G2 . . G2 D3 . . . | C3 . . C3 D3 . . .'), tr('drums', .08, 'k . h . s . h .')]),
  continue: S(120, [tr('square', .09, 'A4 . . . A4 . . . | Bb4 . . . A4 . . . '), tr('triangle', .22, 'D3 . D3 . D3 . D3 . | D3 . D3 . Eb3 . D3 .'), tr('drums', .1, 't . t . t . t .')]),
  gameover: S(80, [tr('square', .1, 'D5 - A4 - Bb4 - G4 - | A4 - - - D4 - - - | . . . . . . . .'), tr('triangle', .2, 'D3 - - - G2 - - - | D2 - - - - - - - | . . . . . . . .')]),
  ending: S(104, [tr('square', .09, 'D5 - E5 G5 A5 - G5 E5 | D5 - B4 - A4 - - - | G4 A4 B4 D5 E5 - D5 B4 | A4 - - - - - . . | B4 - D5 E5 G5 - E5 D5 | E5 - G5 - A5 - - - | B5 A5 G5 E5 D5 - E5 - | D5 - - - - - . .'),
    tr('triangle', .22, 'G2 - D3 - G2 - D3 - | E2 - B2 - E2 - B2 - | C3 - G2 - C3 - G2 - | D3 - A2 - D3 - A2 -'), tr('drums', .06, 'k . h . s . h .')])
};
KC.STINGS = {
  promotion: S(150, [tr('square', .12, 'D5 F#5 A5 D6 - - A5 D6 | - - - - . . . .'), tr('triangle', .22, 'D3 - A3 - D3 - - - | D2 - - - . . . .')], 4),
  victory: S(160, [tr('square', .12, 'G5 . G5 . G5 . D6 - - - B5 . D6 - - -'), tr('triangle', .22, 'G2 . G2 . G2 . D3 - - - G2 . G2 - - -')], 4),
  defeat: S(120, [tr('square', .1, 'A4 - G4 - Eb4 - D4 - - - - -'), tr('triangle', .2, 'D3 - - - Bb2 - - - D2 - - -')], 4),
  perfect: S(170, [tr('square', .12, 'D5 E5 G5 A5 B5 D6 E6 G6 - - - -'), tr('pulse12', .1, 'B5 D6 E6 G6 A6 - - - - - - -')], 4)
};

/* SOUND EFFECTS */
KC.SFX = {
  whooshL: { wave: 'noise', freq: 1400, to: 500, dur: .12, vol: .16, q: .8 }, whooshH: { wave: 'noise', freq: 900, to: 260, dur: .2, vol: .22, q: .7 },
  thwackHalf: [{ wave: 'noise', freq: 2200, to: 600, dur: .07, vol: .4 }, { wave: 'sine', freq: 140, to: 60, dur: .12, vol: .45 }],
  thwackFull: [{ wave: 'noise', freq: 3000, to: 400, dur: .12, vol: .55 }, { wave: 'sine', freq: 120, to: 40, dur: .25, vol: .6 }, { wave: 'square', freq: 90, to: 50, dur: .08, vol: .15 }],
  clack: [{ wave: 'square', freq: 1600, to: 900, dur: .03, vol: .22 }, { wave: 'noise', freq: 3000, dur: .04, vol: .25, q: 4 }],
  thudFall: [{ wave: 'sine', freq: 90, to: 35, dur: .3, vol: .6 }, { wave: 'noise', freq: 300, dur: .2, vol: .3 }],
  land: { wave: 'noise', freq: 400, to: 150, dur: .08, vol: .2 }, stepBare: { wave: 'noise', freq: 600, dur: .03, vol: .07 }, pivot: { wave: 'noise', freq: 2400, dur: .04, vol: .06 },
  flagSnap: { wave: 'noise', freq: 1500, to: 3000, dur: .06, vol: .2, q: 2 }, whistle: { wave: 'sine', freq: 2500, dur: .5, vol: .18, vib: [18, .03], hold: true },
  gong: [{ wave: 'sine', freq: 110, dur: 1.4, vol: .4 }, { wave: 'sine', freq: 233, dur: 1.1, vol: .2 }, { wave: 'triangle', freq: 330, dur: .8, vol: .1 }],
  taikoHit: [{ wave: 'sine', freq: 95, to: 55, dur: .35, vol: .6 }, { wave: 'noise', freq: 200, dur: .1, vol: .2 }],
  boardCrack: [{ wave: 'noise', freq: 2500, to: 700, dur: .12, vol: .5, q: 2 }, { wave: 'square', freq: 200, to: 80, dur: .1, vol: .2 }],
  potShatter: [{ wave: 'noise', freq: 4000, to: 1500, dur: .25, vol: .45, q: 1.5 }, { wave: 'triangle', freq: 1800, to: 2400, dur: .06, vol: .1 }],
  bowlDing: { wave: 'sine', freq: 1568, dur: .6, vol: .25, arp: [0, 7, 12], step: .07 }, bowlSplash: { wave: 'noise', freq: 900, to: 300, dur: .35, vol: .35 },
  bullSnort: { wave: 'noise', freq: 500, to: 200, dur: .35, vol: .35, q: 3 }, bullStomp: { wave: 'sine', freq: 70, to: 40, dur: .15, vol: .5 },
  bullBellow: [{ wave: 'sawtooth', freq: 110, to: 70, dur: .8, vol: .25, vib: [7, .05] }, { wave: 'noise', freq: 300, dur: .6, vol: .15 }],
  bullThud: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .7 }, { wave: 'noise', freq: 800, to: 200, dur: .2, vol: .4 }], dizzy: { wave: 'triangle', freq: 900, to: 1400, dur: .5, vol: .1, arp: [0, 4, 7, 4], step: .06, loop: true },
  gull: { wave: 'triangle', freq: 1400, to: 1000, dur: .25, vol: .06, vib: [12, .05] }, cameraFlash: { wave: 'noise', freq: 5000, dur: .03, vol: .08 },
  beltTie: { wave: 'noise', freq: 1200, to: 2400, dur: .15, vol: .15 }, scoreTick: { wave: 'square', freq: 1800, dur: .02, vol: .06 },
  menuMove: { wave: 'square', freq: 880, dur: .03, vol: .08 }, menuOk: { wave: 'square', freq: 660, to: 1320, dur: .08, vol: .12 }, menuBack: { wave: 'square', freq: 660, to: 330, dur: .08, vol: .1 },
  countBeep: { wave: 'square', freq: 1046, dur: .08, vol: .14 }, kiCharge: { wave: 'sine', freq: 300, to: 900, dur: .2, vol: .08 }
};
KC.music = id => { const s = KC.SONGS[id]; game.audio.music(s ? s : null); KC.musicId = id; };
KC.sting = id => { const s = KC.STINGS[id]; if (s) game.audio.sting(s, { at: 'now' }); };
KC.sfx = (id, o) => game.audio.sfx(id, o);
