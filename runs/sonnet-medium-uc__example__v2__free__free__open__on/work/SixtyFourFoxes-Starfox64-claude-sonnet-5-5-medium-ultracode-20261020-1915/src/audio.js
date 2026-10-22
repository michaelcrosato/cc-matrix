// Procedural Web Audio: SFX synth, radio voice blips and a step-sequenced music engine.
import { settings } from './settings.js';
import { rr } from './util.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

class AudioSystem {
  constructor() { this.ctx = null; this.musicName = null; this.seqTimer = null; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = (this.ctx = new C());
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.musicBus = ctx.createGain(); this.voiceBus = ctx.createGain();
    this.sfxBus.connect(this.master); this.musicBus.connect(this.master); this.voiceBus.connect(this.master);
    // reverb-ish delay for music
    this.delay = ctx.createDelay(1); this.delay.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.28; const dl = ctx.createGain(); dl.gain.value = 0.25;
    this.delay.connect(fb); fb.connect(this.delay); this.delay.connect(dl); dl.connect(this.musicBus);
    // noise buffer
    const len = ctx.sampleRate * 2; this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.pendingMusic) { const n = this.pendingMusic; this.pendingMusic = null; this.playMusic(n); }
  }
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.masterVol; this.sfxBus.gain.value = settings.sfxVol * 0.8;
    this.musicBus.gain.value = settings.musicVol * 0.5; this.voiceBus.gain.value = settings.voiceVol;
  }
  get t() { return this.ctx.currentTime; }
  // ---- primitives ----
  tone(type, f0, f1, dur, vol = 0.2, bus = this.sfxBus, delay = 0, attack = 0.005) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = this.t + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  }
  noise(dur, vol = 0.3, f0 = 4000, f1 = 400, type = 'lowpass', bus = this.sfxBus, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = this.t + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // ---- SFX ----
  sfx(name, p = 1) {
    if (!this.ctx) return;
    switch (name) {
      case 'laser': this.tone('square', 1500 * p, 300, 0.12, 0.09); this.tone('sawtooth', 900 * p, 200, 0.09, 0.05); break;
      case 'laser2': this.tone('square', 1900, 380, 0.14, 0.1); this.tone('square', 1300, 260, 0.14, 0.07, this.sfxBus, 0.02); break;
      case 'enemyLaser': this.tone('sawtooth', 500, 160, 0.18, 0.07); break;
      case 'charge': { const x = this.tone('sawtooth', 120, 900, 1.0, 0.07, this.sfxBus, 0, 0.3); break; }
      case 'lock': this.tone('square', 1200 + p * 120, 1200 + p * 120, 0.05, 0.08); break;
      case 'missile': this.tone('sawtooth', 300, 80, 0.5, 0.12); this.noise(0.5, 0.15, 3000, 300); break;
      case 'explode': this.noise(0.7, 0.5, 2500, 80); this.tone('sine', 140, 30, 0.6, 0.4); break;
      case 'bigExplode': this.noise(1.6, 0.8, 3000, 50); this.tone('sine', 100, 22, 1.4, 0.6); this.noise(0.8, 0.3, 800, 60, 'bandpass', this.sfxBus, 0.2); break;
      case 'hit': this.noise(0.12, 0.25, 6000, 1200, 'highpass'); this.tone('square', 220, 90, 0.15, 0.1); break;
      case 'hurt': this.noise(0.4, 0.55, 2000, 120); this.tone('sawtooth', 200, 50, 0.4, 0.3); break;
      case 'bomb': this.tone('sine', 60, 20, 1.8, 0.7); this.noise(1.8, 0.6, 1200, 40); this.tone('sawtooth', 800, 60, 1.0, 0.1); break;
      case 'roll': this.noise(0.5, 0.18, 800, 3500, 'bandpass'); this.tone('sine', 300, 700, 0.4, 0.05); break;
      case 'deflect': this.tone('triangle', 1800, 2600, 0.1, 0.1); this.tone('triangle', 1200, 3000, 0.12, 0.06, this.sfxBus, 0.04); break;
      case 'boost': this.noise(0.9, 0.3, 300, 4000, 'bandpass'); this.tone('sawtooth', 80, 240, 0.8, 0.1); break;
      case 'brake': this.noise(0.6, 0.2, 3000, 300, 'bandpass'); break;
      case 'pickup': [0, 4, 7, 12].forEach((s, i) => this.tone('square', mtof(72 + s), mtof(72 + s), 0.12, 0.08, this.sfxBus, i * 0.06)); break;
      case 'ring': [0, 7, 12, 16, 19].forEach((s, i) => this.tone('triangle', mtof(76 + s), mtof(76 + s), 0.18, 0.1, this.sfxBus, i * 0.05)); break;
      case 'bombPickup': [0, 5, 9].forEach((s, i) => this.tone('square', mtof(64 + s), mtof(64 + s), 0.12, 0.08, this.sfxBus, i * 0.07)); break;
      case 'warn': this.tone('square', 880, 880, 0.12, 0.08); this.tone('square', 660, 660, 0.12, 0.08, this.sfxBus, 0.16); break;
      case 'ui': this.tone('square', 900, 900, 0.04, 0.06, this.sfxBus); break;
      case 'select': this.tone('square', 660, 990, 0.09, 0.08); this.tone('square', 990, 1320, 0.09, 0.06, this.sfxBus, 0.07); break;
      case 'back': this.tone('square', 500, 330, 0.1, 0.07); break;
      case 'alert': this.tone('sawtooth', 440, 440, 0.2, 0.08); this.tone('sawtooth', 330, 330, 0.2, 0.08, this.sfxBus, 0.22); break;
      case 'whoosh': this.noise(0.6, 0.15, 500, 2500, 'bandpass'); break;
      case 'tick': this.tone('square', 1800, 1800, 0.02, 0.04); break;
      case 'medal': [0, 4, 7, 12, 16].forEach((s, i) => this.tone('square', mtof(67 + s), mtof(67 + s), 0.22, 0.09, this.sfxBus, i * 0.09)); break;
      case 'clank': this.tone('square', 140, 60, 0.18, 0.15); this.noise(0.15, 0.3, 5000, 800, 'highpass'); break;
      case 'crash': this.noise(0.5, 0.45, 1800, 100); this.tone('square', 120, 40, 0.3, 0.2); break;
      case 'uturn': this.noise(0.9, 0.2, 600, 3000, 'bandpass'); this.tone('sawtooth', 200, 600, 0.9, 0.06); break;
    }
  }
  // Radio voice babble: formant-ish chirps with per-character pitch.
  voice(pitch = 1, vol = 0.12) {
    if (!this.ctx) return;
    const f = 220 * pitch * rr(0.85, 1.35);
    const o = this.tone('sawtooth', f, f * rr(0.8, 1.2), 0.07, vol, this.voiceBus);
    if (!o) return;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rr(500, 2200); bp.Q.value = 3;
    o.g.disconnect(); o.g.connect(bp); bp.connect(this.voiceBus);
  }
  // ---- Music ----
  playMusic(name) {
    if (!this.ctx) { this.pendingMusic = name; return; }
    if (this.musicName === name) return;
    this.stopMusic(0.4);
    this.musicName = name;
    const tr = TRACKS[name]; if (!tr) return;
    this.step = 0; this.nextTime = this.t + 0.15; this.track = tr;
    this.seqTimer = setInterval(() => this.schedule(), 40);
  }
  stopMusic(fade = 0.6) {
    if (this.seqTimer) clearInterval(this.seqTimer);
    this.seqTimer = null; this.musicName = null; this.track = null; this.pendingMusic = null;
  }
  schedule() {
    if (!this.track || !this.ctx) return;
    const tr = this.track, spb = 60 / tr.bpm / 4;
    while (this.nextTime < this.t + 0.25) {
      const st = this.step, t = this.nextTime - this.t;
      const bar = Math.floor(st / 16) % tr.chords.length, s16 = st % 16;
      const chord = tr.chords[bar];
      const mel = tr.melody && tr.melody[Math.floor(st / 16) % tr.melody.length];
      // drums
      if (tr.drums) {
        if (tr.drums.kick[s16]) { this.tone('sine', 150, 40, 0.18, 0.5, this.musicBus, t); }
        if (tr.drums.snare[s16]) { this.noise(0.14, 0.35, 5000, 1500, 'highpass', this.musicBus, t); this.tone('triangle', 220, 120, 0.08, 0.2, this.musicBus, t); }
        if (tr.drums.hat[s16]) { this.noise(0.04, 0.18, 9000, 7000, 'highpass', this.musicBus, t); }
      }
      // bass
      if (tr.bass && tr.bass[s16]) { const n = chord[0] - 24 + (tr.bass[s16] === 2 ? 12 : 0); this.tone('sawtooth', mtof(n), mtof(n), spb * 1.6, 0.16, this.musicBus, t, 0.01); }
      // arp / pad
      if (tr.arp && tr.arp[s16] != null) { const n = chord[(tr.arp[s16]) % chord.length] + 12 * Math.floor(tr.arp[s16] / chord.length); const x = this.tone('square', mtof(n), mtof(n), spb * 1.1, 0.045, this.musicBus, t); }
      if (tr.pad && s16 === 0) chord.forEach((n) => this.tone('triangle', mtof(n), mtof(n), spb * 15, 0.05, this.musicBus, t, 0.3));
      // melody (array of [step, note, len])
      if (mel) for (const [ms, n, l] of mel) if (ms === s16 && n) {
        const o = this.tone('square', mtof(n), mtof(n), spb * l, 0.08, this.musicBus, t, 0.01);
        this.tone('sawtooth', mtof(n + 0.07), mtof(n + 0.07), spb * l, 0.04, this.musicBus, t, 0.01);
        if (tr.echo) { const g = this.ctx.createGain(); g.gain.value = 1; }
      }
      this.nextTime += spb; this.step++;
    }
  }
}
const K = (s) => s.split('').map((c) => c === 'x' ? 1 : c === 'X' ? 2 : 0);
const TRACKS = {
  title: { bpm: 96, chords: [[57, 64, 69], [53, 60, 65], [48, 55, 64], [55, 62, 67]], pad: true,
    arp: [0, null, 1, null, 2, null, 1, null, 0, null, 1, null, 2, null, 3, null],
    bass: K('x.......x.......'),
    drums: { kick: K('x.......x.......'), snare: K('....x.......x...'), hat: K('..x...x...x...x.') },
    melody: [[[0, 81, 6], [8, 79, 4], [12, 76, 4]], [[0, 77, 6], [8, 76, 4], [12, 72, 4]], [[0, 76, 8], [8, 79, 8]], [[0, 74, 6], [8, 79, 4], [12, 83, 4]]] },
  stage1: { bpm: 148, chords: [[57, 64, 69], [55, 62, 67], [53, 60, 65], [55, 62, 67]],
    bass: K('x.xxx.xxx.xxx.xx'),
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 2, 1],
    drums: { kick: K('x...x...x..xx...'), snare: K('....x.......x...'), hat: K('x.x.x.x.x.x.x.xx') },
    melody: [[[0, 81, 3], [4, 84, 3], [8, 88, 6], [14, 86, 2]], [[0, 84, 3], [4, 83, 3], [8, 79, 6], [14, 81, 2]], [[0, 81, 3], [4, 84, 3], [8, 89, 6], [14, 88, 2]], [[0, 86, 4], [4, 84, 4], [8, 83, 8]]] },
  stage2: { bpm: 132, chords: [[50, 57, 62], [46, 53, 58], [48, 55, 60], [45, 52, 57]], pad: true,
    bass: K('x..x..x.x..x..x.'),
    arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 3, 2],
    drums: { kick: K('x..x..x...x.x...'), snare: K('....x.......x..x'), hat: K('..x...x...x...x.') },
    melody: [[[0, 74, 4], [6, 77, 2], [8, 81, 6]], [[0, 77, 4], [6, 74, 2], [8, 72, 6]], [[0, 76, 4], [6, 79, 2], [8, 84, 6]], [[0, 81, 4], [6, 77, 2], [8, 76, 6]]] },
  boss: { bpm: 164, chords: [[45, 52, 57], [45, 52, 57], [41, 48, 53], [44, 51, 56]],
    bass: K('xxxxxxxxxxxxxxxx'),
    arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2],
    drums: { kick: K('x.x.x.x.x.x.x.xx'), snare: K('....x.......x.x.'), hat: K('xxxxxxxxxxxxxxxx') },
    melody: [[[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 75, 2], [10, 76, 2], [12, 81, 4]], [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4]]] },
  victory: { bpm: 120, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], pad: true,
    bass: K('x...x...x...x...'), arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1],
    drums: { kick: K('x...x...x...x...'), snare: K('....x.......x...'), hat: K('..x...x...x...x.') },
    melody: [[[0, 76, 4], [4, 79, 4], [8, 84, 8]], [[0, 81, 4], [4, 84, 4], [8, 88, 8]], [[0, 86, 4], [4, 83, 4], [8, 79, 8]], [[0, 84, 16]]] },
  defeat: { bpm: 70, chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]], pad: true, bass: K('x...............'), melody: [[[0, 69, 8], [8, 67, 8]], [[0, 65, 8], [8, 64, 8]]] },
};
export const audio = new AudioSystem();
