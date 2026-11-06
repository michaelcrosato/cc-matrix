// All sounds are synthesized. This module never loads an audio asset.
export class AudioEngine {
  constructor(options = {}) {
    this.context = options.context || null;
    this.musicVolume = 0.1;
    this.volume = 0.8;
    this.intensity = 0;
    this.muted = false;
    this.unlocked = false;
    this._initialized = false;
    this._timer = null;
    this._voices = new Set();
    this._lastEffect = Object.create(null);
    this._noteCount = 0;
    this._effectCount = 0;
    this._voiceCount = 0;
    this._step = 0;
    this._nextStep = 0;
    this._bpm = 104;
    this._noise = null;
    this._supported = typeof globalThis.AudioContext !== 'undefined' || typeof globalThis.webkitAudioContext !== 'undefined' || !!options.context;
  }

  _clamp(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

  async unlock() {
    if (!this._supported) return false;
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        this.context = new Context({ latencyHint: 'interactive' });
      }
      if (!this._initialized) this._initialize();
      this.unlocked = true;
      if (!this.muted && this.context.state !== 'running') await this.context.resume();
      if (!this.muted) this._startClock();
      return true;
    } catch { return false; }
  }

  _initialize() {
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.music = c.createGain();
    this.music.gain.value = this.musicVolume;
    this.effects = c.createGain();
    this.effects.gain.value = 0.72;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.14;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 256;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(c.destination);
    this._noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = this._noise.getChannelData(0);
    let seed = 142857;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    this._initialized = true;
  }

  setMusic(value) {
    this.musicVolume = this._clamp(value);
    if (this.music) this.music.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.04);
  }

  setVolume(value) {
    this.volume = this._clamp(value);
    if (this.master && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.03);
  }

  setIntensity(value) { this.intensity = this._clamp(value); }

  setMuted(value) {
    this.muted = !!value;
    if (!this._initialized) return;
    if (this.muted) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setValueAtTime(0, this.context.currentTime);
      this._stopClock();
      this._stopVoices();
      if (this.context.state === 'running') this.context.suspend().catch(() => {});
    } else if (this.unlocked) {
      this.master.gain.setValueAtTime(this.volume, this.context.currentTime);
      this.context.resume().then(() => { if (!this.muted) this._startClock(); }).catch(() => {});
    }
  }

  _startClock() {
    if (this._timer || !this._initialized || this.muted) return;
    this._nextStep = this.context.currentTime + 0.08;
    this._schedule();
    this._timer = setInterval(() => this._schedule(), 70);
  }

  _stopClock() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  _stopVoices() {
    for (const voice of this._voices) {
      try { voice.source.stop(); } catch {}
      for (const node of voice.nodes) { try { node.disconnect(); } catch {} }
    }
    this._voices.clear();
  }

  _track(source, nodes, end) {
    const voice = { source, nodes };
    this._voices.add(voice);
    source.onended = () => {
      this._voices.delete(voice);
      for (const node of nodes) { try { node.disconnect(); } catch {} }
    };
    source.stop(end);
  }

  _tone(frequency, time, duration, gain = 0.1, type = 'sine', bus = this.effects, slide = null, cutoff = 3500) {
    const c = this.context;
    const oscillator = c.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(15, frequency), time);
    if (slide !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(15, slide), time + duration);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = 0.6;
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), time + Math.min(0.014, duration * 0.15));
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    oscillator.connect(filter); filter.connect(envelope); envelope.connect(bus);
    oscillator.start(time);
    this._track(oscillator, [oscillator, filter, envelope], time + duration + 0.015);
    this._noteCount++;
  }

  _hiss(time, duration, gain, low = 120, high = 2200, bus = this.effects) {
    const c = this.context;
    const source = c.createBufferSource(); source.buffer = this._noise;
    const filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = (low + high) / 2; filter.Q.value = 0.45;
    filter.frequency.setValueAtTime(high, time); filter.frequency.exponentialRampToValueAtTime(Math.max(30, low), time + duration);
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.00001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.00001, time + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(bus);
    source.start(time); this._track(source, [source, filter, envelope], time + duration + 0.015);
    this._noteCount++;
  }

  _schedule() {
    const c = this.context;
    if (this.muted || c.state !== 'running') return;
    const stepSeconds = 60 / this._bpm / 4;
    // Reset after a backgrounded tab, rather than scheduling a burst of old notes.
    if (this._nextStep < c.currentTime - 0.15) this._nextStep = c.currentTime + 0.035;
    while (this._nextStep < c.currentTime + 0.22) {
      const t = this._nextStep;
      const step = this._step % 16;
      const bar = Math.floor(this._step / 16) % 8;
      const roots = [38, 38, 34, 34, 41, 41, 36, 33];
      const root = roots[bar];
      const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
      const chord = [0, 7, 12, 15, 19, 24, 19, 15];
      if (step % 4 === 0) this._tone(hz(root), t, 0.48, 0.26, 'triangle', this.music, null, 650);
      if (step % 2 === 0) {
        const note = root + 24 + chord[(step / 2 + bar) % chord.length];
        this._tone(hz(note), t, 0.32, 0.11 + this.intensity * 0.035, 'sine', this.music);
        this._tone(hz(note + 12), t + 0.11, 0.25, 0.025, 'sine', this.music);
      }
      if (step === 0) {
        for (const n of [0, 7, 15]) this._tone(hz(root + 12 + n), t, 2.2, 0.075, 'triangle', this.music, null, 1000);
      }
      if (this.intensity > 0.2 && (step === 0 || step === 8)) this._tone(105, t, 0.16, 0.22 * this.intensity, 'sine', this.music, 36);
      if (this.intensity > 0.55 && step % 4 === 2) this._hiss(t, 0.065, 0.07 * this.intensity, 3000, 5500, this.music);
      this._step++; this._nextStep += stepSeconds;
    }
  }

  sfx(name) {
    if (!this._initialized || this.muted || !this.unlocked || this.context.state !== 'running') return;
    const t = this.context.currentTime + 0.002;
    const cooldown = { laser: 0.045, hit: 0.07, explode: 0.08, alarm: 0.7, select: 0.035 }[name] || 0.12;
    if (t - (this._lastEffect[name] ?? -100) < cooldown) return;
    this._lastEffect[name] = t; this._effectCount++;
    switch (name) {
      case 'laser':
        this._tone(1250, t, 0.13, 0.11, 'sawtooth', this.effects, 160, 2200);
        this._tone(880, t, 0.07, 0.055, 'sine', this.effects, 280); break;
      case 'hit':
        this._hiss(t, 0.17, 0.32, 150, 2000);
        this._tone(135, t, 0.2, 0.2, 'triangle', this.effects, 45); break;
      case 'explode':
        this._hiss(t, 0.85, 0.42, 65, 2100);
        this._tone(90, t, 0.75, 0.38, 'sine', this.effects, 22);
        this._hiss(t + 0.09, 0.4, 0.13, 200, 3800); break;
      case 'jump':
        this._hiss(t, 1.6, 0.23, 5500, 80);
        this._tone(70, t, 1.25, 0.2, 'sawtooth', this.effects, 1600, 2600);
        this._tone(1300, t + 1.25, 0.5, 0.16, 'sine', this.effects, 180); break;
      case 'select':
        this._tone(740, t, 0.065, 0.1, 'sine');
        this._tone(1110, t + 0.045, 0.08, 0.06, 'sine'); break;
      case 'shield':
        this._tone(300, t, 0.35, 0.13, 'triangle', this.effects, 900);
        this._tone(450, t, 0.3, 0.08, 'sine', this.effects, 1350); break;
      case 'dock':
        [0, 4, 7, 12].forEach((n, i) => this._tone(330 * Math.pow(2, n / 12), t + i * 0.11, 0.65, 0.13, 'sine')); break;
      case 'missile':
        this._hiss(t, 0.65, 0.3, 250, 3000);
        this._tone(140, t, 0.55, 0.18, 'sawtooth', this.effects, 70, 900); break;
      case 'alarm':
        [0, 0.23].forEach((offset, i) => this._tone(i ? 480 : 720, t + offset, 0.18, 0.1, 'triangle')); break;
      case 'victory':
        [0, 7, 12, 15, 19, 24].forEach((n, i) => this._tone(220 * Math.pow(2, n / 12), t + i * 0.15, 0.9, 0.15, 'triangle', this.effects, null, 2400)); break;
      default: break;
    }
  }

  voice(seed = 1) {
    if (!this._initialized || this.muted || !this.unlocked || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (now - (this._lastEffect.voice ?? -100) < 1.4) return;
    this._lastEffect.voice = now; this._voiceCount++;
    let state = ((Number(seed) || 1) * 7919) >>> 0;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const count = 5 + Math.floor(random() * 3);
    let t = now + 0.015;
    for (let i = 0; i < count; i++) {
      const pitch = 145 + random() * 130;
      const duration = 0.07 + random() * 0.065;
      const c = this.context;
      const source = c.createOscillator(); source.type = 'sawtooth';
      source.frequency.setValueAtTime(pitch, t);
      source.frequency.exponentialRampToValueAtTime(pitch * (0.8 + random() * 0.5), t + duration);
      const formant = c.createBiquadFilter(); formant.type = 'bandpass'; formant.frequency.value = [650, 950, 1450, 1850][Math.floor(random() * 4)]; formant.Q.value = 5;
      const envelope = c.createGain(); envelope.gain.setValueAtTime(0.00001, t);
      envelope.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.00001, t + duration);
      source.connect(formant); formant.connect(envelope); envelope.connect(this.effects);
      source.start(t); this._track(source, [source, formant, envelope], t + duration + 0.01);
      this._noteCount++; t += duration + 0.025;
    }
  }

  debug() {
    let rms = 0;
    if (this.analyser && this.context.state === 'running') {
      const wave = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(wave);
      for (const value of wave) rms += value * value;
      rms = Math.sqrt(rms / wave.length);
    }
    return { supported: this._supported, active: !!(this.context && this.context.state === 'running' && !this.muted), state: this.context?.state || 'locked', noteCount: this._noteCount, effectCount: this._effectCount, voiceCount: this._voiceCount, activeNodes: this._voices.size, defaultMusic: 0.1, musicVolume: this.musicVolume, volume: this.volume, muted: this.muted, rms };
  }

  dispose() {
    this._stopClock(); this._stopVoices(); this.muted = true;
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
  }
}
