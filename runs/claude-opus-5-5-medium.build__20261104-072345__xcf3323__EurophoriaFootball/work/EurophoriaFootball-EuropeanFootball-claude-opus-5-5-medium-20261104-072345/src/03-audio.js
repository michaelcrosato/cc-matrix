/* 03-audio: every sound is code. SFX on the engine's chip synth; songs in its song format (original compositions); the
 * crowd engine (a noise bed through band-pass filters that follows the crowd's mood, OOOHs, roars, boos, whistles,
 * claps); sung chants (a choir of formant voices); and Animalese-style babble voices for every speaker. Silent headless. */
const SFX = {
  touch: { wave: 'noise', freq: 700, to: 300, dur: .04, vol: .14, filter: 'lowpass' },
  pass: { wave: 'noise', freq: 900, to: 250, dur: .06, vol: .24, filter: 'lowpass' },
  kick: { wave: 'noise', freq: 1100, to: 180, dur: .09, vol: .34, filter: 'lowpass' },
  thump: { wave: 'sine', freq: 120, to: 60, dur: .09, vol: .3 },
  screamer: [{ wave: 'sine', freq: 90, to: 40, dur: .14, vol: .45 }, { wave: 'noise', freq: 400, to: 3000, dur: .35, vol: .2, filter: 'highpass' }],
  superCharge: { wave: 'saw', freq: 'C4', arp: [0, 4, 7, 12, 16, 19, 24], step: .05, dur: .5, vol: .14 },
  superBoom: [{ wave: 'sine', freq: 80, to: 30, dur: .5, vol: .5 }, { wave: 'noise', freq: 2000, to: 200, dur: .6, vol: .3, filter: 'lowpass' }],
  splash: { wave: 'noise', freq: 2500, to: 800, dur: .2, vol: .18, filter: 'highpass' },
  crunch: { wave: 'noise', freq: 1200, to: 400, dur: .1, vol: .16, filter: 'bandpass' },
  doink: [{ wave: 'triangle', freq: 1400, to: 1100, dur: .35, vol: .3 }, { wave: 'sine', freq: 2800, to: 2700, dur: .5, vol: .08 }],
  net: { wave: 'noise', freq: 4000, to: 1500, dur: .3, vol: .16, filter: 'highpass' },
  catch: { wave: 'noise', freq: 600, to: 200, dur: .06, vol: .3, filter: 'lowpass' },
  parry: { wave: 'noise', freq: 1500, to: 400, dur: .08, vol: .3, filter: 'bandpass' },
  whistle: { wave: 'square', freq: 2300, vib: [30, .05], dur: .25, vol: .1 },
  whistleLong: { wave: 'square', freq: 2300, vib: [30, .05], dur: .7, vol: .1 },
  card: { wave: 'noise', freq: 3000, to: 1000, dur: .05, vol: .2, filter: 'highpass' },
  slide: { wave: 'noise', freq: 500, to: 150, dur: .3, vol: .2, filter: 'lowpass' },
  knock: { wave: 'sine', freq: 100, to: 40, dur: .15, vol: .4 },
  swish: { wave: 'noise', freq: 1500, to: 4000, dur: .12, vol: .12, filter: 'highpass' },
  nutmeg: { wave: 'triangle', freq: 'E6', arp: [0, 7], step: .06, dur: .14, vol: .14 },
  segment: { wave: 'triangle', freq: 'G5', arp: [0, 4, 7], step: .04, dur: .14, vol: .14 },
  europhoria: [{ wave: 'saw', freq: 'C4', dur: .6, vol: .14 }, { wave: 'saw', freq: 'E4', dur: .6, vol: .12 }, { wave: 'saw', freq: 'G4', dur: .6, vol: .12 }, { wave: 'square', freq: 'C5', dur: .6, vol: .08 }],
  tick: { wave: 'square', freq: 1800, dur: .02, vol: .08 },
  perfect: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .2 },
  miss: { wave: 'saw', freq: 200, to: 90, dur: .4, vol: .2 },
  varBeep: { wave: 'sine', freq: 1000, dur: .08, vol: .14 },
  chime: [{ wave: 'sine', freq: 'E5', dur: .4, vol: .18 }, { wave: 'sine', freq: 'C5', dur: .6, vol: .16 }],
  gull: { wave: 'sine', freq: 1600, to: 900, dur: .25, vol: .14, vib: [14, .08] },
  boing: { wave: 'sine', freq: 200, to: 600, dur: .2, vol: .2, vib: [20, .1] },
  powerDown: { wave: 'saw', freq: 300, to: 40, dur: 1, vol: .14 },
  horn: [{ wave: 'saw', freq: 'F3', dur: .6, vol: .14 }, { wave: 'saw', freq: 'A3', dur: .6, vol: .1 }],
  shimmer: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12, 16], step: .04, dur: .4, vol: .12 },
  heartbeat: { wave: 'sine', freq: 60, to: 40, dur: .12, vol: .4 },
  menuMove: { wave: 'square', freq: 'A5', dur: .03, vol: .06 },
  menuPick: { wave: 'square', freq: 'C6', arp: [0, 7], step: .04, dur: .1, vol: .1 },
  menuBack: { wave: 'square', freq: 'E5', to: 'A4', dur: .08, vol: .08 },
  typewriter: { wave: 'noise', freq: 3000, dur: .02, vol: .1, filter: 'highpass' },
  smash: [{ wave: 'noise', freq: 3000, to: 600, dur: .5, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 70, to: 30, dur: .4, vol: .4 }]
};
for (const [k, v] of Object.entries(SFX)) A.define(k, v);
EF.sfx = (name, o) => { try { A.sfx(name, o); } catch (e) { /* sound must never break play */ } };

/* ---- songs (original). The anthem is the game's theme; the rest are built on its chords ---- */
const ANTHEM_LEAD = 'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .';
const ANTHEM_BASS = 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . E3 . C3 . | F2 . A2 . G2 . B2 . | A2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .';
EF.SONGS = {
  anthem: { bpm: 108, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: ANTHEM_LEAD },
    { name: 'counter', wave: 'square', vol: .05, notes: 'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: ANTHEM_BASS },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' }] },
  menu: { bpm: 128, steps: 4, tracks: [
    { wave: 'pulse', vol: .08, notes: 'C5 . E5 G5 . E5 C5 . | F5 . A5 C6 . A5 F5 . | D5 . F5 A5 . F5 D5 . | G5 . B5 D6 . B5 G5 . ' },
    { wave: 'triangle', vol: .28, notes: 'C3 . C3 . G2 . G2 . | F2 . F2 . C3 . C3 . | D3 . D3 . A2 . A2 . | G2 . G2 . B2 . D3 . ' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h k | k . h . s . h h' }] },
  travel: { bpm: 116, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'G5 - - A5 B5 - G5 - | E5 - - - D5 - - - | C5 - - D5 E5 - G5 - | A5 - - - - - . . | G5 - - A5 B5 - D6 - | C6 - B5 - A5 - G5 - | E5 - G5 - A5 - F#5 - | G5 - - - - - . .' },
    { wave: 'triangle', vol: .26, notes: 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | D3 . A2 . D3 . F#2 .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . | k h h . s . h .' }] },
  tabloid: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'C5 . C5 . Eb5 . . C5 | . . G4 . Bb4 . C5 . | C5 . C5 . Eb5 . F5 . | G5 . . . . . . . ' },
    { wave: 'triangle', vol: .26, notes: 'C3 . . C3 . . C3 . | Ab2 . . Ab2 . . Bb2 . ' },
    { wave: 'drums', vol: .08, notes: 't t t t t t t t | t t t t s . s .' }] },
  dressing: { bpm: 84, steps: 2, tracks: [
    { wave: 'triangle', vol: .14, notes: 'E4 - G4 - | A4 - - - | G4 - E4 - | D4 - - - | C4 - E4 - | F4 - - - | E4 - D4 - | C4 - - - ' },
    { wave: 'sine', vol: .2, notes: 'C3 - - - | F2 - - - | C3 - - - | G2 - - - | A2 - - - | F2 - - - | G2 - - - | C3 - - - ' }] },
  europhoria: { bpm: 140, steps: 4, tracks: [
    { name: 'drums', wave: 'drums', vol: .14, on: false, notes: 'k . h k s . h . | k k h . s . h k' },
    { name: 'bass', wave: 'saw', vol: .1, on: false, notes: 'C2 C2 C3 C2 G2 G2 G3 G2 | C2 C2 C3 C2 Bb2 Bb2 Bb3 Bb2' },
    { name: 'brass', wave: 'saw', vol: .07, on: false, notes: '. . C5 . . . E5 . | . . G5 . . . E5 . | . . C5 . . . E5 . | . . Bb5 . G5 . E5 .' }] },
  halftime: { bpm: 120, steps: 4, tracks: [
    { wave: 'square', vol: .07, notes: 'E5 . G5 . A5 . C6 . | B5 . G5 . E5 . . . | D5 . F5 . A5 . B5 . | C6 - - . . . . . ' },
    { wave: 'triangle', vol: .24, notes: 'C3 . E3 . G3 . E3 . | C3 . E3 . G3 . E3 . | D3 . F3 . A3 . F3 . | C3 . G2 . C3 . . . ' },
    { wave: 'drums', vol: .06, notes: 'k . c . s . c . ' }] },
  goal: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'C5 . E5 . G5 . C6 - | - - G5 . C6 - - - ' },
    { wave: 'saw', vol: .06, notes: 'E4 . G4 . C5 . E5 - | - - E5 . G5 - - - ' },
    { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . C3 - | G2 . G2 . C3 - - - ' }] },
  tension: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .1, notes: 'A3 - - - - - - - - - - - - - - - ' }, { wave: 'triangle', vol: .08, notes: 'C4 - - - - - - - - - - - - - - - ' }, { wave: 'triangle', vol: .08, notes: 'E4 - - - - - - - - - - - - - - - ' },
    { wave: 'drums', vol: .16, notes: 'k k . . ' }] },
  victory: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .12, notes: 'G4 . C5 . E5 . G5 - | - . E5 . G5 - - - | A5 . G5 . F5 . E5 . | D5 . E5 . C5 - - - ' },
    { wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | C3 . G2 . C3 . . . | F2 . C3 . F2 . C3 . | G2 . G2 . C3 - - - ' },
    { wave: 'drums', vol: .1, notes: 'k . s . k . s . | k . s . k k s s' }] },
  defeat: { bpm: 70, steps: 2, tracks: [
    { wave: 'saw', vol: .1, notes: 'Bb3 - A3 - Ab3 - G3 - - - - - . . . .' },
    { wave: 'triangle', vol: .2, notes: 'G2 - - - - - - - C2 - - - - - . .' }] },
  villain: { bpm: 96, steps: 2, tracks: [
    { wave: 'pulse', vol: .09, notes: 'A4 - C5 B4 - A4 | E4 - - - - - | F4 - A4 G#4 - F4 | E4 - - - - - | D4 - F4 E4 - D4 | C4 - E4 A4 - - | B4 - G#4 E4 - - | A4 - - - - - ' },
    { wave: 'triangle', vol: .22, notes: 'A2 . E3 . E3 . | A2 . E3 . E3 . | D2 . A2 . A2 . | E2 . B2 . B2 . ' }] },
  ceremony: { bpm: 132, steps: 2, tracks: [
    { wave: 'pulse', vol: .13, notes: ANTHEM_LEAD }, { wave: 'saw', vol: .05, notes: 'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: ANTHEM_BASS }, { wave: 'drums', vol: .12, notes: 'k . s . k k s . | k . s . k s s s' }] },
  credits: { bpm: 96, steps: 2, tracks: [
    { wave: 'triangle', vol: .14, notes: ANTHEM_LEAD.replace(/([A-G]#?b?)(\d)/g, (s, n, o) => n + (+o + 1)) },
    { wave: 'sine', vol: .14, notes: ANTHEM_BASS.replace(/([A-G]#?b?)(\d)/g, (s, n, o) => n + (+o + 1)) }] },
  training: { bpm: 100, steps: 4, tracks: [
    { wave: 'pulse12', vol: .07, notes: 'E5 . . G5 . . A5 . | . . G5 . E5 . D5 . | C5 . . E5 . . G5 . | . . A5 . G5 . . . ' },
    { wave: 'triangle', vol: .24, notes: 'C3 . . C3 . . G2 . | A2 . . A2 . . E2 . | F2 . . F2 . . C3 . | G2 . . G2 . . G2 . ' },
    { wave: 'drums', vol: .07, notes: 'k . c . s . c . | k . c k s . c . ' }] },
  attract: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: ANTHEM_LEAD.replace(/ - /g, ' . ') },
    { wave: 'saw', vol: .08, notes: 'C2 C3 C2 C3 G1 G2 G1 G2 | F1 F2 F1 F2 C2 C3 C2 C3 | D2 D3 D2 D3 A1 A2 A1 A2 | G1 G2 G1 G2 B1 B2 D2 D3' },
    { wave: 'drums', vol: .12, notes: 'k . h k s . h . | k k h . s . h k' }] }
};
EF.music = (id, o = {}) => { try { const s = id && EF.SONGS[id]; A.music(s || null, Object.assign({ fade: .6 }, o)); EF.musicNow = id; } catch (e) { /* no sound */ } };

/* ---- WebAudio helpers on the engine's own context: buses for the crowd and the voices ---- */
const AU = {
  ctx() { try { return A._init ? A._init() : A.ctx; } catch (e) { return null; } },
  bus(name) {
    const c = this.ctx(); if (!c || !A._master) return null;
    this._b = this._b || {};
    if (!this._b[name]) { const g = c.createGain(); g.gain.value = game.settings[name] != null ? game.settings[name] : .8; g.connect(A._master); this._b[name] = g; }
    return this._b[name];
  },
  noise() { return A._noise || null; }
};
EF.AU = AU;
/* ---- the crowd engine ---- */
EF.crowdAudio = {
  on: false, level: 0, ex: 0, nodes: null,
  volume(v) { const b = AU.bus('crowd'); if (b) b.gain.value = v; },
  start(size = .7) {
    this.size = size; const c = AU.ctx(), bus = AU.bus('crowd'); if (!c || !bus || this.nodes) { this.on = true; return; }
    try {
      const mk = (f, q, v) => { const s = c.createBufferSource(); s.buffer = AU.noise(); s.loop = true; s.playbackRate.value = .5 + EF.fx() * .1; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(bp); bp.connect(g); g.connect(bus); s.start(); return { s, bp, g, v }; };
      this.nodes = [mk(300, .7, .5), mk(900, 1, .35), mk(2500, 1.2, .18)]; this.on = true;
    } catch (e) { this.nodes = null; }
  },
  stop() { if (this.nodes) for (const n of this.nodes) { try { n.s.stop(); } catch (e) { /* stopped */ } } this.nodes = null; this.on = false; },
  update(dt, mood) {
    const k = mood > this.ex ? 1 - Math.exp(-dt / .3) : 1 - Math.exp(-dt / 1.5); this.ex += (mood - this.ex) * k;
    if (!this.nodes) return;
    const c = AU.ctx(); if (!c) return;
    const lv = (this.size || .7) * (.25 + .75 * clamp(this.ex, 0, 1.4));
    for (const n of this.nodes) n.g.gain.setTargetAtTime(lv * n.v * .5, c.currentTime, .1);
  },
  /** a formant swept "OOOH" (near misses, the woodwork), a roar, boos, whistles, claps */
  react(kind, amt = 1) {
    const c = AU.ctx(), bus = AU.bus('crowd'); if (!c || !bus || !AU.noise()) return;
    try {
      const t = c.currentTime, s = c.createBufferSource(); s.buffer = AU.noise(); s.loop = true;
      const g = c.createGain(); g.gain.value = 0; s.connect(g);
      const out = c.createGain(); out.gain.value = 1; out.connect(bus);
      const fmt = (f0, f1, q, dur) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = q; b.frequency.setValueAtTime(f0, t); b.frequency.linearRampToValueAtTime(f1, t + dur); g.connect(b); b.connect(out); return b; };
      let dur = 1;
      if (kind === 'ooh') { dur = 1.1; fmt(400, 620, 6, .8); fmt(800, 1000, 7, .8); g.gain.linearRampToValueAtTime(.9 * amt, t + .15); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'roar') { dur = 3.2; fmt(500, 700, 1.2, 1); fmt(1500, 1800, 1.5, 1); g.gain.linearRampToValueAtTime(1.4 * amt, t + .2); g.gain.linearRampToValueAtTime(.6 * amt, t + 1.8); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'boo') { dur = 1.8; fmt(350, 250, 8, 1.6); fmt(700, 550, 8, 1.6); g.gain.linearRampToValueAtTime(.9 * amt, t + .3); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'groan') { dur = 1.4; fmt(500, 300, 5, 1.2); g.gain.linearRampToValueAtTime(.6 * amt, t + .1); g.gain.linearRampToValueAtTime(0, t + dur); }
      else if (kind === 'clap') { dur = .08; fmt(1200, 1200, 1, .05); g.gain.setValueAtTime(.9 * amt, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); }
      else if (kind === 'hum') { dur = 2.4; fmt(300, 320, 10, 2); g.gain.linearRampToValueAtTime(.5 * amt, t + .5); g.gain.linearRampToValueAtTime(0, t + dur); }
      s.start(t); s.stop(t + dur + .05);
      if (kind === 'whistle') for (let i = 0; i < 4; i++) { const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; const tt = t + i * .12 + EF.fx() * .1; o.frequency.setValueAtTime(2200 + EF.fx() * 900, tt); o.frequency.linearRampToValueAtTime(2800 + EF.fx() * 600, tt + .15); og.gain.setValueAtTime(0, tt); og.gain.linearRampToValueAtTime(.05, tt + .02); og.gain.linearRampToValueAtTime(0, tt + .2); o.connect(og); og.connect(bus); o.start(tt); o.stop(tt + .25); }
    } catch (e) { /* no sound */ }
  }
};
/* ---- sung chants: a choir of formant voices on a melody ---- */
const VOWEL = { a: [800, 1200], e: [500, 1800], i: [300, 2300], o: [500, 900], u: [350, 700] };
const noteHz = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 220; const k = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12; return 440 * Math.pow(2, k / 12); };
EF.noteHz = noteHz;
EF.chant = {
  sing(id, o = {}) {
    const ch = EF.get('chant', id); if (!ch) return;
    const c = AU.ctx(), bus = AU.bus('crowd'); if (!c || !bus) return;
    try {
      let t = c.currentTime + .05; const beat = 60 / (ch.bpm || 120), voices = o.voices || 7, det = ch.detune || 0;
      const reps = o.reps || 1;
      for (let r = 0; r < reps; r++) for (const [syl, note, len, vow] of ch.notes) {
        const dur = (len || 1) * beat;
        if (syl === 'clap') { for (let v = 0; v < 3; v++) setTimeout(() => EF.crowdAudio.react('clap', .6), Math.max(0, (t - c.currentTime + v * .01) * 1000)); t += dur; continue; }
        if (syl !== '.') for (let v = 0; v < voices; v++) {
          const f = noteHz(note) * Math.pow(2, ((EF.fx() - .5) * 24 + det) / 1200) * (v % 3 === 0 ? .5 : 1), osc = c.createOscillator(); osc.type = v % 2 ? 'sawtooth' : 'square'; osc.frequency.value = f;
          const [f1, f2] = VOWEL[vow || 'a'] || VOWEL.a, g = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter();
          b1.type = b2.type = 'bandpass'; b1.frequency.value = f1; b2.frequency.value = f2; b1.Q.value = 5; b2.Q.value = 7;
          const tt = t + EF.fx() * .03; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.05 / voices * 4, tt + .03); g.gain.setValueAtTime(.05 / voices * 4, tt + dur * .7); g.gain.linearRampToValueAtTime(0, tt + dur * .95);
          osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(bus); osc.start(tt); osc.stop(tt + dur);
        }
        t += dur;
      }
    } catch (e) { /* no sound */ }
  }
};
/* ---- babble voices: each revealed letter a 50-70 ms formant syllable ---- */
const LETTER_PITCH = {}; 'abcdefghijklmnopqrstuvwxyz'.split('').forEach((ch, i) => { LETTER_PITCH[ch] = 1 + (((i * 7) % 13) - 6) / 40; });
const VOWEL_OF = ch => 'aeiou'.includes(ch) ? ch : { y: 'i', w: 'u', h: 'a', r: 'e', l: 'e', m: 'u', n: 'e' }[ch] || 'a';
EF.babble = {
  vol: .8, last: 0,
  volume(v) { this.vol = v; const b = AU.bus('voices'); if (b) b.gain.value = v; },
  speakers: {},
  profile(id) { return this.speakers[id] || { f0: 150, wave: 'saw', rate: 1, formant: 1, breath: 0, vib: 0, echo: 0 }; },
  /** a voice function for E.Dialog (called once per revealed letter) */
  voiceFor(id) {
    const p = this.profile(id); let n = 0;
    return (ch, i, txt) => {
      n++; if (ch === ' ' || n % (p.rate > 1 ? 1 : 2)) return;
      const lc = ch.toLowerCase(); if (!/[a-z!?]/.test(lc)) return;
      const rest = txt.slice(i), q = rest.indexOf('?'), dot = rest.search(/[.!]/), up = q >= 0 && (dot < 0 || q < dot);
      const contour = 1 + (up ? .12 : -.04) * Math.max(0, 1 - (Math.min(q < 0 ? 99 : q, 30)) / 30) + (ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? .02 : 0);
      this.syl(lc, p, contour, txt.includes('!') ? 1.25 : 1);
    };
  },
  syl(ch, p, contour = 1, loud = 1) {
    const c = AU.ctx(), bus = AU.bus('voices'); if (!c || !bus) return;
    try {
      const t = c.currentTime + .01, dur = .055 + EF.fx() * .015, f = p.f0 * (LETTER_PITCH[ch] || 1) * contour;
      const o = c.createOscillator(); o.type = p.wave === 'pulse' ? 'square' : 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (contour > 1 ? 1.06 : .96), t + dur);
      if (p.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = f * p.vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
      const [f1, f2] = VOWEL[VOWEL_OF(ch)], b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), g = c.createGain();
      b1.type = b2.type = 'bandpass'; b1.frequency.value = f1 * (p.formant || 1); b2.frequency.value = f2 * (p.formant || 1); b1.Q.value = 4; b2.Q.value = 6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22 * loud, t + .005); g.gain.setValueAtTime(.22 * loud, t + dur - .03); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g);
      let out = g;
      if (p.echo) { const d = c.createDelay(.5), fb = c.createGain(); d.delayTime.value = .18; fb.gain.value = .35; g.connect(d); d.connect(fb); fb.connect(d); d.connect(bus); }
      out.connect(bus); o.start(t); o.stop(t + dur + .02);
      if (/[szfx]/.test(ch) || /[tkpbd]/.test(ch)) {
        const s = c.createBufferSource(); s.buffer = AU.noise(); const hp = c.createBiquadFilter(), ng = c.createGain(); hp.type = /[szfx]/.test(ch) ? 'highpass' : 'bandpass'; hp.frequency.value = /[szfx]/.test(ch) ? 4000 : 2000;
        ng.gain.setValueAtTime(.12, t); ng.gain.linearRampToValueAtTime(0, t + (/[szfx]/.test(ch) ? .014 : .005)); s.connect(hp); hp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + .03);
      }
      if (p.breath) { const s = c.createBufferSource(); s.buffer = AU.noise(); const bp = c.createBiquadFilter(), ng = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f1; ng.gain.setValueAtTime(p.breath * .2, t); ng.gain.linearRampToValueAtTime(0, t + dur); s.connect(bp); bp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + dur); }
    } catch (e) { /* no sound */ }
  },
  /** a short shout ("WAHEY!") as babble */
  shout(id, text) { const p = this.profile(id), fn = this.voiceFor(id); for (let i = 0; i < text.length; i++) setTimeout(() => fn(text[i], i, text), i * 45); }
};
