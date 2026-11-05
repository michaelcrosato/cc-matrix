// All sound is code: songs in the engine's notation, stings, sound effects, a Web Audio car engine (two detuned
// oscillators and a sub through a shaper and a lowpass, a gearbox), tyre and wind noise, and gibberish voices
// (Animalese: a syllable per letter through vowel formants). Silent headless, honours the volume and mute.
const E = globalThis.My3D2dge;
const rep = (s, n) => Array(n).fill(s).join(' | ');
export const SONGS = {
  title: { bpm: 128, steps: 4, tracks: [   // Crack the Clock: electro-funk, slap bass, a square hook
    { name: 'lead', wave: 'square', vol: .11, notes: 'E5 . G5 . A5 - G5 . E5 . D5 . E5 - - . | . . G5 . A5 . C6 . B5 - A5 . G5 - - . | E5 . G5 . A5 - G5 . E5 . D5 . C5 - - . | D5 . E5 . G5 . E5 . D5 - C5 . A4 - - .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'A2 . A3 A2 . A2 G2 . A2 . A3 . G2 . E2 . | F2 . F3 F2 . F2 E2 . F2 . F3 . G2 . G3 . | A2 . A3 A2 . A2 G2 . A2 . A3 . G2 . E2 . | D2 . D3 D2 . D2 E2 . G2 . G3 . A2 . E2 .' },
    { name: 'chords', wave: 'pulse', vol: .05, notes: '. . A4 . . . C5 . . . A4 . . . E5 . | . . F4 . . . A4 . . . C5 . . . A4 . | . . A4 . . . C5 . . . A4 . . . E5 . | . . D4 . . . F4 . . . G4 . . . B4 .' },
    { name: 'drums', wave: 'drums', vol: .5, notes: rep('k . h . s . h k . k h . s . h h', 4) }] },
  dustbowl: { bpm: 140, steps: 4, tracks: [   // Heat Shimmer: desert surf electro, E minor pentatonic
    { name: 'lead', wave: 'pulse12', vol: .1, on: false, notes: 'E5 - - G5 . A5 . B5 - - A5 . G5 . E5 . | D5 - - E5 . G5 . E5 - - D5 . B4 . . . | E5 - - G5 . A5 . B5 - - D6 . B5 . A5 . | G5 - - E5 . D5 . E5 - - - . . . . .' },
    { name: 'bass', wave: 'saw', vol: .14, notes: 'E2 E2 . E3 E2 . B2 . E2 E2 . E3 D3 . B2 . | C2 C2 . C3 C2 . G2 . D2 D2 . D3 C3 . A2 . | E2 E2 . E3 E2 . B2 . E2 E2 . E3 D3 . B2 . | A2 A2 . A3 B2 . B3 . E2 . E3 . B2 . E2 .' },
    { name: 'twang', wave: 'triangle', vol: .12, notes: 'B4 . E5 . B4 . E5 . B4 . E5 . G5 . E5 . | G4 . C5 . G4 . C5 . A4 . D5 . A4 . D5 . | B4 . E5 . B4 . E5 . B4 . E5 . G5 . E5 . | A4 . C5 . B4 . D5 . B4 . E5 . G5 . B5 .' },
    { name: 'drums', wave: 'drums', vol: .5, on: false, notes: rep('k . h k s . h . k . h k s . h o', 4) }] },
  hedgerow: { bpm: 126, steps: 4, tracks: [   // Hedge Fund: bouncy Euro-house, offbeat hats, major
    { name: 'lead', wave: 'square', vol: .09, on: false, notes: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - . | E5 . G5 . C6 . G5 . A5 . G5 . E5 - - . | C5 . E5 . G5 . E5 . F5 . A5 . C6 - - . | B5 . G5 . D5 . G5 . C5 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . C3 . F2 . F2 . F2 . F2 . | A2 . A2 . A2 . A2 . G2 . G2 . G2 . G2 . | C3 . C3 . C3 . C3 . F2 . F2 . F2 . F2 . | G2 . G2 . G2 . G2 . C3 . C3 . G2 . G2 .' },
    { name: 'stab', wave: 'pulse', vol: .05, notes: '. . E4 . . . E4 . . . A4 . . . A4 . | . . C4 . . . C4 . . . B4 . . . B4 . | . . E4 . . . E4 . . . A4 . . . A4 . | . . D4 . . . D4 . . . E4 . . . E4 .' },
    { name: 'drums', wave: 'drums', vol: .5, on: false, notes: rep('k . o . k . o . k . o . k . o h', 4) }] },
  frostpeak: { bpm: 136, steps: 4, tracks: [   // Thin Ice: airy trance, saw arpeggios, a sine pad
    { name: 'arp', wave: 'saw', vol: .06, notes: 'A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 E5 C5 A4 C5 E5 C5 | F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 C5 A4 F4 A4 C5 A4 | C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 G5 E5 C5 E5 G5 E5 | G4 B4 D5 G5 D5 B4 G4 B4 D5 G5 D5 B4 G4 B4 D5 B4' },
    { name: 'pad', wave: 'sine', vol: .16, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - - | C4 - - - - - - - - - - - - - - - | G3 - - - - - - - - - - - - - - -' },
    { name: 'lead', wave: 'square', vol: .07, on: false, notes: 'E5 - - - D5 - C5 - D5 - - - E5 - - - | C5 - - - A4 - - - C5 - D5 - C5 - - - | E5 - - - G5 - E5 - D5 - - - C5 - - - | B4 - - - D5 - - - G5 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .45, on: false, notes: rep('k . h . k . h . k . h . k . h h', 4) }] },
  editor: { bpm: 96, steps: 4, tracks: [   // Blueprint: chill lo-fi
    { name: 'keys', wave: 'triangle', vol: .14, notes: 'E4 . G4 . B4 . D5 . . . B4 . G4 . . . | C4 . E4 . G4 . B4 . . . G4 . E4 . . . | D4 . F#4 . A4 . C5 . . . A4 . F#4 . . . | B3 . D4 . F#4 . A4 . . . F#4 . D4 . . .' },
    { name: 'bass', wave: 'sine', vol: .25, notes: 'E2 - - - . . . . E2 . . . . . . . | C2 - - - . . . . C2 . . . . . . . | D2 - - - . . . . D2 . . . . . . . | B1 - - - . . . . B1 . . . . . . .' },
    { name: 'drums', wave: 'drums', vol: .3, notes: rep('k . . . s . . h . k . . s . h .', 4) }] },
  survival: { bpm: 170, steps: 4, tracks: [   // Ghost Guild: tense half-time drum and bass
    { name: 'bass', wave: 'saw', vol: .13, notes: 'D2 - - . D2 . . . F2 - . . E2 - . . | D2 - - . D2 . . . A1 - . . C2 - . . | D2 - - . D2 . . . F2 - . . G2 - . . | A2 - - . G2 . . . F2 - . . E2 - . .' },
    { name: 'lead', wave: 'pulse12', vol: .07, notes: 'D5 . . . F5 . . . A5 - - - G5 . F5 . | E5 . . . D5 . . . C5 - - - A4 . . . | D5 . . . F5 . . . A5 - - - C6 . A5 . | G5 . . . F5 . . . E5 - - - C#5 . . .' },
    { name: 'drums', wave: 'drums', vol: .55, notes: rep('k . . . . . . . s . . k . k . . | k . h . . . k . s . h . . . h .', 2) }] },
  garage: { bpm: 110, steps: 4, tracks: [   // Paint Job: jazzy chiptune
    { name: 'lead', wave: 'square', vol: .09, notes: 'F5 . A5 . C6 - A5 . G5 . F5 . D5 - - . | E5 . G5 . Bb5 - G5 . F5 . E5 . C5 - - . | F5 . A5 . C6 - D6 . C6 . A5 . F5 - - . | G5 . E5 . C5 - E5 . F5 - - - . . . .' },
    { name: 'bass', wave: 'triangle', vol: .28, notes: 'F2 . A2 . C3 . A2 . D2 . F2 . A2 . F2 . | C2 . E2 . G2 . Bb2 . C2 . E2 . G2 . E2 . | F2 . A2 . C3 . A2 . D2 . F2 . A2 . F2 . | G2 . Bb2 . C3 . E2 . F2 . C2 . F2 . . .' },
    { name: 'drums', wave: 'drums', vol: .35, notes: rep('k . h . s . h h k . h . s . h .', 4) }] },
  victory: { bpm: 120, steps: 4, tracks: [   // Victory Lap: an anthem
    { wave: 'square', vol: .11, notes: 'C5 - - G4 C5 - E5 - G5 - - - E5 - C5 - | F5 - - E5 D5 - C5 - D5 - - - G4 - - - | C5 - - G4 C5 - E5 - G5 - - - C6 - B5 - | A5 - G5 - F5 - E5 - D5 - - - C5 - - -' },
    { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . C3 . A2 . A2 . A2 . A2 . | F2 . F2 . F2 . F2 . G2 . G2 . G2 . G2 . | C3 . C3 . C3 . C3 . E2 . E2 . E2 . E2 . | F2 . F2 . G2 . G2 . C3 . C3 . C3 . . .' },
    { wave: 'drums', vol: .5, notes: rep('k . h . s . h . k k h . s . h c', 4) }] }
};
export const STINGS = {
  count: { bpm: 240, steps: 1, tracks: [{ wave: 'square', vol: .2, notes: 'A4 .' }] },
  go: { bpm: 240, steps: 1, tracks: [{ wave: 'square', vol: .22, notes: 'A5 - - .' }, { wave: 'triangle', vol: .3, notes: 'A3 - - .' }] },
  cp: { bpm: 480, steps: 1, tracks: [{ wave: 'square', vol: .16, notes: 'E6 A6 - .' }] },
  record: { bpm: 480, steps: 1, tracks: [{ wave: 'square', vol: .16, notes: 'C6 E6 G6 C7 - - .' }] },
  finish: { bpm: 300, steps: 1, tracks: [{ wave: 'square', vol: .16, notes: 'G5 C6 E6 G6 - - - .' }, { wave: 'triangle', vol: .3, notes: 'C4 - - C4 - - - .' }, { wave: 'drums', vol: .5, notes: 'k . k c . . . .' }] },
  bronze: { bpm: 300, steps: 1, tracks: [{ wave: 'triangle', vol: .3, notes: 'C5 E5 G5 - - .' }] },
  silver: { bpm: 300, steps: 1, tracks: [{ wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - .' }] },
  gold: { bpm: 360, steps: 1, tracks: [{ wave: 'square', vol: .15, notes: 'C5 E5 G5 C6 E6 G6 C7 - - .' }, { wave: 'drums', vol: .5, notes: '. . . . . . c . . .' }] },
  author: { bpm: 360, steps: 1, tracks: [{ wave: 'square', vol: .15, notes: 'C5 E5 G5 C6 E6 G6 C7 G6 C7 E7 - - .' }, { wave: 'triangle', vol: .3, notes: 'C4 - - - G3 - - - C4 - - - .' }, { wave: 'drums', vol: .5, notes: 'k . . . k . . . c . . . .' }] },
  unlock: { bpm: 360, steps: 1, tracks: [{ wave: 'square', vol: .16, notes: 'G4 C5 E5 G5 - C6 - - .' }] },
  out: { bpm: 200, steps: 1, tracks: [{ wave: 'saw', vol: .14, notes: 'E4 D#4 D4 C#4 - - - .' }] },
  rankup: { bpm: 360, steps: 1, tracks: [{ wave: 'pulse', vol: .15, notes: 'C5 D5 E5 G5 C6 - - .' }] }
};
const SFX = {
  ui_move: { wave: 'square', freq: 880, dur: .03, vol: .08 }, ui_ok: { wave: 'square', freq: 660, to: 1320, dur: .07, vol: .12 }, ui_back: { wave: 'square', freq: 660, to: 330, dur: .07, vol: .1 },
  ui_err: { wave: 'saw', freq: 120, dur: .18, vol: .15, vib: [30, .2] }, coin: { wave: 'square', freq: 1320, to: 1760, dur: .05, vol: .08 },
  boost: { wave: 'noise', freq: 400, to: 2400, dur: .45, vol: .22 }, land: { wave: 'noise', freq: 300, to: 60, dur: .2, vol: .3 }, crash: { wave: 'noise', freq: 900, to: 80, dur: .4, vol: .35 },
  respawn: { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .04, dur: .2, vol: .2 }, horn: [{ wave: 'square', freq: 440, dur: .14, vol: .14 }, { wave: 'square', freq: 554, dur: .14, vol: .1 }],
  place: { wave: 'square', freq: 180, to: 90, dur: .08, vol: .2 }, remove: { wave: 'square', freq: 400, to: 900, dur: .06, vol: .14 }, rotate: { wave: 'triangle', freq: 900, dur: .04, vol: .14 }, level: { wave: 'triangle', freq: 600, to: 900, dur: .05, vol: .12 },
  splash: { wave: 'noise', freq: 2000, to: 200, dur: .5, vol: .3 }, whoosh: { wave: 'noise', freq: 600, to: 1600, dur: .25, vol: .12 }, click: { wave: 'square', freq: 1600, dur: .02, vol: .1 },
  flop: { wave: 'triangle', freq: 300, to: 120, dur: .3, vol: .2 }
};
export function defineSfx(audio) { for (const k in SFX) audio.define(k, SFX[k]); }

/** the car's continuous sound (Web Audio nodes made once per voice) */
export class CarSound {
  constructor(game, carId) { this.game = game; this.carId = carId; this.nodes = null; this.gear = 1; this.shift = 0; }
  _make() {
    const A = this.game.audio, c = A.ctx; if (!c || !A._sfxBus) return null;
    const out = c.createGain(); out.gain.value = 0; out.connect(A._sfxBus);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
    const sh = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); } sh.curve = curve;
    const pre = c.createGain(); pre.gain.value = .5; pre.connect(sh); sh.connect(lp); lp.connect(out);
    const wave = this.carId === 'pebble' ? 'square' : 'sawtooth';
    const o1 = c.createOscillator(), o2 = c.createOscillator(), sub = c.createOscillator();
    o1.type = wave; o2.type = wave; sub.type = 'triangle'; o2.detune.value = 18;
    const g1 = c.createGain(), g2 = c.createGain(), gs = c.createGain(); g1.gain.value = .35; g2.gain.value = .25; gs.gain.value = this.carId === 'coyote' ? .6 : .35;
    o1.connect(g1); o2.connect(g2); sub.connect(gs); g1.connect(pre); g2.connect(pre); gs.connect(pre);
    // noise: tyres and wind
    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate), d = buf.getChannelData(0); let sd = 12345; for (let i = 0; i < d.length; i++) { sd = (sd * 1103515245 + 12345) >>> 0; d[i] = sd / 2147483648 - 1; }
    const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true;
    const tyre = c.createBiquadFilter(); tyre.type = 'bandpass'; tyre.frequency.value = 1800; tyre.Q.value = 4; const tg = c.createGain(); tg.gain.value = 0;
    const wind = c.createBiquadFilter(); wind.type = 'lowpass'; wind.frequency.value = 500; const wg = c.createGain(); wg.gain.value = 0;
    ns.connect(tyre); tyre.connect(tg); tg.connect(out); ns.connect(wind); wind.connect(wg); wg.connect(out);
    const t = c.currentTime; o1.start(t); o2.start(t); sub.start(t); ns.start(t);
    return (this.nodes = { c, out, lp, o1, o2, sub, tyre, tg, wg, all: [o1, o2, sub, ns] });
  }
  /** each frame: speed (m/s), throttle 0..1, slide (m/s), surface, on (audible) */
  update(dt, s) {
    const A = this.game.audio; if (this.game.headless || !A.ctx) return;
    const N = this.nodes || this._make(); if (!N) return;
    const kmh = s.speed * 3.6, bands = [0, 45, 85, 125, 165, 210, 999];
    let gear = 1; while (gear < 6 && kmh > bands[gear]) gear++;
    if (gear !== this.gear) { this.shift = .07; this.gear = gear; }
    this.shift = Math.max(0, this.shift - dt);
    const lo = bands[gear - 1], hi = bands[gear], k = Math.min(1, Math.max(0, (kmh - lo) / Math.max(1, hi - lo)));
    const base = this.carId === 'coyote' ? 38 : this.carId === 'pebble' ? 55 : 32, red = base * 4.2;
    let rpm = base + k * (red - base) * (this.shift > 0 ? .7 : 1);
    if (!s.grounded) rpm = Math.min(red * 1.1, rpm + s.throttle * 30);
    if (s.held) rpm = base + s.throttle * (red - base) * .8;
    const t = N.c.currentTime, vol = s.on ? (.13 + s.throttle * .1) : 0;
    N.o1.frequency.setTargetAtTime(rpm, t, .03); N.o2.frequency.setTargetAtTime(rpm * 1.005, t, .03); N.sub.frequency.setTargetAtTime(rpm / 2, t, .03);
    N.lp.frequency.setTargetAtTime(500 + s.throttle * 1600 + k * 600, t, .05);
    N.out.gain.setTargetAtTime(vol, t, .05);
    const tyreF = { road: 1800, boost: 1800, dirt: 700, grass: 500, sand: 400, snow: 900, ice: 3200 }[s.surface] || 1500;
    N.tyre.frequency.setTargetAtTime(tyreF, t, .05);
    N.tg.gain.setTargetAtTime(s.on && s.grounded ? Math.min(.5, s.slide * .06 + (s.surface === 'dirt' || s.surface === 'sand' || s.surface === 'grass' ? s.speed * .006 : 0)) : 0, t, .05);
    N.wg.gain.setTargetAtTime(s.on ? Math.min(.35, s.speed * s.speed * .00012) : 0, t, .1);
  }
  stop() { if (!this.nodes) return; const t = this.nodes.c.currentTime; this.nodes.out.gain.setTargetAtTime(0, t, .03); }
  dispose() { if (!this.nodes) return; try { for (const n of this.nodes.all) n.stop(); this.nodes.out.disconnect(); } catch (e) { /* gone */ } this.nodes = null; }
}

/** gibberish voices: one syllable per letter, vowels through two band-pass formants */
export const VOICES = {
  coco: { wave: 'triangle', f: 330, ms: 55 }, drapeau: { wave: 'square', f: 200, ms: 65 }, tex: { wave: 'sawtooth', f: 240, ms: 58, q: 9 },
  grav: { wave: 'sine', f: 300, ms: 52 }, bobo: { wave: 'sawtooth', f: 120, ms: 80 }, crowd: { wave: 'triangle', f: 260, ms: 45 }, player: { wave: 'square', f: 280, ms: 60 }
};
const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 2300] };
export function babble(game, text, voice = 'coco', o = {}) {
  const A = game.audio; if (game.headless || !A.ctx || A.muted) return 0;
  const c = A.ctx, V = VOICES[voice] || VOICES.coco, vol = (o.vol ?? .16), out = c.createGain(); out.gain.value = vol; out.connect(A._sfxBus);
  let t = c.currentTime + .02; const str = String(text).toLowerCase().slice(0, 80), end = /[?]$/.test(str) ? 1.15 : .9;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === ' ') { t += .04; continue; } if (ch === ',') { t += .12; continue; } if (ch === '.' || ch === '!') { t += .2; continue; }
    if (!/[a-z0-9]/.test(ch)) continue;
    const h = ((ch.charCodeAt(0) * 2654435761) >>> 0) / 4294967296, prog = i / str.length, f = V.f * (1 + .15 * h) * (1 + (end - 1) * prog) * (o.pitch || 1);
    const dur = V.ms / 1000, F = FORM[ch];
    const osc = c.createOscillator(); osc.type = V.wave; osc.frequency.setValueAtTime(f, t); osc.frequency.linearRampToValueAtTime(f * (F ? 1.04 : .96), t + dur);
    const env = c.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + .008); env.gain.linearRampToValueAtTime(0, t + dur);
    if (F) { for (const fq of F) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = V.q || 6; osc.connect(bp); bp.connect(env); } const dry = c.createGain(); dry.gain.value = .25; osc.connect(dry); dry.connect(env); }
    else { const hp = c.createBiquadFilter(); hp.type = /[sfhz]/.test(ch) ? 'highpass' : 'lowpass'; hp.frequency.value = /[sfhz]/.test(ch) ? 2500 : 1400; osc.connect(hp); hp.connect(env); }
    env.connect(out); osc.start(t); osc.stop(t + dur + .02);
    t += dur;
  }
  return t - c.currentTime;
}
