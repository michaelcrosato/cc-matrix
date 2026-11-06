// All sound is synthesized here. No samples, recordings, or speech services.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.10;
    this.sfxVolume = 0.65;
    this.active = false;
    this.stopped = false;
    this.counts = { notes: 0, events: 0, voices: 0 };
    this.seed = 0x43a2f19;
    this.step = 0;
    this.nextBeat = 0;
    this.lastEvents = new Map();
    this.danger = 0;
    this.throttle = 0;
    this.sources = new Set();
  }

  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  async unlock() {
    if (!this.ctx) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.ctx = new Context({ latencyHint: 'interactive' });
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.78;
      this.music = c.createGain();
      this.music.gain.value = this.musicVolume;
      this.sfx = c.createGain();
      this.sfx.gain.value = this.sfxVolume;
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.16;
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 1024;
      this.samples = new Float32Array(this.analyser.fftSize);
      this.master.connect(compressor);
      compressor.connect(this.analyser);
      this.analyser.connect(c.destination);
      this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const noise = this.noiseBuffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < noise.length; i++) {
        brown = (brown + (this.random() * 2 - 1) * 0.055) / 1.025;
        noise[i] = brown * 2.1;
      }
      this.makeRotor();
      this.nextBeat = c.currentTime + 0.05;
    }
    this.stopped = false;
    try {
      if (this.ctx.state !== 'running') await this.ctx.resume();
    } catch { return false; }
    this.master.gain.setTargetAtTime(0.78, this.ctx.currentTime, 0.025);
    return this.ctx.state === 'running';
  }

  makeRotor() {
    const c = this.ctx;
    const source = c.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 430;
    this.rotor = c.createGain();
    this.rotor.gain.value = 0;
    const chopper = c.createGain();
    chopper.gain.value = 0.5;
    this.rotorLfo = c.createOscillator();
    this.rotorLfo.type = 'sine';
    this.rotorLfo.frequency.value = 19;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 0.46;
    this.rotorLfo.connect(lfoDepth);
    lfoDepth.connect(chopper.gain);
    source.connect(filter);
    filter.connect(chopper);
    chopper.connect(this.rotor);
    this.rotor.connect(this.sfx);
    source.start();
    this.rotorLfo.start();
    this.rotorSource = source;
  }

  setMusic(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.music) this.music.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.035);
  }

  setSfx(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.sfx) this.sfx.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.035);
  }

  // An exponential envelope prevents clicks when many lasers overlap.
  tone(freq, duration, type = 'triangle', volume = 0.15, at, bus, endFreq, pan = 0) {
    if (!this.ctx || this.stopped) return;
    const c = this.ctx;
    const start = Math.max(c.currentTime, at ?? c.currentTime);
    const oscillator = c.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.008, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    const destination = bus || this.sfx;
    if (c.createStereoPanner && pan) {
      const panner = c.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
      envelope.connect(panner);
      panner.connect(destination);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); panner.disconnect(); this.sources.delete(oscillator); };
    } else {
      envelope.connect(destination);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); this.sources.delete(oscillator); };
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
    this.sources.add(oscillator);
    this.counts.notes++;
  }

  noise(duration, volume, cutoff, at, rising = false, pan = 0) {
    if (!this.ctx || this.stopped) return;
    const c = this.ctx, start = Math.max(c.currentTime, at ?? c.currentTime);
    const source = c.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = rising ? 1.7 : 0.7 + this.random() * 0.5;
    const filter = c.createBiquadFilter();
    filter.type = rising ? 'bandpass' : 'lowpass';
    filter.Q.value = rising ? 2.5 : 0.7;
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(rising ? cutoff * 3 : Math.max(60, cutoff / 5), start + duration);
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.009);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    let panner;
    if (c.createStereoPanner && pan) {
      panner = c.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
      envelope.connect(panner);
      panner.connect(this.sfx);
    } else envelope.connect(this.sfx);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); panner?.disconnect(); this.sources.delete(source); };
    source.start(start, this.random() * 0.2);
    source.stop(start + duration + 0.02);
    this.sources.add(source);
  }

  play(name, options = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.stopped) return;
    const now = this.ctx.currentTime;
    const cooldown = name === 'shoot' ? 0.045 : name === 'hit' ? 0.055 : 0;
    if (now - (this.lastEvents.get(name) ?? -Infinity) < cooldown) return;
    this.lastEvents.set(name, now);
    this.counts.events++;
    const pan = options.pan ?? 0;
    const tone = (f, d, type, v, delay = 0, end) => this.tone(f, d, type, v, now + delay, this.sfx, end, pan);
    switch (name) {
      case 'shoot':
        tone(1550 + this.random() * 200, 0.105, 'square', 0.07, 0, 460);
        tone(390, 0.045, 'triangle', 0.13, 0, 110);
        break;
      case 'enemy':
        tone(240, 0.16, 'sawtooth', 0.07, 0, 75);
        this.noise(0.13, 0.09, 1900, now, false, pan);
        break;
      case 'split':
        tone(650, 0.15, 'triangle', 0.11, 0, 1300);
        tone(780, 0.14, 'triangle', 0.07, 0.04, 280);
        break;
      case 'hit':
        this.noise(0.18, 0.22, 2300, now, false, pan);
        tone(135, 0.16, 'sawtooth', 0.16, 0, 50);
        break;
      case 'explode':
        this.noise(0.7, 0.65, 3600, now, false, pan);
        this.noise(0.42, 0.22, 700, now + 0.08, false, pan);
        tone(88, 0.52, 'sine', 0.36, 0, 25);
        tone(56, 0.7, 'triangle', 0.16, 0.025, 24);
        break;
      case 'pulse':
        tone(85, 0.8, 'sine', 0.34, 0, 520);
        tone(220, 0.6, 'triangle', 0.14, 0.1, 1760);
        this.noise(0.65, 0.23, 400, now, true, pan);
        break;
      case 'pickup':
        [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0.22, 'sine', 0.18, i * 0.07));
        break;
      case 'wave':
        [220, 293.66, 349.23, 440].forEach((f, i) => tone(f, 0.32, 'triangle', 0.15, i * 0.115));
        this.voice(7 + this.step);
        break;
      case 'victory':
        [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i === 6 ? 1.15 : 0.4, 'triangle', 0.20, i * 0.14));
        this.voice(123);
        break;
      case 'defeat':
        [329.63, 293.66, 220, 164.81, 130.81].forEach((f, i) => tone(f, 0.52, 'triangle', 0.16, i * 0.21));
        this.voice(59);
        break;
      case 'menu':
      default:
        tone(610, 0.045, 'sine', 0.14);
        tone(910, 0.065, 'triangle', 0.08, 0.035);
    }
  }

  // Brief radio babble: changing formants articulate imaginary syllables.
  voice(seed = 1) {
    if (!this.ctx || this.ctx.state !== 'running' || this.stopped) return;
    let value = typeof seed === 'number' ? seed | 0 : [...String(seed)].reduce((n, ch) => Math.imul(n, 31) + ch.charCodeAt(0), 17);
    const rand = () => { value = (Math.imul(value, 1103515245) + 12345) >>> 0; return value / 4294967296; };
    const c = this.ctx, now = c.currentTime + 0.025;
    this.counts.voices++;
    const radio = c.createBiquadFilter();
    radio.type = 'bandpass';
    radio.frequency.value = 1250;
    radio.Q.value = 0.55;
    const radioGain = c.createGain();
    radioGain.gain.value = 0.18;
    radio.connect(radioGain);
    radioGain.connect(this.sfx);
    this.noise(0.09, 0.05, 2800, now);
    const syllables = 5 + Math.floor(rand() * 4);
    let at = now;
    for (let i = 0; i < syllables; i++) {
      const duration = 0.075 + rand() * 0.065;
      const oscillator = c.createOscillator();
      oscillator.type = 'sawtooth';
      const pitch = 170 + rand() * 150;
      oscillator.frequency.setValueAtTime(pitch, at);
      oscillator.frequency.linearRampToValueAtTime(pitch * (0.8 + rand() * 0.6), at + duration);
      const formant = c.createBiquadFilter();
      formant.type = 'bandpass';
      formant.Q.value = 5;
      formant.frequency.setValueAtTime([580, 940, 1350, 2100, 2600][Math.floor(rand() * 5)], at);
      const envelope = c.createGain();
      envelope.gain.setValueAtTime(0.001, at);
      envelope.gain.linearRampToValueAtTime(0.7, at + 0.014);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + duration);
      oscillator.connect(formant);
      formant.connect(envelope);
      envelope.connect(radio);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.01);
      this.sources.add(oscillator);
      oscillator.onended = () => { oscillator.disconnect(); formant.disconnect(); envelope.disconnect(); this.sources.delete(oscillator); };
      at += duration + 0.025 + rand() * 0.025;
    }
    this.noise(0.08, 0.035, 2200, at);
    // Disconnect after all syllables, using an inaudible scheduled source as clock.
    const clock = c.createOscillator(), silence = c.createGain();
    silence.gain.value = 0;
    clock.connect(silence);
    silence.connect(this.sfx);
    clock.start(now);
    clock.stop(at + 0.1);
    clock.onended = () => { clock.disconnect(); silence.disconnect(); radio.disconnect(); radioGain.disconnect(); };
  }

  musicStep(at) {
    const index = this.step++;
    const bar = Math.floor(index / 16) % 8;
    const root = [45, 45, 48, 48, 41, 41, 43, 43][bar];
    const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
    const tone = (midi, duration, type, gain, delay = 0) => this.tone(frequency(midi), duration, type, gain, at + delay, this.music);
    // A minor-key motor rhythm with a bright fifth above the dusty bass.
    if (index % 4 === 0) {
      tone(root - 12, 0.29, 'triangle', 0.55);
      this.tone(115, 0.13, 'sine', 0.4, at, this.music, 42);
    }
    if (index % 8 === 4) tone(root - 5, 0.23, 'triangle', 0.30);
    if (index % 16 === 0) {
      [0, 3, 7, 12].forEach((interval, i) => tone(root + 12 + interval, 2.1, 'triangle', 0.08, i * 0.018));
    }
    const melody = [12, 19, 15, 22, 19, 15, 10, 7, 12, 15, 19, 24, 22, 19, 15, 7];
    if (index % 2 === 0) tone(root + melody[(index / 2 + bar * 3) % melody.length], 0.18, 'sine', 0.16);
    if (this.danger > 0.5 && index % 4 === 2) tone(root + 31, 0.07, 'square', 0.04);
    // Small metallic ticks, synthesized with a pair of detuned high oscillators.
    if (index % 2 === 1) {
      this.tone(6100, 0.025, 'square', 0.022, at, this.music);
      this.tone(8430, 0.018, 'square', 0.012, at, this.music);
    }
    if (index % 8 === 4) {
      this.tone(186, 0.08, 'triangle', 0.15, at, this.music, 80);
      this.tone(1700, 0.04, 'sawtooth', 0.025, at, this.music, 600);
    }
  }

  update(dt, { active = false, throttle = 0, danger = 0, attract = false } = {}) {
    this.active = !!active;
    this.throttle = Math.max(0, Math.min(1, throttle));
    this.danger = Math.max(0, Math.min(1, danger));
    if (!this.ctx || this.ctx.state !== 'running' || this.stopped) return;
    const c = this.ctx;
    this.rotor.gain.setTargetAtTime(active ? (attract ? 0.10 : 0.15) + this.throttle * 0.07 : 0, c.currentTime, 0.08);
    this.rotorLfo.frequency.setTargetAtTime(18 + this.throttle * 9, c.currentTime, 0.15);
    if (this.nextBeat < c.currentTime - 0.25) this.nextBeat = c.currentTime + 0.02;
    const sixteenth = 60 / (104 + this.danger * 10) / 4;
    while (this.nextBeat < c.currentTime + 0.15) {
      this.musicStep(this.nextBeat);
      this.nextBeat += sixteenth;
    }
  }

  stop() {
    this.stopped = true;
    this.active = false;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    for (const source of this.sources) {
      try { source.stop(); } catch { /* It may already have ended. */ }
    }
    this.sources.clear();
    this.ctx.suspend().catch(() => {});
  }

  async resume() {
    const ready = await this.unlock();
    if (this.ctx) this.nextBeat = this.ctx.currentTime + 0.02;
    return ready;
  }

  stats() {
    let rms = 0, peak = 0;
    if (this.analyser && this.ctx?.state === 'running' && !this.stopped) {
      this.analyser.getFloatTimeDomainData(this.samples);
      for (const sample of this.samples) { rms += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
      rms = Math.sqrt(rms / this.samples.length);
    }
    return {
      ...this.counts,
      active: this.active && !this.stopped,
      ready: !!this.ctx,
      state: this.ctx?.state || 'locked',
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      rms,
      peak,
      playingSources: this.sources.size,
      rotorRunning: !!this.ctx && this.active && !this.stopped,
    };
  }
}
