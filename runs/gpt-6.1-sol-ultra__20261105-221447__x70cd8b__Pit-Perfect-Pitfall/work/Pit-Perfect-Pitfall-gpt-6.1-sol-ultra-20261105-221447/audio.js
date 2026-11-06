/** All sound is synthesized here; no recordings, soundfonts, or audio files. */
export class AudioSystem {
  constructor(options = {}) {
    this.context = options.context || null;
    this.ctx = this.context;
    this.musicVolume = 0.10;
    this.sfxVolume = 0.70;
    this.enabled = false;
    this.underground = false;
    this.step = 0;
    this.nextStep = 0;
    this.nextBird = 0;
    this.events = {};
    this.voices = 0;
    this.musicNotes = 0;
    this.lastVoice = -100;
    this.lastEffect = {};
    this._seed = 1982;
    if (this.context) this._build();
  }

  _random() {
    this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0;
    return this._seed / 4294967296;
  }

  _build() {
    const c = this.context;
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = 0.72;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this._samples = new Float32Array(this.analyser.fftSize);
    this.master.connect(this.compressor).connect(this.analyser).connect(c.destination);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.musicFilter = c.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 6800;
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(this.master);
    this.ambientBus = c.createGain();
    this.ambientBus.gain.value = 0.075;
    this.ambientBus.connect(this.sfxBus);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = this._random() * 2 - 1;
    this.nextStep = c.currentTime + 0.04;
    this.nextBird = c.currentTime + 1.6;
    this.enabled = true;
  }

  async unlock() {
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return false;
        this.context = new Context();
        this._build();
      }
      if (this.context.state === 'suspended' && this.context.resume) await this.context.resume();
      this.enabled = true;
      return true;
    } catch {
      this.enabled = false;
      return false;
    }
  }

  setMusic(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.03);
  }

  setSfx(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.03);
  }

  _tone(freq, when, duration, amplitude, type = 'sine', bus = this.sfxBus, endFreq = null) {
    const c = this.context;
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, freq), when);
    if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), when + duration);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(amplitude, when + Math.min(0.009, duration * 0.1));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain).connect(bus);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.015);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  _noise(when, duration, amplitude, frequency = 2000, bus = this.sfxBus, filterType = 'highpass') {
    const c = this.context;
    const source = c.createBufferSource();
    source.buffer = this.noise;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    const gain = c.createGain();
    gain.gain.setValueAtTime(amplitude, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(gain).connect(bus);
    source.start(when, this._random() * 0.8);
    source.stop(when + duration + 0.01);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  _marimba(midi, when, velocity = 1, duration = 0.4) {
    const f = 440 * 2 ** ((midi - 69) / 12);
    this._tone(f, when, duration, 0.42 * velocity, 'sine', this.musicBus);
    this._tone(f * 3.98, when, duration * 0.23, 0.12 * velocity, 'sine', this.musicBus);
    this._tone(f * 7.92, when, 0.035, 0.035 * velocity, 'sine', this.musicBus);
    this.musicNotes++;
  }

  _musicStep(when) {
    const s = this.step % 64;
    const pattern = [76, null, 79, 81, null, 79, 76, null, 74, null, 76, 79, 74, null, 71, null,
      72, null, 76, 79, null, 76, 72, null, 74, 76, 74, null, 71, null, 67, null,
      76, null, 79, 83, 81, null, 79, null, 74, null, 79, 81, 79, 76, 74, null,
      72, 76, 79, null, 76, 72, null, 69, 71, null, 74, 76, 74, null, 71, null];
    const transpose = this.underground ? -12 : 0;
    const note = pattern[s];
    if (note !== null) this._marimba(note + transpose, when, s % 4 === 0 ? 1 : 0.68);
    const roots = [40, 40, 36, 43];
    if (s % 4 === 0) {
      const root = roots[Math.floor(s / 16)] + (s % 8 === 4 ? 7 : 0);
      const bass = 440 * 2 ** ((root - 69) / 12);
      this._tone(bass, when, 0.38, 0.40, 'triangle', this.musicBus);
      this._tone(105, when, 0.12, 0.30, 'sine', this.musicBus, 47);
    }
    if (s % 4 === 2) {
      this._tone(235, when, 0.11, 0.17, 'sine', this.musicBus, 120);
      this._noise(when, 0.065, 0.065, 950, this.musicBus, 'bandpass');
    }
    this._noise(when, s % 2 ? 0.026 : 0.045, s % 2 ? 0.045 : 0.075, 6200, this.musicBus);
    if (s % 8 === 7) this._tone(520, when + 0.06, 0.05, 0.065, 'sine', this.musicBus, 360);
    this.step++;
  }

  update(_dt, underground = false) {
    if (!this.enabled || !this.context || (this.context.state === 'suspended' && typeof this.context.startRendering !== 'function')) return;
    const now = this.context.currentTime;
    if (this.underground !== underground) {
      this.underground = underground;
      this.musicFilter.frequency.setTargetAtTime(underground ? 2200 : 6800, now, 0.5);
    }
    // Never replay a backlog after a sleeping tab or a paused game.
    if (this.nextStep < now - 0.3) this.nextStep = now + 0.025;
    while (this.nextStep < now + 0.12) {
      this._musicStep(this.nextStep);
      this.nextStep += 60 / 112 / 2;
    }
    if (now > this.nextBird) {
      if (underground) {
        this._tone(1400, now + 0.02, 0.11, 0.22, 'sine', this.ambientBus, 720);
        this._tone(720, now + 0.19, 0.16, 0.08, 'sine', this.ambientBus, 570);
      } else {
        const bird = 1200 + this._random() * 1400;
        this._tone(bird, now + 0.02, 0.095, 0.15, 'sine', this.ambientBus, bird * 1.5);
        this._tone(bird * 1.2, now + 0.15, 0.12, 0.12, 'sine', this.ambientBus, bird * 0.85);
        this._tone(bird * 1.05, now + 0.32, 0.08, 0.08, 'sine', this.ambientBus, bird * 1.7);
      }
      this.nextBird = now + 3.7 + this._random() * 5;
      this.events.ambient = (this.events.ambient || 0) + 1;
    }
  }

  effect(name) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime + 0.005;
    const cooldown = name === 'step' ? 0.12 : name === 'land' ? 0.07 : 0.025;
    if (now - (this.lastEffect[name] ?? -10) < cooldown) return;
    this.lastEffect[name] = now;
    this.events[name] = (this.events[name] || 0) + 1;
    switch (name) {
      case 'jump':
        this._tone(195, now, 0.15, 0.13, 'triangle', this.sfxBus, 540);
        this._noise(now, 0.06, 0.035, 1200);
        break;
      case 'land':
        this._tone(105, now, 0.10, 0.16, 'sine', this.sfxBus, 55);
        this._noise(now, 0.075, 0.085, 900, this.sfxBus, 'lowpass');
        break;
      case 'step':
        this._noise(now, 0.04, 0.045, 1500, this.sfxBus, 'bandpass');
        break;
      case 'treasure':
        [76, 79, 83, 88].forEach((note, i) => {
          const f = 440 * 2 ** ((note - 69) / 12);
          this._tone(f, now + i * 0.075, 0.38, 0.15, 'sine');
          this._tone(f * 2, now + i * 0.075, 0.11, 0.04, 'sine');
        });
        break;
      case 'hit':
      case 'death':
        this._noise(now, 0.20, 0.18, 500, this.sfxBus, 'bandpass');
        this._tone(230, now, 0.33, 0.17, 'sawtooth', this.sfxBus, 50);
        this.voice('hurt');
        break;
      case 'swing':
        this._noise(now, 0.28, 0.055, 1000, this.sfxBus, 'bandpass');
        this.voice('swing');
        break;
      case 'checkpoint':
        [64, 71, 76].forEach((note, i) => this._tone(440 * 2 ** ((note - 69) / 12), now + i * 0.11, 0.36, 0.14, 'triangle'));
        break;
      case 'win':
        [72, 76, 79, 84, 79, 84, 88].forEach((note, i) => this._tone(440 * 2 ** ((note - 69) / 12), now + i * 0.11, 0.54, 0.15, 'triangle'));
        this.voice('win');
        break;
      case 'water':
      case 'splash':
        this._noise(now, 0.42, 0.19, 900, this.sfxBus, 'lowpass');
        [130, 175, 230].forEach((f, i) => this._tone(f, now + 0.07 * i, 0.12, 0.07, 'sine', this.sfxBus, f * 1.8));
        break;
      case 'menu':
      case 'select':
        this._tone(660, now, 0.055, 0.06, 'sine', this.sfxBus, 880);
        break;
      case 'pause':
        this._tone(520, now, 0.15, 0.08, 'triangle', this.sfxBus, 260);
        break;
      default:
        this._tone(430, now, 0.08, 0.06, 'sine');
    }
  }

  voice(type = 'hello') {
    if (!this.enabled || !this.context) return;
    const c = this.context;
    const now = c.currentTime + 0.012;
    if (now - this.lastVoice < 0.4) return;
    this.lastVoice = now;
    this.voices++;
    this.events.voice = (this.events.voice || 0) + 1;
    const syllables = type === 'swing' ? [320, 590, 390, 660, 470] : type === 'hurt' ? [240, 160, 130] : type === 'win' ? [410, 520, 680, 550, 760] : [380, 470, 330, 570];
    const vowels = [[780, 1200], [350, 2300], [500, 1600], [450, 850], [700, 1400]];
    for (let i = 0; i < syllables.length; i++) {
      const t = now + i * (type === 'swing' ? 0.085 : 0.075);
      const duration = type === 'swing' && i === syllables.length - 1 ? 0.23 : 0.095;
      const source = c.createOscillator();
      source.type = 'sawtooth';
      source.frequency.setValueAtTime(syllables[i], t);
      source.frequency.exponentialRampToValueAtTime(syllables[i] * (i % 2 ? 0.91 : 1.12), t + duration);
      const envelope = c.createGain();
      envelope.gain.setValueAtTime(0, t);
      envelope.gain.linearRampToValueAtTime(0.09, t + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      source.connect(envelope);
      const filters = [];
      for (const frequency of vowels[(i + (type === 'hurt' ? 3 : 0)) % vowels.length]) {
        const formant = c.createBiquadFilter();
        formant.type = 'bandpass';
        formant.frequency.value = frequency;
        formant.Q.value = 5;
        envelope.connect(formant).connect(this.sfxBus);
        filters.push(formant);
      }
      source.start(t);
      source.stop(t + duration + 0.01);
      source.onended = () => { source.disconnect(); envelope.disconnect(); filters.forEach(f => f.disconnect()); };
    }
  }

  get metrics() {
    let peak = 0, rms = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this._samples);
      for (const value of this._samples) { peak = Math.max(peak, Math.abs(value)); rms += value * value; }
      rms = Math.sqrt(rms / this._samples.length);
    }
    return {
      enabled: this.enabled,
      state: this.context?.state || 'locked',
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      musicNotes: this.musicNotes,
      voices: this.voices,
      events: { ...this.events },
      peak,
      rms,
    };
  }
}
