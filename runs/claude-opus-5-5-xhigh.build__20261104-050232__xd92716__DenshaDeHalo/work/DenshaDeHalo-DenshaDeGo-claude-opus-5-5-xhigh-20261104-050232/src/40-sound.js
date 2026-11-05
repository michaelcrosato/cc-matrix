/* 40-sound: every sound made in code. A continuous synth on the engine's audio context (built once, only its
 * parameters change each frame, routed through the sfx bus so volume, mute and ducking apply): the Halo 8000's VVVF
 * inverter (an async rising tone, then the stepped synchronous bands that make Japanese trains sing, plus the motor),
 * the Halo 3000's resistor growl, rolling, wind, tunnel and bridge, rain, the brake squeal, the compressor, the horn.
 * One-shots through game.audio.sfx; twelve departure melodies on a bell timbre; the music on the engine's sequencer.
 * DH.soundParams(state) is pure (tested): speed, notch and place -> each layer's level and pitch. Headless: silent. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, A = game.audio, { clamp } = E;
const BANDS = [12, 24, 38, 50, 65];
/** the soundscape's parameters: st { v (km/h), P, B (efforts), type ('vvvf' | 'resistor'), tunnel, bridge, rain, stopped }
 *  -> { vvvf: { f, vol, motorF }, res: { f, vol }, roll: { f, vol }, wind: { vol }, tunnel, bridge, squeal, rain } */
DH.soundParams = st => {
  const v = Math.max(0, st.v), eff = Math.max(st.P || 0, (st.B || 0) * .8) / 3.2, out = {};
  if (st.type === 'resistor') { out.vvvf = { f: 0, vol: 0, motorF: 0 }; out.res = { f: 30 + 6 * v, vol: v > .3 ? clamp(.08 + (st.P || 0) * .1, 0, .35) * Math.min(1, v / 6) : 0 }; }
  else {
    let f;
    if (v < BANDS[0]) f = 300 + 600 * v / BANDS[0];
    else { let i = 0; while (i < BANDS.length - 1 && v >= BANDS[i + 1]) i++; const a = BANDS[i], b = BANDS[i + 1] || a + 30, u = clamp((v - a) / (b - a), 0, 1); f = i < BANDS.length - 1 ? 380 + 520 * u - i * 18 : 760 + (v - a) * 4; }
    out.vvvf = { f, vol: v > .2 ? clamp(eff * .5, 0, .32) : 0, motorF: 18 * v }; out.res = { f: 0, vol: 0 };
  }
  out.roll = { f: 200 + 12 * v, vol: clamp(v / 90, 0, 1) * .45 * (st.tunnel ? 1.3 : 1) };
  out.wind = { vol: clamp((v / 110) ** 2, 0, 1) * (st.tunnel ? .5 : .22) };
  out.tunnel = st.tunnel ? .6 : 0; out.bridge = st.bridge ? clamp(v / 60, 0, 1) * .35 : 0;
  out.squeal = (st.B || 0) > .3 && v > .2 && v < 8 ? clamp((8 - v) / 8, 0, 1) * .05 : 0;
  out.rain = st.rain ? .12 : 0; out.comp = st.stopped ? .06 : 0;
  return out;
};
/* ---- one-shot voices (the engine's voice format) ---- */
const SFX = {
  clack: [{ wave: 'noise', freq: 2400, to: 900, dur: .035, vol: .28, filter: 'bandpass' }, { wave: 'square', freq: 140, to: 90, dur: .04, vol: .1 }],
  ebClunk: [{ wave: 'square', freq: 90, to: 40, dur: .18, vol: .3 }, { wave: 'noise', freq: 3200, to: 1800, dur: 1.4, vol: .22, filter: 'highpass' }],
  release: [{ wave: 'noise', freq: 3600, to: 1400, dur: .9, vol: .2, filter: 'highpass' }],
  joint: [{ wave: 'noise', freq: 1600, to: 300, dur: .045, vol: .32, filter: 'lowpass' }],
  points: [{ wave: 'noise', freq: 2400, to: 400, dur: .03, vol: .25, filter: 'lowpass' }],
  chime: [{ wave: 'sine', freq: 'B5', dur: .38, vol: .26 }, { wave: 'sine', freq: 'G5', dur: .5, vol: .26, delay: .34 }, { wave: 'sine', freq: 'B5', dur: .38, vol: .2, delay: .9 }, { wave: 'sine', freq: 'G5', dur: .5, vol: .2, delay: 1.24 }],
  doorThunk: [{ wave: 'square', freq: 110, to: 60, dur: .12, vol: .22 }, { wave: 'noise', freq: 600, dur: .08, vol: .15, filter: 'lowpass' }],
  buzzer: [{ wave: 'square', freq: 196, dur: .22, vol: .14, hold: true }, { wave: 'square', freq: 196, dur: .22, vol: .14, hold: true, delay: .32 }],
  pilot: [{ wave: 'square', freq: 1800, dur: .02, vol: .08 }],
  atsDing: [{ wave: 'triangle', freq: 'E6', dur: .28, vol: .22 }, { wave: 'sine', freq: 'E7', dur: .18, vol: .08 }],
  atsChime: [{ wave: 'sine', freq: 'A5', dur: .25, vol: .1 }],
  slip: [{ wave: 'saw', freq: 600, to: 1600, dur: .6, vol: .08 }],
  crack: [{ wave: 'noise', freq: 4000, to: 400, dur: .6, vol: .35, filter: 'bandpass' }, { wave: 'triangle', freq: 'C7', to: 'C6', dur: .5, vol: .12, delay: .05 }, { wave: 'triangle', freq: 'G6', to: 'G5', dur: .5, vol: .1, delay: .15 }],
  tick: [{ wave: 'square', freq: 3000, dur: .015, vol: .1 }],
  bell: [{ wave: 'triangle', freq: 700, dur: .18, vol: .16 }],
  bell2: [{ wave: 'triangle', freq: 820, dur: .18, vol: .16 }],
  whoosh: [{ wave: 'noise', freq: 300, to: 2600, dur: .7, vol: .3, filter: 'bandpass', q: .7 }, { wave: 'noise', freq: 2600, to: 400, dur: .9, vol: .25, filter: 'bandpass', delay: .6, q: .7 }],
  toot: [{ wave: 'saw', freq: 349, dur: .35, vol: .12, hold: true }, { wave: 'saw', freq: 440, dur: .35, vol: .1, hold: true }],
  gull: [{ wave: 'sine', freq: 1800, to: 1200, dur: .18, vol: .05 }, { wave: 'sine', freq: 1900, to: 1300, dur: .16, vol: .05, delay: .22 }],
  ferry: [{ wave: 'saw', freq: 98, dur: 1.6, vol: .12, hold: true }, { wave: 'saw', freq: 123, dur: 1.6, vol: .08, hold: true }],
  taiko: [{ wave: 'sine', freq: 80, to: 50, dur: .3, vol: .3 }, { wave: 'noise', freq: 300, dur: .08, vol: .15, filter: 'lowpass' }],
  cicada: [{ wave: 'noise', freq: 6000, dur: 1.2, vol: .03, filter: 'bandpass', q: 6 }],
  stamp: [{ wave: 'noise', freq: 400, to: 100, dur: .25, vol: .4, filter: 'lowpass' }, { wave: 'square', freq: 70, to: 40, dur: .2, vol: .25 }],
  move: [{ wave: 'square', freq: 'E6', dur: .04, vol: .08 }],
  ok: [{ wave: 'square', freq: 'C6', dur: .05, vol: .1 }, { wave: 'square', freq: 'G6', dur: .08, vol: .1, delay: .05 }],
  back: [{ wave: 'square', freq: 'G5', dur: .05, vol: .08 }, { wave: 'square', freq: 'C5', dur: .07, vol: .08, delay: .05 }],
  jPerfect: [0, 4, 7, 12, 16, 19, 24].map((n, i) => ({ wave: 'pulse', freq: 523.25 * Math.pow(2, n / 12), dur: .22, vol: .12, delay: i * .06 })),
  jGreat: [0, 4, 7, 12].map((n, i) => ({ wave: 'pulse', freq: 523.25 * Math.pow(2, n / 12), dur: .2, vol: .12, delay: i * .07 })),
  jGood: [0, 7, 12].map((n, i) => ({ wave: 'square', freq: 392 * Math.pow(2, n / 12), dur: .16, vol: .1, delay: i * .08 })),
  jOk: [{ wave: 'square', freq: 'G5', dur: .14, vol: .1 }, { wave: 'square', freq: 'C6', dur: .2, vol: .1, delay: .1 }],
  jBad: [{ wave: 'saw', freq: 'C5', dur: .45, vol: .1 }, { wave: 'saw', freq: 'C#5', dur: .45, vol: .1 }],
  jTime: [0, 4, 7].map((n, i) => ({ wave: 'triangle', freq: 784 * Math.pow(2, n / 12), dur: .18, vol: .14, delay: .35 + i * .06 })),
  jSmooth: [{ wave: 'sine', freq: 'E6', to: 'B6', dur: .3, vol: .1, delay: .6 }],
  callOk: [{ wave: 'triangle', freq: 'A5', dur: .08, vol: .08 }],
  callGreat: [{ wave: 'triangle', freq: 'A5', dur: .08, vol: .1 }, { wave: 'triangle', freq: 'E6', dur: .12, vol: .1, delay: .07 }],
  halo: [{ wave: 'triangle', freq: 'E6', dur: .12, vol: .1 }, { wave: 'triangle', freq: 'A6', dur: .2, vol: .1, delay: .08 }],
  bad: [{ wave: 'square', freq: 150, dur: .2, vol: .12 }, { wave: 'square', freq: 110, dur: .25, vol: .12, delay: .15 }],
  countdown: [{ wave: 'square', freq: 'A5', dur: .12, vol: .14 }],
  go: [{ wave: 'square', freq: 'A6', dur: .4, vol: .14 }]
};
for (const k in SFX) A.define(k, SFX[k]);
/* ---- departure melodies: one a station, 6-8 s on a bell (triangle + a sine an octave up, fast decay, a light echo) ---- */
const MEL = {
  akari: { bpm: 132, n: 'C5 E5 G5 C6 . B5 G5 E5 | F5 A5 C6 F6 . E6 C6 A5 | G5 B5 D6 G6 . F6 D6 B5 | C6 . G5 . E6 . C6 - ' },
  hanabatake: { bpm: 144, n: 'G5 A5 G5 E5 . C5 E5 G5 | A5 G5 E5 D5 . E5 G5 . | C6 B5 A5 G5 . E5 D5 E5 | C5 - - . ' },
  kujira: { bpm: 112, n: 'E5 . G5 A5 . G5 E5 . | D5 . E5 G5 . E5 D5 . | C5 . D5 E5 G5 A5 G5 E5 | D5 - C5 - ' },
  minato: { bpm: 138, n: 'G5 G5 E5 G5 . A5 G5 E5 | F5 F5 D5 F5 . G5 F5 D5 | E5 G5 C6 . B5 G5 . | C6 - . G4 - - ' },
  todai: { bpm: 108, n: 'A5 . E6 . D6 . C6 . | B5 . G5 . A5 . E5 . | F5 . A5 . C6 . B5 . | A5 - - - ' },
  okiku: { bpm: 104, n: 'A4 C5 D5 E5 . G5 E5 D5 | C5 D5 E5 . A5 G5 E5 . | D5 E5 G5 A5 . G5 E5 D5 | E5 - - A4 - ' },
  yuhi: { bpm: 100, n: 'E6 D6 C6 B5 . A5 G5 . | F5 E5 D5 . E5 G5 . | C6 B5 A5 G5 . F5 E5 D5 | C5 - - - ' },
  shotengai: { bpm: 152, n: 'C5 . E5 G5 . E5 A5 . | G5 . E5 C5 . D5 E5 . | F5 . A5 C6 . A5 D6 . | C6 . G5 E5 C5 - ' },
  daigaku: { bpm: 120, n: 'E5 C5 D5 G4 . G4 D5 E5 C5 . | E5 D5 C5 G4 . G4 D5 E5 C5 - ' },
  koen: { bpm: 126, n: 'E5 G5 B5 . A5 G5 E5 . | D5 F5 A5 . G5 F5 D5 . | C5 E5 G5 C6 . B5 A5 G5 | C6 - - - ' },
  hoshimi: { bpm: 140, n: 'C6 G6 E6 G6 C7 G6 E6 G6 | B5 G6 D6 G6 B6 G6 D6 G6 | A5 E6 C6 E6 A6 E6 C6 E6 | C7 - - - ' },
  kawasemi: { bpm: 160, n: 'E6 F6 E6 C6 . E6 F6 E6 C6 . | G6 E6 C6 G5 . A5 C6 E6 G6 C7 - ' },
  depot: { bpm: 120, n: 'C5 E5 G5 C6 - . ' }
};
DH.MELODIES = MEL;
const noteF = n => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 0; const i = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12; return 261.63 * Math.pow(2, (i - 0) / 12); };
DH.noteF = noteF;
/** the notes of a melody as voices with delays (a bell: triangle + a sine an octave up; an echo a beat later) */
DH.melodyVoices = id => {
  const M = MEL[id] || MEL.akari, step = 60 / M.bpm / 2, toks = M.n.replace(/\|/g, ' ').trim().split(/\s+/), out = []; let t = 0, last = null;
  for (const tk of toks) { if (tk === '-') { if (last) last.forEach(v => { v.dur += step; }); } else if (tk !== '.') { const f = noteF(tk); last = [{ wave: 'triangle', freq: f, dur: step * 1.6, vol: .16, delay: t }, { wave: 'sine', freq: f * 2, dur: step * .9, vol: .07, delay: t }, { wave: 'triangle', freq: f, dur: step * 1.2, vol: .04, delay: t + step * 1.5 }]; out.push(...last); } else last = null; t += step; }
  return { voices: out, len: t };
};
/* ---- music (the engine's sequencer; 8th notes) ---- */
const S = (bpm, tracks, o) => Object.assign({ bpm, steps: 2, tracks }, o);
DH.SONGS = {
  march: S(132, [
    { wave: 'square', vol: .07, notes: 'C5 . E5 G5 C6 . G5 E5 | F5 . A5 C6 F6 . C6 A5 | G5 . B5 D6 G6 . D6 B5 | C6 - G5 - E5 - C5 - | A4 . C5 E5 A5 . E5 C5 | F4 . A4 C5 F5 . C5 A4 | G4 . B4 D5 G5 F5 E5 D5 | C5 - - - . . G4 - ' },
    { wave: 'pulse12', vol: .05, notes: 'E4 . G4 . E4 . G4 . | F4 . A4 . F4 . A4 . | G4 . B4 . G4 . B4 . | E4 . G4 . E4 . G4 . | E4 . A4 . E4 . A4 . | F4 . A4 . F4 . A4 . | D4 . G4 . D4 . G4 . | E4 . G4 . C4 . . . ' },
    { wave: 'triangle', vol: .24, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . . . ' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h . k . h k s . h . ' }]),
  timetable: S(100, [
    { wave: 'pulse12', vol: .06, notes: 'E5 - D5 C5 . A4 C5 - | D5 - C5 A4 . G4 A4 - | E5 - D5 C5 . A4 C5 E5 | D5 - - - . . . . | F5 - E5 D5 . C5 D5 - | E5 - D5 C5 . A4 G4 - | A4 C5 E5 G5 . F5 E5 D5 | C5 - - - . . . . ' },
    { wave: 'triangle', vol: .22, notes: 'F2 . F3 . A2 . C3 . | E2 . E3 . G2 . B2 . | D2 . D3 . F2 . A2 . | G2 . G3 . B2 . D3 . | F2 . F3 . A2 . C3 . | E2 . E3 . A2 . C3 . | D2 . F2 . G2 . B2 . | C3 . G2 . C3 . . . ' },
    { wave: 'sine', vol: .05, notes: 'A4 . C5 . A4 . C5 . | G4 . B4 . G4 . B4 . | F4 . A4 . F4 . A4 . | B4 . D5 . B4 . D5 . | A4 . C5 . A4 . C5 . | G4 . C5 . G4 . C5 . | F4 . A4 . G4 . B4 . | E4 . G4 . E4 . . . ' },
    { wave: 'drums', vol: .045, notes: 'k . h . s . h h k . h . s . h . ' }]),
  briefing: S(84, [
    { wave: 'triangle', vol: .1, notes: 'C5 - - E5 - - G5 - | F5 - - E5 - - D5 - | C5 - - E5 - - G5 - | A5 - - G5 - - - - ' },
    { wave: 'sine', vol: .08, notes: 'C4 - - - G3 - - - | F3 - - - G3 - - - | A3 - - - E3 - - - | F3 - - - G3 - - - ' }]),
  results: S(120, [
    { wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 - . G5 C6 | E6 - - - D6 - C6 - | B5 D6 G6 . F6 E6 D6 . | C6 - - - . . . . ' },
    { wave: 'triangle', vol: .22, notes: 'C3 . G2 . C3 . G2 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . . ' },
    { wave: 'drums', vol: .06, notes: 'k . h . s . h . ' }]),
  resultsMid: S(96, [
    { wave: 'pulse12', vol: .06, notes: 'E5 - D5 - C5 - G4 - | A4 - C5 - B4 - G4 - | E5 - D5 - C5 - E5 - | D5 - - - . . . . ' },
    { wave: 'triangle', vol: .2, notes: 'C3 . . . A2 . . . | F2 . . . G2 . . . | C3 . . . A2 . . . | G2 . . . . . . . ' }]),
  resultsLow: S(72, [
    { wave: 'triangle', vol: .1, notes: 'A4 - - G4 - - E4 - | F4 - - E4 - - D4 - | E4 - - - C4 - - - | D4 - - - - - - - ' },
    { wave: 'sine', vol: .07, notes: 'A2 - - - - - - - | D3 - - - - - - - | A2 - - - - - - - | E2 - - - - - - - ' }]),
  over: S(90, [{ wave: 'square', vol: .1, notes: 'G4 - F#4 - F4 - E4 - - - - - . . . . ' }, { wave: 'triangle', vol: .2, notes: 'C3 - B2 - Bb2 - A2 - - - - - . . . . ' }], { loop: false }),
  parallel: S(150, [
    { wave: 'square', vol: .065, notes: 'A4 C5 E5 A5 . E5 C5 E5 | G4 B4 D5 G5 . D5 B4 D5 | F4 A4 C5 F5 . C5 A4 C5 | E4 G#4 B4 E5 . B4 G#4 B4 | A4 C5 E5 A5 . E5 A5 C6 | B5 . A5 G5 . F5 E5 D5 | C5 E5 A5 . G5 F5 E5 D5 | E5 - - - B4 - - - ' },
    { wave: 'triangle', vol: .24, notes: 'A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 G2 G3 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 E2 E3 | A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 G2 G3 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 E2 E3 ' },
    { wave: 'drums', vol: .075, notes: 'k h s h k k s h k h s h k k s s ' }]),
  evening: S(76, [
    { wave: 'triangle', vol: .11, notes: 'E5 - - D5 C5 - - - | D5 - - C5 A4 - - - | G4 - A4 - C5 - E5 - | D5 - - - - - - - | E5 - - G5 A5 - - - | G5 - - E5 D5 - - - | C5 - D5 - E5 - G5 - | C5 - - - - - - - ' },
    { wave: 'sine', vol: .07, notes: 'C4 - G4 - E4 - G4 - | F3 - C4 - A3 - C4 - | E3 - B3 - G3 - B3 - | G3 - D4 - B3 - D4 - | A3 - E4 - C4 - E4 - | F3 - C4 - A3 - C4 - | D3 - A3 - G3 - B3 - | C3 - G3 - C4 - - - ' },
    { wave: 'pulse12', vol: .025, notes: 'G5 . . . . . . . | A5 . . . . . . . | B5 . . . . . . . | D6 . . . . . . . | C6 . . . . . . . | A5 . . . . . . . | B5 . . . . . . . | C6 . . . . . . . ' }]),
  groove: S(112, [
    { wave: 'pulse12', vol: .05, notes: 'D5 . F5 A5 . G5 F5 . | E5 . C5 . A4 . . . | D5 . F5 A5 . C6 A5 . | G5 - - - . . . . ' },
    { wave: 'triangle', vol: .22, notes: 'D3 . D3 A2 . D3 . A2 | C3 . C3 G2 . C3 . G2 | Bb2 . Bb2 F2 . Bb2 . F2 | A2 . A2 E2 . A2 . E2 ' },
    { wave: 'drums', vol: .05, notes: 'k . h k s . h . k . h . s . h h ' }])
};
/* ---- the continuous synth ---- */
class Sound {
  constructor() { this.g = null; this.t = 0; this.jointAt = 0; this.on = false; this.bellT = 0; this.atsT = 0; this.ambT = 0; this.r = E.rng(9); this.duckN = 0; }
  _build() {
    if (this.g || game.headless) return this.g; const c = A.ctx, bus = A.bus && A.bus('sfx'); if (!c || !bus || c.state !== 'running') return null;
    const nb = A.noiseBuffer(), g = {};
    const gain = (v = 0, to = g.out) => { const n = c.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };
    const noise = () => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(0, this.r() * .5); return s; };
    const filt = (type, f, q = 1) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
    g.comp = c.createDynamicsCompressor(); g.comp.connect(bus); g.out = gain(.9, g.comp);
    // the tunnel's echo: a short feedback delay the rolling and wind also feed
    g.dly = c.createDelay(.2); g.dly.delayTime.value = .06; g.fb = gain(0, null); g.dly.connect(g.fb); g.fb.connect(g.dly); g.dly.connect(g.out); g.tunnelSend = gain(0, g.dly);
    g.vvvfO = c.createOscillator(); g.vvvfO.type = 'square'; g.vvvfF = filt('bandpass', 900, 3); g.vvvfG = gain(0); g.vvvfO.connect(g.vvvfF); g.vvvfF.connect(g.vvvfG); g.vvvfO.start();
    g.motO = c.createOscillator(); g.motO.type = 'sine'; g.motG = gain(0); g.motO.connect(g.motG); g.motO.start();
    g.resO = c.createOscillator(); g.resO.type = 'sawtooth'; g.resF = filt('lowpass', 400, 2); g.resG = gain(0); g.resO.connect(g.resF); g.resF.connect(g.resG); g.resO.start();
    g.rollS = noise(); g.rollF = filt('lowpass', 300, .8); g.rollG = gain(0); g.rollS.connect(g.rollF); g.rollF.connect(g.rollG); g.rollG.connect(g.tunnelSend);
    g.windS = noise(); g.windF = filt('bandpass', 800, .6); g.windG = gain(0); g.windS.connect(g.windF); g.windF.connect(g.windG); g.windG.connect(g.tunnelSend);
    g.brS = noise(); g.brF = filt('bandpass', 400, 2.5); g.brG = gain(0); g.brS.connect(g.brF); g.brF.connect(g.brG);
    g.rainS = noise(); g.rainF = filt('highpass', 4000, .5); g.rainG = gain(0); g.rainS.connect(g.rainF); g.rainF.connect(g.rainG);
    g.sqO = c.createOscillator(); g.sqO.type = 'sine'; g.sqO.frequency.value = 2800; g.sqL = c.createOscillator(); g.sqL.frequency.value = 7; g.sqLG = gain(40, null); g.sqL.connect(g.sqLG); g.sqLG.connect(g.sqO.frequency); g.sqG = gain(0); g.sqO.connect(g.sqG); g.sqO.start(); g.sqL.start();
    g.cpS = noise(); g.cpF = filt('lowpass', 180, 1); g.cpG = gain(0); g.cpL = c.createOscillator(); g.cpL.frequency.value = 3; g.cpLG = gain(0, null); g.cpL.connect(g.cpLG); g.cpLG.connect(g.cpG.gain); g.cpS.connect(g.cpF); g.cpF.connect(g.cpG); g.cpL.start();
    g.hornA = c.createOscillator(); g.hornA.type = 'sawtooth'; g.hornA.frequency.value = 349; g.hornB = c.createOscillator(); g.hornB.type = 'sawtooth'; g.hornB.frequency.value = 441; g.hornF = filt('lowpass', 1800, .9); g.hornG = gain(0); g.hornA.connect(g.hornF); g.hornB.connect(g.hornF); g.hornF.connect(g.hornG); g.hornA.start(); g.hornB.start();
    this.g = g; return g;
  }
  /** the train's sound this frame */
  train(run, o = {}) {
    if (game.headless || !A.ctx) return;
    const g = this._build(); if (!g) return;
    const c = A.ctx, now = c.currentTime, tr = run.train, sg = run.seg();
    const p = DH.soundParams({ v: tr.v, P: tr.st.Pe || 0, B: tr.st.Be || 0, type: tr.ty.sound === 'resistor' ? 'resistor' : 'vvvf', tunnel: !!sg.flags.tunnel, bridge: !!sg.flags.bridge, rain: run.weather === 'rain', stopped: Math.abs(tr.v) < .05 && run.t > 2 });
    const k = o.mute ? 0 : o.vol === undefined ? 1 : o.vol, set = (prm, v, tc = .08) => prm.setTargetAtTime(v, now, tc);
    set(g.vvvfO.frequency, Math.max(30, p.vvvf.f)); set(g.vvvfF.frequency, Math.max(60, p.vvvf.f)); set(g.vvvfG.gain, p.vvvf.vol * k * .5);
    set(g.motO.frequency, Math.max(20, p.vvvf.motorF)); set(g.motG.gain, p.vvvf.vol * k * .25);
    set(g.resO.frequency, Math.max(20, p.res.f)); set(g.resF.frequency, 200 + p.res.f * 3); set(g.resG.gain, p.res.vol * k * .5);
    set(g.rollF.frequency, p.roll.f); set(g.rollG.gain, p.roll.vol * k); set(g.windG.gain, p.wind.vol * k);
    set(g.fb.gain, p.tunnel * .3); set(g.tunnelSend.gain, p.tunnel * .8); set(g.brG.gain, p.bridge * k); set(g.rainG.gain, p.rain * k);
    set(g.sqG.gain, p.squeal * k, .05); set(g.cpLG.gain, p.comp * k); set(g.cpG.gain, 0);
    set(g.hornG.gain, run.horn && !o.mute ? .16 : 0, .02);
    // the rail joints: ta-tan every 25 m, four clicks (two bogies)
    const v = Math.max(0, tr.v / 3.6), jn = Math.floor(run.s / 25);
    if (jn !== this.joint && v > 1.5 && !o.mute) { this.joint = jn; const gap = 2.1 / v, far = 14 / v; for (const d of [0, gap, far, far + gap]) if (d < 3) A.sfx(Object.assign({}, SFX.joint[0], { delay: d, vol: clamp(.08 + v / 40, 0, .3) }), { vary: .05 }); if (o.rumble) o.rumble(); }
  }
  /** a level crossing's bells: alternating dings with distance falloff and a Doppler shift */
  crossingBells(dt, list, run) {
    if (game.headless) return; this.bellT += dt; if (this.bellT < .2) return; this.bellT = 0; this.bellAlt = !this.bellAlt;
    for (const X of list) { if (!X.warn) continue; const d = Math.abs(X.dist === undefined ? 999 : X.dist); if (d > 600) continue; const vol = clamp(1 - d / 600, 0, 1) ** 1.5, dop = 1 + (X.dist > 0 ? 1 : -1) * run.train.v / 3.6 / 340; A.sfx(this.bellAlt ? 'bell' : 'bell2', { vol: vol * 1.6, pitch: dop, vary: 0 }); }
  }
  ats(dt, run) { if (game.headless) return; const R = run.ats; if (!R.ringing) return; this.atsT += dt; const per = R.confirmed ? .9 : .32; if (this.atsT >= per) { this.atsT = 0; A.sfx(R.confirmed ? 'atsChime' : 'atsDing'); } }
  ambience(dt, run) {
    if (game.headless) return; this.ambT += dt; if (this.ambT < 1) return; this.ambT = 0; const z = run.seg().zone, r = this.r();
    if (z === 'harbor' && r < .3) A.sfx('gull', { vol: .8 }); if (z === 'harbor' && r > .97) A.sfx('ferry', { vol: .6 });
    if (z === 'temple' && run.festival) A.sfx('taiko', { vol: .7 }); if ((z === 'hills' || z === 'park') && run.tod > 12 && run.tod < 17 && r < .15) A.sfx('cicada');
  }
  melody(id) { if (game.headless) return 0; const m = DH.melodyVoices(id); A.sfx(m.voices, { vary: 0 }); return m.len; }
  duck(on) { A.duck(!!on); }
  stop() { const g = this.g; if (!g || !A.ctx) return; const now = A.ctx.currentTime; for (const k of ['vvvfG', 'motG', 'resG', 'rollG', 'windG', 'brG', 'rainG', 'sqG', 'cpG', 'hornG', 'cpLG']) g[k].gain.setTargetAtTime(0, now, .05); }
  music(id, o) { if (!id) { A.music(null, o); return; } A.music(DH.SONGS[id], Object.assign({ fade: .6 }, o)); }
  sfx(name, o) { A.sfx(name, o); }
}
DH.Sound = new Sound();
})();
