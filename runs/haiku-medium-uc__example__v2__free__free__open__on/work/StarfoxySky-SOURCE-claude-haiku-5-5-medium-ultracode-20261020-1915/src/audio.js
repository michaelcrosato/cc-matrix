// Web Audio: all effects are synthesized at runtime (no sample files).
// Music is a small step sequencer driven by a lookahead scheduler.

import { settings } from './settings.js';

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.timer = null;
    this.last = {};
  }

  // Must be called from a user gesture (first key/button press).
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.masterVol / 100;
    this.sfxBus.gain.value = settings.sfxVol / 100;
    this.musicBus.gain.value = (settings.musicVol / 100) * 0.55;
  }

  // Limits how often the same effect may play (keeps hit sounds from stacking).
  ready(name, minGap = 0) {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    if (this.last[name] !== undefined && now - this.last[name] < minGap) return false;
    this.last[name] = now;
    return true;
  }

  tone(type, freq, dur, vol, { t = this.ctx.currentTime, slideTo = null, bus = this.sfxBus } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  noise(dur, vol, { t = this.ctx.currentTime, type = 'lowpass', freq = 1200, to = null, q = 0.7, bus = this.sfxBus } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.03);
  }

  // ----- Effects -----

  laser() {
    if (!this.ready('laser', 0.07)) return;
    this.tone('square', 1100, 0.12, 0.05, { slideTo: 380 });
  }

  missile() {
    if (!this.ready('missile', 0.05)) return;
    this.tone('sawtooth', 300, 0.45, 0.07, { slideTo: 90 });
    this.noise(0.4, 0.08, { type: 'bandpass', freq: 900, to: 300 });
  }

  lockOn() {
    if (!this.ready('lockon', 0.1)) return;
    this.tone('triangle', 880, 0.07, 0.12);
    this.tone('triangle', 1320, 0.09, 0.1, { t: this.ctx.currentTime + 0.06 });
  }

  bomb() {
    if (!this.ready('bomb', 0.2)) return;
    this.noise(1.2, 0.5, { type: 'lowpass', freq: 2400, to: 80 });
    this.tone('sine', 110, 1.0, 0.45, { slideTo: 30 });
  }

  explode(size = 1) {
    if (!this.ready('explode', 0.04)) return;
    const d = 0.35 + 0.35 * size;
    this.noise(d, 0.22 + 0.15 * size, { type: 'lowpass', freq: 1800 * size + 400, to: 120 });
    this.tone('sine', 90 + 30 / size, d * 0.8, 0.12 * size, { slideTo: 35 });
  }

  hit() {
    if (!this.ready('hit', 0.15)) return;
    this.tone('sawtooth', 180, 0.22, 0.14, { slideTo: 60 });
    this.noise(0.18, 0.12, { type: 'highpass', freq: 1500 });
  }

  deflect() {
    if (!this.ready('deflect', 0.1)) return;
    this.tone('square', 2200, 0.12, 0.05, { slideTo: 900 });
  }

  enemyFire() {
    if (!this.ready('efire', 0.12)) return;
    this.tone('square', 620, 0.1, 0.035, { slideTo: 260 });
  }

  pickup() {
    if (!this.ready('pickup', 0.05)) return;
    const t = this.ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => this.tone('triangle', f, 0.12, 0.12, { t: t + i * 0.06 }));
  }

  ring() {
    if (!this.ready('ring', 0.1)) return;
    const t = this.ctx.currentTime;
    [988, 1319, 1976].forEach((f, i) => this.tone('sine', f, 0.2, 0.1, { t: t + i * 0.04 }));
  }

  roll() {
    if (!this.ready('roll', 0.3)) return;
    this.noise(0.55, 0.22, { type: 'bandpass', freq: 400, to: 2200, q: 1.2 });
  }

  warning() {
    if (!this.ready('warn', 0.8)) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.tone('square', i % 2 ? 620 : 880, 0.16, 0.06, { t: t + i * 0.18 });
  }

  chatter() {
    if (!this.ready('chatter', 0.2)) return;
    this.tone('triangle', 520 + Math.random() * 180, 0.06, 0.05);
  }

  uiMove() {
    if (!this.ready('uimove', 0.03)) return;
    this.tone('square', 1500, 0.03, 0.03);
  }

  uiSelect() {
    if (!this.ready('uiselect', 0.05)) return;
    this.tone('square', 880, 0.05, 0.05);
    this.tone('square', 1320, 0.08, 0.05, { t: this.ctx.currentTime + 0.05 });
  }

  uiBack() {
    if (!this.ready('uiback', 0.05)) return;
    this.tone('square', 520, 0.09, 0.05, { slideTo: 300 });
  }

  // ----- Music -----

  // track: { bpm, roots: [midi, ...] (one per bar, looping), minor: boolean, hats: boolean }
  playMusic(track) {
    if (!this.ctx || (this.track && this.track.name === track.name)) return;
    this.stopMusic();
    this.track = { ...track, step: 0, next: this.ctx.currentTime + 0.1 };
    this.timer = setInterval(() => this.scheduleMusic(), 25);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  scheduleMusic() {
    const tr = this.track;
    const ctx = this.ctx;
    if (!tr || !ctx) return;
    const stepDur = 60 / tr.bpm / 4;
    while (tr.next < ctx.currentTime + 0.12) {
      const pos = tr.step % 16;
      const bar = Math.floor(tr.step / 16) % tr.roots.length;
      const root = tr.roots[bar];
      const third = tr.minor ? 3 : 4;
      const t = tr.next;
      if (pos % 2 === 0) this.bass(root - 24, t, stepDur * 1.7);
      const arp = [0, third, 7, 12, third + 12, 7, 12, 19];
      if (tr.lead && pos % 2 === 1) {
        const note = root + 24 + arp[(pos >> 1) % arp.length];
        this.lead(note, t, stepDur * 1.5);
      }
      if (tr.hats && pos % 4 === 2) this.hat(t);
      if (pos === 0 && bar === 0 && tr.step > 0 && tr.kick) this.kick(t);
      tr.step++;
      tr.next += stepDur;
    }
  }

  bass(midi, t, dur) {
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = midiHz(midi);
    f.type = 'lowpass';
    f.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  lead(midi, t, dur) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = midiHz(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  hat(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t, Math.random());
    src.stop(t + 0.05);
  }

  kick(t) {
    this.tone('sine', 120, 0.25, 0.4, { t, slideTo: 40, bus: this.musicBus });
  }
}
