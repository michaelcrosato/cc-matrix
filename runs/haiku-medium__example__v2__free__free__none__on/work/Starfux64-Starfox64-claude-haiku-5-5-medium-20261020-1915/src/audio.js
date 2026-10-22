// Web Audio: every sound effect is synthesized here, and music is a small step sequencer.
// The AudioContext is created on the first user gesture, as browsers require.
import { settings } from './settings.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Chord roots and a short lead line per section. Numbers are MIDI notes.
const TRACKS = {
  title: { bpm: 84, chords: [45, 41, 36, 43], lead: [0, 3, 7, 10, 7, 3, 12, 7], drums: false, wave: 'triangle', leadWave: 'sine' },
  stage1: { bpm: 128, chords: [45, 41, 48, 43], lead: [0, 7, 12, 7, 3, 10, 12, 15], drums: true, wave: 'sawtooth', leadWave: 'square' },
  stage2: { bpm: 140, chords: [40, 36, 38, 41], lead: [0, 3, 0, 7, 5, 8, 12, 8], drums: true, wave: 'sawtooth', leadWave: 'square' },
  boss: { bpm: 152, chords: [38, 34, 41, 36], lead: [0, 0, 12, 0, 3, 3, 15, 3], drums: true, wave: 'sawtooth', leadWave: 'square' },
};

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.timer = null;
    this.noise = null;
  }

  // Must be called from a user gesture before anything can play.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(this.comp);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.noise = this.makeNoise();
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.masterVol * 0.9, t, 0.02);
    this.musicBus.gain.setTargetAtTime(settings.musicVol, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(settings.sfxVol, t, 0.02);
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = seed / 0x7fffffff * 2 - 1;
    }
    return buf;
  }

  // One enveloped oscillator note.
  tone({ freq, type = 'square', start = 0, dur = 0.12, gain = 0.2, slideTo = null, bus = this.sfxBus, attack = 0.005 }) {
    const c = this.ctx;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Filtered noise burst with an optional filter sweep.
  burst({ dur = 0.3, gain = 0.3, filter = 'lowpass', f0 = 1800, f1 = 200, start = 0, q = 1 }) {
    const c = this.ctx;
    const t = c.currentTime + start;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const flt = c.createBiquadFilter();
    flt.type = filter;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'laser':
        this.tone({ freq: 1040, slideTo: 260, dur: 0.14, gain: 0.07, type: 'square' });
        break;
      case 'laserEnemy':
        this.tone({ freq: 520, slideTo: 300, dur: 0.12, gain: 0.05, type: 'sawtooth' });
        break;
      case 'lock':
        this.tone({ freq: 1500, dur: 0.05, gain: 0.08, type: 'square' });
        break;
      case 'missile':
        this.tone({ freq: 220, slideTo: 880, dur: 0.35, gain: 0.08, type: 'sawtooth' });
        this.burst({ dur: 0.35, gain: 0.08, filter: 'bandpass', f0: 900, f1: 2400 });
        break;
      case 'launch':
        this.burst({ dur: 0.6, gain: 0.18, filter: 'bandpass', f0: 300, f1: 2600, q: 2 });
        break;
      case 'hit':
        this.burst({ dur: 0.12, gain: 0.25, f0: 2500, f1: 400 });
        break;
      case 'explode':
        this.burst({ dur: 0.9, gain: 0.45, f0: 2400, f1: 120 });
        this.tone({ freq: 110, slideTo: 40, dur: 0.6, gain: 0.35, type: 'sine' });
        break;
      case 'bigExplode':
        this.burst({ dur: 2.2, gain: 0.6, f0: 3000, f1: 60 });
        this.tone({ freq: 90, slideTo: 25, dur: 1.8, gain: 0.5, type: 'sine' });
        this.burst({ dur: 1.5, gain: 0.25, f0: 800, f1: 2000, start: 0.2 });
        break;
      case 'bomb':
        this.burst({ dur: 1.4, gain: 0.55, f0: 600, f1: 40 });
        this.tone({ freq: 60, slideTo: 30, dur: 1.2, gain: 0.5, type: 'sine' });
        break;
      case 'shieldHit':
        this.tone({ freq: 330, slideTo: 170, dur: 0.22, gain: 0.12, type: 'triangle' });
        this.burst({ dur: 0.18, gain: 0.12, filter: 'highpass', f0: 3000, f1: 1200 });
        break;
      case 'hurt':
        this.tone({ freq: 240, slideTo: 90, dur: 0.5, gain: 0.25, type: 'square' });
        this.burst({ dur: 0.5, gain: 0.25, f0: 1200, f1: 150 });
        break;
      case 'roll':
        this.burst({ dur: 0.7, gain: 0.22, filter: 'bandpass', f0: 500, f1: 3000, q: 1.5 });
        break;
      case 'boost':
        this.burst({ dur: 0.8, gain: 0.2, filter: 'bandpass', f0: 400, f1: 1600, q: 1 });
        break;
      case 'brake':
        this.burst({ dur: 0.6, gain: 0.2, filter: 'bandpass', f0: 1600, f1: 300, q: 1 });
        break;
      case 'pickup':
        [880, 1174, 1568].forEach((f, i) => this.tone({ freq: f, dur: 0.12, gain: 0.1, type: 'triangle', start: i * 0.06 }));
        break;
      case 'select':
        this.tone({ freq: 660, dur: 0.07, gain: 0.1, type: 'square' });
        break;
      case 'move':
        this.tone({ freq: 440, dur: 0.03, gain: 0.04, type: 'triangle' });
        break;
      case 'back':
        this.tone({ freq: 330, slideTo: 220, dur: 0.1, gain: 0.08, type: 'square' });
        break;
      case 'warn':
        this.tone({ freq: 880, dur: 0.12, gain: 0.12, type: 'square' });
        this.tone({ freq: 880, dur: 0.12, gain: 0.12, type: 'square', start: 0.2 });
        break;
      case 'fanfare':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.35, gain: 0.12, type: 'square', start: i * 0.14 }));
        break;
      case 'gameover':
        [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, dur: 0.5, gain: 0.14, type: 'triangle', start: i * 0.3 }));
        break;
      case 'comms':
        this.tone({ freq: 1200, dur: 0.04, gain: 0.04, type: 'square' });
        break;
      default:
        break;
    }
  }

  // Music --------------------------------------------------------------
  playTrack(name) {
    if (!this.ctx || this.track === name) return;
    this.stopMusic();
    if (!name) return;
    const tr = TRACKS[name];
    if (!tr) return;
    this.track = name;
    const stepDur = 60 / tr.bpm / 2; // eighth-note steps
    let step = 0;
    let next = this.ctx.currentTime + 0.1;
    const scheduleAhead = () => {
      while (next < this.ctx.currentTime + 0.15) {
        this.musicStep(tr, step, next, stepDur);
        next += stepDur;
        step++;
      }
    };
    scheduleAhead();
    this.timer = setInterval(scheduleAhead, 25);
  }

  musicStep(tr, step, t, dur) {
    const c = this.ctx;
    const bar = Math.floor(step / 8) % tr.chords.length;
    const root = tr.chords[bar];
    const pos = step % 8;
    // Bass pulse on every eighth note, root then octave.
    const bassNote = pos % 2 === 0 ? root : root + 12;
    this.noteAt(tr.wave, midi(bassNote), t, dur * 0.9, 0.09, c);
    // Lead line changes every eighth note.
    if (tr.leadWave) {
      const leadNote = root + 24 + tr.lead[step % tr.lead.length];
      if (step % 2 === 0 || tr.lead.length > 4) this.noteAt(tr.leadWave, midi(leadNote), t, dur * 0.8, 0.045, c);
    }
    if (tr.drums) {
      if (pos % 4 === 0) this.kick(t);
      if (pos % 4 === 2) this.snare(t);
      this.hat(t, dur);
    }
  }

  noteAt(type, freq, t, dur, gain, c) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.2);
  }

  snare(t) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t, 0.1);
    src.stop(t + 0.16);
  }

  hat(t, dur) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t, 0.3);
    src.stop(t + dur);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }
}
