/* BATZOOKA BASEBALL: core. Namespace, tuning values (the dev sliders), the event bus, seeded streams, sounds,
   songs and the Animalese-style babble voice. Everything else adds to BZ. */
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const BZ = window.BZ = { version: '1.0', title: 'BATZOOKA BASEBALL', cosmetic: true };
const PI = Math.PI;

/* ---- tuning: every balance number lives here and is read each time it is used, so the dev sliders act at once ---- */
BZ.TUNE_META = {
  pitchSpeed: ['Pitch speed', 'Pitching', .5, 1.8, .05, 1],
  breaking: ['Break on curves', 'Pitching', 0, 2, .05, 1],
  batWindow: ['Swing timing window', 'Batting', .4, 2.5, .05, 1],
  sweet: ['Sweet spot size', 'Batting', .3, 1.4, .02, .62],
  exitPower: ['Hit power', 'Batting', .5, 1.6, .02, 1],
  batzookaPower: ['Batzooka blast', 'Batting', 1, 2.5, .05, 1.55],
  gravity: ['Ball gravity', 'Ball', 120, 520, 10, 260],
  fence: ['Fence distance', 'Ball', .6, 1.4, .02, 1],
  fielderSpeed: ['Fielder speed', 'Field', 50, 180, 2, 98],
  throwSpeed: ['Throw speed', 'Field', 160, 700, 10, 360],
  throwError: ['Throw wildness', 'Field', 0, 3, .05, 1],
  runnerSpeed: ['Runner speed', 'Running', 40, 140, 2, 74],
  turboBoost: ['Turbo boost', 'Running', 1, 1.8, .02, 1.28],
  meterGain: ['Batzooka meter gain', 'Batzooka', .2, 4, .05, 1],
  cpuSkill: ['CPU skill', 'CPU', 0, 1, .02, .5],
  cpuThinks: ['CPU throw delay', 'CPU', .1, 1.5, .05, .45],
  mercy: ['Mercy rule runs', 'Rules', 3, 20, 1, 10]
};
BZ.TUNE = {};
BZ.resetTune = () => { for (const k in BZ.TUNE_META) BZ.TUNE[k] = BZ.TUNE_META[k][5]; };
BZ.resetTune();
const TUNE = BZ.TUNE;

/* ---- the event bus: every outcome is an event; commentary, crowd, audio, HUD, meter, hub and tests listen ---- */
BZ.listeners = {}; BZ.log = [];
BZ.on = (ev, fn) => { (BZ.listeners[ev] = BZ.listeners[ev] || []).push(fn); return () => BZ.off(ev, fn); };
BZ.off = (ev, fn) => { const a = BZ.listeners[ev]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } };
BZ.emit = (ev, data = {}) => {
  BZ.log.push(ev); if (BZ.log.length > 200) BZ.log.shift();
  for (const fn of (BZ.listeners[ev] || []).slice()) { try { fn(data, ev); } catch (e) { if (window.My3D2dge && My3D2dge.current) My3D2dge.current.fail('event ' + ev, e); else throw e; } }
  for (const fn of (BZ.listeners['*'] || []).slice()) { try { fn(data, ev); } catch (e) { /* listeners must not break play */ } }
};
BZ.clearListeners = () => { BZ.listeners = {}; };

/* ---- seeded streams: gameplay randomness never calls Math.random ---- */
BZ.rng = { play: E.rng(1), fx: E.rng(99), deal: E.rng(7) };
BZ.seed = s => { BZ.rng.play = E.rng(s >>> 0 || 1); BZ.rng.deal = E.rng((s * 7 + 13) >>> 0); };
const rnd = () => BZ.rng.play(), rfx = () => BZ.rng.fx();
const rr = (a, b) => a + (b - a) * rnd();
const pickOf = (list, r = rnd) => list[Math.floor(r() * list.length) % list.length];
BZ.feet = u => Math.round(u * .32);
BZ.mph = u => Math.round(u * .26);
const sgn = v => v < 0 ? -1 : 1;
const hyp = Math.hypot;

/* ---- registries: content is data ---- */
BZ.reg = { teams: {}, parks: {}, lessons: {}, songs: {}, lines: {} };
BZ.def = (kind, id, spec) => { (BZ.reg[kind] = BZ.reg[kind] || {})[id] = Object.assign({ id }, spec); return BZ.reg[kind][id]; };
BZ.get = (kind, id) => BZ.reg[kind] && BZ.reg[kind][id];

/* ---- sound: the engine's chip synth only ---- */
BZ.sound = {
  bat: { wave: 'noise', freq: 1400, to: 300, dur: .09, vol: .5, filter: 'lowpass' },
  crack: { wave: 'square', freq: 220, to: 60, dur: .1, vol: .35 },
  mitt: { wave: 'noise', freq: 700, to: 200, dur: .07, vol: .4, filter: 'lowpass' },
  whiff: { wave: 'noise', freq: 600, to: 1500, dur: .14, vol: .22, filter: 'highpass' },
  pitch: { wave: 'saw', freq: 500, to: 180, dur: .22, vol: .12 },
  fire: { wave: 'saw', freq: 200, to: 900, dur: .4, vol: .2, vib: [20, .1] },
  rocket: { wave: 'saw', freq: 120, to: 1400, dur: .6, vol: .3 },
  boom: { wave: 'noise', freq: 300, to: 40, dur: .6, vol: .5, filter: 'lowpass' },
  strike: { wave: 'square', freq: 440, to: 330, dur: .12, vol: .2 },
  ball: { wave: 'triangle', freq: 330, to: 440, dur: .1, vol: .2 },
  out: { wave: 'square', freq: 523, to: 262, dur: .25, vol: .22 },
  safe: { wave: 'triangle', freq: 392, to: 784, dur: .22, vol: .25 },
  step: { wave: 'noise', freq: 400, to: 200, dur: .04, vol: .1, filter: 'lowpass' },
  slide: { wave: 'noise', freq: 800, to: 150, dur: .35, vol: .3, filter: 'lowpass' },
  throw: { wave: 'noise', freq: 900, to: 500, dur: .12, vol: .2, filter: 'highpass' },
  crowd: { wave: 'noise', freq: 500, to: 900, dur: 1.2, vol: .2, filter: 'lowpass' },
  groan: { wave: 'saw', freq: 220, to: 110, dur: .8, vol: .12, vib: [6, .08] },
  horn: { wave: 'square', freq: 311, to: 311, dur: .5, vol: .2, vib: [5, .02] },
  organ: { wave: 'pulse', freq: 392, dur: .15, vol: .15 },
  punch: { wave: 'noise', freq: 300, to: 100, dur: .1, vol: .4, filter: 'lowpass' },
  firework: { wave: 'noise', freq: 2000, to: 200, dur: .5, vol: .3, filter: 'highpass' },
  coin: { wave: 'square', freq: 988, to: 1319, dur: .18, vol: .2 },
  tick: { wave: 'square', freq: 1200, dur: .03, vol: .12 }
};
BZ.initAudio = game => { for (const k in BZ.sound) game.audio.define('bz_' + k, BZ.sound[k]); };
BZ.sfx = (name, o) => { const g = My3D2dge.current; if (g && g.audio) g.audio.sfx('bz_' + name, o); };

/* original songs (chip music with named layers) */
BZ.songs = {
  title: { bpm: 132, steps: 4, tracks: [
    { name: 'organ', wave: 'pulse', vol: .09, notes: 'C5 . E5 . G5 . E5 . | C5 . E5 . G5 - C6 - | B4 . D5 . G5 . D5 . | B4 . D5 . G5 - B5 - | A4 . C5 . F5 . C5 . | A4 . C5 . F5 - A5 - | G4 . B4 . D5 . G5 . | G5 - F5 - E5 - D5 -' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'C3 . G2 . C3 . G2 . | C3 . G2 . C3 . E3 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . B2 . | F2 . C3 . F2 . C3 . | F2 . C3 . F2 . A2 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h . s . h k | k . h . s . h h | k . h . s . h k | k . h . s h s s' }
  ] },
  play: { bpm: 112, steps: 4, tracks: [
    { name: 'organ', wave: 'pulse', vol: .075, notes: 'G4 . . G4 C5 . . . | E5 . . D5 C5 . . . | A4 . . A4 D5 . . . | F5 . . E5 D5 . . . | G4 . . G4 C5 . . . | E5 . E5 G5 . . . . | F5 . . D5 B4 . . . | C5 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'C3 . . . G2 . . . | C3 . . . G2 . . . | D3 . . . A2 . . . | D3 . . . A2 . . . | C3 . . . G2 . . . | C3 . . . E3 . . . | F2 . . . G2 . . . | C3 . G2 . C3 . . .' },
    { name: 'drums', wave: 'drums', vol: .07, on: false, notes: 'k . . . s . . . | k . . h s . . .' }
  ] },
  tense: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'E4 . E4 . G4 . E4 . | D4 . D4 . F4 . D4 . | C4 . C4 . E4 . C4 . | B3 . D4 . G4 - - .' },
    { name: 'bass', wave: 'triangle', vol: .25, notes: 'E2 . E2 . E2 . E2 . | D2 . D2 . D2 . D2 . | C2 . C2 . C2 . C2 . | G2 . G2 . G2 . G2 .' },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h . s . h . | k . h . s . h s' }
  ] },
  moon: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'sine', vol: .12, notes: 'E5 - - . B4 - - . | G5 - - . E5 - - . | D5 - - . A4 - - . | F#5 - - . D5 - - .' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'E2 - - - - - - - | C3 - - - - - - - | D2 - - - - - - - | B2 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .05, notes: 'k . . . . . h . | . . . . s . . .' }
  ] },
  derby: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'C5 E5 G5 E5 C5 E5 G5 E5 | D5 F5 A5 F5 D5 F5 A5 F5 | E5 G5 B5 G5 E5 G5 B5 G5 | G5 B5 D6 B5 G5 B5 D6 B5' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: 'C3 . C3 . C3 . C3 . | D3 . D3 . D3 . D3 . | E3 . E3 . E3 . E3 . | G3 . G3 . G3 . G3 .' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h h s . h h | k . h h s . h s' }
  ] },
  rhubarb: { bpm: 170, steps: 4, tracks: [
    { name: 'lead', wave: 'saw', vol: .06, notes: 'A4 . A4 C5 A4 . G4 . | A4 . A4 C5 D5 . C5 . | A4 . A4 C5 A4 . G4 . | E4 G4 A4 C5 E5 - - .' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'A2 A2 . A2 A2 . A2 . | A2 A2 . A2 A2 . C3 . | A2 A2 . A2 A2 . A2 . | E2 E2 . E2 A2 . . .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k h s h k h s s' }
  ] },
  victory: { bpm: 140, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .09, notes: 'C5 . E5 . G5 . C6 - | B5 . G5 . E5 . G5 - | A5 . F5 . C5 . F5 . | G5 - - - C6 - - -' },
    { name: 'bass', wave: 'triangle', vol: .26, notes: 'C3 . C3 . E3 . G3 . | G2 . G2 . B2 . D3 . | F2 . F2 . A2 . C3 . | G2 . G2 . G2 . C3 -' },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . s . k . s s' }
  ] }
};
BZ.music = (name, o) => { const g = My3D2dge.current; if (g && g.audio) g.audio.music(BZ.songs[name] || null, o); };
/* the stadium organ's charge call, a sting for rallies */
BZ.charge = () => {
  const g = My3D2dge.current; if (!g) return;
  const n = ['G4', 'C5', 'E5', 'G5', 'E5', 'G5'], d = [0, .14, .28, .42, .72, .86];
  n.forEach((f, i) => g.after(d[i], () => g.audio.sfx({ wave: 'pulse', freq: f, dur: i === 3 || i === 5 ? .36 : .12, vol: .16 })));
  g.after(1.1, () => g.audio.sfx('bz_horn'));
};

/* ---- the babble voice: Animalese-style gibberish, one blip per letter, pitch by speaker ---- */
BZ.babble = (text, pitch = 1, vol = .1) => {
  const g = My3D2dge.current; if (!g || !g.audio || !text) return;
  const letters = String(text).replace(/\{[^}]*\}/g, '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 14);
  let t = 0;
  for (let i = 0; i < letters.length; i++) {
    const c = letters.charCodeAt(i) - 97, f = (180 + (c * 37 % 160) + (i % 3) * 18) * pitch;
    g.after(t, () => g.audio.sfx({ wave: c % 5 === 0 ? 'square' : 'triangle', freq: f, to: f * (1 + ((c % 3) - 1) * .12), dur: .055, vol }));
    t += .055 + (c % 4) * .008;
  }
};

/* ---- small helpers ---- */
BZ.tween = (obj, to, s, o) => My3D2dge.current.tween(obj, to, s, o);
BZ.noop = () => {};
BZ.pad = (n, w = 2) => String(n).padStart(w, '0');
BZ.ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]);
BZ.fmtDist = u => BZ.feet(u) + ' ft';
