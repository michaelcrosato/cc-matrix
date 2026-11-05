/* =============================================================================
 * 02-audio: every sound in code. Sound effects (audio.define), the crowd, the
 * music director (a song per scene, named layers, stings) and BABBLE: the
 * Animalese / Simlish-style gibberish voices every character speaks with.
 * ========================================================================== */
BZ.SFX = {
  tink: [{ wave: 'square', freq: 1800, to: 1400, dur: .06, vol: .22 }, { wave: 'noise', freq: 5000, dur: .04, vol: .12, filter: 'highpass' }],
  crack: [{ wave: 'noise', freq: 2600, to: 900, dur: .09, vol: .55 }, { wave: 'square', freq: 900, to: 300, dur: .08, vol: .22 }, { wave: 'triangle', freq: 220, to: 90, dur: .12, vol: .3 }],
  krakoom: [{ wave: 'noise', freq: 1600, to: 200, dur: .5, vol: .7 }, { wave: 'sine', freq: 120, to: 30, dur: .6, vol: .7 }, { wave: 'square', freq: 1200, to: 2400, dur: .25, vol: .14, delay: .05 }, { wave: 'triangle', freq: 660, dur: .5, vol: .12, delay: .1, vib: [12, .02] }],
  fizzle: [{ wave: 'noise', freq: 3000, to: 400, dur: .7, vol: .3 }, { wave: 'saw', freq: 300, to: 80, dur: .6, vol: .12 }],
  mitt: [{ wave: 'noise', freq: 900, to: 300, dur: .07, vol: .5 }, { wave: 'sine', freq: 180, to: 80, dur: .08, vol: .45 }],
  glove: [{ wave: 'noise', freq: 1300, to: 600, dur: .05, vol: .35 }, { wave: 'sine', freq: 260, to: 140, dur: .05, vol: .25 }],
  pitchWhoosh: [{ wave: 'noise', freq: 900, to: 3200, dur: .32, vol: .2 }],
  foultip: [{ wave: 'noise', freq: 4000, to: 2000, dur: .05, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 2200, dur: .03, vol: .1 }],
  dirtThud: [{ wave: 'noise', freq: 500, to: 200, dur: .09, vol: .35 }],
  bounce: [{ wave: 'sine', freq: 260, to: 120, dur: .06, vol: .25 }, { wave: 'noise', freq: 700, dur: .04, vol: .12 }],
  clang: [{ wave: 'square', freq: 520, to: 480, dur: .25, vol: .16 }, { wave: 'triangle', freq: 1040, dur: .3, vol: .12 }, { wave: 'noise', freq: 1200, dur: .08, vol: .25 }],
  thudWall: [{ wave: 'sine', freq: 140, to: 60, dur: .14, vol: .5 }, { wave: 'noise', freq: 400, dur: .08, vol: .3 }],
  ping: [{ wave: 'triangle', freq: 1760, dur: .4, vol: .2 }, { wave: 'sine', freq: 2640, dur: .3, vol: .12 }],
  cheer: [{ wave: 'noise', freq: 1400, to: 2200, dur: 1.3, vol: .32 }, { wave: 'noise', freq: 900, to: 1500, dur: 1.1, vol: .22, delay: .1 }],
  bigCheer: [{ wave: 'noise', freq: 1200, to: 2600, dur: 2.4, vol: .42 }, { wave: 'noise', freq: 800, to: 1700, dur: 2, vol: .3, delay: .15 }, { wave: 'noise', freq: 2400, to: 3200, dur: 1.6, vol: .12, delay: .3, filter: 'highpass' }],
  groan: [{ wave: 'noise', freq: 900, to: 380, dur: 1.1, vol: .3 }, { wave: 'saw', freq: 200, to: 120, dur: .9, vol: .05 }],
  oooh: [{ wave: 'noise', freq: 600, to: 1300, dur: .5, vol: .25 }, { wave: 'noise', freq: 1300, to: 500, dur: .7, vol: .25, delay: .45 }],
  boo: [{ wave: 'noise', freq: 420, to: 300, dur: 1.2, vol: .25 }, { wave: 'saw', freq: 140, to: 110, dur: 1, vol: .05 }],
  gasp: [{ wave: 'noise', freq: 2400, to: 1200, dur: .3, vol: .22, filter: 'highpass' }],
  murmur: [{ wave: 'noise', freq: 700, to: 800, dur: .7, vol: .06 }],
  step: [{ wave: 'noise', freq: 600, dur: .03, vol: .1 }],
  slide: [{ wave: 'noise', freq: 1600, to: 500, dur: .45, vol: .32 }],
  dive: [{ wave: 'noise', freq: 800, to: 300, dur: .25, vol: .35 }, { wave: 'sine', freq: 150, to: 60, dur: .12, vol: .3, delay: .2 }],
  climb: [{ wave: 'noise', freq: 2000, dur: .06, vol: .18 }, { wave: 'noise', freq: 2200, dur: .06, vol: .18, delay: .1 }, { wave: 'noise', freq: 1900, dur: .06, vol: .18, delay: .2 }],
  throwWhoosh: [{ wave: 'noise', freq: 1200, to: 2600, dur: .2, vol: .2 }],
  crash: [{ wave: 'noise', freq: 1200, to: 200, dur: .5, vol: .6 }, { wave: 'sine', freq: 110, to: 40, dur: .4, vol: .5 }, { wave: 'square', freq: 300, to: 100, dur: .2, vol: .12 }],
  firework: [{ wave: 'sine', freq: 90, to: 30, dur: .5, vol: .45 }, { wave: 'noise', freq: 3000, to: 6000, dur: .8, vol: .16, delay: .1, filter: 'highpass' }],
  launch: [{ wave: 'noise', freq: 2000, to: 6000, dur: .45, vol: .14 }],
  charge: [{ wave: 'saw', freq: 110, to: 880, dur: .7, vol: .14 }, { wave: 'noise', freq: 600, to: 3000, dur: .7, vol: .14 }],
  rocket: [{ wave: 'noise', freq: 900, to: 400, dur: .8, vol: .3 }, { wave: 'saw', freq: 70, dur: .8, vol: .12 }],
  gull: [{ wave: 'square', freq: 1500, to: 900, dur: .14, vol: .14 }, { wave: 'square', freq: 1600, to: 1000, dur: .16, vol: .14, delay: .18 }],
  lava: [{ wave: 'sine', freq: 55, to: 40, dur: 1.4, vol: .5, vib: [7, .2] }, { wave: 'noise', freq: 300, dur: 1.2, vol: .25 }],
  erupt: [{ wave: 'noise', freq: 600, to: 150, dur: 1, vol: .6 }, { wave: 'sine', freq: 80, to: 30, dur: .9, vol: .6 }],
  meteor: [{ wave: 'noise', freq: 4000, to: 400, dur: .9, vol: .3 }, { wave: 'sine', freq: 90, to: 30, dur: .5, vol: .4, delay: .8 }],
  ghost: [{ wave: 'sine', freq: 500, to: 300, dur: .9, vol: .18, vib: [5, .06] }, { wave: 'triangle', freq: 750, to: 450, dur: .8, vol: .08, vib: [6, .05] }],
  drone: [{ wave: 'saw', freq: 140, dur: .5, vol: .06, vib: [30, .03] }],
  horn: [{ wave: 'saw', freq: 98, dur: 1.2, vol: .22 }, { wave: 'square', freq: 147, dur: 1.2, vol: .12 }],
  splash: [{ wave: 'noise', freq: 1200, to: 300, dur: .6, vol: .4 }],
  ding: [{ wave: 'triangle', freq: 1320, dur: .25, vol: .25 }, { wave: 'triangle', freq: 1760, dur: .35, vol: .2, delay: .08 }],
  turbo: [{ wave: 'noise', freq: 800, to: 2200, dur: .25, vol: .14 }],
  select: [{ wave: 'square', freq: 660, dur: .04, vol: .14 }],
  confirm: [{ wave: 'square', freq: 660, dur: .05, vol: .16 }, { wave: 'square', freq: 990, dur: .08, vol: .16, delay: .05 }],
  cancel: [{ wave: 'square', freq: 440, to: 300, dur: .08, vol: .14 }],
  bonk: [{ wave: 'sine', freq: 500, to: 180, dur: .12, vol: .4 }, { wave: 'noise', freq: 900, dur: .05, vol: .2 }],
  slideWhistle: [{ wave: 'sine', freq: 500, to: 1400, dur: .35, vol: .2 }, { wave: 'sine', freq: 1400, to: 400, dur: .35, vol: .2, delay: .35 }],
  pow: [{ wave: 'noise', freq: 1400, to: 300, dur: .15, vol: .5 }, { wave: 'square', freq: 200, to: 80, dur: .1, vol: .2 }],
  pok: [{ wave: 'square', freq: 900, to: 1600, dur: .05, vol: .2 }, { wave: 'noise', freq: 3000, dur: .03, vol: .14 }],
  zap: [{ wave: 'saw', freq: 1600, to: 200, dur: .2, vol: .18 }, { wave: 'noise', freq: 5000, dur: .1, vol: .12, filter: 'highpass' }],
  laserPitch: [{ wave: 'square', freq: 2400, to: 300, dur: .5, vol: .16 }],
  scream: [{ wave: 'saw', freq: 900, to: 1500, dur: .6, vol: .12, vib: [9, .08] }, { wave: 'sine', freq: 1200, to: 2000, dur: .5, vol: .1, vib: [11, .06] }],
  wave: [{ wave: 'noise', freq: 500, to: 1500, dur: .8, vol: .3 }],
  sizzle: [{ wave: 'noise', freq: 4000, to: 2000, dur: .6, vol: .2, filter: 'highpass' }],
  whistle: [{ wave: 'sine', freq: 2600, dur: .12, vol: .25, vib: [40, .03] }, { wave: 'sine', freq: 2600, dur: .4, vol: .25, delay: .16, vib: [40, .03] }],
  popcorn: [{ wave: 'square', freq: 1200, to: 2000, dur: .04, vol: .14 }, { wave: 'square', freq: 1400, to: 2300, dur: .04, vol: .14, delay: .07 }, { wave: 'square', freq: 1100, to: 1900, dur: .04, vol: .14, delay: .15 }],
  organStab: [{ wave: 'square', freq: 'C5', dur: .18, vol: .12, vib: [6, .01] }, { wave: 'triangle', freq: 'C4', dur: .18, vol: .14 }, { wave: 'square', freq: 'E5', dur: .18, vol: .1 }, { wave: 'square', freq: 'G5', dur: .18, vol: .1 }],
  coin: [{ wave: 'square', freq: 990, dur: .05, vol: .16 }, { wave: 'square', freq: 1320, dur: .12, vol: .16, delay: .05 }],
  explode: 'explode'
};
BZ.sfx = (name, o) => {
  const A = BZ.game && BZ.game.audio; if (!A || !BZ.cosmetic) return;
  if (BZ.hubActive) o = Object.assign({ vary: 0 }, o);   // a session's card draws no numbers from Math.random
  try { A.sfx(BZ.SFX[name] && typeof BZ.SFX[name] !== 'string' ? name : (BZ.SFX[name] || name), o); } catch (e) { /* sound is best-effort */ }
};
BZ.defineSounds = (game) => { for (const k in BZ.SFX) if (typeof BZ.SFX[k] !== 'string') game.audio.define(k, BZ.SFX[k]); };

/* ---- BABBLE: gibberish voices, one syllable a letter ---- */
BZ.VOICES = {
  hap: { wave: 'pulse', base: 190, rate: 20, range: 7 },
  lou: { wave: 'square', base: 120, rate: 15, vib: [6, .02], range: 5 },
  gloria: { wave: 'triangle', base: 150, rate: 9, echo: true, range: 4 },
  barb: { wave: 'square', base: 260, rate: 14, hold: true, range: 6 },
  dot: { wave: 'pulse12', base: 300, rate: 22, range: 7 },
  ike: { wave: 'triangle', base: 170, rate: 12, vib: [5, .04], range: 6 },
  mortimer: { wave: 'saw', base: 140, rate: 16, range: 6 },
  enforcer: { wave: 'saw', base: 90, rate: 18, robot: true, range: 0 },
  skeleton: { wave: 'triangle', base: 220, rate: 18, clack: true, range: 7 },
  brine: { wave: 'pulse', base: 200, rate: 17, range: 7 },
  iggy: { wave: 'square', base: 230, rate: 22, range: 8 },
  cosmo: { wave: 'sine', base: 210, rate: 15, vib: [7, .03], range: 6 },
  kid: { wave: 'pulse12', base: 260, rate: 20, range: 8 },
  crowdguy: { wave: 'square', base: 170, rate: 16, range: 6 },
  vendor: { wave: 'pulse', base: 230, rate: 14, range: 9 }
};
const VOWEL = { a: 0, e: 4, i: 7, o: 2, u: -3, y: 5 };
BZ.babble = {
  /** speak text in a voice: one note a letter (deterministic); returns the seconds it takes */
  say(text, voiceId = 'hap', o = {}) {
    const v = BZ.VOICES[voiceId] || BZ.VOICES.hap, vol = (BZ.game && BZ.game.settings && BZ.game.settings.voices !== undefined ? BZ.game.settings.voices : .8) * (o.vol || 1);
    const list = this.voices(text, v, vol, o);
    if (BZ.game && BZ.cosmetic && vol > 0 && list.length) { try { BZ.game.audio.sfx(list, { vary: 0 }); } catch (e) { /* best effort */ } }
    BZ.babble.last = { text, voice: voiceId, notes: list.length };
    return list.length ? list[list.length - 1].delay + .1 : 0;
  },
  /** the notes for a line, without playing them (tests read this) */
  voices(text, v, vol = .8, o = {}) {
    const out = []; let t = 0, lift = 0, word = '', i = 0;
    const s = String(text).replace(/\{[^}]*\}/g, '').slice(0, o.max || 90);
    const words = s.split(/(\s+)/);
    for (const w of words) {
      const caps = /[A-Z]{2,}/.test(w) && w === w.toUpperCase();
      for (const ch of w) {
        const c = ch.toLowerCase();
        if (/\s/.test(c)) { t += .04; continue; }
        if (c === '.' || c === ',' || c === ';' || c === ':') { t += c === ',' ? .1 : .16; continue; }
        if (c === '!') { t += .12; lift = 4; continue; }
        if (c === '?') { t += .12; continue; }
        if (!/[a-z0-9]/.test(c)) continue;
        const isV = c in VOWEL, h = BZ.hash(c + voiceIdKey(v)) % 7 - 3;
        let semi = isV ? VOWEL[c] : h, contour = Math.sin((i + word.length) * .9) * (v.range || 5) * .35;
        if (v.robot) { semi = [0, 4, 7][i % 3]; contour = 0; }
        if (lift > 0) { semi += 3; lift--; }
        const q = s.trim().endsWith('?') && i > s.length - 6 ? 4 : 0;
        const f = v.base * Math.pow(2, (semi + contour + q) / 12), dur = (1 / v.rate) * (isV ? 1.3 : .8) * (caps ? 1.35 : 1) * (v.hold && isV ? 1.6 : 1);
        out.push({ wave: v.wave, freq: f, to: f * 1.06, dur, vol: vol * .2 * (caps ? 1.3 : 1), vib: v.vib || (v.hold && isV ? [7, .03] : undefined), delay: t });
        if (v.echo) out.push({ wave: v.wave, freq: f, to: f * 1.06, dur, vol: vol * .08, delay: t + .12 });
        if ('szx'.includes(c)) out.push({ wave: 'noise', freq: 6000, dur: .01, vol: vol * .08, delay: t, filter: 'highpass' });
        if (v.clack && i % 3 === 0) out.push({ wave: 'noise', freq: 2500, dur: .02, vol: vol * .12, delay: t });
        t += dur; i++;
      }
      word = w;
    }
    return out;
  }
};
function voiceIdKey(v) { return String(v.base); }

/* ---- music: original songs in the engine's notation (bpm, steps a beat, tracks of tokens) ---- */
const ORGAN = (notes, vol = .1, name) => [
  { name: name ? name : 'organ', wave: 'square', vol, notes, vib: [5.5, .012] },
  { name: name ? name + '2' : 'organ2', wave: 'triangle', vol: vol * 1.2, notes, octave: -1 }
];
BZ.SONGS = {
  title: { bpm: 140, steps: 4, tracks: [
    ...ORGAN('C5 - E5 - G5 - C6 - - - G5 - A5 - G5 - | F5 - A5 - C6 - A5 - G5 - - - E5 - D5 - | C5 - E5 - G5 - C6 - - - D6 - C6 - B5 - | A5 - G5 - F5 - E5 - D5 - - - C5 - - -', .1),
    { wave: 'saw', vol: .1, notes: 'C3 . C3 C3 G2 . G2 . F2 . F2 F2 G2 . G2 . | F2 . F2 F2 C3 . C3 . G2 . G2 G2 D3 . D3 . | C3 . C3 C3 G2 . G2 . F2 . F2 F2 G2 . G2 . | F2 . F2 . G2 . G2 . C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .16, notes: 'k . h . s . h k k . h . s . h h | k . h . s . h k k . h . s . s s' } ] },
  menu: { bpm: 100, steps: 4, tracks: [
    ...ORGAN('E5 - . G5 - . A5 - G5 - . E5 - . D5 - | C5 - . E5 - . G5 - - - . . . . . . | E5 - . G5 - . A5 - C6 - . A5 - . G5 - | E5 - D5 - C5 - - - . . . . . . . .', .08),
    { wave: 'triangle', vol: .16, notes: 'C3 . . G2 . . C3 . E3 . . G2 . . C3 . | F2 . . C3 . . F2 . G2 . . D3 . . G2 .' },
    { wave: 'drums', vol: .1, notes: 'k . . h . . s . k . . h . . s . ' } ] },
  tourmap: { bpm: 120, steps: 4, tracks: [
    { wave: 'pulse', vol: .12, notes: 'G4 - B4 - D5 - B4 - C5 - E5 - G5 - E5 - | D5 - - - B4 - G4 - A4 - - - - - . . | G4 - B4 - D5 - B4 - C5 - E5 - G5 - A5 - | G5 - F#5 - E5 - D5 - G4 - - - - - . .' },
    { wave: 'triangle', vol: .17, notes: 'G2 . B2 . D3 . B2 . C3 . E3 . G3 . E3 . | D3 . F#3 . A3 . F#3 . D3 . A2 . D3 . . .' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k k h . s . h .' } ] },
  rally: { bpm: 132, steps: 4, loop: false, tracks: [
    ...ORGAN('G4 - C5 - E5 - G5 - - - E5 - G5 - - - - - - - - - . . . . . . . .', .12) ] },
  derby: { bpm: 160, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: 'E5 E5 . E5 . D5 E5 . G5 . E5 . D5 C5 . . | A4 A4 . A4 . G4 A4 . C5 . A4 . G4 E4 . . | E5 E5 . E5 . D5 E5 . G5 . A5 . G5 E5 . . | D5 . C5 . B4 . A4 . E5 - - - - - . .' },
    { wave: 'square', vol: .1, notes: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 G2 G2 G3 G2', octave: 0 },
    { wave: 'drums', vol: .17, notes: 'k h s h k k s h k h s h k s s s' } ] },
  rhubarb: { bpm: 180, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'C5 . C#5 . C5 . C#5 . E5 . D#5 . E5 . G5 . | C5 . C#5 . C5 . C#5 . A#4 . A4 . G#4 . G4 .' },
    { wave: 'saw', vol: .1, notes: 'C2 C3 C2 C3 C2 C3 C2 C3 | G#1 G#2 G#1 G#2 G1 G2 G1 G2' },
    { wave: 'drums', vol: .18, notes: 'k s k s k s k s k s k s k s s s' } ] },
  training: { bpm: 112, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - . . | E5 . C5 . D5 . B4 . C5 - - - . . . . ' },
    { wave: 'triangle', vol: .16, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | C3 . G2 . G2 . B2 . C3 . G2 . C3 . . .' },
    { wave: 'drums', vol: .09, notes: 'k . h . s . h . k . h h s . h .' } ] },
  ending: { bpm: 120, steps: 4, tracks: [
    ...ORGAN('C5 - - - E5 - - - G5 - - - C6 - - - | A5 - - - F5 - - - G5 - - - - - - - | E5 - - - G5 - - - C6 - - - E6 - - - | D6 - - - B5 - - - C6 - - - - - - -', .1),
    { wave: 'saw', vol: .09, notes: 'C3 . C3 . C3 . C3 . E3 . E3 . E3 . E3 . | F3 . F3 . F3 . F3 . G3 . G3 . G3 . G3 .' },
    { wave: 'drums', vol: .13, notes: 'k . h . s . h . k . h . s . h h' } ] },
  hubcard: { bpm: 120, steps: 4, tracks: [
    ...ORGAN('C5 - E5 - G5 - - - A5 - G5 - E5 - - - | F5 - E5 - D5 - - - G4 - - - - - - -', .07),
    { wave: 'triangle', vol: .12, notes: 'C3 . . . G2 . . . F2 . . . G2 . . .' } ] },
  // one in-game loop per park: layers named base, hype (the meter full), drums (runners in scoring position)
  kernel: { bpm: 116, steps: 4, tracks: [
    ...ORGAN('G4 - C5 - D5 - E5 - - - D5 - C5 - - - | A4 - D5 - E5 - F5 - - - E5 - D5 - - - | G4 - C5 - D5 - E5 - - - G5 - A5 - G5 - | F5 - E5 - D5 - B4 - C5 - - - - - . .', .08, 'base'),
    { name: 'bass', wave: 'triangle', vol: .15, notes: 'C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | C3 . G2 . C3 . E3 . | F2 . G2 . C3 . . .' },
    { name: 'hype', wave: 'pulse', vol: .08, on: false, notes: 'C6 . G5 . E5 . G5 . C6 . G5 . E5 . G5 .' },
    { name: 'drums', wave: 'drums', vol: .12, on: false, notes: 'k . h . s . h . k k h . s . h h' } ] },
  barnacle: { bpm: 108, steps: 3, tracks: [
    { name: 'base', wave: 'square', vol: .09, notes: 'D5 - A4 D5 - F5 | E5 - A4 C#5 - E5 | D5 - A4 D5 - F5 | A5 - G5 F5 E5 D5 | C5 - G4 C5 - E5 | D5 - A4 D5 - - ', vib: [5, .01] },
    { name: 'bass', wave: 'triangle', vol: .16, notes: 'D3 . A2 D3 . A2 | A2 . E2 A2 . E2 | D3 . A2 D3 . A2 | F2 . C3 G2 . A2 | C3 . G2 C3 . G2 | D3 . A2 D3 . .' },
    { name: 'hype', wave: 'pulse', vol: .07, on: false, notes: 'A5 . F5 . D5 . | E5 . C#5 . A4 .' },
    { name: 'drums', wave: 'drums', vol: .11, on: false, notes: 'k . h s . h' } ] },
  caldera: { bpm: 126, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .08, notes: 'E4 . E4 G4 . E4 A4 . G4 . E4 . D4 . E4 . | E4 . E4 G4 . E4 B4 . A4 . G4 . A4 . B4 .' },
    { name: 'bass', wave: 'saw', vol: .1, notes: 'E2 E2 . E2 E2 . G2 A2 | E2 E2 . E2 D2 . D2 B1' },
    { name: 'hype', wave: 'square', vol: .07, on: false, notes: 'E5 . G5 . B5 . G5 . E5 . G5 . A5 . B5 .' },
    { name: 'drums', wave: 'drums', vol: .15, on: true, notes: 'k . t . s . t k k . t . s . t t' } ] },
  tranquility: { bpm: 100, steps: 4, tracks: [
    { name: 'base', wave: 'sine', vol: .1, notes: 'C5 E5 G5 B5 C6 B5 G5 E5 | A4 C5 E5 G5 A5 G5 E5 C5 | F4 A4 C5 E5 F5 E5 C5 A4 | G4 B4 D5 F5 G5 F5 D5 B4', vib: [6, .01] },
    { name: 'bass', wave: 'triangle', vol: .14, notes: 'C3 - - - - - - - | A2 - - - - - - - | F2 - - - - - - - | G2 - - - - - - -' },
    { name: 'hype', wave: 'pulse12', vol: .06, on: false, notes: 'G5 . C6 . E6 . C6 . G5 . C6 . E6 . G6 .' },
    { name: 'drums', wave: 'drums', vol: .09, on: false, notes: 'k . . h . . s . . h . . k . h .' } ] },
  boneyard: { bpm: 96, steps: 4, tracks: [
    ...ORGAN('A4 - - C5 - - E5 - D#5 - - - E5 - - - | F5 - - E5 - - D5 - C5 - - - B4 - - - | A4 - - C5 - - E5 - A5 - - - G#5 - - - | F5 - E5 - D5 - C5 - B4 - - - A4 - - -', .07, 'base'),
    { name: 'theremin', wave: 'sine', vol: .07, notes: 'E6 - - - - - - - D#6 - - - - - - - | C6 - - - - - - - B5 - - - - - - -', vib: [6, .03] },
    { name: 'hype', wave: 'square', vol: .06, on: false, notes: 'A5 . E5 . A5 . E5 . G#5 . E5 . G#5 . E5 .' },
    { name: 'drums', wave: 'drums', vol: .1, on: false, notes: 'k . . . s . . . k . k . s . . .' } ] },
  megadome: { bpm: 118, steps: 4, tracks: [
    { name: 'base', wave: 'saw', vol: .07, notes: 'A4 - - - C5 - - - E5 - - - G5 - - - | F5 - - - E5 - - - D5 - - - E5 - - -', vib: [4, .006] },
    { name: 'bass', wave: 'square', vol: .1, notes: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 G2 G2 G3 G2' },
    { name: 'arp', wave: 'pulse12', vol: .06, notes: 'A5 C6 E6 C6 A5 C6 E6 C6 | F5 A5 C6 A5 G5 B5 D6 B5' },
    { name: 'hype', wave: 'pulse', vol: .06, on: false, notes: 'E6 . E6 . D6 . E6 . G6 . E6 . D6 . C6 .' },
    { name: 'drums', wave: 'drums', vol: .14, on: true, notes: 'k . h . s . h . k . h k s . h o' } ] },
  // stings
  homerun: { bpm: 150, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - - - . .' }, { wave: 'triangle', vol: .16, notes: 'C4 - - - G3 - - - C4 - - - - - . .' },
    { wave: 'drums', vol: .16, notes: 'k . s . k . s . c . . . . . . .' } ] },
  strikeout: { bpm: 150, steps: 4, loop: false, tracks: [
    { wave: 'square', vol: .12, notes: 'G5 . G5 . D5 - - - G4 - - - . . . .' }, { wave: 'drums', vol: .14, notes: 's . s . k . . . c . . . . . . .' } ] },
  ignite: { bpm: 160, steps: 4, loop: false, tracks: [
    { wave: 'saw', vol: .1, notes: 'C4 D4 E4 F#4 G#4 A#4 C5 - - - . . . . . .' }, { wave: 'drums', vol: .16, notes: 'k k k k s s s s c . . . . . . .' } ] },
  inning: { bpm: 132, steps: 4, loop: false, tracks: [
    ...ORGAN('C5 . E5 . G5 . E5 . C6 - - - . . . .', .1) ] },
  victory: { bpm: 140, steps: 4, loop: false, tracks: [
    ...ORGAN('G4 . C5 . E5 . G5 - - E5 G5 - - - - - | A5 . G5 . E5 . C6 - - - - - - - . .', .11),
    { wave: 'drums', vol: .14, notes: 'k . s . k . s . k k s . c . . . | k . s . k k s s c . . . . . . .' } ] },
  defeat: { bpm: 90, steps: 4, loop: false, tracks: [
    ...ORGAN('E5 - - - D#5 - - - D5 - - - C#5 - - - - - - - . . . .', .09) ] },
  show: { bpm: 140, steps: 4, loop: false, tracks: [
    ...ORGAN('C5 C5 . C5 . A4 C5 . F5 - . E5 - . C5 - | D5 . E5 . C5 - - - . . . . . . . .', .1),
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h .' } ] }
};
BZ.music = (name, o = {}) => {
  const A = BZ.game && BZ.game.audio; if (!A) return;
  BZ.musicName = name;
  if (!name) { A.music(null); return; }
  const song = BZ.SONGS[name]; if (!song) return;
  try { A.music(song, Object.assign({ fade: .6 }, o)); } catch (e) { BZ.game.fail('music', e); }
};
BZ.sting = (name, o = {}) => { const A = BZ.game && BZ.game.audio; if (!A || !BZ.SONGS[name] || !BZ.cosmetic) return; try { A.sting(BZ.SONGS[name], Object.assign({ at: 'now', duck: .35 }, o)); } catch (e) { /* best effort */ } };
BZ.layer = (name, vol, fade = .8) => {
  const A = BZ.game && BZ.game.audio, S = BZ.SONGS[BZ.musicName]; if (!A || !A.song || !S || !S.tracks.some(t => t.name === name)) return;
  try { A.layer(name, vol, fade); } catch (e) { /* the song may not have it */ }
};
