/** Super Bounceout's entirely synthesized sound cabinet. No recordings. */
export class ArcadeAudio {
  constructor(options = {}) {
    this.context = options.context || null;
    this.musicVolume = .10;
    this.sfxVolume = .65;
    this.muted = false;
    this.stage = 0;
    this.step = 0;
    this.nextBeat = 0;
    this.running = false;
    this.ready = false;
    this.notesPlayed = 0;
    this.effectsPlayed = 0;
    this.syllablesPlayed = 0;
    this.voiceUntil = 0;
    this.lastWall = -1;
    this.lastCharge = -1;
    if (this.context) this._build();
  }

  async unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context({ latencyHint: 'interactive' });
      this._build();
    }
    if (this.context.state === 'suspended') await this.context.resume();
    this.nextBeat = this.context.currentTime + .035;
    return this.context.state === 'running';
  }

  _build() {
    if (this.ready) return;
    const ctx = this.context;
    this.master = ctx.createGain();
    this.master.gain.value = .7;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = .004;
    this.compressor.release.value = .18;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.musicBus.connect(this.compressor);
    this.sfxBus.connect(this.compressor);
    this.compressor.connect(this.master);
    this.master.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .35), ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    // Stable noise avoids a different timbre on every reload.
    let seed = 987654321;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      data[i] = (seed >>> 0) / 2147483648 - 1;
    }
    this.ready = true;
    this.nextBeat = ctx.currentTime + .03;
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.ready) return;
    const t = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : .7, t, .035);
    this.musicBus.gain.setTargetAtTime(this.running ? this.musicVolume : 0, t, .05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, t, .035);
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, Number(v) || 0));
    this._applyVolumes();
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(v) || 0));
    this._applyVolumes();
  }

  setMuted(v) {
    this.muted = Boolean(v);
    this._applyVolumes();
  }

  setStage(n) {
    this.stage = Math.max(0, Math.floor(n));
    this.step = 0;
    if (this.context) this.nextBeat = this.context.currentTime + .04;
  }

  /** Call once per frame. active=false fades music, leaving menu sounds available. */
  update(dt, active = true) {
    if (!this.ready || this.context.state !== 'running') return;
    if (this.running !== active) {
      this.running = active;
      this.nextBeat = this.context.currentTime + .03;
      this._applyVolumes();
    }
    if (!active || this.muted || this.musicVolume === 0) return;
    const now = this.context.currentTime;
    if (this.nextBeat < now - .4) this.nextBeat = now + .025;
    let count = 0;
    while (this.nextBeat < now + .12 && count++ < 4) {
      this._musicStep(this.nextBeat, this.step++);
      this.nextBeat += 60 / (108 + Math.min(this.stage, 3) * 5) / 2;
    }
  }

  _tone(freq, duration, volume, type = 'sine', when, endFreq, bus) {
    if (!this.ready) return;
    const ctx = this.context;
    const t = Math.max(ctx.currentTime, when ?? ctx.currentTime);
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, freq), t);
    if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration * .85);
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(volume, t + Math.min(.009, duration * .12));
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(envelope);
    envelope.connect(bus || this.sfxBus);
    oscillator.start(t);
    oscillator.stop(t + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    this.notesPlayed++;
  }

  _noise(duration, volume, cutoff, when, bus) {
    const ctx = this.context;
    const t = Math.max(ctx.currentTime, when ?? ctx.currentTime);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(volume, t);
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus || this.sfxBus);
    source.start(t);
    source.stop(t + duration + .01);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }

  _musicStep(t, index) {
    const s = index % 32;
    const roots = [45, 48, 41, 43];
    const root = roots[Math.floor(s / 8)];
    const hz = midi => 440 * 2 ** ((midi - 69) / 12);
    const bus = this.musicBus;
    // Rounded bass with a little octave pluck; a buoyant eight-bar loop.
    if (s % 2 === 0 || s % 8 === 7) {
      this._tone(hz(root + (s % 8 === 6 ? 7 : 0)), .23, .52, 'triangle', t, undefined, bus);
      this._tone(hz(root + 12), .07, .10, 'sine', t, undefined, bus);
    }
    // Soft kick, brushed snare and closed hats.
    if (s % 8 === 0 || s % 8 === 4) this._tone(130, .18, .55, 'sine', t, 38, bus);
    if (s % 8 === 2 || s % 8 === 6) {
      this._noise(.095, .14, 1100, t, bus);
      this._tone(175, .08, .10, 'triangle', t, 120, bus);
    }
    this._noise(s % 2 ? .025 : .045, s % 2 ? .04 : .065, 6200, t, bus);
    const melody = [12, 19, 24, -1, 22, 19, 16, 19, 12, -1, 19, 24, 26, 24, 19, -1,
      12, 19, 24, 28, 26, -1, 24, 19, 14, 19, 26, 24, 19, 16, 14, -1];
    const note = melody[(s + this.stage * 4) % melody.length];
    if (note >= 0) {
      this._tone(hz(root + note), .22, .24, 'sine', t, undefined, bus);
      this._tone(hz(root + note + 12), .12, .045, 'triangle', t + .006, undefined, bus);
    }
    if (s % 8 === 1) {
      for (const note of [12, 16, 19]) this._tone(hz(root + note), .30, .065, 'triangle', t, undefined, bus);
    }
  }

  play(name, value = 0) {
    if (!this.ready || this.muted || this.context.state !== 'running') return;
    const t = this.context.currentTime;
    this.effectsPlayed++;
    const sequence = (notes, duration = .1, volume = .2, type = 'sine') => notes.forEach((n, i) =>
      this._tone(440 * 2 ** ((n - 69) / 12), duration * 1.8, volume, type, t + i * duration));
    switch (name) {
      case 'brick':
      case 'hit': {
        const pitch = 520 * 2 ** ((Math.max(0, value) % 12) / 12);
        this._tone(pitch, .105, .28, 'triangle', t, pitch * 1.4);
        this._tone(pitch * 2, .065, .08, 'sine', t);
        this._noise(.035, .06, 2200, t);
        break;
      }
      case 'paddle':
        this._tone(180, .13, .32, 'sine', t, 450);
        this._tone(500, .045, .09, 'triangle', t);
        break;
      case 'wall':
        if (t - this.lastWall < .035) break;
        this.lastWall = t;
        this._tone(830, .055, .095, 'sine', t, 610);
        break;
      case 'launch': sequence([60, 67, 72, 79], .055, .20, 'triangle'); break;
      case 'powerup':
      case 'power': sequence([72, 76, 79, 84], .08, .23); this.speak('power'); break;
      case 'lose':
      case 'life': sequence([60, 55, 51, 48], .12, .24, 'triangle'); break;
      case 'win':
      case 'clear': sequence([60, 64, 67, 72, 76, 79, 84], .09, .22); this.speak('win'); break;
      case 'charge':
        if (t - this.lastCharge < .12) break;
        this.lastCharge = t;
        this._tone(280 + Math.min(1, value) * 650, .09, .10, 'sine', t, 500 + Math.min(1, value) * 900);
        break;
      case 'burst':
        this._tone(130, .34, .38, 'sine', t, 38);
        this._noise(.18, .22, 800, t);
        sequence([72, 79, 84], .045, .16, 'triangle');
        break;
      case 'menu':
      case 'focus': this._tone(660, .065, .11, 'sine', t, 820); break;
      case 'confirm': sequence([72, 79], .055, .16, 'triangle'); break;
      case 'cancel': this._tone(480, .10, .12, 'triangle', t, 330); break;
      case 'stage': sequence([55, 62, 67, 74], .09, .19); this.speak('ready'); break;
      default: this._tone(440, .06, .09, 'sine', t);
    }
  }

  /** Tiny formant-shaped syllables: cheerful gibberish, never recorded speech. */
  speak(kind = 'ready') {
    if (!this.ready || this.muted || this.context.state !== 'running') return;
    const ctx = this.context;
    const now = ctx.currentTime;
    if (now < this.voiceUntil) return;
    const syllables = kind === 'win' ? [0, 2, 4, 2, 5] : kind === 'power' ? [3, 1, 4] : [0, 1, 3, 2];
    const vowels = [[720, 1220], [330, 2220], [410, 880], [550, 1780], [820, 1450], [290, 940]];
    syllables.forEach((syllable, i) => {
      const t = now + .035 + i * .105;
      const duration = .075 + (i % 2) * .025;
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      osc.type = 'sawtooth';
      const pitch = 250 + ((i * 37 + this.stage * 17) % 100) + (kind === 'win' ? 60 : 0);
      osc.frequency.setValueAtTime(pitch, t);
      osc.frequency.linearRampToValueAtTime(pitch * (i % 2 ? .86 : 1.18), t + duration);
      envelope.gain.setValueAtTime(0, t);
      envelope.gain.linearRampToValueAtTime(.065, t + .012);
      envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
      const filters = vowels[syllable].map((frequency, j) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = j ? 7 : 4;
        osc.connect(filter);
        filter.connect(envelope);
        return filter;
      });
      envelope.connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + duration + .015);
      osc.onended = () => { osc.disconnect(); filters.forEach(f => f.disconnect()); envelope.disconnect(); };
      this.syllablesPlayed++;
      this.notesPlayed++;
    });
    this.voiceUntil = now + syllables.length * .105 + .08;
  }

  get metrics() {
    return {
      state: this.context?.state || 'locked',
      sampleRate: this.context?.sampleRate || 0,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      muted: this.muted,
      active: this.running,
      notesPlayed: this.notesPlayed,
      effectsPlayed: this.effectsPlayed,
      syllablesPlayed: this.syllablesPlayed,
      stage: this.stage,
      masterGain: this.master?.gain.value ?? 0,
      musicGain: this.musicBus?.gain.value ?? 0,
      sfxGain: this.sfxBus?.gain.value ?? 0,
    };
  }
}
