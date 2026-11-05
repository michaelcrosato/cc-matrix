/* AUDIO (section 6.22), all in code, no files: the engine's chip synth for effects and songs; a WebAudio crowd engine
 * (a bed of filtered noise that follows the mood, OOOHs, roars, boos, whistles, claps and sung chants) and babble
 * voices (Animalese-style syllables through vowel formants) on the engine's own context through named buses.
 * Headless every call is a no-op. */
const SFX = {
  touch: { wave: 'noise', freq: 1400, to: 500, dur: .03, vol: .12, filter: 'bandpass' },
  pass: { wave: 'noise', freq: 1100, to: 300, dur: .06, vol: .26, filter: 'lowpass' },
  kick: { wave: 'noise', freq: 900, to: 160, dur: .08, vol: .34, filter: 'lowpass' },
  shot: { wave: 'noise', freq: 700, to: 120, dur: .12, vol: .42, filter: 'lowpass' },
  thump: { wave: 'sine', freq: 130, to: 60, dur: .1, vol: .38 },
  screamer: { wave: 'noise', freq: 300, to: 3200, dur: .32, vol: .28, filter: 'bandpass' },
  superCharge: { wave: 'square', freq: 'C4', arp: [0, 4, 7, 12, 16, 19, 24], step: .07, dur: .55, vol: .14 },
  superRelease: { wave: 'noise', freq: 200, to: 60, dur: .5, vol: .5, filter: 'lowpass' },
  sizzle: { wave: 'noise', freq: 4000, to: 7000, dur: .5, vol: .14, filter: 'highpass' },
  grass: { wave: 'sine', freq: 110, to: 70, dur: .06, vol: .2 },
  splash: { wave: 'noise', freq: 2400, to: 600, dur: .25, vol: .28, filter: 'bandpass' },
  crunch: { wave: 'noise', freq: 3000, to: 1200, dur: .08, vol: .2, filter: 'highpass' },
  doink: { wave: 'triangle', freq: 1400, to: 1100, dur: .45, vol: .34, vib: [18, .01] },
  net: { wave: 'noise', freq: 3000, to: 1800, dur: .3, vol: .26, filter: 'highpass' },
  catch: { wave: 'noise', freq: 600, to: 300, dur: .06, vol: .4, filter: 'lowpass' },
  parry: { wave: 'square', freq: 220, to: 110, dur: .08, vol: .28 },
  whistle: { wave: 'square', freq: 2300, vib: [32, .05], dur: .26, vol: .14 },
  whistleLong: { wave: 'square', freq: 2300, vib: [32, .05], dur: .7, vol: .14, hold: true },
  card: { wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .3, filter: 'bandpass' },
  slide: { wave: 'noise', freq: 500, to: 180, dur: .32, vol: .24, filter: 'lowpass' },
  thud: { wave: 'sine', freq: 90, to: 40, dur: .18, vol: .45 },
  swish: { wave: 'noise', freq: 2000, to: 5000, dur: .14, vol: .14, filter: 'bandpass' },
  nutmeg: { wave: 'triangle', freq: 'E6', to: 'B6', dur: .18, vol: .2 },
  chime: { wave: 'triangle', freq: 'G5', arp: [0, 7], step: .06, dur: .2, vol: .2 },
  stab: { wave: 'saw', freq: 'C4', arp: [0, 4, 7, 12], step: 0, dur: .4, vol: .2 },
  tick: { wave: 'square', freq: 1800, dur: .025, vol: .12 },
  perfect: { wave: 'triangle', freq: 'C6', arp: [0, 7, 12], step: .05, dur: .3, vol: .26 },
  buzz: { wave: 'saw', freq: 110, to: 80, dur: .35, vol: .26 },
  beep: { wave: 'sine', freq: 1200, dur: .08, vol: .16 },
  ding: { wave: 'triangle', freq: 'E5', to: 'C5', dur: .7, vol: .22 },
  squawk: { wave: 'saw', freq: 1200, to: 700, dur: .18, vol: .16, vib: [30, .1] },
  boing: { wave: 'sine', freq: 180, to: 600, dur: .25, vol: .3 },
  powerDown: { wave: 'saw', freq: 300, to: 40, dur: .9, vol: .2 },
  horn: { wave: 'square', freq: 'A3', dur: .6, vol: .2, hold: true },
  shimmer: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12, 16], step: .04, dur: .3, vol: .14 },
  heartbeat: { wave: 'sine', freq: 60, to: 40, dur: .12, vol: .5 },
  coin: { wave: 'square', freq: 'B5', arp: [0, 5], step: .05, dur: .15, vol: .12 },
  typewriter: { wave: 'noise', freq: 3500, to: 2000, dur: .02, vol: .14, filter: 'bandpass' },
  paper: { wave: 'noise', freq: 1200, to: 3000, dur: .3, vol: .14, filter: 'bandpass' },
  firework: { wave: 'noise', freq: 400, to: 80, dur: .6, vol: .3, filter: 'lowpass' }
};
for (const k in SFX) A_.define(k, SFX[k]);
EF.sfx = (name, o) => { if (EF.muteAll) return; try { A_.sfx(name, o); } catch (e) { /* sound off */ } };

/* ---- songs (the engine's format; original melodies, Appendix D) ---- */
const SONG = {
  anthem: { bpm: 108, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: 'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
    { name: 'counter', wave: 'square', vol: .06, notes: 'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . E3 . C3 . | F2 . A2 . G2 . B2 . | A2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' }] },
  menu: { bpm: 128, steps: 4, tracks: [
    { wave: 'pulse', vol: .08, notes: 'C5 . E5 . G5 . E5 . | F5 . A5 . C6 . A5 . | D5 . F5 . A5 . F5 . | G5 . B5 . D6 . B5 .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . C3 . C3 . G2 . | F2 . F2 . F2 . C3 . | D3 . D3 . D3 . A2 . | G2 . G2 . G2 . D3 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h . k k h . s . h h' }] },
  travel: { bpm: 116, steps: 2, tracks: [
    { wave: 'sine', vol: .16, notes: 'E5 - G5 E5 D5 - C5 - | D5 - E5 - G4 - - - | E5 - G5 E5 A5 - G5 - | E5 D5 C5 D5 C5 - - - ' },
    { wave: 'triangle', vol: .26, notes: 'C3 G2 C3 G2 | G2 D3 G2 D3 | C3 G2 A2 E2 | F2 G2 C3 .' },
    { wave: 'drums', vol: .08, notes: 'k h s h k h s h' }] },
  tabloid: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'A4 . . A4 C5 . . . | A4 . . A4 E5 . D5 . | A4 . . A4 C5 . . . | G4 . A4 . . . . .' },
    { wave: 'triangle', vol: .26, notes: 'A2 . A2 . A2 . A2 . | F2 . F2 . F2 . F2 . | A2 . A2 . A2 . A2 . | E2 . E2 . E2 . E2 .' },
    { wave: 'drums', vol: .08, notes: 't t t . t t t . t t t . t . t t' }] },
  dressing: { bpm: 84, steps: 2, tracks: [
    { wave: 'triangle', vol: .14, notes: 'E4 - - G4 A4 - - - | G4 - - E4 D4 - - - | C4 - - E4 G4 - - A4 | G4 - - - - - - -' },
    { wave: 'sine', vol: .2, notes: 'A2 - - - E3 - - - | F2 - - - C3 - - - | C3 - - - G2 - - - | G2 - - - D3 - - -' }] },
  matchbed: { bpm: 140, steps: 4, tracks: [
    { name: 'eudrums', wave: 'drums', vol: .14, on: false, notes: 'k . h k s . h . | k k h . s . h k' },
    { name: 'eubass', wave: 'saw', vol: .1, on: false, notes: 'C2 C2 G2 C2 C2 G2 C3 G2 | C2 C2 G2 C2 Bb1 Bb1 F2 Bb1' },
    { name: 'eubrass', wave: 'saw', vol: .08, on: false, notes: '. . C5 . . . E5 . | . . G5 . . . E5 .' },
    { name: 'tension', wave: 'triangle', vol: .12, on: false, notes: 'A3 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - -' },
    { name: 'heart', wave: 'drums', vol: .18, on: false, notes: 'k k . . . . . . k k . . . . . .' }] },
  halftime: { bpm: 132, steps: 2, tracks: [
    { wave: 'pulse', vol: .1, notes: 'C5 E5 G5 Bb5 A5 - F5 - | G5 E5 C5 D5 C5 - - -' },
    { wave: 'triangle', vol: .26, notes: 'C3 G2 C3 G2 | F2 C3 G2 C3' },
    { wave: 'drums', vol: .07, notes: 'k h s h' }] },
  goal: { bpm: 150, steps: 2, loop: false, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - G5 C6 - | - - - - - - - -' },
    { wave: 'saw', vol: .1, notes: 'E4 G4 C5 E5 - C5 E5 - | - - - - - - - -' },
    { wave: 'drums', vol: .12, notes: 'k k s k s s s s' }] },
  tension: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'A3 - - - - - - - - - - - - - - -' }, { wave: 'triangle', vol: .1, notes: 'C4 - - - - - - - - - - - - - - -' }, { wave: 'triangle', vol: .08, notes: 'E4 - - - - - - - D4 - - - - - - -' },
    { wave: 'drums', vol: .2, notes: 'k k . . k k . . k k . . k k . .' }] },
  victory: { bpm: 128, steps: 2, loop: false, tracks: [
    { wave: 'pulse', vol: .14, notes: 'G4 C5 E5 G5 - E5 G5 - | C6 - - - - - . .' },
    { wave: 'triangle', vol: .26, notes: 'C3 - G2 - C3 - E3 - | C3 - - - - - . .' },
    { wave: 'drums', vol: .1, notes: 'k . s . k k s . | k . . . . . . .' }] },
  defeat: { bpm: 70, steps: 2, loop: false, tracks: [
    { wave: 'saw', vol: .12, notes: 'G4 - F#4 - F4 - E4 - - - - - - - . .' },
    { wave: 'triangle', vol: .2, notes: 'C3 - B2 - Bb2 - A2 - - - - - - - . .' }] },
  villain: { bpm: 96, steps: 3, tracks: [
    { wave: 'saw', vol: .09, notes: 'A4 - C5 E5 - D5 C5 - B4 | A4 - - E4 - - A4 - - | F4 - A4 C5 - B4 A4 - G#4 | A4 - - - - - . . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . . E3 . . E3 . . | A2 . . E3 . . E3 . . | F2 . . C3 . . C3 . . | E2 . . B2 . . E3 . .' }] },
  ceremony: { bpm: 132, steps: 2, tracks: [
    { name: 'lead', wave: 'pulse', vol: .13, notes: 'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
    { wave: 'saw', vol: .06, notes: 'C4 - E4 - G4 - C5 - | A3 - C4 - F4 - A4 - | D4 - F4 - A4 - D5 - | G3 - B3 - D4 - G4 - | C4 - E4 - G4 - C5 - | F3 - A3 - G3 - B3 - | A3 - F3 - G3 - G3 - | C4 - - - - - . .' },
    { wave: 'triangle', vol: .3, notes: 'C3 C3 G2 G2 C3 C3 G2 G2 | F2 F2 C3 C3 F2 F2 C3 C3 | D3 D3 A2 A2 D3 D3 A2 A2 | G2 G2 D3 D3 G2 G2 B2 B2' },
    { wave: 'drums', vol: .12, notes: 'k h s h k k s h | k h s k k h s s' }] },
  credits: { bpm: 96, steps: 2, tracks: [
    { wave: 'triangle', vol: .16, notes: 'G5 - C6 - E6 - G6 - | F6 - E6 D6 E6 - C6 - | A5 - D6 - F6 - A6 - | G6 - - - - - . . | E6 - G6 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
    { wave: 'sine', vol: .14, notes: 'C4 . G3 . C4 . G3 . | F3 . C4 . F3 . C4 . | D4 . A3 . D4 . A3 . | G3 . D4 . G3 . B3 .' }] },
  training: { bpm: 100, steps: 2, tracks: [
    { wave: 'pulse', vol: .08, notes: 'E5 . G5 . A5 - G5 . | E5 . D5 . C5 - . . | D5 . E5 . G5 - E5 . | D5 . C5 . A4 - . .' },
    { wave: 'triangle', vol: .24, notes: 'A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 .' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h h' }] },
  attract: { bpm: 150, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'G4 . C5 . E5 . G5 . F5 . E5 D5 E5 . C5 . | A4 . D5 . F5 . A5 . G5 - - - - . . . | E5 . G5 . C6 . B5 A5 G5 . E5 . F5 . D5 . | C5 . E5 D5 C5 . B4 . C5 - - - - . . .' },
    { wave: 'saw', vol: .07, notes: 'C3 C3 C4 C3 G2 G2 G3 G2 | F2 F2 F3 F2 C3 C3 C4 C3 | D3 D3 D4 D3 A2 A2 A3 A2 | G2 G2 G3 G2 G2 G2 B2 G2' },
    { wave: 'drums', vol: .13, notes: 'k . h k s . h . k k h . s . h k' }] }
};
EF.SONGS = SONG;
EF.music = (id, o) => { if (EF.muteAll) return; try { A_.music(id ? SONG[id] || id : null, o); EF.musicNow = id; } catch (e) { /* off */ } };
EF.layer = (name, vol, fade) => { try { A_.layer(name, vol, fade); } catch (e) { /* off */ } };
EF.sting = id => { try { A_.sting(SONG[id], { at: 'bar' }); } catch (e) { /* off */ } };

/* ---- WebAudio helpers on the engine's context (null headless) ---- */
const WA = {
  ctx() { return A_.ready || A_.ctx ? A_.ctx : null; },
  bus(name) { return A_.bus ? A_.bus(name) : null; },
  noise(c, dur) { const s = c.createBufferSource(); s.buffer = A_.noiseBuffer(); s.loop = true; return s; },
  bp(c, f, q) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; },
  env(c, t, a, h, r, v) { const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + a + h); g.gain.linearRampToValueAtTime(0, t + a + h + r); return g; }
};
const VOWEL = { a: [800, 1200], e: [500, 1800], i: [300, 2300], o: [500, 900], u: [350, 700] };

/* ---- the crowd engine (section 6.22.3) ---- */
EF.crowdAudio = {
  on: false, ex: 0, want: 0, size: .6,
  start(size) {
    this.stop(); this.size = clamp(size / 1600, .15, 1); this.want = .2; this.ex = .2;
    const c = WA.ctx(), bus = WA.bus('crowd'); if (!c || !bus) return;
    try {
      this.nodes = [[300, .7, .6], [900, 1, .45], [2500, 1.2, .2]].map(([f, q, v]) => { const s = WA.noise(c), b = WA.bp(c, f, q), g = c.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(bus); s.start(); return { s, g, v }; });
      this.on = true;
    } catch (e) { if (EF.audioDebug) throw e; this.on = false; }
  },
  stop() { if (this.nodes) for (const n of this.nodes) { try { n.s.stop(); n.s.disconnect(); n.g.disconnect(); } catch (e) { if (EF.audioDebug) throw e; /* gone */ } } this.nodes = null; this.on = false; },
  /** excitement 0..1 (the crowd's mood); smoothed up fast and down slowly */
  set(ex, dt) { this.want = clamp(ex, 0, 1); this.ex = approach(this.ex, this.want, dt * (this.want > this.ex ? 3.3 : .7)); const c = WA.ctx(); if (!this.on || !c) return; const lvl = this.size * (.25 + .75 * this.ex) * .5, t = A_.now(); for (const n of this.nodes) n.g.gain.setTargetAtTime(lvl * n.v * (EF.mutedCrowd ? 0 : 1), t, .1); },
  react(kind) {
    const c = WA.ctx(), bus = WA.bus('crowd'); if (!c || !bus || EF.mutedCrowd) return;
    const t = A_.now() + .01, S = this.size;
    try {
      if (kind === 'ooh') { const s = WA.noise(c), g = WA.env(c, t, .12, .35, .45, .22 * S); for (const [f0, f1] of [[400, 600], [800, 1000]]) { const b = WA.bp(c, f0, 8); b.frequency.setValueAtTime(f0, t); b.frequency.linearRampToValueAtTime(f1, t + .8); s.connect(b); b.connect(g); } g.connect(bus); s.start(t); s.stop(t + 1.1); }
      else if (kind === 'roar') { const s = WA.noise(c), b = WA.bp(c, 1400, .6), g = WA.env(c, t, .15, 1.8, 1.2, .3 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t); s.stop(t + 3.3); this.ex = 1; }
      else if (kind === 'boo') { const s = WA.noise(c), g = WA.env(c, t, .2, .8, .6, .45 * S); const b = WA.bp(c, 330, 6); b.frequency.setValueAtTime(360, t); b.frequency.linearRampToValueAtTime(240, t + 1.5); s.connect(b); b.connect(g); for (let i = 0; i < 4; i++) { const o = c.createOscillator(), og = WA.env(c, t, .2, .7, .5, .03 * S); o.type = 'sawtooth'; o.frequency.setValueAtTime(120 + i * 13, t); o.frequency.linearRampToValueAtTime(90 + i * 9, t + 1.4); const ob = WA.bp(c, 400, 3); o.connect(ob); ob.connect(og); og.connect(bus); o.start(t); o.stop(t + 1.6); } g.connect(bus); s.start(t); s.stop(t + 1.7); }
      else if (kind === 'whistles') { for (let i = 0; i < 5; i++) { const o = c.createOscillator(), t0 = t + EF.fx(0, .5), g = WA.env(c, t0, .02, .12, .08, .06 * S); o.type = 'sine'; o.frequency.setValueAtTime(EF.fx(2200, 3200), t0); o.frequency.linearRampToValueAtTime(EF.fx(2600, 3600), t0 + .2); o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + .3); } }
      else if (kind === 'clap') { for (let i = 0; i < 12; i++) { const s = WA.noise(c), t0 = t + EF.fx(0, .06), b = WA.bp(c, 1500, 1.4), g = WA.env(c, t0, .002, .01, .05, .14 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + .1); } }
      else if (kind === 'gasp') { const s = WA.noise(c), b = WA.bp(c, 2200, 2), g = WA.env(c, t, .05, .1, .4, .3 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t); s.stop(t + .6); }
    } catch (e) { if (EF.audioDebug) throw e; /* the context went away */ }
  },
  /** a sung chant (registry 'chant'): syllables on notes with vowels, a choir of 8 detuned voices, claps */
  chant(id) {
    const ch = EF.get('chant', id), c = WA.ctx(), bus = WA.bus('crowd'); if (!ch || !c || !bus || EF.mutedCrowd) return;
    const beat = 60 / (ch.bpm || 120); let t = A_.now() + .05; const S = this.size;
    try {
      for (let rep = 0; rep < (ch.reps || 2); rep++) for (const [note, vowel, beats, clap] of ch.notes) {
        if (note === '.') { if (clap) this.clapAt(t, S); t += beats * beat; continue; }
        const f = 440 * Math.pow(2, (E.noteNum ? E.noteNum(note) - 69 : noteToMidi(note) - 69) / 12) * (ch.detune ? Math.pow(2, ch.detune / 1200) : 1), [F1, F2] = VOWEL[vowel] || VOWEL.a, dur = beats * beat * .9;
        const g = WA.env(c, t, .04, Math.max(.02, dur - .12), .08, .05 * S);
        for (let v = 0; v < 8; v++) { const o = c.createOscillator(); o.type = v % 2 ? 'square' : 'sawtooth'; o.frequency.value = f * Math.pow(2, (v - 3.5) * 3.4 / 1200) * (v > 5 ? .5 : 1); const b1 = WA.bp(c, F1, 6), b2 = WA.bp(c, F2, 8); o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); o.start(t); o.stop(t + dur + .1); }
        g.connect(bus); if (clap) this.clapAt(t, S); t += beats * beat;
      }
    } catch (e) { if (EF.audioDebug) throw e; /* gone */ }
  },
  clapAt(t, S) { const c = WA.ctx(), bus = WA.bus('crowd'); if (!c || !bus) return; for (let i = 0; i < 10; i++) { const s = WA.noise(c), t0 = t + EF.fx(0, .05), b = WA.bp(c, 1600, 1.4), g = WA.env(c, t0, .002, .01, .05, .12 * S); s.connect(b); b.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + .1); } }
};
const NOTE_I = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteToMidi = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return 69; return 12 * (+m[3] + 1) + NOTE_I[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };

/* ---- babble voices (section 6.22.4): a syllable per letter, through the vowel's formants; consonants are noise ---- */
const LETTER_PITCH = {}; 'abcdefghijklmnopqrstuvwxyz'.split('').forEach((ch, i) => { LETTER_PITCH[ch] = 1 + (((i * 7) % 13) - 6) * .025; });
const NEXT_VOWEL = (line, i) => { for (let k = i; k < Math.min(line.length, i + 4); k++) { const c = line[k].toLowerCase(); if ('aeiou'.includes(c)) return c; } return 'a'; };
EF.babble = {
  busy: 0,
  /** a voice function for E.Dialog (engine change 1): called for each newly shown letter */
  voiceFor(id) { const prof = EF.Cast.voice(id); return (ch, i, line) => this.syllable(prof, ch, i, line); },
  syllable(prof, ch, i, line) {
    const c = WA.ctx(), bus = WA.bus('voices'); if (!c || !bus || EF.mutedVoices) return;
    if (ch === ' ' || ch === ',' || ch === '.' || ch === '!' || ch === '?' || ch === '-' || ch === "'") return;
    if (i % 2 === 1 && !'aeiouAEIOU'.includes(ch)) return;   // every other consonant: a quicker chatter
    try {
      const t = A_.now() + .005, lc = ch.toLowerCase(), cap = ch !== lc, end = line.slice(i).search(/[.!?]/), q = end >= 0 ? line[i + end] : '.';
      const contour = q === '?' ? 1 + .12 * (1 - Math.min(1, end / 8)) : q === '!' ? 1.08 : 1 - .06 * (1 - Math.min(1, Math.max(0, end) / 8));
      const f = (prof.f0 || 140) * (LETTER_PITCH[lc] || 1) * contour * (cap ? 1.06 : 1) * EF.fx(.97, 1.03), dur = .055 / (prof.rate || 1);
      const vowel = 'aeiou'.includes(lc) ? lc : NEXT_VOWEL(line, i), [F1, F2] = VOWEL[vowel], fs = prof.formant || 1;
      const g = WA.env(c, t, .005, dur * .6, .03, (cap || q === '!' ? .2 : .14));
      const o = c.createOscillator(); o.type = prof.wave === 'pulse' ? 'square' : 'sawtooth'; o.frequency.value = f;
      if (prof.vibrato) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = f * prof.vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .05); }
      const b1 = WA.bp(c, F1 * fs, 5), b2 = WA.bp(c, F2 * fs, 7); o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g);
      let out = g;
      if (prof.echo) { const d = c.createDelay(); d.delayTime.value = .18; const fb = c.createGain(); fb.gain.value = .35; g.connect(d); d.connect(fb); fb.connect(d); const mix = c.createGain(); g.connect(mix); d.connect(mix); out = mix; }
      out.connect(bus); o.start(t); o.stop(t + dur + .05);
      if (prof.breath) { const s = WA.noise(c), hb = c.createBiquadFilter(); hb.type = 'highpass'; hb.frequency.value = 2500; const ng = WA.env(c, t, .005, dur * .5, .03, .05 * prof.breath); s.connect(hb); hb.connect(ng); ng.connect(bus); s.start(t); s.stop(t + dur + .05); }
      if ('szfx'.includes(lc) || lc === 'c' && line[i + 1] === 'h') { const s = WA.noise(c), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4200; const ng = WA.env(c, t, .002, .01, .01, .07); s.connect(hp); hp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + .03); }
      else if ('tkpbdg'.includes(lc)) { const s = WA.noise(c), bp = WA.bp(c, 2000, 2), ng = WA.env(c, t, .001, .004, .004, .1); s.connect(bp); bp.connect(ng); ng.connect(bus); s.start(t); s.stop(t + .015); }
    } catch (e) { if (EF.audioDebug) throw e; /* gone */ }
  },
  /** a short shout (celebrations): babble a word at once */
  shout(id, word) { const prof = EF.Cast.voice(id), line = word; for (let i = 0; i < line.length; i++) game.after(i * .05, () => this.syllable(Object.assign({}, prof, { f0: (prof.f0 || 140) * 1.15 }), line[i], i, line)); }
};
/** stop every sound of ours: music, the crowd engine (the hub's end, leaving a match) */
EF.silence = () => { EF.music(null); EF.crowdAudio.stop(); };
