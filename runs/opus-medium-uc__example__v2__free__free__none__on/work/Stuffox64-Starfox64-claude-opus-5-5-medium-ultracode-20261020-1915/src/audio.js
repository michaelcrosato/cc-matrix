// Web Audio: fully synthesized SFX, music sequencer and "plush-speak" voice blips.
import { settings } from './settings.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- Songs (data-driven so designers can add tracks) ----------
// chords: one per bar [rootMidi, 'maj'|'min'|'sus'|'dim']; lead: [bar, step, midi, lenSteps]
const Q = { maj: [0, 4, 7], min: [0, 3, 7], sus: [0, 5, 7], dim: [0, 3, 6], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10] };
const SONGS = {
  title: {
    bpm: 112, swing: 0, chords: [[50, 'maj'], [55, 'maj'], [57, 'sus'], [57, 'maj'], [47, 'min'], [55, 'maj'], [52, 'min'], [57, 'maj']],
    kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'x..x..x.x..x..x.', arp: 'x.x.x.x.x.x.x.x.', pad: true,
    lead: [[0, 0, 74, 6], [0, 6, 76, 2], [0, 8, 78, 8], [1, 0, 79, 4], [1, 4, 78, 4], [1, 8, 76, 8], [2, 0, 74, 6], [2, 6, 76, 2], [2, 8, 81, 8], [3, 0, 79, 12],
      [4, 0, 78, 6], [4, 6, 76, 2], [4, 8, 74, 8], [5, 0, 74, 4], [5, 4, 76, 4], [5, 8, 79, 8], [6, 0, 78, 6], [6, 6, 76, 2], [6, 8, 74, 8], [7, 0, 76, 14]],
  },
  stage1: {
    bpm: 148, chords: [[50, 'maj'], [50, 'maj'], [48, 'maj'], [55, 'maj'], [50, 'maj'], [50, 'maj'], [53, 'maj'], [55, 'maj'],
      [47, 'min'], [45, 'maj'], [43, 'maj'], [45, 'maj'], [47, 'min'], [45, 'maj'], [43, 'maj'], [45, 'sus']],
    kick: 'x.....x...x.....', snare: '....x.......x..x', hat: 'xxx.xxx.xxx.xxx.', bass: 'x.xx.xx.x.xx.xx.', arp: 'x.xxx.xxx.xxx.xx',
    lead: [[0, 0, 74, 3], [0, 3, 74, 3], [0, 6, 74, 2], [0, 8, 79, 8], [1, 0, 81, 4], [1, 4, 79, 2], [1, 6, 78, 2], [1, 8, 76, 8],
      [2, 0, 72, 3], [2, 3, 72, 3], [2, 6, 72, 2], [2, 8, 76, 8], [3, 0, 79, 6], [3, 6, 78, 2], [3, 8, 79, 8],
      [4, 0, 74, 3], [4, 3, 74, 3], [4, 6, 74, 2], [4, 8, 79, 8], [5, 0, 81, 4], [5, 4, 83, 4], [5, 8, 86, 8],
      [6, 0, 84, 4], [6, 4, 81, 4], [6, 8, 77, 8], [7, 0, 79, 16],
      [8, 0, 83, 6], [8, 6, 81, 2], [8, 8, 78, 8], [9, 0, 76, 6], [9, 6, 78, 2], [9, 8, 81, 8], [10, 0, 79, 6], [10, 6, 78, 2], [10, 8, 74, 8], [11, 0, 76, 16],
      [12, 0, 83, 6], [12, 6, 81, 2], [12, 8, 86, 8], [13, 0, 85, 6], [13, 6, 81, 2], [13, 8, 76, 8], [14, 0, 79, 8], [14, 8, 81, 8], [15, 0, 81, 16]],
  },
  canyon: {
    bpm: 156, chords: [[45, 'min'], [45, 'min'], [41, 'maj'], [43, 'maj'], [45, 'min'], [48, 'maj'], [43, 'maj'], [44, 'dim']],
    kick: 'x..x..x...x..x..', snare: '....x.......x.x.', hat: 'x.xxx.xxx.xxx.xx', bass: 'xx.xx.xx.xx.x.xx', arp: 'xxxxxxxxxxxxxxxx',
    lead: [[0, 0, 69, 4], [0, 4, 72, 4], [0, 8, 76, 8], [1, 0, 74, 4], [1, 4, 72, 4], [1, 8, 71, 8], [2, 0, 72, 6], [2, 6, 69, 2], [2, 8, 65, 8], [3, 0, 67, 16],
      [4, 0, 76, 4], [4, 4, 79, 4], [4, 8, 81, 8], [5, 0, 79, 4], [5, 4, 76, 4], [5, 8, 72, 8], [6, 0, 74, 8], [6, 8, 71, 8], [7, 0, 68, 16]],
  },
  boss: {
    bpm: 164, chords: [[40, 'min'], [40, 'min'], [41, 'maj'], [40, 'min'], [38, 'maj'], [40, 'min'], [43, 'maj'], [39, 'dim']],
    kick: 'x.x...x.x.x...x.', snare: '....x..x....x..x', hat: 'xxxxxxxxxxxxxxxx', bass: 'xxxxxxxxxxxxxxxx', arp: 'x.xxx.xxx.xxx.xx',
    lead: [[0, 0, 64, 2], [0, 2, 67, 2], [0, 4, 71, 4], [0, 8, 70, 4], [0, 12, 67, 4], [1, 0, 64, 8], [1, 8, 76, 8], [2, 0, 77, 4], [2, 4, 76, 4], [2, 8, 72, 8], [3, 0, 71, 16],
      [4, 0, 74, 4], [4, 4, 76, 4], [4, 8, 78, 8], [5, 0, 79, 8], [5, 8, 76, 8], [6, 0, 79, 4], [6, 4, 83, 4], [6, 8, 81, 8], [7, 0, 78, 16]],
  },
  space: {
    bpm: 138, chords: [[45, 'min7'], [43, 'maj7'], [41, 'maj7'], [40, 'min7'], [45, 'min7'], [43, 'maj7'], [46, 'maj'], [44, 'maj']],
    kick: 'x.......x..x....', snare: '....x.......x...', hat: '.xx.xx.x.xx.xx.x', bass: 'x..x..x...x..x..', arp: 'x.xx.xx.x.xx.xx.', pad: true,
    lead: [[0, 0, 76, 8], [0, 8, 72, 4], [0, 12, 74, 4], [1, 0, 71, 12], [2, 0, 72, 4], [2, 4, 76, 4], [2, 8, 81, 8], [3, 0, 79, 16],
      [4, 0, 76, 8], [4, 8, 84, 8], [5, 0, 83, 8], [5, 8, 79, 8], [6, 0, 82, 8], [6, 8, 77, 8], [7, 0, 80, 16]],
  },
  clear: {
    bpm: 132, loop: false, chords: [[50, 'maj'], [55, 'maj'], [57, 'maj'], [62, 'maj']],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: 'x...x...x...x...', arp: 'xxxxxxxxxxxxxxxx',
    lead: [[0, 0, 74, 2], [0, 2, 74, 2], [0, 4, 74, 2], [0, 6, 74, 6], [0, 12, 70, 4], [1, 0, 72, 4], [1, 4, 74, 6], [1, 10, 72, 2], [1, 12, 74, 4], [2, 0, 78, 16], [3, 0, 86, 16]],
  },
  gameover: {
    bpm: 80, loop: false, chords: [[45, 'min'], [41, 'maj'], [43, 'min'], [40, 'min']],
    kick: 'x...............', snare: '................', hat: '........x.......', bass: 'x.......x.......', arp: 'x...x...x...x...', pad: true,
    lead: [[0, 0, 72, 8], [0, 8, 71, 8], [1, 0, 69, 16], [2, 0, 67, 8], [2, 8, 65, 8], [3, 0, 64, 16]],
  },
};

const VOICES = {
  tod: { base: 260, range: 90, wave: 'square' },
  bramble: { base: 120, range: 50, wave: 'sawtooth' },
  pippa: { base: 420, range: 160, wave: 'triangle' },
  gizmo: { base: 330, range: 220, wave: 'square' },
  woolsey: { base: 170, range: 60, wave: 'triangle' },
  ratchet: { base: 210, range: 140, wave: 'sawtooth' },
  vex: { base: 190, range: 80, wave: 'sawtooth' },
  snarl: { base: 150, range: 120, wave: 'square' },
  quill: { base: 300, range: 70, wave: 'sawtooth' },
};

export class Audio {
  constructor() {
    this.ctx = null; this.song = null; this.songName = null;
    this.chargeNode = null; this.alarmT = 0;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    this.voiceBus = ctx.createGain(); this.voiceBus.connect(this.master);
    // shared reverb-ish delay for music
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.27;
    const fb = ctx.createGain(); fb.gain.value = 0.25;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    delay.connect(fb).connect(delay); delay.connect(wet).connect(this.musicBus);
    this.musicDelay = delay;
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.timer = setInterval(() => this.schedule(), 25);
    if (this.pending) { const p = this.pending; this.pending = null; this.playSong(p); }
  }
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.master;
    this.musicBus.gain.value = settings.music * 0.55;
    this.sfxBus.gain.value = settings.sfx;
    this.voiceBus.gain.value = settings.voice * 0.6;
  }
  // ---------- music ----------
  playSong(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.songName === name && this.song) return;
    this.stopSong();
    const s = SONGS[name]; if (!s) return;
    this.songName = name;
    this.song = { s, step: 0, next: this.ctx.currentTime + 0.08, gain: this.ctx.createGain() };
    this.song.gain.gain.value = 1;
    this.song.gain.connect(this.musicBus);
    this.song.gain.connect(this.musicDelay);
  }
  stopSong(fade = 0.4) {
    if (!this.song) { this.songName = null; return; }
    const g = this.song.gain, t = this.ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => g.disconnect(), fade * 1000 + 100);
    this.song = null; this.songName = null;
  }
  schedule() {
    const sg = this.song; if (!sg) return;
    const ctx = this.ctx, s = sg.s, stepDur = 60 / s.bpm / 4;
    const totalSteps = s.chords.length * 16;
    while (sg.next < ctx.currentTime + 0.12) {
      if (sg.step >= totalSteps) { if (s.loop === false) { this.song = null; return; } sg.step = 0; }
      const bar = Math.floor(sg.step / 16), st = sg.step % 16, t = sg.next;
      const [root, q] = s.chords[bar];
      const notes = Q[q];
      if (s.kick[st] === 'x') this.kick(t, sg.gain);
      if (s.snare[st] === 'x') this.snare(t, sg.gain);
      if (s.hat[st] === 'x') this.hat(t, sg.gain, st % 4 === 2 ? 0.07 : 0.04);
      if (s.bass[st] === 'x') this.tone(t, mtof(root - 12 + (st % 8 === 6 ? 12 : 0)), stepDur * 1.6, 'sawtooth', 0.16, sg.gain, 600);
      if (s.arp[st] === 'x') { const n = notes[(st >> 1) % notes.length] + root + 24; this.tone(t, mtof(n), stepDur * 0.9, 'square', 0.035, sg.gain, 2600); }
      if (s.pad && st === 0) for (const n of notes) this.tone(t, mtof(root + 12 + n), stepDur * 15, 'triangle', 0.05, sg.gain, 1400, 0.4);
      for (const L of s.lead) if (L[0] === bar && L[1] === st) {
        this.tone(t, mtof(L[2]), stepDur * L[3] * 0.95, 'square', 0.07, sg.gain, 3200, 0.01, true);
        this.tone(t, mtof(L[2] + 0.08), stepDur * L[3] * 0.95, 'sawtooth', 0.03, sg.gain, 2000, 0.01, true);
      }
      sg.step++; sg.next += stepDur * (s.swing && st % 2 === 0 ? 1 + s.swing : 1);
    }
  }
  tone(t, f, dur, type, vol, dest, cutoff = 2000, atk = 0.005, vib = false) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    if (vib && dur > 0.25) {
      const l = ctx.createOscillator(); l.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = f * 0.012;
      l.connect(lg).connect(o.frequency); l.start(t + 0.15); l.stop(t + dur + 0.1);
    }
    const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + Math.max(atk, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.05);
    o.connect(flt).connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.1);
  }
  kick(t, dest) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.22);
  }
  snare(t, dest) {
    const ctx = this.ctx, n = ctx.createBufferSource(); n.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(f).connect(g).connect(dest); n.start(t, Math.random()); n.stop(t + 0.16);
  }
  hat(t, dest, v) {
    const ctx = this.ctx, n = ctx.createBufferSource(); n.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(f).connect(g).connect(dest); n.start(t, Math.random()); n.stop(t + 0.06);
  }
  // ---------- SFX ----------
  _noise(dur, type, freq, vol, freqEnd, q = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f).connect(g).connect(this.sfxBus); n.start(t, Math.random()); n.stop(t + dur + 0.02);
  }
  _sweep(f0, f1, dur, type, vol, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  laser(level = 0) {
    if (level >= 2) { this._sweep(1800, 300, 0.14, 'sawtooth', 0.09); this._sweep(2400, 500, 0.1, 'square', 0.04); }
    else if (level === 1) { this._sweep(1500, 260, 0.12, 'square', 0.08); }
    else this._sweep(1300, 240, 0.11, 'square', 0.07);
  }
  enemyShot() { this._sweep(600, 200, 0.15, 'triangle', 0.05); }
  hit() { this._noise(0.08, 'bandpass', 2500, 0.25); this._sweep(500, 120, 0.08, 'square', 0.06); }
  explode(size = 1) {
    this._noise(0.4 + size * 0.5, 'lowpass', 2200, 0.45 * Math.min(1.5, size), 80);
    this._sweep(160, 30, 0.35 + size * 0.3, 'sine', 0.4 * Math.min(1.4, size));
  }
  bomb() { this._noise(1.4, 'lowpass', 3000, 0.7, 40); this._sweep(90, 20, 1.2, 'sine', 0.7); }
  bombLaunch() { this._sweep(200, 900, 0.4, 'sawtooth', 0.08); }
  damage() { this._noise(0.25, 'bandpass', 900, 0.6, 200, 2); this._sweep(220, 60, 0.3, 'square', 0.18); }
  roll() { this._noise(0.45, 'bandpass', 600, 0.25, 3000, 3); }
  deflect() { this._sweep(3000, 4500, 0.06, 'square', 0.06); }
  boost() { this._noise(0.6, 'bandpass', 400, 0.3, 1800, 2); }
  brake() { this._noise(0.5, 'bandpass', 1500, 0.2, 300, 2); }
  ring(gold = false) {
    const base = gold ? 880 : 660;
    [0, 4, 7, 12].forEach((s, i) => this._sweep(base * Math.pow(2, s / 12), base * Math.pow(2, s / 12), 0.15, 'triangle', 0.12, i * 0.05));
  }
  powerup() { [0, 5, 7, 12, 16, 19].forEach((s, i) => this._sweep(520 * Math.pow(2, s / 12), 520 * Math.pow(2, s / 12) * 1.01, 0.09, 'square', 0.08, i * 0.045)); }
  lock() { this._sweep(1800, 1800, 0.05, 'square', 0.06); this._sweep(2400, 2400, 0.05, 'square', 0.06, 0.06); }
  chargeStart() {
    if (!this.ctx || this.chargeNode) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(120, ctx.currentTime); o.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.6);
    g.gain.value = 0.03; o.connect(g).connect(this.sfxBus); o.start();
    this.chargeNode = { o, g };
  }
  chargeStop() { if (this.chargeNode) { const { o, g } = this.chargeNode; g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02); o.stop(this.ctx.currentTime + 0.1); this.chargeNode = null; } }
  chargeShot() { this._sweep(400, 1600, 0.25, 'sawtooth', 0.12); this._noise(0.3, 'highpass', 1500, 0.15); }
  alarm() { this._sweep(880, 880, 0.12, 'square', 0.06); this._sweep(660, 660, 0.12, 'square', 0.06, 0.14); }
  menuMove() { this._sweep(900, 1000, 0.04, 'square', 0.04); }
  menuOk() { this._sweep(700, 1400, 0.1, 'square', 0.07); }
  menuBack() { this._sweep(800, 400, 0.1, 'square', 0.06); }
  checkpoint() { [0, 7, 12, 19, 24].forEach((s, i) => this._sweep(440 * Math.pow(2, s / 12), 440 * Math.pow(2, s / 12), 0.12, 'triangle', 0.12, i * 0.07)); }
  warning() { for (let i = 0; i < 3; i++) { this._sweep(440, 440, 0.25, 'sawtooth', 0.08, i * 0.5); this._sweep(330, 330, 0.25, 'sawtooth', 0.08, i * 0.5 + 0.25); } }
  thud() { this._noise(0.5, 'lowpass', 400, 0.6, 60); }
  windup() { for (let i = 0; i < 8; i++) this._noise(0.03, 'bandpass', 3500, 0.2, 2000, 6); }
  // plush-speak: gibberish blips per character, like classic radio chatter
  voice(who, text) {
    if (!this.ctx) return;
    const v = VOICES[who] || VOICES.tod;
    const ctx = this.ctx; let t = ctx.currentTime + 0.02;
    const syll = Math.min(14, Math.max(3, Math.round(text.length / 5)));
    let seed = 0; for (const c of text) seed = (seed * 31 + c.charCodeAt(0)) % 9973;
    for (let i = 0; i < syll; i++) {
      seed = (seed * 7919 + 13) % 9973;
      const f = v.base + (seed % 100) / 100 * v.range;
      const d = 0.06 + (seed % 7) * 0.008;
      const o = ctx.createOscillator(); o.type = v.wave;
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (i === syll - 1 ? 0.8 : 1.08), t + d);
      const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1400; flt.Q.value = 1.2;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(flt).connect(g).connect(this.voiceBus); o.start(t); o.stop(t + d + 0.02);
      t += d + 0.025;
    }
    this._noise(0.05, 'bandpass', 3000, 0.08); // radio click
  }
}
