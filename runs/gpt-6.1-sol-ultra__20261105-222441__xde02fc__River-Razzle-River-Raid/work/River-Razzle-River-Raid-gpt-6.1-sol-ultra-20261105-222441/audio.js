// River Razzle — all sound is synthesized. No media files or network requests.
export class AudioEngine {
  constructor(options = {}) {
    this.context = options.context || null;
    this.musicVolume = 0.1;
    this.sfxVolume = 0.65;
    this.muted = false;
    this.state = 'title';
    this.ready = false;
    this.step = 0;
    this.nextBeat = 0;
    this.lastWarning = -10;
    this.lastRefuel = -10;
    this.stats = { notes: 0, effects: 0, voices: 0, musicSteps: 0, sounds: {} };
    this._seed = 0x51ab;
  }
  _random() {
    this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0;
    return this._seed / 4294967296;
  }
  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context();
    }
    if (!this.ready) this._build();
    if (this.context.state === 'suspended' && this.context.resume && !('startRendering' in this.context)) {
      try { await this.context.resume(); } catch (_) { return false; }
    }
    return true;
  }
  _build() {
    const c = this.context;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 512;
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(c.destination);
    this.music = c.createGain();
    this.music.gain.value = this.musicVolume;
    this.music.connect(this.master);
    this.sfx = c.createGain();
    this.sfx.gain.value = this.sfxVolume;
    this.sfx.connect(this.master);
    this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < d.length; i++) {
      const white = this._random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      d[i] = brown * 2.5 + white * 0.22;
    }
    this.engine = c.createGain();
    this.engine.gain.value = 0;
    this.engine.connect(this.sfx);
    this.engineFilter = c.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 300;
    this.engineFilter.Q.value = 0.7;
    this.engineFilter.connect(this.engine);
    this.engineNoise = c.createBufferSource();
    this.engineNoise.buffer = this.noiseBuffer;
    this.engineNoise.loop = true;
    this.engineNoise.connect(this.engineFilter);
    this.engineNoise.start();
    this.engineOsc = c.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 65;
    const engineToneGain = c.createGain();
    engineToneGain.gain.value = 0.09;
    this.engineOsc.connect(engineToneGain);
    engineToneGain.connect(this.engineFilter);
    this.engineOsc.start();
    this.nextBeat = c.currentTime + 0.06;
    this.ready = true;
  }
  setMusic(volume = 0.1) {
    this.musicVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    if (this.ready) this.music.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.03);
  }
  setSfx(volume = 0.65) {
    this.sfxVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    if (this.ready) this.sfx.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.03);
  }
  setMuted(value) {
    this.muted = !!value;
    if (this.ready) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.62, this.context.currentTime, 0.025);
  }
  setState(state) {
    if (this.state !== state && this.ready) this.nextBeat = this.context.currentTime + 0.05;
    this.state = state;
  }
  _freq(note) { return 440 * Math.pow(2, (note - 69) / 12); }
  _tone(frequency, time, duration, volume, type = 'square', destination = this.sfx, endFrequency = null) {
    const c = this.context;
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(12, frequency), time);
    if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(12, endFrequency), time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + Math.min(0.008, duration * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.012);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    this.stats.notes++;
  }
  _noise(time, duration, volume, cutoff = 1500, type = 'lowpass', destination = this.sfx) {
    const c = this.context;
    const source = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, time);
    if (type === 'lowpass') filter.frequency.exponentialRampToValueAtTime(Math.max(70, cutoff * 0.12), time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(time, this._random());
    source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  _musicStep(index, time) {
    const s = index % 64;
    const beat = s % 16;
    const roots = [45, 45, 48, 43];
    const root = roots[Math.floor(s / 16)];
    const menu = !['playing', 'attract', 'game', 'running', 'coop'].includes(this.state);
    const level = menu ? 0.55 : 1;
    // Eight-bar river-run groove: syncopated bass, square lead, soft chord stabs.
    const bassPattern = [0, null, 0, 12, null, 7, 0, null, 0, null, 10, null, 12, 7, null, 0];
    const b = bassPattern[beat];
    if (b !== null) this._tone(this._freq(root + b), time, 0.19, 0.35 * level, 'triangle', this.music);
    const melody = [12, null, 15, 19, null, 22, 19, null, 17, null, 15, 12, null, 10, 12, null];
    const n = melody[(beat + (Math.floor(s / 16) % 2) * 4) % 16];
    if (n !== null && (!menu || beat % 4 === 0)) {
      this._tone(this._freq(root + n + 12), time, beat % 4 === 0 ? 0.23 : 0.12, 0.12 * level, 'square', this.music);
      this._tone(this._freq(root + n + 12) * 1.003, time + 0.015, 0.16, 0.045 * level, 'triangle', this.music);
    }
    if (beat === 0 || beat === 7 || beat === 12) {
      for (const offset of [12, 15, 19]) this._tone(this._freq(root + offset), time, 0.3, 0.075 * level, 'triangle', this.music);
    }
    if (!menu || beat % 2 === 0) {
      this._noise(time, beat % 2 ? 0.035 : 0.055, 0.055 * level, 6800, 'highpass', this.music);
    }
    if ([0, 6, 8, 14].includes(beat)) this._tone(115, time, 0.15, 0.6 * level, 'sine', this.music, 38);
    if (beat === 4 || beat === 12) {
      this._noise(time, 0.12, 0.23 * level, 2000, 'bandpass', this.music);
      this._tone(165, time, 0.075, 0.1 * level, 'triangle', this.music, 90);
    }
    this.stats.musicSteps++;
  }
  update(dt, { speed = 12, fuel = 100, active = false } = {}) {
    if (!this.ready) return;
    const c = this.context;
    const now = c.currentTime;
    const paused = ['paused', 'pause', 'settings', 'dev', 'about'].includes(this.state);
    if (this.nextBeat < now - 0.25) this.nextBeat = now + 0.02;
    const interval = 60 / 126 / 4;
    if (!paused) {
      let count = 0;
      while (this.nextBeat < now + 0.16 && count++ < 8) {
        this._musicStep(this.step++, this.nextBeat);
        this.nextBeat += interval;
      }
    }
    const velocity = Math.min(1.6, Math.max(0, speed / 18));
    this.engine.gain.setTargetAtTime(active && !paused ? 0.15 + velocity * 0.065 : 0, now, 0.16);
    this.engineOsc.frequency.setTargetAtTime(48 + velocity * 55, now, 0.15);
    this.engineFilter.frequency.setTargetAtTime(180 + velocity * 780, now, 0.15);
    this.engineNoise.playbackRate.setTargetAtTime(0.65 + velocity * 0.55, now, 0.15);
    if (active && !paused && fuel < 25 && now - this.lastWarning > (fuel < 10 ? 0.65 : 1.4)) {
      this.lastWarning = now;
      this.play('lowfuel');
    }
  }
  play(name) {
    if (!this.ready) return;
    const t = this.context.currentTime + 0.006;
    if (name === 'refuel' && t - this.lastRefuel < 0.14) return;
    if (name === 'refuel') this.lastRefuel = t;
    this.stats.effects++;
    this.stats.sounds[name] = (this.stats.sounds[name] || 0) + 1;
    switch (name) {
      case 'shot':
      case 'shoot':
        this._tone(1450, t, 0.075, 0.10, 'square', this.sfx, 370);
        this._noise(t, 0.035, 0.045, 3000, 'highpass');
        break;
      case 'explosion':
      case 'destroy':
        this._noise(t, 0.48, 0.85, 2200);
        this._tone(120, t, 0.35, 0.42, 'triangle', this.sfx, 28);
        this._tone(65, t, 0.4, 0.3, 'sine', this.sfx, 20);
        break;
      case 'bridge':
        this._noise(t, 0.9, 1.0, 3200);
        this._noise(t + 0.11, 0.55, 0.55, 1700);
        this._tone(105, t, 0.7, 0.65, 'sine', this.sfx, 24);
        for (let i = 0; i < 5; i++) this._tone(440 * Math.pow(2, i * 2 / 12), t + 0.08 + i * 0.055, 0.15, 0.16, 'triangle');
        break;
      case 'refuel':
        this._tone(880, t, 0.12, 0.12, 'sine');
        this._tone(1320, t + 0.035, 0.13, 0.075, 'triangle');
        break;
      case 'checkpoint':
        [0, 4, 7, 12].forEach((n, i) => this._tone(this._freq(72 + n), t + i * 0.075, 0.25, 0.18, 'triangle'));
        this.voice(4);
        break;
      case 'hit':
        this._noise(t, 0.3, 0.7, 2400);
        this._tone(260, t, 0.25, 0.35, 'sawtooth', this.sfx, 40);
        break;
      case 'pulse':
        this._tone(90, t, 0.55, 0.35, 'sine', this.sfx, 600);
        this._tone(1600, t, 0.5, 0.25, 'triangle', this.sfx, 70);
        this._noise(t, 0.4, 0.3, 6200, 'bandpass');
        break;
      case 'lowfuel':
        this._tone(440, t, 0.13, 0.12, 'triangle');
        this._tone(330, t + 0.16, 0.13, 0.10, 'triangle');
        break;
      case 'win':
        [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this._tone(this._freq(n), t + i * 0.11, 0.45, 0.22, 'triangle'));
        this._noise(t + 0.02, 0.6, 0.2, 6000, 'highpass');
        this.voice(7);
        break;
      case 'menu':
      case 'select':
        this._tone(650, t, 0.06, 0.09, 'triangle');
        this._tone(975, t + 0.035, 0.07, 0.07, 'triangle');
        break;
      case 'start':
        [52, 59, 64, 71].forEach((n, i) => this._tone(this._freq(n), t + i * 0.07, 0.19, 0.2, 'square'));
        this.voice(1);
        break;
      case 'gameover':
        [64, 60, 55, 48].forEach((n, i) => this._tone(this._freq(n), t + i * 0.18, 0.32, 0.19, 'triangle'));
        break;
      default:
        this._tone(740, t, 0.08, 0.08, 'triangle');
    }
  }
  voice(seed = 1) {
    if (!this.ready) return;
    this.stats.voices++;
    const t = this.context.currentTime + 0.04;
    // Short radio chirps with changing vowel resonances: intentionally no real words.
    const vowels = [[700, 1200], [350, 2200], [500, 1500], [300, 900], [650, 1900]];
    let localSeed = (Number(seed) || 1) * 1777;
    const rand = () => { localSeed = (Math.imul(localSeed, 1664525) + 1013904223) >>> 0; return localSeed / 4294967296; };
    for (let i = 0, count = 5 + Math.floor(rand() * 3); i < count; i++) {
      const c = this.context;
      const start = t + i * 0.09;
      const osc = c.createOscillator();
      const envelope = c.createGain();
      const vowel = vowels[Math.floor(rand() * vowels.length)];
      const volume = 0.10;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200 + rand() * 180, start);
      osc.frequency.linearRampToValueAtTime(170 + rand() * 220, start + 0.07);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(volume, start + 0.008);
      envelope.gain.linearRampToValueAtTime(0, start + 0.075);
      const filters = vowel.map(freq => {
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 5;
        osc.connect(filter);
        filter.connect(envelope);
        return filter;
      });
      envelope.connect(this.sfx);
      osc.start(start);
      osc.stop(start + 0.08);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); filters.forEach(f => f.disconnect()); };
    }
    this._noise(t - 0.02, 0.045, 0.07, 1800, 'bandpass');
    this._tone(1600, t + 0.75, 0.045, 0.055, 'sine');
  }
  debug() {
    let rms = 0;
    if (this.ready) {
      const samples = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(samples);
      for (const sample of samples) rms += sample * sample;
      rms = Math.sqrt(rms / samples.length);
    }
    return {
      ready: this.ready,
      contextState: this.context ? this.context.state : 'locked',
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
      rms,
      ...this.stats,
      sounds: { ...this.stats.sounds },
    };
  }
  dispose() {
    if (!this.ready) return;
    try { this.engineNoise.stop(); this.engineOsc.stop(); } catch (_) { /* Already stopped. */ }
    this.master.disconnect();
    this.ready = false;
    if (this.context.close) this.context.close().catch(() => {});
  }
}
