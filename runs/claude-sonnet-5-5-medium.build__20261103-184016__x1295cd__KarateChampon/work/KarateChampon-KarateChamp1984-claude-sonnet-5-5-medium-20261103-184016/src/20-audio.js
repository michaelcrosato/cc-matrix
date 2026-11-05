/* ---------- audio: everything is written in code. Chip music + sfx via game.audio, voices via our own Animalese synth ---------- */
KC.sfx = (n, o) => { try { if (KC.game && KC.game.audio) KC.game.audio.sfx(n, o); } catch (e) { /* audio is optional */ } };
const SFXDEFS = {
  whooshL: [{ wave: 'noise', freq: 1800, to: 700, dur: .14, vol: .22, filter: 'bandpass', q: .8 }],
  whooshH: [{ wave: 'noise', freq: 2400, to: 500, dur: .2, vol: .3, filter: 'bandpass', q: .7 }],
  thwackHalf: [{ wave: 'noise', freq: 2600, to: 900, dur: .09, vol: .4, q: 1.4 }, { wave: 'sine', freq: 150, to: 70, dur: .12, vol: .4 }],
  thwackFull: [{ wave: 'noise', freq: 3200, to: 800, dur: .16, vol: .55, q: 1.2 }, { wave: 'sine', freq: 120, to: 45, dur: .26, vol: .6 }, { wave: 'square', freq: 220, to: 80, dur: .1, vol: .2 }],
  clack: [{ wave: 'square', freq: 1400, to: 900, dur: .04, vol: .3 }, { wave: 'noise', freq: 3000, dur: .03, vol: .3 }],
  thudFall: [{ wave: 'sine', freq: 90, to: 40, dur: .3, vol: .6 }, { wave: 'noise', freq: 500, to: 150, dur: .25, vol: .3, filter: 'lowpass' }],
  land: [{ wave: 'noise', freq: 400, to: 150, dur: .08, vol: .25, filter: 'lowpass' }],
  stepBare: [{ wave: 'noise', freq: 900, dur: .03, vol: .1, q: 2 }],
  pivot: [{ wave: 'noise', freq: 1200, to: 600, dur: .06, vol: .12 }],
  flagSnap: [{ wave: 'noise', freq: 2200, to: 1200, dur: .07, vol: .3 }],
  whistle: [{ wave: 'sine', freq: 2500, dur: .5, vol: .25, vib: [28, .03], hold: true }],
  gong: [{ wave: 'sine', freq: 130, to: 120, dur: 1.4, vol: .5 }, { wave: 'sine', freq: 262, dur: 1.2, vol: .25 }, { wave: 'noise', freq: 900, dur: .2, vol: .1 }],
  taikoHit: [{ wave: 'sine', freq: 110, to: 55, dur: .25, vol: .7 }, { wave: 'noise', freq: 300, to: 100, dur: .1, vol: .3, filter: 'lowpass' }],
  crowdOoh: [{ wave: 'noise', freq: 700, to: 500, dur: .6, vol: .12, q: .6 }],
  crowdCheer: [{ wave: 'noise', freq: 1200, to: 1800, dur: .9, vol: .16, q: .5 }, { wave: 'noise', freq: 600, dur: .9, vol: .1, q: .5 }],
  crowdBoo: [{ wave: 'noise', freq: 400, to: 250, dur: .8, vol: .14, q: .5 }],
  boardCrack: [{ wave: 'noise', freq: 2400, to: 500, dur: .15, vol: .6, q: 1.6 }, { wave: 'square', freq: 300, to: 90, dur: .08, vol: .3 }],
  potShatter: [{ wave: 'noise', freq: 3500, to: 1500, dur: .25, vol: .45, q: 1.6 }, { wave: 'square', freq: 1800, to: 500, dur: .1, vol: .15 }],
  bowlDing: [{ wave: 'sine', freq: 1760, dur: .5, vol: .3 }, { wave: 'sine', freq: 2637, dur: .4, vol: .15 }],
  bowlSplash: [{ wave: 'noise', freq: 1200, to: 400, dur: .3, vol: .3, q: .6 }],
  bullSnort: [{ wave: 'noise', freq: 500, to: 300, dur: .25, vol: .35, q: .8 }],
  bullStomp: [{ wave: 'sine', freq: 80, to: 40, dur: .12, vol: .6 }],
  bullBellow: [{ wave: 'saw', freq: 90, to: 60, dur: .7, vol: .3, vib: [6, .04] }],
  bullThud: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .8 }, { wave: 'noise', freq: 600, to: 150, dur: .2, vol: .4, filter: 'lowpass' }],
  dizzy: [{ wave: 'triangle', freq: 600, to: 900, dur: .5, vol: .2, vib: [9, .08] }],
  gull: [{ wave: 'saw', freq: 900, to: 1400, dur: .25, vol: .05, vib: [14, .1] }],
  waves: [{ wave: 'noise', freq: 500, to: 300, dur: 1.5, vol: .04, q: .4 }],
  creak: [{ wave: 'saw', freq: 140, to: 100, dur: .5, vol: .05, vib: [20, .05] }],
  steamHiss: [{ wave: 'noise', freq: 5000, dur: .5, vol: .05, filter: 'highpass' }],
  cameraFlash: [{ wave: 'square', freq: 3000, to: 1000, dur: .04, vol: .1 }],
  beltTie: [{ wave: 'noise', freq: 1500, to: 600, dur: .25, vol: .25 }, { wave: 'triangle', freq: 660, to: 880, dur: .2, vol: .2, delay: .15 }],
  scoreTick: [{ wave: 'square', freq: 1500, dur: .02, vol: .08 }],
  menuMove: [{ wave: 'square', freq: 880, to: 1040, dur: .04, vol: .1 }],
  menuOk: [{ wave: 'square', freq: 660, dur: .05, vol: .13 }, { wave: 'square', freq: 990, dur: .08, vol: .13, delay: .05 }],
  menuBack: [{ wave: 'square', freq: 520, to: 330, dur: .09, vol: .12 }],
  countBeep: [{ wave: 'square', freq: 1000, dur: .1, vol: .2 }],
  good: [{ wave: 'pulse', freq: 880, dur: .08, vol: .2 }, { wave: 'pulse', freq: 1320, dur: .12, vol: .2, delay: .08 }],
  bad: [{ wave: 'square', freq: 200, to: 120, dur: .2, vol: .2 }]
};
KC.defineAudio = a => { for (const k in SFXDEFS) a.define(k, SFXDEFS[k]); for (const k in SONGS) { /* songs are passed by object */ } };
/* ---- music: Japanese pentatonic colour. in scale: D Eb G A Bb; yo scale: D E G A B ---- */
const rep = (s, n) => Array(n).fill(s).join(' ');
const SONGS = {
  title: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'D5 . D5 E5 G5 . A5 . | B5 A5 G5 . E5 . D5 . | D5 . D5 E5 G5 . A5 B5 | D6 B5 A5 G5 A5 . . . | G5 . G5 A5 B5 . D6 . | B5 A5 G5 E5 G5 . A5 . | D5 E5 G5 A5 B5 A5 G5 E5 | D5 . . . D5 . . .' },
    { wave: 'triangle', vol: .3, notes: 'D3 . D3 . A2 . A2 . | G2 . G2 . A2 . A2 . | D3 . D3 . A2 . A2 . | G2 . A2 . D3 . D3 .' },
    { wave: 'drums', vol: .12, notes: 't . h . s . h t | t . h . s . h h | t . h . s . h t | t t h . s . s s' }] },
  dojo: { bpm: 96, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'D5 . . . Eb5 . . . | G5 . . . A5 . . . | Bb5 . A5 . G5 . . . | Eb5 . D5 . . . . . | A4 . . . Bb4 . . . | D5 . . . Eb5 . G5 . | A5 . G5 . Eb5 . . . | D5 . . . . . . .' },
    { wave: 'triangle', vol: .22, notes: 'D3 . . . . . D3 . | G2 . . . . . G2 . | A2 . . . . . A2 . | D3 . . . . . . .' },
    { wave: 'drums', vol: .1, notes: 'k . . . . . t . | . . . . k . . . | t . . . . . t . | . . k . . . . .' }] },
  harbor: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'G5 . A5 B5 D6 . B5 . | A5 . G5 . E5 . G5 . | A5 B5 D6 . B5 A5 G5 . | E5 . G5 A5 G5 . . . | D6 . D6 B5 A5 . G5 . | E5 G5 A5 . B5 . A5 . | G5 A5 B5 D6 B5 A5 G5 E5 | D5 . G5 . A5 . . .' },
    { wave: 'triangle', vol: .28, notes: 'G2 . G3 . D3 . G3 . | E3 . E2 . B2 . E3 . | A2 . A3 . E3 . A3 . | D3 . D2 . A2 . D3 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k . h k s . s s' }] },
  bamboo: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .22, vib: [5, .01], notes: 'D5 . . . . . A4 . | . . G4 . . . . . | E5 . . . D5 . . . | B4 . . . A4 . . . | D5 . . . G5 . . . | A5 . . . . . E5 . | D5 . . . B4 . A4 . | G4 . . . . . . .' },
    { wave: 'sine', vol: .18, notes: 'D3 . . . . . . . | G2 . . . . . . . | A2 . . . . . . . | D3 . . . . . . .' },
    { wave: 'drums', vol: .06, notes: 'h . h . h . h . | h . h . h . h h' }] },
  gorge: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'D3 D3 . D3 Eb3 . D3 . | D3 D3 . D3 G3 . Eb3 . | D3 D3 . D3 Eb3 . D3 . | A3 . G3 . Eb3 . D3 .' },
    { wave: 'square', vol: .09, notes: 'D5 . . . . . Eb5 . | . . . . G5 . . . | A5 . . . Bb5 . A5 . | G5 . Eb5 . D5 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . t . k . t t | k . t . k k t t' }] },
  ship: { bpm: 110, steps: 3, tracks: [
    { wave: 'pulse', vol: .11, notes: 'G5 . A5 B5 . A5 | G5 . E5 D5 . . | E5 . G5 A5 . G5 | E5 . D5 D5 . . | G5 . A5 B5 D6 B5 | A5 . G5 E5 . . | D5 E5 G5 A5 G5 E5 | D5 . . . . .' },
    { wave: 'triangle', vol: .26, notes: 'G2 . . D3 . . | G2 . . D3 . . | E2 . . B2 . . | D3 . . A2 . .' },
    { wave: 'drums', vol: .08, notes: 'k . . h . h | k . . h . h' }] },
  market: { bpm: 124, steps: 4, tracks: [
    { wave: 'sine', vol: .2, vib: [6, .015], notes: 'A5 . B5 . D6 . B5 A5 | G5 . A5 . E5 . . . | A5 . B5 . D6 . E6 D6 | B5 . A5 . G5 . . . | E6 . D6 . B5 . A5 . | G5 . E5 . D5 . . . | A5 B5 D6 E6 D6 B5 A5 G5 | A5 . . . . . . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . A2 . E3 . A2 . | G2 . G2 . D3 . G2 . | A2 . A2 . E3 . A2 . | D3 . E3 . A2 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . h h t . h h | k . h h t . h t | k . h h t . h h | k h h h t t t h' }] },
  fuji: { bpm: 100, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'D4 A4 D5 A4 D4 A4 D5 A4 | E4 B4 E5 B4 E4 B4 E5 B4 | G4 D5 G5 D5 G4 D5 G5 D5 | A4 E5 A5 E5 A4 E5 A5 E5' },
    { wave: 'triangle', vol: .2, notes: 'D5 - - - - - E5 - | G5 - - - - - A5 - | B5 - - - A5 - - - | D6 - - - - - - -' },
    { wave: 'drums', vol: .06, notes: 't . . . h . . . | k . . . h . . .' }] },
  stadium: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'D5 . D5 D5 G5 . A5 . | B5 . A5 G5 A5 . . . | D5 . D5 D5 G5 . A5 . | D6 . B5 A5 G5 . . . | E5 . E5 E5 A5 . B5 . | D6 . B5 A5 B5 . . . | G5 A5 B5 D6 E6 D6 B5 A5 | D6 . . . . . . .' },
    { wave: 'pulse', vol: .08, notes: 'D4 . A4 . D5 . A4 . | G4 . D5 . G5 . D5 . | E4 . B4 . E5 . B4 . | A4 . E5 . A5 . E5 .' },
    { wave: 'triangle', vol: .3, notes: 'D2 D2 D3 D2 D2 D2 D3 D2 | G2 G2 G3 G2 G2 G2 G3 G2 | E2 E2 E3 E2 E2 E2 E3 E2 | A2 A2 A3 A2 A2 A2 A3 A2' },
    { wave: 'drums', vol: .14, notes: 'k . h k s . h k | k . h k s . h k | k . h k s . h k | k k s s k k s s' }] },
  bonus: { bpm: 160, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 . G5 . D5 . G5 . | A5 . G5 . E5 . . . | D5 . G5 . D5 . A5 . | B5 A5 G5 E5 D5 . . . | E5 . A5 . E5 . A5 . | B5 . A5 . G5 . . . | G5 A5 B5 . A5 G5 E5 . | D5 . . . . . . .' },
    { wave: 'triangle', vol: .26, notes: 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E3 . B2 . E3 . B2 . | A2 . E3 . A2 . . .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h . s . h h' }] },
  practice: { bpm: 90, steps: 4, tracks: [
    { wave: 'pulse12', vol: .07, notes: 'D5 . . . G5 . . . | A5 . . . G5 . . . | E5 . . . D5 . . . | B4 . . . D5 . . .' },
    { wave: 'triangle', vol: .18, notes: 'D3 . . . . . A2 . | G2 . . . . . D3 . | E3 . . . . . B2 . | A2 . . . . . . .' }] },
  select: { bpm: 128, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 . E5 G5 A5 . G5 . | E5 . D5 . B4 . . . | D5 . E5 G5 A5 . B5 . | A5 . G5 . E5 . . . ' },
    { wave: 'triangle', vol: .26, notes: 'D3 . D3 . A2 . A2 . | G2 . G2 . A2 . A2 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' }] },
  session: { bpm: 110, steps: 4, tracks: [
    { wave: 'pulse12', vol: .09, notes: 'D5 . . G5 . . A5 . | B5 . A5 . G5 . . . | E5 . . A5 . . B5 . | D6 . B5 . A5 . . .' },
    { wave: 'triangle', vol: .24, notes: 'D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . B2 . . . | A2 . . . E3 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . . . t . . h | k . . . t . h h' }] },
  continue: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'D4 . . . D4 . . . | Eb4 . . . D4 . . .' }, { wave: 'drums', vol: .12, notes: 'k . . . k . . . | k . . . k . k k' }] },
  gameover: { bpm: 80, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .25, notes: 'A4 - - - G4 - - - | Eb4 - - - D4 - - - - - - -' }] },
  ending: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .24, notes: 'D5 . D5 E5 G5 . A5 . | B5 A5 G5 . E5 . D5 . | G5 . G5 A5 B5 . D6 . | B5 A5 G5 E5 D5 . . .' },
    { wave: 'square', vol: .07, notes: 'D4 . A4 . D5 . A4 . | G4 . D5 . G5 . D5 . | E4 . B4 . E5 . B4 . | D4 . A4 . D5 . . .' },
    { wave: 'triangle', vol: .2, notes: 'D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . B2 . . . | D3 . . . . . . .' }] }
};
const STINGS = {
  promotion: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .15, notes: 'D5 . G5 . A5 . D6 - - - B5 . D6 - - -' }, { wave: 'triangle', vol: .25, notes: 'D3 . G3 . A3 . D4 - - - G3 . D4 - - -' }] },
  victory: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .14, notes: 'G5 . G5 G5 B5 - D6 - - - -' }, { wave: 'triangle', vol: .24, notes: 'G3 . G3 G3 B3 - D4 - - - -' }] },
  defeat: { bpm: 80, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .24, notes: 'A4 - - - Eb4 - - - D4 - - -' }] },
  perfect: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'square', vol: .13, notes: 'D6 B5 D6 E6 G6 - - -' }, { wave: 'triangle', vol: .2, notes: 'D4 G4 B4 D5 G5 - - -' }] }
};
KC.SONGS = SONGS; KC.STINGS = STINGS;
KC.music = (id, o) => { try { const a = KC.game.audio; if (!id) { a.music(null); return; } a.music(SONGS[id] || id, o); } catch (e) { /* ok */ } };
KC.sting = id => { try { KC.game.audio.sting(STINGS[id], { at: 'now' }); } catch (e) { /* ok */ } };

/* ---- the voice: Animalese / Simlish-style gibberish. Deterministic per line; speak() returns the line's duration in seconds ---- */
const VOWELS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
const CONS_CLASS = c => 'pbtdkgq'.includes(c) ? 'plosive' : 'fszhxcjv'.includes(c) ? 'fric' : 'mnlrwy'.includes(c) ? 'nasal' : 'none';
KC.Voice = {
  volume: .8,
  /** the syllable plan for a line: [{ v: vowel, c: class, stress, t (s), dur }] */
  plan(text, prof, o = {}) {
    const s = String(text).toLowerCase(), words = s.split(/[^a-z!?]+/).filter(Boolean), rate = (o.rate || prof.rate || 14), sy = [];
    const h = hash32(s + (prof.f0 || 0));
    let k = 0;
    for (const w of words) {
      const letters = w.replace(/[!?]/g, ''); let cons = '';
      for (let i = 0; i < letters.length; i++) {
        const ch = letters[i];
        if ('aeiou'.includes(ch)) { sy.push({ v: ch, c: CONS_CLASS(cons[cons.length - 1] || ' '), stress: false }); cons = ''; k++; }
        else cons += ch;
      }
      if (cons && sy.length === 0) sy.push({ v: 'a', c: CONS_CLASS(cons[0]), stress: false });
      if (w.length > 5 && sy.length) sy.push({ v: 'aeiou'[(h >> sy.length) % 5], c: CONS_CLASS(letters[letters.length - 1]), stress: false });
    }
    if (!sy.length) sy.push({ v: 'a', c: 'none', stress: false });
    const stressEvery = 3; sy.forEach((x, i) => { x.stress = i % stressEvery === 0; });
    // fixed shapes for referee calls
    if (o.syllables) { while (sy.length > o.syllables) sy.pop(); while (sy.length < o.syllables) sy.push({ v: 'o', c: 'nasal', stress: false }); sy.forEach((x, i) => { x.stress = i === (o.stress || 0); }); }
    const dur = 1 / rate; let t = 0; sy.forEach(x => { x.t = t; x.dur = dur * (x.stress ? 1.25 : 1); t += x.dur; });
    const end = /!/.test(text) ? 'bang' : /\?/.test(text) ? 'ask' : /\.\.\./.test(text) ? 'slow' : 'flat';
    return { sy, dur: t + .05, end };
  },
  speak(text, prof, o = {}) {
    const pl = this.plan(text, prof, o); const A = KC.game && KC.game.audio;
    if (!A || !A._init || !A._init() || A.muted || !A.ctx || A.ctx.state !== 'running') return pl.dur;
    try { this.play(pl, prof, o); } catch (e) { /* no voice */ }
    return pl.dur;
  },
  bus() {
    const A = KC.game.audio; if (this._bus && this._bus.ctx === A.ctx) return this._bus.g;
    const g = A.ctx.createGain(); g.connect(A._master); this._bus = { ctx: A.ctx, g }; return g;
  },
  play(pl, prof, o) {
    const A = KC.game.audio, c = A.ctx, t0 = c.currentTime + .02, bus = this.bus(), vol = (o.vol === undefined ? 1 : o.vol) * (KC.game.settings.voices === undefined ? .8 : KC.game.settings.voices) * .5;
    bus.gain.value = 1; const n = pl.sy.length;
    pl.sy.forEach((x, i) => {
      const fm = prof.fm || 1, [f1, f2] = VOWELS[x.v], jitter = 1 + (hash32(x.v + i + (prof.f0 || 0)) % 60 - 30) / 1000;
      const prog = i / Math.max(1, n - 1), decl = 1 - .12 * prog, endMod = pl.end === 'bang' ? (prog > .7 ? 1.18 - (prog - .7) * 1.6 : 1) : pl.end === 'ask' ? 1 + prog * .25 : pl.end === 'slow' ? 1 - prog * .12 : 1;
      const f0 = (o.f0 || prof.f0) * decl * endMod * (x.stress ? 1.15 : 1) * jitter, t = t0 + x.t, dur = x.dur;
      const osc = c.createOscillator(); osc.type = ({ pulse: 'square', pulse12: 'square', saw: 'sawtooth', square: 'square', triangle: 'triangle' })[prof.wave] || 'sawtooth';
      osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (x.stress ? 1.04 : .97), t + dur);
      if (prof.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = prof.vib; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + .05); }
      const env = c.createGain(); const peak = vol * (x.stress ? .5 : .35) * (prof.loud || 1);
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(peak, t + .005); env.gain.setValueAtTime(peak, t + Math.max(.01, dur * .6)); env.gain.linearRampToValueAtTime(0, t + dur * .95);
      for (const [fr, q, g2] of [[f1 * fm, 6, 1], [f2 * fm, 8, .6]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; const gg = c.createGain(); gg.gain.value = g2; osc.connect(bp); bp.connect(gg); gg.connect(env); }
      env.connect(bus); osc.start(t); osc.stop(t + dur + .02);
      if (x.c !== 'none' && A._noise) {   // the consonant: a tiny noise burst
        const nb = c.createBufferSource(); nb.buffer = A._noise; const hp = c.createBiquadFilter(); hp.type = x.c === 'fric' ? 'highpass' : x.c === 'plosive' ? 'bandpass' : 'lowpass'; hp.frequency.value = x.c === 'fric' ? 5000 : x.c === 'plosive' ? 1800 : 300;
        const ng = c.createGain(); const cd = x.c === 'fric' ? .025 : x.c === 'plosive' ? .008 : .02; ng.gain.setValueAtTime(vol * .25, t); ng.gain.linearRampToValueAtTime(0, t + cd); nb.connect(hp); hp.connect(ng); ng.connect(bus); nb.start(t); nb.stop(t + cd + .01);
      }
      if (prof.rough) { const nb = c.createBufferSource(); nb.buffer = A._noise; nb.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f1 * fm; const ng = c.createGain(); ng.gain.setValueAtTime(vol * prof.rough * .5, t); ng.gain.linearRampToValueAtTime(0, t + dur); nb.connect(bp); bp.connect(ng); ng.connect(bus); nb.start(t); nb.stop(t + dur + .01); }
    });
  },
  /** a loud 1-2 syllable shout with a pitch drop */
  kiai(prof, heavy) { const A = KC.game.audio; if (!A._init || !A._init() || A.muted || A.ctx.state !== 'running') return; try { this.play({ sy: [{ v: heavy ? 'o' : 'a', c: 'fric', stress: true, t: 0, dur: heavy ? .22 : .14 }], dur: .25, end: 'bang' }, Object.assign({}, prof, { loud: 1.6, rough: .25 }), { f0: (prof.f0 || 180) * 1.1 }); } catch (e) { /* ok */ } },
  crowd(kind) { KC.sfx(kind === 'ooh' ? 'crowdOoh' : kind === 'boo' ? 'crowdBoo' : 'crowdCheer'); }
};
// referee calls: fixed syllable counts and stress so each call has a recognisable rhythm
const CALL_SHAPE = { begin: [3, 1], stop: [2, 0], white: [2, 0], red: [2, 0], half: [4, 1], full: [3, 0], nopoint: [4, 1], aiuchi: [3, 1], time: [3, 1], judges: [3, 0], whiteWins: [4, 2], redWins: [3, 2], bow: [2, 0], decide: [4, 1], forfeit: [3, 0], matchPoint: [4, 2] };
KC.speakCall = id => { const sh = CALL_SHAPE[id] || [3, 0]; return KC.Voice.speak(KC.callText(id), KC.REF.voice, { syllables: sh[0], stress: sh[1], rate: 9, f0: KC.REF.voice.f0 }); };
KC.speakLine = (who, text) => { const prof = who === 'genkotsu' ? KC.REF.voice : (KC.FIGHTER[who] || KC.FIGHTER.taro).voice; return KC.Voice.speak(text, prof); };
KC.onCall = (c, bout) => { KC.speakCall(c.id); if (c.id === 'begin') KC.sfx('taikoHit'); if (c.id === 'judges') KC.sfx('whistle'); if (c.id === 'stop') KC.sfx('flagSnap'); if (c.id === 'full') KC.sfx('crowdCheer'); if (c.id === 'half') KC.sfx('crowdOoh'); if (c.id === 'bow') KC.sfx('gong', { vol: .4 }); };
