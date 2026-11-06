import { Sequencer } from './sequencer.js';
import { SFX } from './sfx.js';
import { speak } from './voice.js';
import { STINGS } from './tracks.js';
import { INSTRUMENTS } from './instruments.js';
import { mulberry32 } from '../core/rng.js';

/** buses (music, sfx, voice) → master compressor → destination. Works on any context. */
export class Mix {
  constructor(ctx) {
    this.ctx = ctx;
    this.r = mulberry32(4242);
    this.master = ctx.createDynamicsCompressor();
    this.master.threshold.value = -10; this.master.ratio.value = 5; this.master.attack.value = 0.004; this.master.release.value = 0.2;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.sfx = ctx.createGain(); this.voice = ctx.createGain();
    this.music.connect(this.master); this.sfx.connect(this.master); this.voice.connect(this.master);
    // A trim so a full arrangement at 100 stays under full scale.
    this.musicIn = ctx.createGain(); this.musicIn.gain.value = 0.36; this.musicIn.connect(this.music);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(1.9);
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    this.reverb.connect(wet); wet.connect(this.musicIn);
    this.setLevels(10, 80, 80);
    this.seq = new Sequencer(this);
  }
  _impulse(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    const r = mulberry32(777);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    return b;
  }
  setLevels(music, sfx, voice) {
    const t = this.ctx.currentTime;
    this.music.gain.setValueAtTime(music / 100, t); this.sfx.gain.setValueAtTime(sfx / 100, t); this.voice.gain.setValueAtTime(voice / 100, t);
    this.levels = { music: music / 100, sfx: sfx / 100, voice: voice / 100 };
  }
  sting(name, at) {
    const s = STINGS[name];
    if (!s) return;
    const beat = 60 / s.bpm, t0 = at ?? this.ctx.currentTime + 0.01;
    for (const [b, inst, midi, dur, vel] of s.notes) INSTRUMENTS[inst](this.ctx, this.sfx, t0 + b * beat, midi, dur * beat, vel * 0.7, 0);
  }
  playSfx(name, at, o) {
    const f = SFX[name];
    if (f) f(this, at ?? this.ctx.currentTime + 0.005, o);
  }
}

/** The live mix. It starts on the first gesture, pad input included. Until then all of this is silent and harmless. */
export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null; this.mix = null; this.gestured = false; this.gestureT = 0;
    this.analysers = {};
    this.disabled = false; this.lineGain = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { this.ctx = new AC({ latencyHint: 'interactive' }); this.mix = new Mix(this.ctx); this._analyse(); }
    } catch (e) { this.disabled = true; }
    this.applyLevels();
    this._timer = null;
    if (this.ctx) this._timer = setInterval(() => this.tick(), 25);
  }
  _analyse() {
    for (const k of ['music', 'sfx', 'voice']) {
      const a = this.ctx.createAnalyser(); a.fftSize = 1024;
      this.mix[k].connect(a);
      this.analysers[k] = a;
    }
  }
  /** Peak level on a bus right now, 0 to 1. */
  level(bus) {
    const a = this.analysers[bus];
    if (!a) return 0;
    const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b);
    let p = 0;
    for (let i = 0; i < b.length; i++) p = Math.max(p, Math.abs(b[i]));
    return p;
  }
  get state() { return this.ctx ? this.ctx.state : 'none'; }
  get seq() { return this.mix ? this.mix.seq : null; }
  gesture() {
    this.gestured = true;
    if (this.ctx && this.ctx.state === 'suspended') { const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
  }
  applyLevels() {
    if (!this.mix) return;
    const s = this.settings();
    this.mix.setLevels(s.music, s.sound, s.voice);
  }
  /** A pad-only player whose browser wouldn't unlock audio gets a small tag asking for a key. */
  stuck() { return !!(this.ctx && this.gestured && this.ctx.state === 'suspended'); }
  tick() {
    if (!this.mix) return;
    if (this.ctx.state !== 'running') return;
    this.mix.seq.tick();
  }
  music(id, o) { if (this.mix) this.mix.seq.play(id, o); }
  stopMusic(fade) { if (this.mix) this.mix.seq.stop(fade); }
  get musicId() { return this.mix ? this.mix.seq.id : null; }
  setTilt(deg) { if (this.mix) this.mix.seq.tiltDeg = deg; this.tiltDeg = deg; }
  detuneNow() { return this.mix ? this.mix.seq.detuneAt(this.ctx.currentTime) : 0; }
  sfx(name, o) { if (this.mix && this.ctx.state === 'running') this.mix.playSfx(name, undefined, o); }
  sting(name) { if (this.mix && this.ctx.state === 'running') this.mix.sting(name); }
  /** Speak a line. Stopping a line silences what remains of it. */
  say(voiceId, text) {
    if (!this.mix || this.ctx.state !== 'running') return { duration: 0 };
    this.stopVoice();
    const g = this.ctx.createGain(); g.connect(this.mix.voice);
    this.lineGain = g;
    return speak(this.mix, g, voiceId, text, this.ctx.currentTime + 0.01, this.mix.r);
  }
  stopVoice() {
    if (this.lineGain) {
      const g = this.lineGain; this.lineGain = null;
      g.gain.setValueAtTime(g.gain.value, this.ctx.currentTime); g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.03);
    }
  }
  /** Session end: everything stops. */
  silence() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this.ctx) { const p = this.ctx.suspend(); if (p && p.catch) p.catch(() => {}); }
  }
}
