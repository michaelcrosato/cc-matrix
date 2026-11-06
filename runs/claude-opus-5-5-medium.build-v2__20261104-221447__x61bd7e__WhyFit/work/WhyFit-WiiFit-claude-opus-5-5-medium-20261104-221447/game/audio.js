// All sound is written here. Hold music in a very clean building. Music defaults to 10% and is never compensated for.
const A = game.audio;
G.sfx = (name, o) => { try { return A.sfx(name, o); } catch (e) { return null; } };
const bar = (s, n = 1) => Array(n).fill(s).join(' | ');
G.SONGS = {
  studio: { bpm: 78, steps: 4, name: 'Please Hold Your Posture', tracks: [
    { wave: 'sine', vol: .28, gate: .9, name: 'lead', notes: bar('E5 - - - G5 - A5 - | G5 - - - E5 - D5 - | C5 - - - E5 - G5 - | A5 - G5 - E5 - - -', 2) },
    { wave: 'triangle', vol: .26, name: 'bass', notes: bar('C3 - - - G3 - - - | A2 - - - E3 - - - | F2 - - - C3 - - - | G2 - - - D3 - - -', 2) },
    { wave: 'pulse12', vol: .07, notes: bar('C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3', 2) } ] },
  morning: { bpm: 92, steps: 4, name: 'A Light Breakfast', tracks: [
    { wave: 'triangle', vol: .24, notes: bar('G5 . E5 . C5 . E5 . | F5 . D5 . B4 . D5 . | E5 . C5 . A4 . C5 . | D5 - - - . . . .', 2) },
    { wave: 'sine', vol: .28, notes: bar('C3 . . . G3 . . . | G2 . . . D3 . . . | A2 . . . E3 . . . | F2 . G2 . C3 . . .', 2) },
    { wave: 'drums', vol: .1, notes: bar('h . . . h . . . | h . . . h . . .', 4) } ] },
  dusk: { bpm: 66, steps: 4, name: 'The Institute Thanks You For Today', tracks: [
    { wave: 'sine', vol: .28, notes: bar('A4 - - - C5 - - - | E5 - - - D5 - C5 - | G4 - - - B4 - - - | D5 - - - C5 - B4 -', 2) },
    { wave: 'triangle', vol: .24, notes: bar('A2 - - - E3 - - - | F2 - - - C3 - - - | C3 - - - G3 - - - | G2 - - - D3 - - -', 2) } ] },
  yoga: { bpm: 60, steps: 4, name: 'Pad For Holding Still', tracks: [
    { wave: 'sine', vol: .3, notes: bar('C4 - - - - - - - | E4 - - - - - - - | D4 - - - - - - - | G3 - - - - - - -', 2) },
    { wave: 'sine', vol: .18, notes: bar('G4 - - - - - - - | B4 - - - - - - - | A4 - - - - - - - | D4 - - - - - - -', 2) },
    { wave: 'triangle', vol: .08, notes: bar('. . C6 . . . G5 . | . . E6 . . . B5 . | . . D6 . . . A5 . | . . G5 . . . D5 .', 2) } ] },
  iron: { bpm: 96, steps: 4, name: 'Light Resistance', tracks: [
    { wave: 'pulse', vol: .12, notes: bar('A3 . A3 . C4 . E4 . | G3 . G3 . B3 . D4 . | F3 . F3 . A3 . C4 . | E3 . G#3 . B3 . E4 .', 2) },
    { wave: 'triangle', vol: .28, notes: bar('A2 . . . A2 . . . | G2 . . . G2 . . . | F2 . . . F2 . . . | E2 . . . E2 . . .', 2) },
    { wave: 'drums', vol: .2, notes: bar('k . h . s . h . | k . h . s . h .', 4) } ] },
  step1: { bpm: 100, steps: 4, loop: false, name: 'Step A: Up, And Down Again', tracks: [
    { wave: 'triangle', vol: .3, notes: bar('C3 . C3 . G3 . C3 . | F2 . F2 . C3 . F2 . | G2 . G2 . D3 . G2 . | C3 . E3 . G3 . E3 .', 6) },
    { wave: 'sine', vol: .26, notes: bar('E5 . G5 . C6 . G5 . | F5 . A5 . C6 . A5 . | D5 . G5 . B5 . G5 . | E5 . - . G5 . . .', 6) },
    { wave: 'drums', vol: .2, notes: bar('k . h . s . h . | k . h . s . h .', 12) } ] },
  step2: { bpm: 120, steps: 4, loop: false, name: 'Step B: With Enthusiasm', tracks: [
    { wave: 'triangle', vol: .3, notes: bar('A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | C3 . C4 . C3 . C4 . | G2 . G3 . G2 . G3 .', 8) },
    { wave: 'pulse', vol: .11, notes: bar('E5 . A5 . C6 . A5 . | F5 . A5 . C6 . F5 . | G5 . C6 . E6 . C6 . | G5 . B5 . D6 . B5 .', 8) },
    { wave: 'drums', vol: .22, notes: bar('k h h h s h h h | k h k h s h h h', 16) } ] },
  jog: { bpm: 90, steps: 4, name: 'Coast Road, Moderate Pace', tracks: [
    { wave: 'triangle', vol: .24, notes: bar('D5 . F#5 . A5 . F#5 . | E5 . G5 . B5 . G5 . | F#5 . A5 . D6 . A5 . | E5 - - - . . . .', 2) },
    { wave: 'sine', vol: .28, notes: bar('D3 . D3 . A3 . D3 . | E3 . E3 . B3 . E3 . | D3 . D3 . A3 . D3 . | A2 . A2 . E3 . A2 .', 2) },
    { wave: 'drums', vol: .15, notes: bar('k . h . k . h . | k . h . k . h .', 4) } ] },
  ski: { bpm: 126, steps: 4, name: 'Mount Posture, Downhill', tracks: [
    { wave: 'pulse', vol: .12, notes: bar('E5 G5 B5 G5 E5 G5 B5 G5 | C5 E5 G5 E5 C5 E5 G5 E5 | D5 F#5 A5 F#5 D5 F#5 A5 F#5 | B4 D5 F#5 D5 B4 D5 F#5 D5', 2) },
    { wave: 'triangle', vol: .3, notes: bar('E2 . E3 . E2 . E3 . | C2 . C3 . C2 . C3 . | D2 . D3 . D2 . D3 . | B1 . B2 . B1 . B2 .', 2) },
    { wave: 'drums', vol: .2, notes: bar('k . h . s . h h | k . h k s . h .', 4) } ] },
  tray: { bpm: 84, steps: 4, name: 'Olive Lounge', tracks: [
    { wave: 'sine', vol: .28, notes: bar('D5 - F5 . A5 - G5 . | F5 - - - D5 . . . | C5 - E5 . G5 - F5 . | E5 - - - C5 . . .', 2) },
    { wave: 'triangle', vol: .26, notes: bar('D3 . A3 . D3 . A3 . | G2 . D3 . G2 . D3 . | C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 .', 2) },
    { wave: 'drums', vol: .08, notes: bar('h . h h . h . . | h . h h . h . .', 4) } ] },
  laundry: { bpm: 104, steps: 4, name: 'Pizzicato For A Clothesline', tracks: [
    { wave: 'triangle', vol: .3, gate: .25, notes: bar('G4 . B4 . D5 . B4 . | A4 . C5 . E5 . C5 . | F#4 . A4 . D5 . A4 . | G4 . . . D4 . . .', 2) },
    { wave: 'sine', vol: .26, gate: .35, notes: bar('G2 . . . D3 . . . | A2 . . . E3 . . . | D3 . . . A2 . . . | G2 . D3 . G2 . . .', 2) } ] },
  festival: { bpm: 112, steps: 4, name: 'The Gentle Games: A Fanfare, Quietly', tracks: [
    { wave: 'pulse', vol: .13, notes: bar('C5 . C5 E5 G5 - E5 . | F5 . F5 A5 C6 - A5 . | G5 . G5 B5 D6 - B5 . | C6 - G5 - E5 - C5 .', 2) },
    { wave: 'triangle', vol: .28, notes: bar('C3 . G3 . C3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . .', 2) },
    { wave: 'drums', vol: .2, notes: bar('k . h . s . h . | k k h . s . h h', 4) } ] },
  ending: { bpm: 58, steps: 4, name: 'That Is The Whole Job', tracks: [
    { wave: 'sine', vol: .3, notes: bar('E5 - - - D5 - C5 - | A4 - - - - - G4 - | F4 - A4 - C5 - F5 - | E5 - - - - - - -', 2) + ' | ' + bar('E5 - G5 - E5 - D5 - | C5 - - - A4 - - - | B4 - D5 - G5 - F5 - | E5 - - - - - - -') },
    { wave: 'triangle', vol: .24, notes: bar('A2 - E3 - C4 - E3 - | F2 - C3 - A3 - C3 - | D3 - A3 - F3 - A3 - | E3 - B3 - G#3 - B3 -', 3) } ] },
  star1: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'sine', vol: .5, notes: 'C5 E5 G5 - - .' }] },
  star2: { bpm: 150, steps: 4, loop: false, tracks: [{ wave: 'sine', vol: .5, notes: 'C5 E5 G5 C6 - - .' }, { wave: 'triangle', vol: .3, notes: 'C4 . G4 . C5 - .' }] },
  star3: { bpm: 170, steps: 4, loop: false, tracks: [{ wave: 'sine', vol: .5, notes: 'C5 E5 G5 C6 E6 G6 - - - .' }, { wave: 'triangle', vol: .3, notes: 'C4 . G4 . C5 . E5 - - .' }] },
  unlock: { bpm: 140, steps: 4, loop: false, tracks: [{ wave: 'triangle', vol: .5, notes: 'G4 C5 E5 G5 - .' }] },
  dayDone: { bpm: 90, steps: 4, loop: false, tracks: [{ wave: 'sine', vol: .5, notes: 'G5 - E5 - C5 - - - .' }, { wave: 'triangle', vol: .3, notes: 'C4 - - - C3 - - - .' }] }
};
G.music = (name, o) => { if (G.silent) return; const s = G.SONGS[name]; if (A._whyfit === name && !(o && o.restart)) return; A._whyfit = name; A.music(s, Object.assign({ fade: .6 }, o || {})); };
G.stopMusic = () => { A._whyfit = null; A.stopMusic(.3); };
G.sting = n => { try { A.sting(G.SONGS[n], { at: 'now' }); } catch (e) {} };

const defs = {
  boop: [{ wave: 'sine', freq: 660, dur: .09, vol: .4 }, { wave: 'sine', freq: 990, dur: .12, vol: .4, delay: .1 }],
  tareHop: { wave: 'sine', freq: 520, to: 780, dur: .08, vol: .25 },
  creak: { wave: 'saw', freq: 90, to: 140, dur: .22, vol: .14, vib: [14, .08] },
  chime: { wave: 'sine', freq: 880, dur: .3, vol: .22 },
  stumble: { wave: 'triangle', freq: 300, to: 70, dur: .3, vol: .4 },
  clink: { wave: 'triangle', freq: 1760, to: 2100, dur: .07, vol: .35 },
  gull: { wave: 'saw', freq: 1200, to: 700, dur: .24, vol: .12, vib: [24, .1] },
  flurry: { wave: 'noise', freq: 2600, dur: .28, vol: .16 },
  flick: { wave: 'noise', freq: 4000, dur: .07, vol: .12 },
  whirr: { wave: 'triangle', freq: 300, to: 360, dur: .1, vol: .14 },
  carve: { wave: 'noise', freq: 1800, dur: .14, vol: .14 },
  trayClink: { wave: 'triangle', freq: 2300, dur: .04, vol: .18 },
  plop: { wave: 'sine', freq: 520, to: 180, dur: .13, vol: .4 },
  rope: { wave: 'saw', freq: 140, to: 110, dur: .25, vol: .1, vib: [9, .1] },
  stamp: { wave: 'noise', freq: 400, dur: .12, vol: .45 },
  tick: { wave: 'sine', freq: 1100, dur: .035, vol: .14 },
  pick: [{ wave: 'sine', freq: 740, dur: .06, vol: .25 }, { wave: 'sine', freq: 1110, dur: .09, vol: .25, delay: .06 }],
  beat: { wave: 'sine', freq: 1500, dur: .03, vol: .32 },
  beatUp: { wave: 'sine', freq: 2000, dur: .035, vol: .4 },
  whoosh: { wave: 'noise', freq: 900, to: 300, dur: .35, vol: .14 },
  firework: { wave: 'noise', freq: 1200, to: 200, dur: .3, vol: .12 },
  blender: { wave: 'saw', freq: 240, to: 280, dur: .6, vol: .1, vib: [30, .12] },
  goose: { wave: 'saw', freq: 340, to: 260, dur: .22, vol: .2, vib: [20, .05] },
  sock: { wave: 'noise', freq: 2000, dur: .2, vol: .1 },
  splash: { wave: 'noise', freq: 800, to: 300, dur: .3, vol: .2 }
};
for (const k in defs) A.define(k, defs[k]);

// Voices: Animalese-style gibberish, a sound per letter, on the voice bus.
const VOICES = { TARE: { base: 620, speed: 1.3, wave: 'sine', vib: 8 }, BIRCH: { base: 105, speed: .75, wave: 'triangle', vib: 0 }, ALDER: { base: 240, speed: 1.05, wave: 'sine', vib: 2 } };
const lf = 'abcdefghijklmnopqrstuvwxyz', vowels = 'aeiou';
G.babble = (name, ch, o = {}) => {
  const ctx = (o.ctx || A.ctx); if (!ctx) return false;
  const c = String(ch).toLowerCase(), idx = lf.indexOf(c); if (idx < 0 && !/[0-9]/.test(c)) return false;
  const key = String(name || 'TARE').toUpperCase(); let V = VOICES[key];
  if (!V) { for (const id in G.CAST) if (G.CAST[id].name.toUpperCase() === key) V = G.CAST[id].voice; }
  V = V || VOICES.TARE;
  const vowel = vowels.includes(c), n = idx < 0 ? 6 : idx, f = V.base * Math.pow(2, ((n * 7) % 12 - 5) / 18), dur = (vowel ? .09 : .06) / (V.speed || 1), t = ctx.currentTime + (o.at || 0);
  const os = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  os.type = V.wave || 'sine'; os.frequency.setValueAtTime(f, t); os.frequency.linearRampToValueAtTime(f * (vowel ? .96 : 1.06), t + dur);
  if (V.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 22; lg.gain.value = V.vib; lfo.connect(lg); lg.connect(os.frequency); lfo.start(t); lfo.stop(t + dur); }
  fl.type = 'bandpass'; fl.frequency.value = vowel ? f * 2.2 : f * 3.4; fl.Q.value = vowel ? 1.2 : 2.4;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.34, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  os.connect(fl); fl.connect(g); g.connect(o.dest || A.bus('voice')); os.start(t); os.stop(t + dur + .01);
  return true;
};
// exercise grunts use the same voice
G.grunt = (name = 'TARE') => { G.babble(name, 'u'); };
// the Stork's second tier: a stereo tone, pan = lean x, pitch = lean y, on the sfx bus
G.BalanceTone = class {
  constructor() { this.os = null; }
  start() { const c = A.ctx; if (!c || this.os) return; this.os = c.createOscillator(); this.g = c.createGain(); this.pan = c.createStereoPanner ? c.createStereoPanner() : null; this.os.type = 'sine'; this.g.gain.value = 0; this.os.connect(this.g); if (this.pan) { this.g.connect(this.pan); this.pan.connect(A.bus('sfx')); } else this.g.connect(A.bus('sfx')); this.os.start(); }
  set(x, y, near) { if (!A.ctx) return; if (!this.os) this.start(); if (!this.os) return; const t = A.ctx.currentTime; this.os.frequency.setTargetAtTime(330 * Math.pow(2, y * .9), t, .03); this.g.gain.setTargetAtTime(.04 + .12 * near, t, .05); if (this.pan) this.pan.pan.setTargetAtTime(clamp(x * 1.2, -1, 1), t, .03); }
  stop() { if (this.os) { try { this.os.stop(); } catch (e) {} this.os.disconnect(); this.g.disconnect(); if (this.pan) this.pan.disconnect(); this.os = null; } }
};
