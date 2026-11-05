/* DENSHA DE HALO! · all sound, made in code: a continuous synth for the train (the VVVF inverter's "singing", the
 * resistor growl of the old 3000, rolling, wind, tunnel echo, rain, brake squeal, the horn), one-shots on the chip
 * (lever clack, doors, buzzer, ATS bell, crossing bells, rail joints, jingles), twelve departure melodies, and music.
 * DH.soundParams(state) is a pure function (tested); headless, every call does nothing. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, clamp = E.clamp;
const game = DH.game, A = game.audio;

/* ---------- the continuous layers' parameters from speed, notch, effort and zone (pure) ---------- */
const VVVF_BANDS = [12, 24, 38, 50, 65];
DH.VVVF_BANDS = VVVF_BANDS;
DH.soundParams = st => {
  const v = Math.abs(st.v || 0), eff = Math.max(st.P || 0, st.regen ? (st.B || 0) * .7 : 0), out = {};
  // VVVF: an asynchronous rising tone to 12 km/h, then stepped synchronous bands, each a ramp that drops at its edge
  let f;
  if (v < 12) f = 300 + 600 * v / 12;
  else { let lo = 12, hi = 24, k = 0; for (let i = 0; i < VVVF_BANDS.length; i++) if (v >= VVVF_BANDS[i]) { lo = VVVF_BANDS[i]; hi = VVVF_BANDS[i + 1] || 140; k = i; } const u = (v - lo) / (hi - lo); f = (520 + 140 * k) * (1 + u * .9); }
  out.vvvf = { f, vol: st.train === 'vvvf' ? clamp(eff / 3, 0, 1) * .16 * (v > 95 ? .5 : 1) : 0 };
  out.motor = { f: 18 * v + 40, vol: st.train === 'vvvf' ? clamp(eff / 3, 0, 1) * .05 + (v > 1 ? .01 : 0) : 0 };
  out.resistor = { f: 6 * v + 30, vol: st.train === 'resistor' ? clamp(eff / 2.5, 0, 1) * .14 + (v > 1 ? .015 : 0) : 0 };
  out.roll = { f: 200 + 12 * v, vol: clamp(v / 80, 0, 1) * .12 * (st.bridge ? 1.3 : 1) };
  out.wind = { f: 800, vol: clamp((v / 110) ** 2, 0, 1) * .08 * (st.tunnel ? 2.4 : 1) };
  out.tunnel = { wet: st.tunnel ? .35 : 0, rumble: st.tunnel ? clamp(v / 80, 0, 1) * .1 : 0 };
  out.bridge = { vol: st.bridge ? clamp(v / 60, 0, 1) * .1 : 0 };
  out.rain = { vol: st.rain ? .05 + clamp(v / 100, 0, 1) * .03 : 0 };
  out.squeal = { f: 2600 + (8 - Math.min(8, v)) * 50, vol: (st.B || 0) > .3 && v > .3 && v < 8 ? .04 * (1 - v / 8 + .3) : 0 };
  out.horn = { vol: st.horn ? .22 : 0 };
  return out;
};

/* ---------- the synth graph, built once, parameters only per frame ---------- */
let G = null;
const build = () => {
  if (G || game.headless || !A.bus) return G;
  const bus = A.bus('sfx'); if (!bus) return null;
  const c = A.ctx, noise = A.noiseBuffer();
  const gain = (v = 0, to = out) => { const g = c.createGain(); g.gain.value = v; g.connect(to); return g; };
  const out = c.createGain(); out.gain.value = 1;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; out.connect(comp); comp.connect(bus);
  const delay = c.createDelay(.5); delay.delayTime.value = .06; const fb = gain(0, delay); delay.connect(fb); const wet = gain(0, comp); delay.connect(wet); out.connect(delay);
  const osc = (type, f, to) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start(); return o; };
  const nsrc = to => { const s = c.createBufferSource(); s.buffer = noise; s.loop = true; s.connect(to); s.start(); return s; };
  const filt = (type, f, q, to) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  const g = {};
  g.vvvfG = gain(0); g.vvvfF = filt('bandpass', 900, 2.5, g.vvvfG); g.vvvf = osc('square', 400, g.vvvfF);
  g.motorG = gain(0); g.motor = osc('sine', 100, g.motorG);
  g.resG = gain(0); g.resF = filt('lowpass', 400, 1, g.resG); g.res = osc('sawtooth', 40, g.resF);
  g.rollG = gain(0); g.rollF = filt('lowpass', 300, .7, g.rollG); nsrc(g.rollF);
  g.windG = gain(0); g.windF = filt('bandpass', 800, .6, g.windG); nsrc(g.windF);
  g.rumbleG = gain(0); g.rumbleF = filt('lowpass', 90, .7, g.rumbleG); nsrc(g.rumbleF);
  g.bridgeG = gain(0); g.bridgeF = filt('bandpass', 400, 3, g.bridgeG); nsrc(g.bridgeF);
  g.rainG = gain(0); g.rainF = filt('highpass', 2500, .5, g.rainG); nsrc(g.rainF);
  g.sqG = gain(0); g.sq = osc('sine', 2800, g.sqG); const lfo = osc('sine', 7, gain(30, g.sq.frequency));
  g.hornG = gain(0); g.hornF = filt('lowpass', 1800, .8, g.hornG); g.h1 = osc('sawtooth', 349, g.hornF); g.h2 = osc('sawtooth', 440, g.hornF); g.h3 = osc('sawtooth', 351.5, g.hornF);
  Object.assign(g, { out, delay, fb, wet, c });
  G = g; return G;
};
const set = (p, v, t = .05) => { try { p.setTargetAtTime(v, G.c.currentTime, t); } catch (e) { /* closed */ } };
DH.Sound = {
  /* the continuous train sound from the drive scene's state, each frame */
  update(st) {
    if (game.headless || !A.ready) return;
    if (!build()) return;
    const P = DH.soundParams(st), on = st.on === false ? 0 : 1;
    set(G.vvvf.frequency, P.vvvf.f); set(G.vvvfF.frequency, P.vvvf.f * 1.5); set(G.vvvfG.gain, P.vvvf.vol * on);
    set(G.motor.frequency, P.motor.f); set(G.motorG.gain, P.motor.vol * on);
    set(G.res.frequency, P.resistor.f); set(G.resF.frequency, 200 + P.resistor.f * 4); set(G.resG.gain, P.resistor.vol * on);
    set(G.rollF.frequency, P.roll.f); set(G.rollG.gain, P.roll.vol * on); set(G.windG.gain, P.wind.vol * on);
    set(G.rumbleG.gain, P.tunnel.rumble * on); set(G.fb.gain, P.tunnel.wet * on); set(G.wet.gain, P.tunnel.wet * on);
    set(G.bridgeG.gain, P.bridge.vol * on); set(G.rainG.gain, P.rain.vol * on);
    set(G.sq.frequency, P.squeal.f); set(G.sqG.gain, P.squeal.vol * on);
    set(G.hornG.gain, P.horn.vol * on, .02);
  },
  silence() { if (G) for (const k of ['vvvfG', 'motorG', 'resG', 'rollG', 'windG', 'rumbleG', 'bridgeG', 'rainG', 'sqG', 'hornG', 'wet', 'fb']) set(G[k].gain, 0, .02); },
  play(name, o = {}) { const f = SFX[name]; if (!f) return false; if (game.headless) return true; f(o); return true; },
  has: name => !!SFX[name],
  melody(id) { const m = MELODIES[id] || MELODIES.akari; DH.Sound.notes(m.notes, m.bpm, m.wave || 'bell'); return m; },
  notes(str, bpm, timbre = 'bell', vol = .14) {
    if (game.headless) return;
    const step = 60 / bpm / 2; let t = 0;
    for (const tok of str.trim().split(/\s+/)) {
      if (tok === '.') { t += step; continue; }
      if (tok === '-') { t += step; continue; }
      const len = step * 1.6;
      if (timbre === 'bell') { A.sfx({ wave: 'triangle', freq: tok, dur: len * 1.8, vol, delay: t }); A.sfx({ wave: 'sine', freq: tok, dur: len, vol: vol * .45, delay: t, pitch: 2 }); A.sfx({ wave: 'sine', freq: tok, dur: len * .6, vol: vol * .25, delay: t + .09 }); }
      else A.sfx({ wave: timbre, freq: tok, dur: len, vol, delay: t });
      t += step;
    }
  }
};
/* the sfx voices: one-shots on the chip (game.audio.sfx takes a voice; several with a delay make a chord or a phrase) */
const S = (v) => A.sfx(v);
const SFX = {
  clack: () => { S({ wave: 'noise', freq: 2400, dur: .03, vol: .22, filter: 'bandpass', q: 3 }); S({ wave: 'square', freq: 180, to: 90, dur: .03, vol: .08 }); },
  ebclunk: () => { S({ wave: 'noise', freq: 300, dur: .12, vol: .35 }); S({ wave: 'noise', freq: 3000, to: 1200, dur: 1.4, vol: .14, filter: 'highpass', delay: .05 }); },
  pshh: () => S({ wave: 'noise', freq: 4000, to: 1500, dur: .7, vol: .14, filter: 'highpass' }),
  joint: o => { const k = clamp((o.v || 60) / 100, .3, 1); for (const d of [0, .045, .32, .365]) S({ wave: 'noise', freq: 700, dur: .03, vol: .12 * k, filter: 'lowpass', delay: d * (60 / Math.max(20, o.v || 60)) }); },
  points: () => { for (let i = 0; i < 6; i++) S({ wave: 'noise', freq: 1500, dur: .02, vol: .12, delay: i * .05 }); },
  doorchime: () => { S({ wave: 'sine', freq: 'E6', dur: .35, vol: .16 }); S({ wave: 'sine', freq: 'C6', dur: .5, vol: .16, delay: .3 }); S({ wave: 'sine', freq: 'E6', dur: .35, vol: .16, delay: .9 }); S({ wave: 'sine', freq: 'C6', dur: .5, vol: .16, delay: 1.2 }); },
  doorthunk: () => { S({ wave: 'noise', freq: 220, dur: .15, vol: .3 }); S({ wave: 'square', freq: 70, dur: .08, vol: .1 }); },
  doorsbuzz: () => S({ wave: 'square', freq: 120, dur: .25, vol: .1 }),
  buzzer: () => { S({ wave: 'square', freq: 440, dur: .18, vol: .1, hold: true }); S({ wave: 'square', freq: 440, dur: .18, vol: .1, hold: true, delay: .3 }); },
  pilot: () => S({ wave: 'square', freq: 1800, dur: .02, vol: .08 }),
  atsbell: () => { S({ wave: 'triangle', freq: 'A6', dur: .4, vol: .2 }); S({ wave: 'sine', freq: 'A7', dur: .2, vol: .08 }); },
  atschime: () => S({ wave: 'sine', freq: 'E6', dur: .5, vol: .1 }),
  slip: () => S({ wave: 'saw', freq: 900, to: 1600, dur: .8, vol: .07, vib: [12, .02] }),
  slide: () => { for (let i = 0; i < 5; i++) S({ wave: 'noise', freq: 500, dur: .05, vol: .16, delay: i * .09 }); },
  crack: () => { S({ wave: 'noise', freq: 3000, to: 200, dur: .8, vol: .35 }); S({ wave: 'square', freq: 'E3', to: 'E1', dur: 1.2, vol: .14 }); },
  tick: () => S({ wave: 'square', freq: 2000, dur: .015, vol: .1 }),
  crossbell: o => { const d = o.dop || 1, v = o.vol === undefined ? .12 : o.vol; S({ wave: 'triangle', freq: 700 * d, dur: .18, vol: v }); S({ wave: 'triangle', freq: 820 * d, dur: .18, vol: v, delay: .2 }); },
  whoosh: () => { S({ wave: 'noise', freq: 400, to: 1800, dur: .5, vol: .3 }); S({ wave: 'noise', freq: 1800, to: 300, dur: 1.4, vol: .25, delay: .45 }); },
  toot: () => { S({ wave: 'saw', freq: 392, dur: .5, vol: .12, hold: true }); S({ wave: 'saw', freq: 494, dur: .5, vol: .1, hold: true }); },
  alarm: () => { for (let i = 0; i < 6; i++) S({ wave: 'square', freq: i % 2 ? 960 : 760, dur: .14, vol: .09, delay: i * .16 }); },
  crash: () => { S({ wave: 'noise', freq: 200, dur: .8, vol: .45 }); S({ wave: 'noise', freq: 2000, to: 300, dur: .6, vol: .3 }); },
  warn: () => { S({ wave: 'square', freq: 880, dur: .1, vol: .08 }); S({ wave: 'square', freq: 660, dur: .14, vol: .08, delay: .12 }); },
  seagull: () => { S({ wave: 'sine', freq: 1600, to: 1100, dur: .18, vol: .05 }); S({ wave: 'sine', freq: 1700, to: 1200, dur: .15, vol: .04, delay: .22 }); },
  ferry: () => S({ wave: 'saw', freq: 'A1', dur: 2, vol: .1, hold: true }),
  taiko: () => { for (const [d, v] of [[0, .3], [.4, .2], [.6, .2], [1.0, .3], [1.4, .25]]) S({ wave: 'sine', freq: 70, to: 45, dur: .3, vol: v, delay: d }); },
  cicada: () => S({ wave: 'noise', freq: 6000, dur: 1.4, vol: .03, vib: [30, .2] }),
  stamp: () => { S({ wave: 'noise', freq: 300, dur: .12, vol: .4 }); S({ wave: 'square', freq: 90, to: 50, dur: .15, vol: .2 }); },
  move: () => S({ wave: 'square', freq: 'C6', dur: .03, vol: .06 }),
  confirm: () => { S({ wave: 'square', freq: 'E6', dur: .05, vol: .08 }); S({ wave: 'square', freq: 'A6', dur: .08, vol: .08, delay: .05 }); },
  back: () => S({ wave: 'square', freq: 'A5', to: 'E5', dur: .08, vol: .07 }),
  jingle_perfect: () => ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((n, i) => { S({ wave: 'pulse', freq: n, dur: .14, vol: .1, delay: i * .07 }); S({ wave: 'sine', freq: n, dur: .3, vol: .06, delay: i * .07 + .02, pitch: 2 }); }),
  jingle_great: () => ['E6', 'G6', 'B6', 'E7'].forEach((n, i) => S({ wave: 'pulse', freq: n, dur: .12, vol: .09, delay: i * .07 })),
  jingle_good: () => ['C6', 'E6', 'G6'].forEach((n, i) => S({ wave: 'pulse', freq: n, dur: .1, vol: .08, delay: i * .07 })),
  jingle_bad: () => { S({ wave: 'square', freq: 'E4', dur: .3, vol: .1 }); S({ wave: 'square', freq: 'F4', dur: .3, vol: .1 }); },
  clockTick: () => S({ wave: 'square', freq: 1500, dur: .01, vol: .06 }),
  wiper: () => { S({ wave: 'noise', freq: 1200, to: 600, dur: .25, vol: .04, filter: 'bandpass', q: 4 }); },
  droplet: () => S({ wave: 'sine', freq: 2000 + Math.floor(DH.game.real * 997) % 1200, dur: .02, vol: .03 }),
  compressor: () => { for (let i = 0; i < 3; i++) S({ wave: 'noise', freq: 120, dur: .08, vol: .1, delay: i * .33 }); },
  camera: () => S({ wave: 'noise', freq: 3000, dur: .04, vol: .1 }),
  postcard: () => ['G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => S({ wave: 'triangle', freq: n, dur: .2, vol: .1, delay: i * .1 }))
};
DH.SFX_NAMES = Object.keys(SFX);

/* ---------- departure melodies: twelve original 6-8 s bell tunes, one a station ---------- */
const MELODIES = DH.MELODIES = {
  akari: { bpm: 112, notes: 'C5 E5 G5 C6 . B5 G5 E5 F5 A5 C6 F6 . E6 D6 C6 . G5 C6 E6 G6 . F6 E6 D6 C6' },
  hanabatake: { bpm: 132, notes: 'G5 . A5 B5 D6 . B5 . A5 G5 E5 . G5 . A5 B5 G5 D6 . B5 G5 . G5' },
  kujira: { bpm: 100, notes: 'E5 G5 A5 B5 . A5 G5 E5 D5 E5 G5 A5 . G5 E5 . D5 E5 . E5' },
  minato: { bpm: 126, notes: 'C5 . C5 E5 G5 . E5 . F5 . F5 A5 C6 . A5 . G5 E5 C5 D5 . . C4' },
  todai: { bpm: 108, notes: 'A5 . E6 . D6 C6 B5 . A5 . C6 . E6 . A6 . E6 . A5' },
  okiku: { bpm: 96, notes: 'D5 . E5 G5 A5 . B5 . A5 G5 E5 . D5 . E5 G5 . A5 . D5' },
  yuhi: { bpm: 104, notes: 'G6 . E6 D6 C6 . A5 G5 . A5 C6 D6 . E6 . D6 C6 . . C6' },
  shotengai: { bpm: 140, notes: 'C6 . C6 D6 . E6 C6 . G5 . A5 C6 . D6 . E6 G6 E6 D6 C6 . C6' },
  daigaku: { bpm: 96, notes: 'E5 C5 D5 G4 . G4 D5 E5 C5 . E5 D5 C5 G4 . G4 D5 E5 C5' },
  koen: { bpm: 120, notes: 'E6 D6 C6 D6 E6 . E6 . D6 C6 D6 . E6 G6 E6 D6 . C6' },
  hoshimi: { bpm: 128, notes: 'C7 G6 E6 G6 C7 . D7 . B6 G6 D6 G6 B6 . C7 . . C7' },
  kawasemi: { bpm: 150, notes: 'A5 C6 E6 A5 C6 E6 G6 . F6 E6 D6 C6 B5 . C6 E6 A6 . A6' },
  mark1: { bpm: 120, notes: 'C6 E6 G6' }, mark2: { bpm: 120, notes: 'C6 E6 G6' }, gate: { bpm: 120, notes: 'C6 E6 G6 C7' }
};

/* ---------- music (the engine's sequencer) ---------- */
DH.SONGS = {
  title: { bpm: 128, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'C5 - E5 G5 | C6 - B5 - | A5 - G5 E5 | F5 - - - | D5 - F5 A5 | D6 - C6 - | B5 G5 A5 B5 | C6 - - - ' },
    { wave: 'triangle', vol: .16, notes: 'C3 . G3 . | E3 . G3 . | F3 . C3 . | F3 . A3 . | D3 . A3 . | G3 . D3 . | G3 . B3 . | C3 . G3 . ' },
    { wave: 'drums', notes: 'k . h . | s . h . | k . h k | s . h . | k . h . | s . h . | k k h . | s . s s ' }] },
  menu: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .1, notes: 'E5 . G5 . | B5 - A5 . | F#5 . A5 . | D6 - C#6 . | E5 . G5 . | B5 - D6 . | C6 B5 A5 G5 | F#5 - - . ' },
    { wave: 'pulse12', vol: .06, notes: 'G4 B4 D5 B4 | G4 B4 D5 B4 | F#4 A4 D5 A4 | F#4 A4 D5 A4 | E4 G4 B4 G4 | E4 G4 B4 G4 | A4 C5 E5 C5 | D4 F#4 A4 F#4 ' },
    { wave: 'triangle', vol: .12, notes: 'G2 . . G2 | . . D3 . | D2 . . D2 | . . A2 . | E2 . . E2 | . . B2 . | A2 . . A2 | D2 . . . ' },
    { wave: 'drums', notes: 'k . h . | s . h h | k . h . | s . h . | k . h . | s . h h | k . h . | s . c . ' }] },
  brief: { bpm: 84, steps: 4, tracks: [
    { wave: 'triangle', vol: .09, notes: 'A4 - C5 - | E5 - - - | G4 - B4 - | D5 - - - | F4 - A4 - | C5 - E5 - | E4 - G#4 - | B4 - - - ' },
    { wave: 'sine', vol: .1, notes: 'A2 - - - | - - - - | G2 - - - | - - - - | F2 - - - | - - - - | E2 - - - | - - - - ' }] },
  resultsHi: { bpm: 140, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'C5 E5 G5 C6 | E6 - D6 C6 | D6 - B5 G5 | C6 - - - ' },
    { wave: 'triangle', vol: .14, notes: 'C3 . G3 . | A2 . E3 . | G2 . D3 . | C3 . . . ' }, { wave: 'drums', notes: 'k . s . | k k s . | k . s . | k . c . ' }] },
  resultsMid: { bpm: 112, steps: 4, tracks: [
    { wave: 'triangle', vol: .1, notes: 'E5 - G5 - | A5 - G5 E5 | D5 - E5 G5 | E5 - - - ' }, { wave: 'triangle', vol: .12, notes: 'C3 . . . | F2 . . . | G2 . . . | C3 . . . ' }] },
  resultsLo: { bpm: 90, steps: 4, tracks: [
    { wave: 'triangle', vol: .1, notes: 'E5 - D5 - | C5 - B4 - | A4 - G#4 - | A4 - - - ' }, { wave: 'sine', vol: .12, notes: 'A2 . . . | F2 . . . | E2 . . . | A2 . . . ' }] },
  gameover: { bpm: 80, steps: 4, tracks: [{ wave: 'triangle', vol: .12, notes: 'E5 - D#5 - | D5 - C#5 - | C5 - - - | - - - - ' }, { wave: 'sine', vol: .12, notes: 'A2 - - - | G#2 - - - | A2 - - - | - - - - ' }] },
  parallel: { bpm: 150, steps: 4, tracks: [
    { wave: 'pulse', vol: .09, notes: 'E5 E5 . G5 | . E5 D5 C5 | D5 D5 . F5 | . D5 C5 B4 | C5 E5 G5 C6 | B5 G5 A5 B5 | C6 . G5 . | E5 . C5 . ' },
    { wave: 'saw', vol: .05, notes: 'C3 C3 C4 C3 | C3 C3 C4 C3 | G2 G2 G3 G2 | G2 G2 G3 G2 | A2 A2 A3 A2 | F2 F2 F3 F2 | G2 G2 G3 G2 | C3 C3 C4 C3 ' },
    { wave: 'drums', notes: 'k h s h | k h s h | k h s h | k k s h | k h s h | k h s h | k h s h | s s s s ' }] },
  ending: { bpm: 76, steps: 4, tracks: [
    { wave: 'triangle', vol: .1, notes: 'G5 - - E5 | C5 - D5 E5 | F5 - - D5 | B4 - C5 D5 | E5 - - C5 | A4 - B4 C5 | D5 - G4 - | C5 - - - ' },
    { wave: 'pulse12', vol: .05, notes: 'C4 E4 G4 E4 | C4 E4 G4 E4 | D4 F4 A4 F4 | G3 B3 D4 B3 | A3 C4 E4 C4 | F3 A3 C4 A3 | G3 B3 D4 B3 | C4 E4 G4 E4 ' },
    { wave: 'sine', vol: .12, notes: 'C3 - - - | A2 - - - | D3 - - - | G2 - - - | A2 - - - | F2 - - - | G2 - - - | C3 - - - ' }] },
  drive: { bpm: 104, steps: 4, tracks: [
    { wave: 'pulse12', vol: .05, notes: 'A4 . C5 E5 | . D5 . C5 | G4 . B4 D5 | . C5 . B4 | F4 . A4 C5 | . B4 . A4 | E4 G#4 B4 D5 | C5 B4 A4 . ' },
    { wave: 'triangle', vol: .1, notes: 'A2 . A2 . | E3 . A2 . | G2 . G2 . | D3 . G2 . | F2 . F2 . | C3 . F2 . | E2 . E2 . | B2 . E2 . ' },
    { wave: 'drums', notes: 'k . h . | s . h k | . k h . | s . h . | k . h . | s . h k | . k h . | s . h h ' }] }
};
DH.music = (id, o = { fade: 1 }) => { if (!id) { A.music(null); DH.curSong = null; return; } if (DH.curSong === id) return; DH.curSong = id; A.music(DH.SONGS[id], o); };
})();
