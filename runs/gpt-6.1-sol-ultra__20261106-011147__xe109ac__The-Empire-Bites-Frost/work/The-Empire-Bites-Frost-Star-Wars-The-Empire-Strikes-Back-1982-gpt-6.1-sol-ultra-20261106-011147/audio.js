/** All sound is synthesized here. No recordings, speech service, or media files. */
export class AudioSystem {
  constructor(context = null) {
    this.context = context;
    this.musicVolume = 0.1;
    this.sfxVolume = 0.7;
    this.muted = false;
    this.ready = false;
    this.events = {};
    this.step = 0;
    this.nextBeat = 0;
    this.playing = false;
    this.danger = 0;
    this.last = {};
    if (context) this._build();
  }

  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context({ latencyHint: 'interactive' });
      this._build();
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }

  _build() {
    if (this.ready) return;
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.65;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 4;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.master.connect(this.compressor).connect(this.analyser).connect(c.destination);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.musicBus.connect(this.master);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(this.master);
    this.ambienceBus = c.createGain();
    this.ambienceBus.gain.value = 0;
    this.ambienceBus.connect(this.sfxBus);
    // A short, very quiet synthesized echo gives radio and brass some space.
    this.echo = c.createDelay(1);
    this.echo.delayTime.value = 0.225;
    this.echoGain = c.createGain();
    this.echoGain.gain.value = 0.17;
    this.musicBus.connect(this.echo);
    this.echo.connect(this.echoGain).connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const samples = this.noise.getChannelData(0);
    let seed = 97183, last = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 16807) % 2147483647;
      const white = seed / 1073741824 - 1;
      last = (last + white * 0.04) / 1.04;
      samples[i] = last * 4;
    }
    this.wind = c.createBufferSource();
    this.wind.buffer = this.noise;
    this.wind.loop = true;
    const windFilter = c.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 550;
    windFilter.Q.value = 0.5;
    const windGain = c.createGain();
    windGain.gain.value = 0.065;
    this.wind.connect(windFilter).connect(windGain).connect(this.ambienceBus);
    this.wind.start();
    this.engine = c.createOscillator();
    this.engine.type = 'triangle';
    this.engine.frequency.value = 48;
    this.engineGain = c.createGain();
    this.engineGain.gain.value = 0.045;
    this.engine.connect(this.engineGain).connect(this.ambienceBus);
    this.engine.start();
    this.ready = true;
    this.nextBeat = c.currentTime + 0.05;
  }

  setMusic(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ready) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.03);
  }
  setSfx(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ready) this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.03);
  }
  setMuted(value) {
    this.muted = !!value;
    if (this.ready) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.65, this.context.currentTime, 0.02);
  }

  update(dt, { speed = 0, danger = 0, playing = true } = {}) {
    this.playing = !!playing;
    this.danger = Math.max(0, Math.min(1, danger));
    if (!this.ready || this.context.state !== 'running') return;
    const c = this.context, now = c.currentTime;
    this.engine.frequency.setTargetAtTime(46 + Math.min(100, Math.abs(speed)) * 1.7, now, 0.12);
    this.ambienceBus.gain.setTargetAtTime(playing ? 1 : 0.18, now, 0.3);
    // Audio-clock lookahead remains stable when rendering briefly stalls.
    if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.025;
    let count = 0;
    while (this.nextBeat < now + 0.16 && count++ < 4) {
      this._musicStep(this.step++, this.nextBeat);
      this.nextBeat += 0.2083333333; // 144 BPM eighths.
    }
  }

  _tone(freq, start, duration, volume, type = 'triangle', bus = this.sfxBus, to = null, cutoff = 0) {
    const c = this.context;
    const oscillator = c.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(10, freq), start);
    if (to) oscillator.frequency.exponentialRampToValueAtTime(Math.max(10, to), start + duration);
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.025, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (cutoff) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.3), start + duration);
      oscillator.connect(filter).connect(envelope).connect(bus);
    } else oscillator.connect(envelope).connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    return oscillator;
  }

  _noise(start, duration, volume, frequency = 600, type = 'lowpass', bus = this.sfxBus) {
    const c = this.context, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noise;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(bus);
    source.start(start, 0, duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  _musicStep(step, t) {
    const s = step % 64, bar = Math.floor(s / 8);
    // Original D-minor / B-flat / F / C progression and asymmetrical lead phrase.
    const roots = [38, 38, 34, 34, 41, 41, 36, 36];
    const root = roots[bar];
    const hz = note => 440 * 2 ** ((note - 69) / 12);
    if (s % 2 === 0) this._tone(hz(root), t, 0.32, 0.30, 'triangle', this.musicBus);
    if (s % 8 === 0) {
      this._tone(80, t, 0.14, 0.33, 'sine', this.musicBus, 33);
      [root + 24, root + 27, root + 31].forEach((n, i) => {
        this._tone(hz(n), t + i * 0.016, 1.15, 0.105, 'sawtooth', this.musicBus, null, 1200);
      });
    }
    if (s % 8 === 4) this._noise(t, 0.09, 0.13, 1700, 'highpass', this.musicBus);
    if (this.playing && s % 2 === 1) this._noise(t, 0.035, 0.07, 3400, 'highpass', this.musicBus);
    const phrase = [74, null, 69, 72, null, 77, 76, null, 74, null, 65, 69, 72, null, 70, null];
    if (s < 16 || (s >= 32 && s < 48)) {
      const note = phrase[s % 16];
      if (note) this._tone(hz(note), t, s % 4 === 0 ? 0.5 : 0.29, 0.16, 'sawtooth', this.musicBus, null, 1700);
    } else if (s % 4 === 2) {
      this._tone(hz(root + 36 + [0, 7, 3, 10][Math.floor(s / 4) % 4]), t, 0.7, 0.1, 'sine', this.musicBus);
    }
    if (this.danger > 0.5 && s % 2 === 0) this._tone(hz(50 + s % 4), t, 0.11, 0.1, 'square', this.musicBus, null, 650);
  }

  sfx(name, when = null) {
    if (!this.ready) return;
    const c = this.context, t = when ?? c.currentTime;
    // Prevent accidental per-frame triggering from overwhelming the mix.
    const minimum = { shoot: 0.045, hit: 0.055, repair: 0.35, boost: 0.4, ui: 0.045 }[name] || 0.02;
    if (when === null && t - (this.last[name] ?? -100) < minimum) return;
    this.last[name] = t;
    this.events[name] = (this.events[name] || 0) + 1;
    switch (name) {
      case 'shoot':
        this._tone(1350, t, 0.16, 0.12, 'sawtooth', this.sfxBus, 230, 2600);
        this._tone(720, t + 0.012, 0.11, 0.07, 'sine', this.sfxBus, 160);
        break;
      case 'hit':
        this._noise(t, 0.16, 0.23, 1450, 'bandpass');
        this._tone(170, t, 0.12, 0.2, 'square', this.sfxBus, 65, 1200);
        break;
      case 'explosion':
        this._noise(t, 0.95, 0.7, 850);
        this._noise(t + 0.04, 0.42, 0.2, 2200, 'bandpass');
        this._tone(110, t, 0.7, 0.5, 'sine', this.sfxBus, 24);
        this._tone(58, t + 0.12, 0.8, 0.3, 'triangle', this.sfxBus, 22);
        break;
      case 'boost':
        this._noise(t, 0.55, 0.3, 950, 'bandpass');
        this._tone(85, t, 0.45, 0.17, 'sawtooth', this.sfxBus, 220, 900);
        break;
      case 'repair':
        [440, 554.37, 659.25].forEach((f, i) => this._tone(f, t + i * 0.08, 0.22, 0.12, 'sine'));
        break;
      case 'weakpoint':
        [660, 990, 1320, 1760].forEach((f, i) => this._tone(f, t + i * 0.035, 0.27, 0.13, 'triangle'));
        this._noise(t, 0.16, 0.12, 3500, 'highpass');
        break;
      case 'victory':
        [62, 65, 69, 74, 72, 77, 74].forEach((n, i) => this._tone(440 * 2 ** ((n - 69) / 12), t + i * 0.2, 0.65, 0.22, 'sawtooth', this.sfxBus, null, 1800));
        break;
      case 'defeat':
        [62, 61, 57, 50].forEach((n, i) => this._tone(440 * 2 ** ((n - 69) / 12), t + i * 0.3, 0.65, 0.2, 'triangle'));
        break;
      case 'force':
        [293.66, 440, 587.33, 880].forEach((f, i) => this._tone(f, t + i * 0.07, 1.3, 0.13, 'sine', this.sfxBus, f * 1.5));
        this._noise(t, 0.8, 0.12, 1700, 'bandpass');
        break;
      default:
        this._tone(660, t, 0.065, 0.1, 'sine', this.sfxBus, 880);
    }
  }

  voice(seed = 1, when = null) {
    if (!this.ready) return;
    const c = this.context, now = when ?? c.currentTime;
    if (when === null && now - (this.last.voice ?? -10) < 1) return;
    this.last.voice = now;
    this.events.voice = (this.events.voice || 0) + 1;
    let randomSeed = ((Number(seed) || 1) * 9301 + 49297) >>> 0;
    const random = () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296; };
    const vowels = [[650, 1080], [350, 1800], [420, 820], [280, 2200], [800, 1350]];
    const count = 5 + Math.floor(random() * 4);
    let t = now;
    for (let i = 0; i < count; i++) {
      const duration = 0.075 + random() * 0.075, v = vowels[Math.floor(random() * vowels.length)];
      const oscillator = c.createOscillator(), envelope = c.createGain();
      oscillator.type = 'sawtooth';
      const pitch = 170 + random() * 160 + (i === count - 1 ? 70 : 0);
      oscillator.frequency.setValueAtTime(pitch, t);
      oscillator.frequency.exponentialRampToValueAtTime(pitch * (0.85 + random() * 0.3), t + duration);
      envelope.gain.setValueAtTime(0.0001, t);
      envelope.gain.linearRampToValueAtTime(0.16, t + 0.014);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      oscillator.connect(envelope);
      const formants = v.map((f, j) => {
        const filter = c.createBiquadFilter(), gain = c.createGain();
        filter.type = 'bandpass'; filter.frequency.value = f; filter.Q.value = 6;
        gain.gain.value = j === 0 ? 1 : 0.5;
        envelope.connect(filter).connect(gain).connect(this.sfxBus);
        return [filter, gain];
      });
      this._noise(t, 0.024, 0.065, 2100 + random() * 1500, 'highpass');
      oscillator.start(t); oscillator.stop(t + duration + 0.01);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); formants.forEach(([f, g]) => { f.disconnect(); g.disconnect(); }); };
      t += duration + 0.025 + (i === 2 ? 0.12 : 0);
    }
  }

  inspect() {
    let rms = 0, peak = 0;
    if (this.ready) {
      const values = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(values);
      for (const v of values) { rms += v * v; peak = Math.max(peak, Math.abs(v)); }
      rms = Math.sqrt(rms / values.length);
    }
    return { ready: this.ready, state: this.context?.state || 'locked', music: this.musicVolume, sfx: this.sfxVolume, muted: this.muted, rms, peak, events: { ...this.events }, musicSteps: this.step };
  }

  static async renderTest() {
    const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Context) return { supported: false };
    const context = new Context(2, 44100 * 4, 44100), audio = new AudioSystem(context);
    audio.playing = true;
    for (let i = 0; i < 16; i++) audio._musicStep(i, 0.03 + i * 0.2083333333);
    audio.sfx('shoot', 0.2); audio.sfx('hit', 0.5); audio.sfx('explosion', 1);
    audio.sfx('repair', 2); audio.sfx('weakpoint', 2.5); audio.voice(9, 2.8);
    const buffer = await context.startRendering(), data = buffer.getChannelData(0);
    let sum = 0, peak = 0, nonFinite = 0;
    for (const value of data) { if (!Number.isFinite(value)) nonFinite++; sum += value * value; peak = Math.max(peak, Math.abs(value)); }
    return { supported: true, frames: buffer.length, rms: Math.sqrt(sum / data.length), peak, nonFinite, music: audio.musicVolume, events: audio.events };
  }
}
