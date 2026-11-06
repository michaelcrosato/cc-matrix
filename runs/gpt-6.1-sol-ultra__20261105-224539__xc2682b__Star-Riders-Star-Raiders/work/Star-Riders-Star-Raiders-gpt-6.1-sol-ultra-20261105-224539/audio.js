// All sound is synthesized here. No recordings, samples, or downloaded audio.
export class AudioEngine {
  constructor() {
    this.context = null;
    this.musicVolume = 0.10;
    this.sfxVolume = 0.70;
    this.muted = false;
    this.paused = false;
    this.events = {};
    this.notes = 0;
    this.step = 0;
    this.nextNote = 0;
    this.lastVoice = -100;
    this.combat = 0;
    this.disposed = false;
  }

  async unlock() {
    if (this.disposed) return false;
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return false;
        this._build(new Context({ latencyHint: 'interactive' }));
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch (_) { return false; }
  }

  _build(context) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(context.destination);
    this.music = context.createGain();
    this.music.gain.value = this.musicVolume;
    this.music.connect(this.master);
    this.effects = context.createGain();
    this.effects.gain.value = this.sfxVolume;
    this.effects.connect(this.master);
    this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = this.noise.getChannelData(0);
    // Deterministic noise leaves the game's seeded random stream untouched.
    let seed = 92111;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = (seed / 4294967296) * 2 - 1;
    }
    this.engine = context.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 35;
    this.engineFilter = context.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 130;
    this.engineGain = context.createGain();
    this.engineGain.gain.value = 0;
    this.engine.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.effects);
    this.engine.start();
    this.nextNote = context.currentTime + 0.04;
  }

  _gain(node, value, tau = 0.035) {
    if (this.context && node) node.gain.setTargetAtTime(value, this.context.currentTime, tau);
  }
  setMusic(value) {
    this.musicVolume = Math.min(1, Math.max(0, Number(value) || 0));
    this._gain(this.music, this.paused ? this.musicVolume * 0.35 : this.musicVolume);
  }
  setSfx(value) {
    this.sfxVolume = Math.min(1, Math.max(0, Number(value) || 0));
    this._gain(this.effects, this.sfxVolume);
  }
  setMuted(value) {
    this.muted = !!value;
    this._gain(this.master, this.muted ? 0 : 0.55);
  }

  _tone(type, startFreq, endFreq, duration, volume, time, bus, pan = 0) {
    const c = this.context;
    if (!c || this.disposed) return;
    const at = Math.max(c.currentTime, time ?? c.currentTime);
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, startFreq), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), at + duration);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + Math.min(0.012, duration * 0.15));
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env);
    let panner;
    if (c.createStereoPanner && pan !== 0) {
      panner = c.createStereoPanner();
      panner.pan.value = Math.min(1, Math.max(-1, pan));
      env.connect(panner); panner.connect(bus || this.effects);
    } else env.connect(bus || this.effects);
    osc.onended = () => { osc.disconnect(); env.disconnect(); if (panner) panner.disconnect(); };
    osc.start(at); osc.stop(at + duration + 0.02);
  }

  _noise(duration, volume, freq, type = 'lowpass', time) {
    const c = this.context;
    if (!c || this.disposed) return;
    const at = Math.max(c.currentTime, time ?? c.currentTime);
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.16), at + duration);
    filter.Q.value = 1.2;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter); filter.connect(env); env.connect(this.effects);
    src.onended = () => { src.disconnect(); filter.disconnect(); env.disconnect(); };
    src.start(at); src.stop(at + duration + 0.02);
  }

  play(name) {
    this.events[name] = (this.events[name] || 0) + 1;
    if (!this.context || this.disposed || this.muted) return;
    const t = this.context.currentTime;
    switch (name) {
      case 'laser':
        this._tone('sawtooth', 1350, 160, 0.15, 0.16, t);
        this._tone('triangle', 2400, 420, 0.095, 0.13, t + 0.012, null, -0.3);
        break;
      case 'enemyShot':
        this._tone('square', 520, 105, 0.22, 0.065, t, null, 0.3); break;
      case 'hit':
        this._noise(0.24, 0.23, 1800);
        this._tone('sine', 150, 42, 0.23, 0.30, t); break;
      case 'explosion':
        this._noise(0.80, 0.46, 3300);
        this._tone('sine', 130, 25, 0.65, 0.40, t);
        this._noise(0.35, 0.15, 6500, 'highpass', t + 0.08); break;
      case 'warp':
        this._tone('sawtooth', 48, 1800, 1.15, 0.13, t, null, -0.25);
        this._tone('sine', 50, 450, 1.20, 0.24, t + 0.04, null, 0.25);
        this._noise(1.35, 0.18, 7000, 'bandpass', t + 0.1);
        this._tone('sine', 1500, 100, 0.35, 0.15, t + 1.2); break;
      case 'lock':
        this._tone('sine', 880, 880, 0.09, 0.12, t);
        this._tone('sine', 1320, 1320, 0.14, 0.13, t + 0.11); break;
      case 'select':
        this._tone('triangle', 740, 950, 0.07, 0.12, t); break;
      case 'dock':
        [440, 554.37, 659.26, 880].forEach((f, i) => this._tone('triangle', f, f, 0.44, 0.13, t + i * 0.16));
        this._noise(0.6, 0.08, 1200, 'bandpass', t); break;
      case 'shield':
        this._tone('sine', 140, 560, 0.32, 0.15, t);
        this._tone('triangle', 280, 1120, 0.24, 0.06, t + 0.04); break;
      case 'victory':
        [62, 65, 69, 74, 72, 77, 81, 86].forEach((n, i) => {
          const f = 440 * 2 ** ((n - 69) / 12);
          this._tone('triangle', f, f, i === 7 ? 1.1 : 0.36, 0.17, t + i * 0.15);
          this._tone('sine', f * 0.5, f * 0.5, 0.42, 0.12, t + i * 0.15);
        }); break;
      case 'defeat':
        [62, 60, 57, 50].forEach((n, i) => {
          const f = 440 * 2 ** ((n - 69) / 12);
          this._tone('triangle', f, f * 0.97, 0.65, 0.16, t + i * 0.26);
        }); break;
      case 'radio': this.voice(); break;
      default: break;
    }
  }

  voice() {
    const c = this.context;
    if (!c || this.disposed || this.muted || c.currentTime - this.lastVoice < 0.7) return;
    this.lastVoice = c.currentTime;
    this.events.voice = (this.events.voice || 0) + 1;
    // Five nonsense syllables: a voiced source through two moving formants.
    const pitches = [258, 345, 294, 388, 270, 330];
    const vowelA = [650, 430, 900, 320, 700, 470];
    const vowelB = [1300, 2200, 1500, 2400, 1100, 1800];
    const variant = this.events.voice % 3;
    for (let i = 0; i < 5; i++) {
      const at = c.currentTime + i * 0.105;
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitches[(i + variant) % 6], at);
      osc.frequency.linearRampToValueAtTime(pitches[(i + variant + 1) % 6] * 0.91, at + 0.08);
      const amp = c.createGain();
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.linearRampToValueAtTime(0.07, at + 0.013);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.091);
      const a = c.createBiquadFilter(), b = c.createBiquadFilter();
      a.type = b.type = 'bandpass';
      a.frequency.value = vowelA[(i + variant) % 6]; a.Q.value = 5;
      b.frequency.value = vowelB[(i + variant) % 6]; b.Q.value = 8;
      osc.connect(a); osc.connect(b); a.connect(amp); b.connect(amp); amp.connect(this.effects);
      osc.onended = () => { osc.disconnect(); a.disconnect(); b.disconnect(); amp.disconnect(); };
      osc.start(at); osc.stop(at + 0.1);
    }
  }

  _musicStep(at) {
    const chord = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 60, 65, 69], [48, 55, 60, 64]][Math.floor(this.step / 32) % 4];
    const n = chord[[0, 2, 1, 3, 2, 1, 3, 2][this.step % 8]] + 12;
    const hz = 440 * 2 ** ((n - 69) / 12);
    this._tone('triangle', hz, hz, 0.38, 0.22, at, this.music, this.step % 2 ? 0.4 : -0.4);
    if (this.step % 4 === 0) {
      const bass = 440 * 2 ** ((chord[0] - 12 - 69) / 12);
      this._tone('sine', bass, bass, 0.58, 0.48, at, this.music);
    }
    if (this.step % 16 === 0) {
      for (const midi of chord.slice(1)) {
        const f = 440 * 2 ** ((midi - 69) / 12);
        this._tone('sine', f, f * 1.002, 2.8, 0.14, at, this.music);
      }
    }
    if (this.combat > 0.25 && this.step % 2 === 0) {
      this._tone('sine', 100, 36, 0.16, 0.30, at, this.music);
      this._tone('square', 2800, 2000, 0.028, 0.025, at + 0.12, this.music);
    }
    this.notes++;
    this.step++;
  }

  update(dt, { combat = false, boost = false, speed = 0, paused = false } = {}) {
    if (!this.context || this.disposed || this.context.state !== 'running') return;
    const c = this.context;
    this.combat += ((combat ? 1 : 0) - this.combat) * Math.min(1, Math.max(0, dt) * 2);
    if (this.paused !== !!paused) {
      this.paused = !!paused;
      this._gain(this.music, this.musicVolume * (this.paused ? 0.35 : 1));
    }
    const intensity = Math.min(1, Math.abs(Number(speed) || 0) / 80);
    this.engine.frequency.setTargetAtTime(boost ? 95 : 34 + intensity * 28, c.currentTime, 0.12);
    this.engineFilter.frequency.setTargetAtTime(boost ? 650 : 100 + intensity * 170, c.currentTime, 0.12);
    this.engineGain.gain.setTargetAtTime(paused ? 0 : (boost ? 0.10 : 0.022 + intensity * 0.024), c.currentTime, 0.12);
    if (this.nextNote < c.currentTime - 0.2) this.nextNote = c.currentTime + 0.015;
    let scheduled = 0;
    while (this.nextNote < c.currentTime + 0.15 && scheduled++ < 8) {
      this._musicStep(this.nextNote);
      this.nextNote += 60 / (this.combat > 0.4 ? 108 : 84) / 4;
    }
  }

  async suspend() {
    if (this.context?.state === 'running') await this.context.suspend();
  }
  async dispose() {
    this.disposed = true;
    if (this.engine) { try { this.engine.stop(); } catch (_) {} this.engine.disconnect(); }
    if (this.context && this.context.state !== 'closed') await this.context.close();
  }
  get stats() {
    let peak = 0, rms = 0;
    if (this.analyser) {
      const wave = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(wave);
      for (const sample of wave) { peak = Math.max(peak, Math.abs(sample)); rms += sample * sample; }
      rms = Math.sqrt(rms / wave.length);
    }
    return { active: this.context?.state === 'running', musicVolume: this.musicVolume, sfxVolume: this.sfxVolume,
      muted: this.muted, events: { ...this.events }, notes: this.notes, peak, rms };
  }

  static async renderProof() {
    const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Context) return { supported: false };
    const context = new Context(2, 44100 * 3, 44100);
    const engine = new AudioEngine(); engine._build(context);
    engine.play('laser'); engine.play('explosion'); engine.voice();
    for (let i = 0; i < 12; i++) engine._musicStep(i * 0.15);
    const buffer = await context.startRendering();
    let peak = 0, squares = 0, nonzero = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      for (const x of buffer.getChannelData(ch)) {
        peak = Math.max(peak, Math.abs(x)); squares += x * x; if (Math.abs(x) > 0.0001) nonzero++;
      }
    }
    return { supported: true, peak, rms: Math.sqrt(squares / (buffer.length * buffer.numberOfChannels)),
      nonzero, samples: buffer.length * buffer.numberOfChannels, musicVolume: engine.musicVolume };
  }
}
