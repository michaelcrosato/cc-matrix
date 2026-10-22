// Web Audio: every sound is synthesized at runtime (no asset files).
// SFX are one-shot voices; music is a small step sequencer driven by a lookahead timer.
import { settings } from './settings.js';

// Music tracks: root in MIDI note numbers, bpm, chord progression as semitone offsets from root.
const TRACKS = {
  title: { bpm: 72, root: 33, prog: [0, 8, 3, 10], minor: true, arp: false },
  aurelia: { bpm: 128, root: 33, prog: [0, 8, 3, 10], minor: true, arp: true },
  kessar: { bpm: 146, root: 38, prog: [0, -2, -5, -3], minor: true, arp: true },
  solace: { bpm: 150, root: 40, prog: [0, 8, 5, 10], minor: true, arp: true },
  cinder: { bpm: 116, root: 42, prog: [0, -4, 3, -2], minor: true, arp: true },
  vorrack: { bpm: 156, root: 37, prog: [0, 1, -4, -2], minor: true, arp: true },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.timer = null;
  }

  // Must be called from a user gesture (first key or button press).
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.wantTrack) this.setMusic(this.wantTrack);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.musicBus.gain.value = (settings.musicVol / 10) * 0.32;
    this.sfxBus.gain.value = (settings.sfxVol / 10) * 0.85;
  }

  // One oscillator voice with a simple attack/decay envelope and optional pitch sweep.
  tone({ type = 'square', freq, freq2 = null, dur = 0.15, vol = 0.3, attack = 0.005, bus = null, when = 0 }) {
    const { ctx } = this;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(bus || this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Filtered noise burst: explosions, hits, whooshes.
  noise({ dur = 0.3, vol = 0.4, filter = 'lowpass', f1 = 1800, f2 = 200, q = 0.7, when = 0, bus = null }) {
    const { ctx } = this;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = filter;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f1, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(gain);
    gain.connect(bus || this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'laser':
        this.tone({ type: 'square', freq: 980, freq2: 320, dur: 0.12, vol: 0.09 });
        break;
      case 'laserEnemy':
        this.tone({ type: 'sawtooth', freq: 300, freq2: 140, dur: 0.16, vol: 0.06 });
        break;
      case 'lock':
        this.tone({ type: 'triangle', freq: 1320, dur: 0.06, vol: 0.12 });
        break;
      case 'launch':
        this.noise({ dur: 0.5, vol: 0.25, filter: 'bandpass', f1: 600, f2: 3000, q: 1.2 });
        this.tone({ type: 'sawtooth', freq: 220, freq2: 880, dur: 0.5, vol: 0.05 });
        break;
      case 'hit':
        this.noise({ dur: 0.35, vol: 0.5, f1: 1400, f2: 120 });
        this.tone({ type: 'sine', freq: 90, freq2: 40, dur: 0.3, vol: 0.4 });
        break;
      case 'explode':
        this.noise({ dur: 0.6, vol: 0.55, f1: 2200, f2: 80 });
        this.tone({ type: 'sine', freq: 120, freq2: 30, dur: 0.5, vol: 0.35 });
        break;
      case 'explodeBig':
        this.noise({ dur: 1.8, vol: 0.8, f1: 2600, f2: 40 });
        this.tone({ type: 'sine', freq: 90, freq2: 22, dur: 1.6, vol: 0.6 });
        this.noise({ dur: 1.0, vol: 0.4, f1: 600, f2: 60, when: 0.25 });
        break;
      case 'bomb':
        this.noise({ dur: 1.4, vol: 0.7, filter: 'bandpass', f1: 1400, f2: 60 });
        this.tone({ type: 'sawtooth', freq: 60, freq2: 900, dur: 1.2, vol: 0.12 });
        break;
      case 'roll':
        this.noise({ dur: 0.55, vol: 0.3, filter: 'bandpass', f1: 300, f2: 2400, q: 2 });
        break;
      case 'ring':
        [0, 0.05, 0.1].forEach((w, i) => this.tone({ type: 'triangle', freq: 660 * (1 + i * 0.25), dur: 0.15, vol: 0.15, when: w }));
        break;
      case 'pickup':
        [0, 0.07, 0.14].forEach((w, i) => this.tone({ type: 'sine', freq: 520 + i * 260, dur: 0.12, vol: 0.2, when: w }));
        break;
      case 'menu':
        this.tone({ type: 'triangle', freq: 740, dur: 0.04, vol: 0.12 });
        break;
      case 'confirm':
        this.tone({ type: 'triangle', freq: 520, freq2: 1040, dur: 0.14, vol: 0.18 });
        break;
      case 'back':
        this.tone({ type: 'triangle', freq: 500, freq2: 260, dur: 0.12, vol: 0.16 });
        break;
      case 'warn':
        [0, 0.4, 0.8].forEach((w) => this.tone({ type: 'square', freq: 440, freq2: 880, dur: 0.35, vol: 0.09, when: w }));
        break;
      case 'chatter':
        this.tone({ type: 'sawtooth', freq: 1100, freq2: 900, dur: 0.035, vol: 0.03 });
        break;
      case 'win':
        [0, 0.16, 0.32, 0.48].forEach((w, i) => this.tone({ type: 'triangle', freq: [523, 659, 784, 1046][i], dur: 0.4, vol: 0.2, when: w }));
        break;
      case 'lose':
        [0, 0.25, 0.5].forEach((w, i) => this.tone({ type: 'sawtooth', freq: [300, 250, 180][i], dur: 0.4, vol: 0.15, when: w }));
        break;
      default:
        break;
    }
  }

  // Start a music track by name (or stop with null). Re-entering the same track keeps playing.
  setMusic(name) {
    this.wantTrack = name;
    if (!this.ctx) return;
    if (this.track === name) return;
    this.stopMusic();
    if (!name || !TRACKS[name]) return;
    const track = TRACKS[name];
    this.track = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.stepDur = 60 / track.bpm / 2;
    this.timer = setInterval(() => this.schedule(track), 60);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  schedule(track) {
    const horizon = this.ctx.currentTime + 0.25;
    while (this.nextTime < horizon) {
      this.playStep(track, this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  playStep(track, step, time) {
    const { ctx } = this;
    const bar = Math.floor(step / 8);
    const chord = track.prog[bar % track.prog.length];
    const root = track.root + chord;
    const third = track.minor ? 3 : 4;
    const when = time - ctx.currentTime;
    const s = step % 8;
    // Bass on the downbeats of each half bar.
    if (s === 0 || s === 4) {
      this.tone({ type: 'sawtooth', freq: mtof(root), dur: this.stepDur * 3.6, vol: 0.14, bus: this.musicBus, when });
    }
    // Pad chord once per bar.
    if (s === 0) {
      [root + 12, root + 12 + third, root + 19].forEach((m) => {
        this.tone({ type: 'sine', freq: mtof(m), dur: this.stepDur * 7.5, vol: 0.035, attack: 0.4, bus: this.musicBus, when });
      });
    }
    // Arpeggio on each eighth note.
    if (track.arp) {
      const offsets = [0, third, 7, 12];
      this.tone({ type: 'triangle', freq: mtof(root + 24 + offsets[s % 4]), dur: this.stepDur * 0.9, vol: 0.05, bus: this.musicBus, when });
    }
    // Light hi-hat style tick on off-beats so the pulse reads through the mix.
    if (track.arp && s % 2 === 1) {
      this.noise({ dur: 0.03, vol: 0.05, filter: 'highpass', f1: 6000, f2: 4000, when, bus: this.musicBus });
    }
  }
}

export const audio = new Audio();
