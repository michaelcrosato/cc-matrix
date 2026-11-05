/* Densha de Halo! · 40-sound: every sound is made in code (no audio files). The continuous layers (the VVVF inverter's
 * singing, rolling, wind, the brake squeal) are a small Web Audio graph built once and driven by parameters; the one-shots
 * are the engine's chip voices; the departure melodies are note lists; the voices (Babble, 41) are syllable synthesis.
 * Headless (tests) every call does nothing. */
(() => {
'use strict';
const DH = window.DH;
const E = window.My3D2dge;

DH.Sound = {
  game: null, ctx: null, nodes: null, on: true, lastBrakeSq: 0,
  attach(game) { this.game = game; },
  /** the audio context and the continuous graph, made at the first sound */
  ensure() {
    const game = this.game; if (!game || game.headless) return null;
    const a = game.audio; if (!a) return null;
    if (!a.ctx) { try { a.ensureContext && a.ensureContext(); } catch (e) { /* no audio yet */ } }
    const ctx = a.ctx; if (!ctx) return null;
    if (!this.nodes || this.nodes.ctx !== ctx) {
      const master = ctx.createGain(); master.gain.value = 0.0;
      const comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
      const vvvf = ctx.createOscillator(), vvvfGain = ctx.createGain(), vvvfF = ctx.createBiquadFilter();
      vvvf.type = 'sawtooth'; vvvf.frequency.value = 300; vvvfF.type = 'bandpass'; vvvfF.frequency.value = 900; vvvfF.Q.value = 2; vvvfGain.gain.value = 0;
      vvvf.connect(vvvfF); vvvfF.connect(vvvfGain); vvvfGain.connect(master);
      const motor = ctx.createOscillator(), motorGain = ctx.createGain();
      motor.type = 'sine'; motor.frequency.value = 40; motorGain.gain.value = 0; motor.connect(motorGain); motorGain.connect(master);
      // rolling and wind: one noise buffer through two filters
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let seed = 1234567; for (let i = 0; i < len; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; }
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const rollF = ctx.createBiquadFilter(), rollG = ctx.createGain(); rollF.type = 'lowpass'; rollF.frequency.value = 300; rollG.gain.value = 0;
      const windF = ctx.createBiquadFilter(), windG = ctx.createGain(); windF.type = 'bandpass'; windF.frequency.value = 800; windF.Q.value = 1.2; windG.gain.value = 0;
      noise.connect(rollF); rollF.connect(rollG); rollG.connect(master); noise.connect(windF); windF.connect(windG); windG.connect(master);
      const rain = ctx.createBiquadFilter(), rainG = ctx.createGain(); rain.type = 'highpass'; rain.frequency.value = 4000; rainG.gain.value = 0;
      noise.connect(rain); rain.connect(rainG); rainG.connect(master);
      const sq = ctx.createOscillator(), sqG = ctx.createGain(); sq.type = 'sine'; sq.frequency.value = 2800; sqG.gain.value = 0; sq.connect(sqG); sqG.connect(master);
      (comp ? master.connect(comp) : null); if (comp) comp.connect(ctx.destination); else master.connect(ctx.destination);
      vvvf.start(); motor.start(); noise.start(); sq.start();
      this.nodes = { ctx, master, vvvf, vvvfF, vvvfGain, motor, motorGain, rollF, rollG, windF, windG, rainG, sq, sqG, noise, tunnel: 0 };
      master.gain.value = 0.22;
    }
    return this.nodes;
  },
  /** each frame: the sound follows the train (speed, notch, zone) without changing the graph */
  frame(snap, env) {
    const N = this.ensure(); if (!N || !this.on) return;
    const t = N.ctx.currentTime, v = snap.v, k = v / 110;
    const traction = snap.notchNum > 0 ? snap.notchNum / 5 : 0, brake = snap.notchNum < 0 ? -snap.notchNum / 8 : 0;
    // VVVF: a rising singing with stepped bands at 12/24/38/50/65 km/h (the inverter's synchronous steps)
    const bands = [0, 12, 24, 38, 50, 65, 80, 100];
    let band = 0; for (let i = 0; i < bands.length; i++) if (v >= bands[i]) band = i;
    const base = 300 + 600 * Math.min(1, v / 65);
    N.vvvf.frequency.setTargetAtTime(base + band * 12, t, 0.05);
    N.vvvfGain.gain.setTargetAtTime((0.05 + 0.10 * traction + 0.05 * brake) * Math.min(1, v / 8), t, 0.05);
    N.motor.frequency.setTargetAtTime(18 * v / 3.6 * 0.3 + 30, t, 0.1);
    N.motorGain.gain.setTargetAtTime(0.02 * traction * Math.min(1, v / 5), t, 0.1);
    N.rollF.frequency.setTargetAtTime(200 + 12 * v, t, 0.1);
    N.rollG.gain.setTargetAtTime(0.10 * Math.min(1, k * 1.2), t, 0.1);
    N.windF.frequency.setTargetAtTime(800 + env.tunnelBoost * 300, t, 0.2);
    N.windG.gain.setTargetAtTime((0.06 * k * k + env.tunnelBoost * 0.05) * (env.wind === false ? 0 : 1), t, 0.2);
    N.rainG.gain.setTargetAtTime(env.rain ? 0.035 : 0, t, 0.3);
    // the brake squeal under 8 km/h, with a vibrato
    const squeal = brake > 0 && v > 0.5 && v < 8 ? 0.03 * (1 - v / 8) : 0;
    N.sq.frequency.setTargetAtTime(2600 + 200 * Math.sin(t * 25), t, 0.05);
    N.sqG.gain.setTargetAtTime(squeal, t, 0.05);
  },
  /** the one-shots: the names the game uses (each a chip voice, or a melody) */
  play(name, o = {}) {
    const game = this.game; if (!game || game.headless || !this.on) return;
    const V = DH.SFX[name];
    if (!V) return;
    try { game.audio.sfx(V, o); } catch (e) { /* no audio in this browser */ }
  },
  /** a melody: a list of [note, beats] at a tempo, played as sfx voices with delays (works with or without music) */
  melody(id, bpm = 120) {
    const game = this.game; if (!game || game.headless || !this.on) return 0;
    const M = DH.MELODIES[id] || DH.MELODIES.todai;
    let t = 0; const beat = 60 / bpm;
    for (const [n, b] of M) {
      if (n !== '.') {
        const f = DH.noteHz(n);
        try { game.audio.sfx({ wave: 'triangle', freq: f, dur: beat * b * .9, vol: .16, delay: t }); game.audio.sfx({ wave: 'sine', freq: f * 2, dur: beat * b * .6, vol: .05, delay: t }); } catch (e) { /* */ }
      }
      t += beat * b;
    }
    return t;
  }
};

/** note name to frequency: 'C4' .. 'B5', with sharps and flats */
DH.noteHz = (n) => {
  const m = /^([A-G])([#b]?)(\d)$/.exec(n); if (!m) return 440;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + base;
  return 440 * Math.pow(2, (midi - 69) / 12);
};

/** the one-shot voices (chip synth): names used by the game */
DH.SFX = {
  notch: { wave: 'square', freq: 220, to: 180, dur: .05, vol: .12 },
  clack: { wave: 'noise', dur: .03, vol: .18 },
  eb: { wave: 'saw', freq: 120, to: 40, dur: .6, vol: .3 },
  ats: { wave: 'square', freq: 880, dur: .12, vol: .22, arp: [0, 12] },
  atsOk: { wave: 'triangle', freq: 660, dur: .25, vol: .18 },
  chime: { wave: 'triangle', freq: 'E6', dur: .4, vol: .18, arp: [0, 4] },
  close: { wave: 'triangle', freq: 'G5', dur: .3, vol: .16, arp: [0, -5] },
  buzz: { wave: 'saw', freq: 110, dur: .25, vol: .18 },
  horn: { wave: 'saw', freq: 349, dur: .5, vol: .18 },
  call: { wave: 'pulse', freq: 'A4', to: 'A5', dur: .18, vol: .2 },
  callMiss: { wave: 'noise', dur: .08, vol: .08 },
  good: { wave: 'triangle', freq: 'C5', dur: .15, vol: .18, arp: [0, 4, 7, 12] },
  bad: { wave: 'saw', freq: 'C4', to: 'Db4', dur: .5, vol: .2 },
  stamp: { wave: 'noise', dur: .15, vol: .3 },
  select: { wave: 'square', freq: 660, dur: .05, vol: .1 },
  confirm: { wave: 'triangle', freq: 'A5', dur: .1, vol: .15, arp: [0, 7] },
  cancel: { wave: 'triangle', freq: 'G4', dur: .1, vol: .12, arp: [0, -5] },
  tick: { wave: 'square', freq: 1400, dur: .02, vol: .08 },
  slip: { wave: 'saw', freq: 900, to: 1400, dur: .35, vol: .1 },
  hurt: { wave: 'saw', freq: 300, to: 60, dur: .5, vol: .25 },
  pilot: { wave: 'square', freq: 1200, dur: .04, vol: .1 },
  perfect: { wave: 'triangle', freq: 'C5', dur: .12, vol: .2, arp: [0, 4, 7, 12, 16] },
  overrun: { wave: 'saw', freq: 'Eb4', dur: .6, vol: .2, arp: [0, 1] },
  gate: { wave: 'square', freq: 700, to: 820, dur: .4, vol: .08 },
  door: { wave: 'noise', dur: .2, vol: .12 }
};

/** the departure melodies, one per station (section 5.8): [note, beats]; '.' is a rest */
DH.MELODIES = {
  akari: [['C5', 1], ['E5', 1], ['G5', 1], ['C6', 2], ['G5', 1], ['E5', 1], ['G5', 2], ['C6', 4]],
  hanabatake: [['E5', .5], ['G5', .5], ['A5', 1], ['G5', .5], ['E5', .5], ['C5', 1], ['D5', .5], ['E5', .5], ['G5', 2], ['E5', 2]],
  kujira: [['C5', 1], ['D5', 1], ['E5', 2], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 3]],
  minato: [['G4', .5], ['C5', .5], ['E5', 1], ['G5', .5], ['E5', .5], ['C5', 1], ['G4', 1], ['C5', 2]],
  todai: [['A5', 1], ['E6', .5], ['C6', .5], ['A5', 1], ['E5', 1], ['A5', 2]],
  okiku: [['D5', 1], ['E5', 1], ['G5', 1], ['A5', 1], ['G5', 1], ['E5', 1], ['D5', 2]],
  yuhi: [['G5', 1], ['F5', 1], ['E5', 1], ['D5', 1], ['C5', 2], ['D5', 1], ['C5', 3]],
  shotengai: [['C5', .5], ['E5', .5], ['G5', .5], ['E5', .5], ['A5', .5], ['G5', .5], ['E5', 1], ['C5', 1], ['G5', 2]],
  daigaku: [['E5', 1], ['E5', 1], ['F5', 1], ['G5', 1], ['G5', 1], ['F5', 1], ['E5', 2]],
  koen: [['A5', .5], ['G5', .5], ['E5', 1], ['G5', .5], ['A5', .5], ['C6', 1], ['A5', 2]],
  hoshimi: [['E6', .5], ['B5', .5], ['E6', .5], ['G6', .5], ['E6', 1], ['D6', .5], ['B5', .5], ['E5', 2]],
  kawasemi: [['G5', .25], ['A5', .25], ['B5', .25], ['C6', .25], ['B5', .5], ['G5', .5], ['E5', 1], ['G5', 2]]
};

/** the sound's per-station melody map (a station's melody name is its id, or 'todai' by default) */
DH.stationMelody = (id) => (DH.MELODIES[id] ? id : 'todai');
})();
